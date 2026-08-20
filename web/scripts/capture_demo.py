#!/usr/bin/env python3
"""Capture each demo scenario into its own screenshot set + markdown docs.

Usage (dev server on :5173):
  python scripts/capture_demo.py                                  # all scenarios, review docs
  DEMO_SCENARIO=e2e-01 python scripts/capture_demo.py             # single scenario
  DEMO_MODE=presentation python scripts/capture_demo.py           # external whitepapers (no launcher)

Output:
  web/screenshots/demo/<scenario>/*.png
  web/DEMO-Review-E2E-0N.md      (internal: operations + narration + launcher)
  web/DEMO-Whitepaper-E2E-0N.md  (external: user-journey narrative, business views only)

Step/script data is read at runtime from the launcher's __skillos.demoScript,
so this script never drifts from src/app/demoScript.ts.
"""
import sys, time, os, datetime, json
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "screenshots" / "demo"
MODE = os.environ.get("DEMO_MODE", "review")          # review | presentation
ONLY = os.environ.get("DEMO_SCENARIO", "all")         # e2e-01 | e2e-02 | e2e-03 | all

SCENARIO_IDS = ["e2e-01", "e2e-02", "e2e-03"]

# Human-readable operation for each DEMO_COMMAND action ("涉及的具体操作")
ACTION_OPS = {
    "run": "在工作台输入任务「{prompt}」并运行",
    "correct": "点击「修正」，改用建议的替代技能",
    "buildEvidence": "点击「结构化证据」，将本次运行记录结构化为证据",
    "createLocalRule": "点击「同时创建本地规则」，把修正沉淀为本地治理规则",
    "requestGrant": "提交委托授权，为会话申请临时权限",
    "navigate": "打开「{to}」页面",
    "openCandidate": "打开自动生成的全局候选规则进行审查",
    "approveCandidate": "审批通过候选规则，进入全局契约编辑器",
    "runImpact": "运行影响分析，扫描依赖图",
    "publish": "发布全局治理版本",
    "applyUpgrade": "升级技能 {skillId} → {version}",
}

def log(msg):
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def op_text(step, win_label):
    """Describe the concrete operation a step performs."""
    cmd = step.get("command") or {}
    action = cmd.get("action", "")
    if action == "run":
        prompt = cmd.get("prompt") or cmd.get("task") or ""
        return f"在「{win_label}」工作台输入任务「{prompt}」并运行" if prompt else f"在「{win_label}」工作台运行任务"
    tpl = ACTION_OPS.get(action)
    if tpl:
        return tpl.format(**{**cmd, "to": cmd.get("to", "")})
    return "——"

def main():
    ids = [ONLY] if ONLY != "all" else SCENARIO_IDS
    if ONLY not in ("all",) and ONLY not in SCENARIO_IDS:
        log(f"ERROR: unknown DEMO_SCENARIO={ONLY}"); sys.exit(1)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for sid in ids:
            run_scenario(p, browser, sid)
        browser.close()

def run_scenario(p, browser, sid):
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.add_init_script("""(() => {
        const orig = window.open;
        window.open = (url, name, feats) => orig(url, name);
    })();""")
    launcher = ctx.new_page()
    errors = []
    ctx.on("page", lambda pg: pg.on("pageerror", lambda e: errors.append(str(e)[:200])))

    launcher.goto(f"{BASE}/demo?scenario={sid}")
    launcher.wait_for_timeout(2500)

    # Read the scenario script straight from the running app.
    script = launcher.evaluate("""() => {
        const info = window.__skillos.demoScript;
        const sc = window.__skillos.scenarios.find(s => s.id === info.scenarioId);
        return { ...info, scenarioTitle: sc ? sc.title : info.scenarioId,
                 steps: info.steps.map(s => ({ ...s })) };
    }""")
    steps, windows = script["steps"], script["windows"]
    label_of = {w["key"]: w["label"] for w in windows}
    focus_labels = {"launcher": "演示台", "developer": "开发者端"}
    log(f"[{sid}] 剧本 {len(steps)} 步 / 窗口 {len(windows)} 个")

    sdir = OUT / sid
    sdir.mkdir(parents=True, exist_ok=True)
    (sdir / ".." ).mkdir(parents=True, exist_ok=True)

    if MODE == "review":
        launcher.screenshot(path=str(sdir / "00-launcher.png"))
    launcher.get_by_role("button", name="开始演示").click()
    log(f"[{sid}] 已点击开始演示，等待窗口打开…")

    def page_map():
        pages = {"launcher": launcher}
        for pg in ctx.pages:
            u = pg.url
            if "/user/" in u:
                # URL is /user/user-a?scenario=… → key "user-a" (segment already has prefix)
                pages[u.split("/user/")[1].split("/")[0].split("?")[0]] = pg
            elif "/developer" in u:
                pages["developer"] = pg
        return pages

    need = ["developer"] + [w["key"] for w in windows if w["kind"] == "user"]
    pm = {}
    deadline = time.time() + 40
    while time.time() < deadline:
        pm = page_map()
        if all(k in pm for k in need):
            break
        time.sleep(0.2)
    missing = [k for k in need if k not in pm]
    if missing:
        log(f"[{sid}] ERROR: windows missing: {missing}")
        ctx.close(); return
    for k in need:
        pm[k].wait_for_load_state("domcontentloaded")
    launcher.wait_for_timeout(600)
    pm = page_map()
    for w in windows:
        if w["kind"] == "user" or w["key"] == "developer":
            pm[w["key"]].screenshot(path=str(sdir / f"01-{w['key']}-initial.png"))
    log(f"[{sid}] 01-* 初始状态已截")

    captures = []  # (n, step, focus_key, png)
    for i, step in enumerate(steps):
        n = i + 1
        focus = step["focus"]
        # presentation mode: never capture the orchestration console
        if MODE == "presentation" and focus == "launcher":
            log(f"[{sid}] skip step {n} ({step['id']}) — Launcher 聚焦，对外模式不截图")
            continue
        # wait until this step becomes active (launcher exposes dataset.demoStep)
        found = False
        deadline = time.time() + (step.get("wait", 2000) / 1000) + 20
        while time.time() < deadline:
            try:
                cur = launcher.evaluate("document.documentElement.dataset.demoStep || ''")
            except Exception:
                cur = ""
            if cur == step["id"]:
                found = True
                break
            time.sleep(0.1)
        if not found:
            log(f"[{sid}] WARN: step {n} ({step['id']}) never became active, skipping")
            continue
        frac = 0.95 if step["id"].startswith("propagation") else 0.85
        time.sleep(step.get("wait", 2000) / 1000 * frac)
        pm = page_map()
        pg = pm.get(focus)
        if pg is None and focus != "launcher":
            for _ in range(20):
                time.sleep(0.2); pm = page_map(); pg = pm.get(focus)
                if pg is not None: break
        if pg is None:
            log(f"[{sid}] WARN: focus '{focus}' not found at step {n}")
            continue
        png = f"{n:02d}-{step['id']}.png"
        pg.screenshot(path=str(sdir / png))
        captures.append((n, step, focus, png))
        log(f"[{sid}] {png} — 步骤 {n}/{len(steps)} ({focus})")

    time.sleep(1.2)
    if MODE == "review":
        launcher.screenshot(path=str(sdir / f"{len(steps)+2:02d}-launcher-end.png"))
    log(f"[{sid}] done, {len(captures)} captures, errors={len(errors)} {errors[:2]}")
    ctx.close()

    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    if MODE == "review":
        write_review(sid, script, captures, label_of, ts)
    else:
        write_whitepaper(sid, script, captures, label_of, ts)

# ---------------------------------------------------------------------------
def write_review(sid, script, captures, label_of, ts):
    """内部版：操作步骤 + 旁白 + 截图（含编排控制台），供 QA / 专利审查。"""
    steps = script["steps"]
    lines = [
        f"# {script.get("scenarioTitle", sid)} — 演示文档（内部审查版）",
        "",
        f"> 生成时间：{ts} ｜ 环境：Chromium 1440×900，播放速度 1× ｜ 剧本源：`src/app/demoScript.ts`（共 {len(steps)} 步）",
        "> ⚠️ 本文件含编排控制台（Launcher），仅供内部 QA 与专利审查；对外演示请使用 `DEMO-Whitepaper-" + sid.upper() + ".md`。",
        "",
        "## 0. 参演窗口",
        "",
        "| 窗口 | 路径 |",
        "| --- | --- |",
    ]
    for w in script["windows"]:
        lines.append(f"| {w['label']} | `{w['sub']}` |")
    lines += ["", "## 1. 分步演示记录", ""]
    for (n, step, focus, png) in captures:
        win = label_of.get(focus, "演示台")
        op = op_text(step, win)
        cmd = step.get("command") or {}
        lines += [
            f"### 步骤 {n} · `{step['id']}`（{win}）",
            "",
            f"- **具体操作**：{op}" + (f"（命令 `{cmd.get('action')}`）" if cmd else ""),
            f"- **旁白**：{step['narration']}",
            "",
            f"![步骤 {n}](screenshots/demo/{sid}/{png})",
            "",
        ]
    lines += ["---", "", "## 附注", "", "- 重跑：`python scripts/capture_demo.py`（`DEMO_SCENARIO=" + sid + "` 单跑本场景）。", ""]
    doc = ROOT / f"DEMO-Review-{sid.upper()}.md"
    doc.write_text("\n".join(lines), encoding="utf-8")
    log(f"written: {doc}")

# ---------------------------------------------------------------------------
# 对外白皮书：每场景一份，用户旅程叙事，仅业务视图
# ---------------------------------------------------------------------------
SCENARIO_STORY = {
    "e2e-01": {
        "title": "证券研究官方财报来源治理",
        "problem": "分析师查询上市公司官方财报时，智能体默认选中通用网页搜索，返回的却是 Reuters、CNBC 等媒体摘要——数据没错，但「来源合规」的业务约束被绕过了。",
        "closure": "同一任务再次发起时，全局规则在技能规划阶段直接生效：IR 搜索得分升至 1.00，通用搜索降至 0.61，零人工干预直达官方来源。一条来自一线的人工修正，经过「证据上行 → 全局演化 → 局部消解」闭环，成为全团队默认可用的基础设施。",
    },
    "e2e-02": {
        "title": "保险理赔扫描件治理与 PDF 技能升级",
        "problem": "理赔团队上传扫描件时，PDF 抽取直接返回空字段（召回率仅 41%）。一线先 OCR 再抽取的修正经验，如何变成全团队默认流程，并在技能升级后自动收敛版本冲突？",
        "closure": "PDF Extraction 2.4 发布后，标准扫描件直读成功；仍绑定旧 OCR 1.5 的插件用户被自动标记冲突并进入重验证——升级没有破坏任何人的合规基线。",
    },
    "e2e-03": {
        "title": "企业财务数据访问与临时授权",
        "problem": "持有效委托的区域财务经理被全局不变量误阻断——旧权限 Schema 只识别 finance:read，不识别委托声明。安全边界不能放宽，但合法访问不能被误伤。",
        "closure": "权限模型发布后，委托被映射为 finance:read，持委托经理正常放行；无任何委托的分析师依旧被阻断——安全边界未被降低一分。",
    },
}

def write_whitepaper(sid, script, captures, label_of, ts):
    """对外版：用户旅程叙事，仅 User / Developer 业务视图。"""
    story = SCENARIO_STORY[sid]
    steps = script["steps"]

    # group captures into acts: user acts first, then developer, then outcomes
    user_acts, dev_acts, end_acts = [], [], []
    for (n, step, focus, png) in captures:
        if focus == "developer":
            dev_acts.append((n, step, png))
        elif focus.startswith("user-"):
            (end_acts if step["id"].startswith(("outcome", "closure", "legacy", "mgr-success", "analyst-blocked")) else user_acts).append((n, step, png))
        # launcher-focused steps are excluded entirely

    def shots(acts):
        out = []
        for (n, step, png) in acts:
            win = label_of.get(step["focus"], "")
            out.append((png, f"{win} · {step['narration']}"))
        return out

    lines = [
        f"# 智能体 Skill 双端协同治理 — {script.get('scenarioTitle', sid)}（对外演示手册）",
        "",
        f"> 版本：{ts} ｜ 截图均取自系统真实运行画面",
        "",
        "## 背景",
        "",
        story["problem"],
        "",
        "本场演示展示：一线修正如何自动上行、治理引擎如何聚合与发布、全局规则如何按依赖链落地并闭环验证。",
        "",
        "## 一、一线遭遇问题并沉淀本地经验（用户端）",
        "",
    ]
    for png, cap in shots(user_acts):
        lines += [f"![{cap}](screenshots/demo/{sid}/{png})", "", f"*{cap}*", ""]
    lines += ["## 二、治理引擎聚合证据并发布全局规则（治理侧）", ""]
    for png, cap in shots(dev_acts):
        lines += [f"![{cap}](screenshots/demo/{sid}/{png})", "", f"*{cap}*", ""]
    if end_acts:
        lines += ["## 三、升级落地与闭环验证", ""]
        for png, cap in shots(end_acts):
            lines += [f"![{cap}](screenshots/demo/{sid}/{png})", "", f"*{cap}*", ""]
    lines += ["## 结语", "", story["closure"], "",
              "*本手册由系统真实运行画面自动生成（`DEMO_MODE=presentation DEMO_SCENARIO=" + sid + " python scripts/capture_demo.py`）。*", ""]
    doc = ROOT / f"DEMO-Whitepaper-{sid.upper()}.md"
    doc.write_text("\n".join(lines), encoding="utf-8")
    log(f"written: {doc}")

if __name__ == "__main__":
    main()
