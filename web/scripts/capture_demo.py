#!/usr/bin/env python3
"""Capture the full guided demo (25 steps) into screenshots + a review markdown doc.

Usage: python scripts/capture_demo.py   (dev server must be running on :5173)
Output: web/screenshots/demo/NN-<step>.png  and  web/DEMO-完整演示文档.md
"""
import sys, time, datetime
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
OUT = Path(__file__).resolve().parent.parent / "screenshots" / "demo"
DOC = Path(__file__).resolve().parent.parent / "DEMO-完整演示文档.md"

# (id, focus, wait_ms, narration, 看点) — mirrors web/src/app/demoScript.ts
STEPS = [
    ("intro", "launcher", 4500, "第一幕 · 三位分析师分别在各自的智能体工作台查询上市公司官方财报。当前全局版本 v18 没有针对「官方公告」的路由规则。", "演示台展示剧本时间线与事件日志"),
    ("a-run", "user-a", 7000, "User A（林·分析师）发起查询：智能体选中 Web Search，返回的却是 Reuters/CNBC 等媒体来源，与「官方」要求不符。", "运行结果出现非官方来源告警，提示治理机会"),
    ("a-correct", "user-a", 4000, "A 点击「修正」，改用 Investor Relations Search，成功返回 investor.nvidia.com 的官方公告。系统识别到治理机会。", "技能切换成功，出现「识别到治理机会」横幅"),
    ("a-build", "user-a", 3500, "A 把这次修正结构化为本地证据，并生成本地规则：官方公告场景下 IRSearch 优先于 WebSearch。", "进入证据构建器（结构化提取过程）"),
    ("a-create-rule", "user-a", 3500, "证据构建器自动提取上下文、技能关系、违规类型、版本依赖，一键提交并创建本地契约 LC-A。", "返回工作台，本地规则 LC-A 生效"),
    ("b-run", "user-b", 7000, "User B（陈·投研助理）遇到完全相同的问题：Web Search 返回非官方来源。", "User B 工作台出现相同违规"),
    ("b-correct-build", "user-b", 4000, "B 同样修正并提交证据。注意 B 的本地规则还包含「internal_resource=true」这个用户特有条件。", "B 的修正包含本地特有条件"),
    ("b-build", "user-b", 3000, "B 的证据被结构化并发送给开发者端。", "证据构建器提取 B 的运行证据"),
    ("b-create-rule", "user-b", 3000, "B 的本地规则创建完成。", "B 的本地规则 LC-B 生效"),
    ("c-run", "user-c", 7000, "User C（周·交易员）的终端网络策略屏蔽了 IR 站点，本地规则强制只走 Web Search。同样的官方公告任务也触发了问题。", "C 的本地规则与任务需求冲突"),
    ("c-correct-build", "user-c", 4000, "C 提交修正证据。现在三份独立证据指向同一类问题。", "C 完成修正，第三份证据产生"),
    ("c-build", "user-c", 3000, "C 的证据发送到开发者端，聚类即将越过升级阈值。", "证据结构化完成"),
    ("c-create-rule", "user-c", 3500, "C 的本地规则（强制 WebSearch）已建立——它将在全局发布后与新规则产生冲突。", "C 的冲突型本地规则 LC-C 建立"),
    ("dev-cluster", "developer", 5000, "第三幕 · 切到开发者端。三份证据自动聚类，独立用户数=3、结果一致性=100%，升级评分 0.78 越过阈值 0.75 → PROMOTION READY。", "证据聚类卡片：评分 0.78、PROMOTION READY"),
    ("dev-candidate", "developer", 4500, "系统自动生成全局候选 GGC：当任务类型=官方公告时，IRSearch 优先于 WebSearch。", "全局候选审查页 GGC"),
    ("dev-approve", "developer", 4000, "开发者审批通过，进入全局契约编辑器。", "契约编辑器预填候选内容"),
    ("dev-impact", "developer", 5000, "影响分析：扫描依赖图，发现 3 个受影响本地契约（A、B、C 各一个）。", "影响分析：3 个受影响契约"),
    ("dev-publish", "developer", 5000, "发布全局治理 v18 → v19。依赖波沿全局契约→技能关系→本地契约逐层传播。", "发布成功，版本升级 v18 → v19"),
    ("dev-propagation", "developer", 6000, "传播监控：提交 → 依赖扫描 → 本地失效 → 重验证。", "传播监控页 DELTA-19 全链路状态"),
    ("outcome-a", "user-a", 4500, "第四幕 · 三个用户窗口同时收到 v19。User A 的本地规则被全局完全覆盖 → RETIRED（退役）。", "User A 治理页：LC-A 状态 RETIRED"),
    ("outcome-b", "user-b", 4500, "User B 的规则包含 internal_resource 这一本地特有条件 → ACTIVE_REFINEMENT（共享部分被吸收，本地部分保留）。", "User B 治理页：LC-B 状态 ACTIVE_REFINEMENT"),
    ("outcome-c", "user-c", 5000, "User C 的本地规则强制 WebSearch，与新全局规则方向相反 → CONFLICT，进入冲突解决器。", "User C 冲突解决器：LC-C CONFLICT"),
    ("closure", "user-a", 2500, "第五幕 · 闭环验证。User A 再次运行同样的任务，这次全局规则生效：IRSearch 得分从 0.78 提升到 1.00，WebSearch 降到 0.61，IRSearch 被选中，直接返回官方来源。", "User A 工作台，全局规则已生效"),
    ("closure-run", "user-a", 7000, "局部运行证据 → 全局治理演化 → 局部重验证与消解。专利三段式闭环完成。", "官方来源结果 + 全局规则命中"),
    ("end", "launcher", 3000, "演示结束。可在各窗口中自由查看治理状态、历史、依赖网络与重验证结果。", "演示台回到初始状态，全部 25 步完成"),
]

def log(msg):
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    # make popups open at the context viewport size instead of window.open()'s 560px
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        ctx.add_init_script("""(() => {
            const orig = window.open;
            window.open = (url, name, feats) => orig(url, name);
        })();""")

        launcher = ctx.new_page()
        launcher.goto(f"{BASE}/demo")
        launcher.wait_for_timeout(1500)
        launcher.screenshot(path=str(OUT / "00-launcher.png"))
        log("00-launcher.png — 演示台初始状态")

        launcher.get_by_role("button", name="开始演示").click()
        log("已点击「开始演示」，等待 4 个窗口打开…")

        def page_map():
            pages = {"launcher": launcher}
            for pg in ctx.pages:
                u = pg.url
                if "/user/" in u:
                    # URL is /user/user-a/... → key "user-a"
                    pages[u.split("/user/")[1].split("/")[0]] = pg
                elif "/developer" in u:
                    pages["developer"] = pg
            return pages

        deadline = time.time() + 30
        pm = {}
        while time.time() < deadline:
            pm = page_map()
            if all(k in pm for k in ["developer", "user-a", "user-b", "user-c"]):
                break
            time.sleep(0.2)
        else:
            log(f"ERROR: windows missing: {[k for k in ['developer','user-a','user-b','user-c'] if k not in pm]}")
            sys.exit(1)

        pm = page_map()
        for name in ["developer", "user-a", "user-b", "user-c"]:
            pm[name].wait_for_load_state("domcontentloaded")
        launcher.wait_for_timeout(800)
        pm = page_map()
        for name in ["developer", "user-a", "user-b", "user-c"]:
            pm[name].screenshot(path=str(OUT / f"01-{name}-initial.png"))
        log("01-*.png — 四个窗口初始状态")

        captures = []  # (step_no, sid, focus, png, narration, note)
        for i, (sid, focus, wait, narration, note) in enumerate(STEPS):
            n = i + 1
            # wait for launcher narration to show this step
            found = False
            deadline = time.time() + (wait / 1000) + 20
            while time.time() < deadline:
                try:
                    body = launcher.inner_text("body", timeout=1000)
                except Exception:
                    body = ""
                if f"第 {n} 步 ·" in body:
                    found = True
                    break
                time.sleep(0.1)
            if not found:
                log(f"WARN: step {n} ({sid}) narration never appeared, skipping")
                continue
            # settle: capture at ~85% through the step's wait (95% for propagation page)
            frac = 0.95 if sid == "dev-propagation" else 0.85
            time.sleep(wait / 1000 * frac)
            pm = page_map()
            pg = pm.get(focus)
            if pg is None:  # transient unmapped page — retry briefly
                for _ in range(20):
                    time.sleep(0.2)
                    pm = page_map()
                    pg = pm.get(focus)
                    if pg is not None:
                        break
            if pg is None:
                log(f"WARN: focus page '{focus}' not found at step {n}")
                continue
            png = f"{n:02d}-{sid}.png"
            pg.screenshot(path=str(OUT / png))
            try:
                txt = pg.inner_text("body", timeout=1000)[:120].replace("\n", " / ")
            except Exception:
                txt = "<no text>"
            log(f"{png} — 步骤 {n}/{len(STEPS)} ({focus}) url={pg.url} text={txt}")
            captures.append((n, sid, focus, png, narration, note))
            log(f"{png} — 步骤 {n}/{len(STEPS)} ({focus})")

        # final: launcher settled view
        time.sleep(1.5)
        launcher.screenshot(path=str(OUT / f"{len(STEPS)+1:02d}-launcher-end.png"))
        log("done")

    # ---------- markdown doc ----------
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    acts = [
        ("第一幕 · User A 遭遇问题并沉淀本地规则", 1, 5),
        ("第二幕 · B、C 遇到同样问题，三份证据汇聚", 6, 13),
        ("第三幕 · 开发者端聚类、审批、发布 v19", 14, 19),
        ("第四幕 · 三种本地结局：退役 / 精化 / 冲突", 20, 22),
        ("第五幕 · 闭环验证", 23, 24),
    ]
    lines = [
        "# 智能体 Skill 双端协同治理系统 — 完整演示文档（自动截图）",
        "",
        f"> 生成时间：{ts} ｜ 环境：Chromium 1440×900，播放速度 1× ｜ 剧本源：`src/app/demoScript.ts`（共 {len(STEPS)} 步）",
        "> 截图为演示自动运行过程中各窗口的真实状态，按剧本顺序排列，可直接用于审阅。",
        "",
        "## 0. 演示启动",
        "",
        "### 0.1 演示台（Demo Launcher）",
        "",
        "点击「开始演示」后，系统在同一浏览器内打开 4 个窗口（开发者端 + 用户 A/B/C），并通过 BroadcastChannel 事件总线按剧本下发命令。",
        "",
        "![演示台初始状态](screenshots/demo/00-launcher.png)",
        "",
        "### 0.2 四个窗口初始状态",
        "",
        "| 窗口 | 截图 |",
        "| --- | --- |",
        "| 开发者端（/developer） | ![开发者端](screenshots/demo/01-developer-initial.png) |",
        "| User A · 林·分析师 | ![User A](screenshots/demo/01-user-a-initial.png) |",
        "| User B · 陈·投研助理 | ![User B](screenshots/demo/01-user-b-initial.png) |",
        "| User C · 周·交易员 | ![User C](screenshots/demo/01-user-c-initial.png) |",
        "",
        "## 1. 分幕演示记录",
        "",
    ]
    for act_name, start, end in acts:
        lines.append(f"### {act_name}（步骤 {start}–{end}）\n")
        for (n, sid, focus, png, narration, note) in captures:
            if not (start <= n <= end):
                continue
            lines += [
                f"#### 步骤 {n} · `{sid}`（关注窗口：{focus}）",
                "",
                f"> **旁白**：{narration}",
                "",
                f"**看点**：{note}",
                "",
                f"![步骤 {n}](screenshots/demo/{png})",
                "",
            ]
    lines += [
        "### 收尾：演示结束后的演示台",
        "",
        "![演示结束](screenshots/demo/26-launcher-end.png)",
        "",
        "---",
        "",
        "## 附注",
        "",
        "- 截图脚本：`web/scripts/capture_demo.py`（Playwright，可重复执行）。",
        "- 若剧本（`demoScript.ts`）调整了步骤或等待时长，重新运行脚本即可重新生成本文档。",
        "",
    ]
    DOC.write_text("\n".join(lines), encoding="utf-8")
    log(f"written: {DOC}")

if __name__ == "__main__":
    main()
