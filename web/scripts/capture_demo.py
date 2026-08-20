#!/usr/bin/env python3
"""Capture guided demos for all E2E scenarios into screenshots + markdown docs.

Usage:
  python scripts/capture_demo.py                       # internal QA review doc
  DEMO_MODE=presentation python scripts/capture_demo.py # external whitepaper

Dev server must be running (BASE env overrides, default http://localhost:5173).
In presentation mode the Launcher console is never captured — only User/Developer
business views. The script reads each scenario's script from window.__skillos so
it stays in sync with src/app/demoScript.ts without duplicating the step table.
"""
import os, sys, time, datetime, urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "http://localhost:5173")
ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "screenshots" / "demo"
MODE = os.environ.get("DEMO_MODE", "review")  # review | presentation
DOC = ROOT / ("DEMO-Review.md" if MODE == "review" else "DEMO-Whitepaper.md")
SPEED = os.environ.get("SPEED", "1.5")

SCENARIO_IDS = ["e2e-01", "e2e-02", "e2e-03"]
SCENARIO_TITLES = {
    "e2e-01": "证券研究官方财报来源治理",
    "e2e-02": "保险理赔扫描件治理与 PDF Skill 升级",
    "e2e-03": "企业财务数据访问与临时授权",
}
SCENARIO_META = {
    "e2e-01": ("E2E-01", "证券研究", "PRIORITY / EXCLUSION / FALLBACK · 退役 · 精化 · 冲突"),
    "e2e-02": ("E2E-02", "保险理赔", "ORDER / FALLBACK · 两次全局发布 · 版本兼容"),
    "e2e-03": ("E2E-03", "企业财务", "Global Invariant / PERMISSION · 权限映射 · 重认证"),
}

# Business-value captions per step id, grouped into user-journey sections.
# Steps not listed are still captured but only shown in the review doc.
JOURNEY = {
  "e2e-01": [
    ("一线用户踩坑：要的是官方来源，给的却是媒体", ["a-run", "a-correct", "a-build", "a-rule"]),
    ("同一个坑，不同团队接连踩到", ["b-run", "b-correct", "c-run", "c-correct"]),
    ("治理引擎自动聚合：三份证据汇成一条全局规则", ["dev-cluster", "dev-candidate", "dev-approve", "dev-impact", "dev-publish"]),
    ("规则落地：三条本地规则的三种命运", ["outcome-a", "outcome-b", "outcome-c"]),
    ("闭环：下次同样的任务，直接返回官方来源", ["closure-run"]),
  ],
  "e2e-02": [
    ("扫描件抽不出字段：理赔员的日常困境", ["east-run", "east-correct", "east-rule"]),
    ("多个团队遇到同样问题，车险传真更棘手", ["south-run", "fax-run", "fax-correct"]),
    ("全局临时规则 v31：先 OCR 再抽取", ["dev-cluster", "publish-v31", "propagation-v31"]),
    ("基础 Skill 升级：PDF Extraction 2.4 原生支持扫描件", ["upgrade", "publish-v32", "propagation-v32"]),
    ("闭环：标准扫描件从三步变两步，旧插件被拦截", ["legacy-conflict", "closure"]),
  ],
  "e2e-03": [
    ("合法业务诉求被权限不变量拦下", ["mgr-run", "mgr-request", "mgr-rerun-blocked", "mgr-evidence"]),
    ("不止一个人：其他持委托的经理也被误阻断", ["west-run", "west-evidence"]),
    ("治理修正的是声明映射，不是放开权限", ["dev-cluster", "dev-candidate", "publish-v21", "propagation"]),
    ("合法者恢复，越权者仍被挡在门外", ["mgr-success", "analyst-blocked"]),
  ],
}

# Friendly business captions keyed by step id.
CAPTIONS = {
  "a-run": "User A 查询英伟达官方财报，通用搜索返回 Reuters/CNBC 等媒体来源，来源合规告警触发",
  "a-correct": "一键修正为 IR Search，直达 investor.nvidia.com 官方 10-Q",
  "a-build": "系统把这次人工修正自动结构化为运行证据",
  "a-rule": "一条属于 A 的本地规则生效：官方公告场景 IR 搜索优先",
  "b-run": "投研助理 B 踩到同一个坑",
  "b-correct": "B 完成修正，其证据额外携带 internal_resource 特有条件",
  "c-run": "交易员 C 的终端屏蔽 IR 站点，本地规则强制走通用搜索",
  "c-correct": "C 提交修正，第三份独立证据汇聚",
  "dev-cluster": "证据自动聚类：3 位独立用户、100% 一致性，升级评分越过阈值",
  "dev-candidate": "系统生成全局候选：官方公告场景 IR 搜索优先于通用搜索",
  "dev-approve": "开发者审批候选，进入契约编辑器",
  "dev-impact": "发布前影响分析：扫描受影响本地契约",
  "dev-publish": "全局治理 v18 → v19 发布",
  "outcome-a": "A 的规则被全局完全覆盖 → 自动退役（RETIRED）",
  "outcome-b": "B 保留个人特有条件 → 精化续存（ACTIVE_REFINEMENT）",
  "outcome-c": "C 的规则与全局方向相反 → 冲突，进入解决器（CONFLICT）",
  "closure-run": "同一任务重跑：IR 搜索得分 1.00，直接返回官方来源",
  "east-run": "华东理赔上传扫描诊断证明，直接 PDF 抽取字段缺失、召回率仅 41%",
  "east-correct": "改为先 OCR 再抽取，字段召回率提升到 97%",
  "east-rule": "本地顺序规则：OCR BEFORE PDF Extraction",
  "south-run": "华南团队遇到相同问题",
  "fax-run": "车险传真件图像质量更低，召回率仅 33%",
  "fax-correct": "二次 OCR 增强后召回率 96%，证据携带 image_quality=low",
  "publish-v31": "发布临时全局规则 v31：scanned_pdf 先 OCR 再 PDF 2.3 抽取",
  "propagation-v31": "标准团队规则退役，传真件规则保留精化",
  "upgrade": "Skill 团队发布 PDF Extraction 2.4，原生支持扫描件",
  "publish-v32": "影子回放后发布 v32：2.4 直读，低置信度才回退 OCR",
  "propagation-v32": "第二轮重验证：旧 OCR 1.5 插件用户因版本不兼容进入冲突",
  "legacy-conflict": "旧插件用户需升级或转人工，不能继续绑定已停用版本",
  "closure": "华东重跑：标准扫描件从三步缩短为两步",
  "mgr-run": "财务经理想读取内部费用，Internal Financial DB 被全局不变量阻断",
  "mgr-request": "提交 24 小时委托授权，会话获得 delegated_finance_read",
  "mgr-rerun-blocked": "重跑仍被阻断——旧 Schema 只认 finance:read",
  "mgr-evidence": "形成不含财务数据的证据：主体、委托、阻断规则、失败原因",
  "west-run": "另一位持委托的区域经理同样被合法误阻断",
  "west-evidence": "证据汇聚为同一类「权限声明未映射」问题",
  "dev-candidate": "候选：委托有效期内 delegated_finance_read 映射为 finance:read",
  "publish-v21": "发布 v21，原权限不变量不放宽",
  "propagation": "权限 Schema 变更下行，相关规则重验证",
  "mgr-success": "经理重跑：委托被映射，内部库放行，输出脱敏偏差报告",
  "analyst-blocked": "对照：无委托的分析师仍被阻断，安全边界未降低",
}


def log(msg):
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def page_map(ctx, launcher):
    pages = {"launcher": launcher}
    for pg in ctx.pages:
        if pg == launcher:
            continue
        u = pg.url
        if "/user/" in u:
            key = "user-" + u.split("/user/")[1].split("/")[0].split("?")[0]
            pages[key] = pg
        elif "/developer" in u:
            pages["developer"] = pg
    return pages


def wait_step(launcher, step_id, timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        val = launcher.evaluate("() => document.documentElement.dataset.demoStep || ''")
        if val == step_id:
            return True
        time.sleep(0.15)
    return False


def capture_scenario(p, ctx, launcher, scenario_id, captures):
    url = f"{BASE}/demo?scenario={scenario_id}&mode={MODE}&noWindows=1"
    launcher.goto(url)
    launcher.wait_for_timeout(1000)
    script = launcher.evaluate("() => window.__skillos.demoScript")
    if not script:
        log(f"ERROR: no demoScript for {scenario_id}")
        return
    steps = script["steps"]
    windows = script["windows"]
    user_keys = [w["key"] for w in windows if w["kind"] == "user"]
    out = SHOTS / scenario_id
    out.mkdir(parents=True, exist_ok=True)

    # Open business pages explicitly (headless window.open is unreliable).
    opened = {}
    for w in windows:
        page_url = f"{BASE}{w['sub']}?scenario={scenario_id}"
        pg = ctx.new_page()
        pg.goto(page_url)
        opened[w["key"]] = pg
    launcher.wait_for_timeout(1500)

    # Start the orchestrator (it won't open its own windows because of noWindows=1).
    try:
        launcher.get_by_role("button", name="开始演示").click(timeout=3000)
    except Exception:
        try: launcher.get_by_role("button", name="继续演示").click(timeout=2000)
        except Exception: pass
    log(f"[{scenario_id}] 演示已启动，{len(windows)} 个窗口就绪")

    required = ["developer"] + user_keys
    pm = page_map(ctx, launcher)
    missing = [k for k in required if k not in pm]
    if missing:
        log(f"ERROR: 缺少窗口 {missing}")
        return
    for pg in pm.values():
        try: pg.wait_for_load_state("domcontentloaded", timeout=2000)
        except Exception: pass
    launcher.wait_for_timeout(1000)
    pm = page_map(ctx, launcher)

    # Initial windows (review doc only shows launcher; both modes show business windows)
    if MODE == "review":
        launcher.screenshot(path=str(out / "00-launcher.png"))
    for k in ["developer"] + user_keys:
        if k in pm:
            pm[k].screenshot(path=str(out / f"00-{k}.png"))
    log(f"[{scenario_id}] 初始窗口截图完成")

    for i, step in enumerate(steps):
        sid = step["id"]
        focus = step.get("focus", "launcher")
        wait_ms = step.get("wait", 2000)
        narration = step.get("narration", "")
        if not wait_step(launcher, sid, timeout=(wait_ms / 1000) + 25):
            log(f"WARN: 步骤 {sid} 未出现，跳过")
            continue
        # Settle ~80% through the step
        time.sleep((wait_ms / 1000) * 0.8 / float(SPEED))
        pm = page_map(ctx, launcher)
        if MODE == "presentation" and focus == "launcher":
            continue
        pg = pm.get(focus)
        if pg is None:
            for _ in range(15):
                time.sleep(0.2)
                pm = page_map(ctx, launcher)
                pg = pm.get(focus)
                if pg is not None: break
        if pg is None:
            log(f"WARN: 找不到焦点窗口 {focus} @ {sid}")
            continue
        n = i + 1
        png = f"{n:02d}-{sid}.png"
        pg.screenshot(path=str(out / png))
        try:
            (out / f"{n:02d}-{sid}.txt").write_text(pg.inner_text("body", timeout=1000), encoding="utf-8")
        except Exception:
            pass
        captures.append((scenario_id, n, sid, focus, png, narration))
        log(f"[{scenario_id}] {png} ({focus})")

    launcher.wait_for_timeout(1200)


def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    captures = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
        launcher = ctx.new_page()
        errors = {}
        def watch(pg):
            errors[pg.url] = []
            pg.on("pageerror", lambda e, u=pg.url: errors.setdefault(u, []).append(str(e)[:300]))
        watch(launcher)
        ctx.on("page", watch)
        launcher.set_default_timeout(8000)

        for sid in SCENARIO_IDS:
            capture_scenario(p, ctx, launcher, sid, captures)
            # Close business windows between scenarios; launcher reused.
            for pg in list(ctx.pages):
                if pg != launcher and ("/user/" in pg.url or "/developer" in pg.url):
                    try: pg.close()
                    except Exception: pass
            launcher.wait_for_timeout(800)

        for u, errs in errors.items():
            if errs:
                log(f"PAGEERROR {u}: " + " | ".join(errs[:3]))
        browser.close()

    if MODE == "review":
        write_review(captures)
    else:
        write_whitepaper(captures)
    log(f"written: {DOC}")


def write_review(captures):
    by_sc = {sid: [] for sid in SCENARIO_IDS}
    for c in captures: by_sc[c[0]].append(c)
    lines = [
        "# 智能体 Skill 双端协同治理系统 — 完整演示文档（内部审查版）",
        "",
        f"> 生成时间：{datetime.datetime.now().strftime('%Y-%m-%d %H:%M')} ｜ Chromium 1440×900 ｜ 播放速度 {SPEED}× ｜ 剧本源：`web/src/app/demoScript.ts`",
        "> ⚠️ 含 Launcher 控制台与剧本旁白，仅供内部 QA 与专利审查；对外请用 `DEMO-Whitepaper.md`。",
        "",
        "## 场景索引",
        "",
        "| 编号 | 实施例 | 行业 | 核心治理机制 |",
        "| --- | --- | --- | --- |",
    ]
    for sid in SCENARIO_IDS:
        code, ind, mech = SCENARIO_META[sid]
        lines.append(f"| {code} | [{SCENARIO_TITLES[sid]}](#{sid}) | {ind} | {mech} |")
    lines.append("")
    for sid in SCENARIO_IDS:
        code, ind, mech = SCENARIO_META[sid]
        caps = by_sc[sid]
        lines += [
            f"---", "",
            f"## {code} · {SCENARIO_TITLES[sid]}",
            "",
            f"**行业**：{ind} ｜ **机制**：{mech} ｜ **截图数**：{len(caps)}",
            "",
            "### 初始状态",
            "",
            f"![演示台](screenshots/demo/{sid}/00-launcher.png)",
            "",
            "| 窗口 | 截图 |",
            "| --- | --- |",
        ]
        # find window initials from captures? just list known
        lines.append(f"| 开发者端 | ![开发者端](screenshots/demo/{sid}/00-developer.png) |")
        for png in sorted((SHOTS / sid).glob("00-user-*.png")):
            key = png.stem.replace("00-", "")
            lines.append(f"| {key} | ![{key}](screenshots/demo/{sid}/{png.name}) |")
        lines += ["", "### 分步骤记录", ""]
        for (sc, n, sidstep, focus, png, narration) in caps:
            cap = CAPTIONS.get(sidstep, "")
            lines += [
                f"#### 步骤 {n} · `{sidstep}`（关注：{focus}）",
                "",
                f"> **旁白**：{narration}",
                "",
            ]
            if cap:
                lines.append(f"**看点**：{cap}")
                lines.append("")
            lines += [f"![步骤 {n}](screenshots/demo/{sc}/{png})", ""]
    lines += [
        "---", "",
        "## 附注", "",
        "- 截图脚本：`web/scripts/capture_demo.py`（Playwright，可重复执行）。",
        "- 对外白皮书：`DEMO_MODE=presentation python scripts/capture_demo.py`。",
        "- 剧本或场景调整后重新运行脚本即可刷新文档。", "",
    ]
    DOC.write_text("\n".join(lines), encoding="utf-8")


def write_whitepaper(captures):
    lines = [
        "# 智能体 Skill 双端协同治理系统 — 对外演示手册",
        "",
        f"> 版本：{datetime.datetime.now().strftime('%Y-%m-%d')} ｜ 截图均取自系统真实运行画面（用户端工作台 / 治理侧控制台）",
        "",
        "## 系统在解决什么问题",
        "",
        "智能体正在成为各岗位的工作伙伴，但每个智能体带着各自的技能配置与本地规则。当同一类业务约束（如「必须官方来源」「先筛查后写入」「越权数据不可访问」）在多个智能体间反复失守时——",
        "",
        "- **一线用户**各自为战：每次踩坑手动修正，经验留在个人本地，无法惠及团队；",
        "- **治理侧**看不到一线发生了什么：规则靠文档和会议，一次全局变更的影响范围靠拍脑袋；",
        "- **个人规则与全局规则**互不知情：升级后要么被静默覆盖，要么原地冲突。",
        "",
        "本系统以 **运行证据（Runtime Evidence）** 为纽带，让一线修正自动上行、治理引擎自动聚合、全局规则按依赖链平滑落地，并在下一次运行时闭环验证——形成「**局部经验 → 全局治理 → 局部消解**」的双端协同闭环。",
        "",
        "## 界面角色",
        "",
        "| 界面 | 职责 |",
        "| --- | --- |",
        "| 用户端 · 智能体工作台 | 执行任务、修正技能、提交运行证据；本地规则实时生效 |",
        "| 治理侧 · 开发者控制台 | 证据聚类、候选审查、影响分析、全局契约发布与传播监控 |",
        "",
        "---", "",
    ]
    for sid in SCENARIO_IDS:
        code, ind, mech = SCENARIO_META[sid]
        lines += [f"## {code} · {SCENARIO_TITLES[sid]}", ""]
        lines.append(f"*{ind} · {mech}*")
        lines.append("")
        for section_title, step_ids in JOURNEY[sid]:
            lines += [f"### {section_title}", ""]
            # intro prose is generic per section; captions tell the story
            for sidstep in step_ids:
                cap = CAPTIONS.get(sidstep)
                if not cap: continue
                png = f"screenshots/demo/{sid}/"
                # find actual file by step id prefix
                matches = sorted((SHOTS / sid).glob(f"*-{sidstep}.png"))
                if not matches: continue
                rel = f"screenshots/demo/{sid}/{matches[0].name}"
                lines += [f"![{cap}]({rel})", "", f"*{cap}*", ""]
            lines.append("")
        lines += ["---", ""]
    lines += [
        "## 结语", "",
        "从一次个人的手动修正，到一条全团队默认遵守的治理规则——运行证据让治理不再依赖文档与会议，而由一线行为自然生长。",
        "三个行业、三类核心机制，最终汇聚为同一条闭环：**证据上行 → 全局演化 → 依赖传播 → 局部消解 → 运行验证**。",
        "",
        "*本手册由系统真实运行画面自动生成（`DEMO_MODE=presentation python web/scripts/capture_demo.py`）。*", "",
    ]
    DOC.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
