#!/usr/bin/env python3
"""Capture the full guided demo (25 steps) into screenshots + markdown docs.

Usage:
  python scripts/capture_demo.py               # internal QA review doc (DEMO-Review.md)
  DEMO_MODE=presentation python scripts/capture_demo.py   # external whitepaper (DEMO-Whitepaper.md)

Dev server must be running on :5173. In presentation mode the orchestration
console (Launcher) is never captured — only User/Developer business views.
"""
import sys, time, os, datetime
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
OUT = Path(__file__).resolve().parent.parent / "screenshots" / "demo"
MODE = os.environ.get("DEMO_MODE", "review")  # review | presentation
DOC = Path(__file__).resolve().parent.parent / ("DEMO-Review.md" if MODE == "review" else "DEMO-Whitepaper.md")
CONSOLE_STEPS = {"intro", "end"}  # launcher-focused steps — never captured in presentation mode

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
        errors: dict[str, list[str]] = {}
        def watch(pg):
            errors[pg.url] = []
            pg.on("pageerror", lambda e, u=pg.url: errors.setdefault(u, []).append(str(e)[:400]))
        watch(launcher)
        ctx.on("page", watch)
        launcher.goto(f"{BASE}/demo")
        launcher.wait_for_timeout(1500)
        if MODE == "review":
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

        if MODE == "presentation":
            log("presentation 模式：跳过编排控制台（Launcher）截图")

        captures = []  # (step_no, sid, focus, png, narration, note)
        for i, (sid, focus, wait, narration, note) in enumerate(STEPS):
            if MODE == "presentation" and sid in CONSOLE_STEPS:
                log(f"skip {sid}（Launcher 聚焦，对外模式不截图）")
                continue
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
                (OUT / f"{n:02d}-{sid}.txt").write_text(pg.inner_text("body", timeout=1000), encoding="utf-8")
            except Exception:
                pass
            pm = page_map()
            log(f"{png} — 步骤 {n}/{len(STEPS)} ({focus}) url={pg.url} map={{{','.join(f'{k}:{v.url[:60]}' for k, v in pm.items())}}}")
            captures.append((n, sid, focus, png, narration, note))
            log(f"{png} — 步骤 {n}/{len(STEPS)} ({focus})")

        # final: launcher settled view (review mode only)
        time.sleep(1.5)
        if MODE == "review":
            launcher.screenshot(path=str(OUT / f"{len(STEPS)+1:02d}-launcher-end.png"))
        log("done")
        for u, errs in errors.items():
            if errs:
                log(f"PAGEERROR[{u}]: " + " | ".join(errs[:3]))

    # ---------- markdown doc ----------
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    if MODE == "review":
        write_review(ts, captures)
    else:
        write_whitepaper(ts)
    log(f"written: {DOC}")


def write_review(ts, captures):
    """内部 QA / 专利审查版：含编排控制台、步骤旁白与事件日志，供开发团队审阅。"""
    acts = [
        ("第一幕 · User A 遭遇问题并沉淀本地规则", 1, 5),
        ("第二幕 · B、C 遇到同样问题，三份证据汇聚", 6, 13),
        ("第三幕 · 开发者端聚类、审批、发布 v19", 14, 19),
        ("第四幕 · 三种本地结局：退役 / 精化 / 冲突", 20, 22),
        ("第五幕 · 闭环验证", 23, 24),
    ]
    lines = [
        "# 智能体 Skill 双端协同治理系统 — 完整演示文档（内部审查版）",
        "",
        f"> 生成时间：{ts} ｜ 环境：Chromium 1440×900，播放速度 1× ｜ 剧本源：`src/app/demoScript.ts`（共 {len(STEPS)} 步）",
        "> ⚠️ 本文件含编排控制台（Launcher）与事件日志，仅供内部 QA 与专利审查使用；对外演示请使用 `DEMO-Whitepaper.md`。",
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
        "- 对外演示模式：`DEMO_MODE=presentation python scripts/capture_demo.py`，产出 `DEMO-Whitepaper.md`（不含编排控制台）。",
        "- 若剧本（`demoScript.ts`）调整了步骤或等待时长，重新运行脚本即可重新生成本文档。",
        "",
    ]
    DOC.write_text("\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------------------
# 对外白皮书：以用户旅程为核心的场景化叙事，仅包含 User / Developer 业务视图
# ---------------------------------------------------------------------------
SCENARIOS = [
    (
        "场景一 · 当「官方数据」查不到：一次真实的分析师工作会话",
        [
            "分析师林在智能体工作台发起一项再普通不过的任务：查询英伟达最新官方季度财报（10-Q）。他的诉求很明确——**要官方来源，不要二手转述**。",
            "智能体默认选中了通用网页搜索，返回的却是 Reuters、CNBC、Yahoo Finance 等媒体摘要。数据本身没有错，但「来源合规」这一业务约束被绕过了——这正是治理系统要解决的第一个问题。",
        ],
        [
            ("02-a-run.png", "通用搜索返回媒体来源，触发「来源要求=官方」的合规告警"),
            ("03-a-correct.png", "分析师一键修正：改用投资者关系搜索，直达 investor.nvidia.com 官方公告"),
            ("04-a-build.png", "系统把这次人工修正自动结构化为运行证据（含上下文、技能关系、违规类型、版本依赖）"),
            ("05-a-create-rule.png", "一条属于该分析师的本地治理规则随即生效：官方公告场景下，IR 搜索优先于通用搜索"),
        ],
    ),
    (
        "场景二 · 同一个坑，同一支团队接连踩到",
        [
            "同样的官方财报任务，投研助理陈与交易员周也相继触发了相同的非官方来源问题。陈的本地规则还带着个人特有条件（仅内部资源场景生效）；而周的终端网络策略屏蔽了 IR 站点，本地规则被迫强制走通用搜索，问题被进一步放大。",
            "值得注意的是：三位分析师的修正动作彼此独立、互不知情——但**三份结构化的运行证据正在后台悄悄汇聚**，指向同一类治理缺口。",
        ],
        [
            ("06-b-run.png", "第二位分析师遭遇完全相同的来源合规问题"),
            ("07-b-correct-build.png", "陈完成修正——他的本地规则额外携带个人特有条件（internal_resource）"),
            ("08-b-build.png", "证据被自动结构化并上行至治理侧"),
            ("09-b-create-rule.png", "陈的本地规则建立，与林的规则各自独立运作"),
            ("10-c-run.png", "第三位分析师受网络策略限制，本地规则与任务需求相悖"),
            ("11-c-correct-build.png", "周完成修正，第三份独立证据产生"),
            ("12-c-build.png", "证据结构化：违规类型、技能关系、上下文被标准化"),
            ("13-c-create-rule.png", "周的本地规则（强制通用搜索）建立——它将在全局规则发布后与新规则正面冲突"),
        ],
    ),
    (
        "场景三 · 治理引擎自动聚合：从三份散落证据到一条全局规则",
        [
            "治理侧的开发者控制台此刻并不需要人工翻找。系统按「违规类型 + 技能关系 + 上下文」自动聚类三份证据：独立用户数 3、结果一致性 100%，升级评分 0.78 越过 0.75 阈值——一条全局候选规则被自动生成。",
            "开发者所做的，只是审查这条候选规则、确认影响范围，然后发布。全局治理版本从 v18 升至 v19，规则沿「全局契约 → 技能关系 → 本地契约」的依赖链逐层传播，所有受影响方在发布瞬间被标记并进入重验证。",
        ],
        [
            ("14-dev-cluster.png", "证据自动聚类：3 位独立用户、100% 结果一致性、升级评分 0.78 → PROMOTION READY"),
            ("15-dev-candidate.png", "系统自动生成全局候选规则：官方公告场景下 IR 搜索优先"),
            ("16-dev-approve.png", "开发者审批候选规则，进入契约编辑器"),
            ("17-dev-impact.png", "发布前影响分析：3 个本地契约将被波及"),
            ("18-dev-publish.png", "全局治理 v18 → v19 发布完成"),
            ("19-dev-propagation.png", "依赖波传播监控：提交 → 依赖扫描 → 本地失效 → 重验证全链路"),
        ],
    ),
    (
        "场景四 · 升级落地：三条本地规则的三重结局",
        [
            "全局规则发布后，三个用户的本地规则走向了三种不同的命运——系统对每一条都给出了可解释的处理：",
            "被全局完全覆盖的规则自动退役；保留个人特有条件（internal_resource）的规则在共享部分被吸收后继续以精化形态存在；与全局规则方向相悖的规则被标记为冲突，并进入冲突解决器由用户裁定。",
        ],
        [
            ("20-outcome-a.png", "林的规则被全局规则完全覆盖 → 自动退役（RETIRED）"),
            ("21-outcome-b.png", "陈的规则保留个人特有条件 → 精化续存（ACTIVE_REFINEMENT）"),
            ("22-outcome-c.png", "周的规则与全局规则方向相反 → 冲突，进入冲突解决器（CONFLICT）"),
        ],
    ),
    (
        "场景五 · 闭环验证：治理如何反哺下一次运行",
        [
            "故事还没有结束。林再次发起完全相同的官方财报查询——这一次，全局规则在技能规划阶段就生效了：IR 搜索综合得分升至 1.00，通用搜索降至 0.61，智能体直接选中官方来源，全程零人工干预。",
            "一条来自一线运行的人工修正，经过「证据上行 → 全局演化 → 局部消解」的治理闭环，最终变成全团队默认可用的基础设施——这就是双端协同治理的完整价值。",
        ],
        [
            ("23-closure.png", "同一任务再次发起：全局规则已在规划阶段生效"),
            ("24-closure-run.png", "IR 搜索得分 1.00 vs 通用搜索 0.61，直接返回 investor.nvidia.com 官方来源"),
        ],
    ),
]


def write_whitepaper(ts):
    """对外演示手册：用户旅程叙事，仅含 User / Developer 业务视图，不含编排控制台。"""
    lines = [
        "# 智能体 Skill 双端协同治理系统 — 对外演示手册",
        "",
        f"> 版本：{ts} ｜ 截图均取自系统真实运行画面（用户端工作台 / 治理侧控制台）",
        "",
        "## 系统在解决什么问题",
        "",
        "智能体正在成为分析师的工作伙伴，但每个智能体都带着各自独立的技能配置与本地规则。当同一类业务约束（如「官方数据源」）在多个智能体间反复失守时——",
        "",
        "- **一线用户**只能各自为战：每次踩坑后手动修正，修正经验留在个人本地，无法惠及团队；",
        "- **治理侧**看不到一线发生了什么：规则沉淀靠文档和会议，发布一次全局变更，影响范围靠拍脑袋；",
        "- **个人规则与全局规则**彼此不知情：升级后要么被静默覆盖，要么原地冲突，无人知晓。",
        "",
        "本系统以 **运行证据（Runtime Evidence）** 为纽带，让一线修正自动上行、治理引擎自动聚合、全局规则按依赖链平滑落地，并在下一次运行时闭环验证——形成「**局部经验 → 全局治理 → 局部消解**」的双端协同闭环。",
        "",
        "## 界面角色",
        "",
        "| 界面 | 角色 | 截图 |",
        "| --- | --- | --- |",
        "| 用户端 · 智能体工作台 | 分析师与智能体对话、执行任务、修正技能选择；治理规则在此实时生效 | ![用户端工作台](screenshots/demo/01-user-a-initial.png) |",
        "| 治理侧 · 开发者控制台 | 证据聚类、候选规则审查、全局契约发布与传播监控 | ![开发者控制台](screenshots/demo/01-developer-initial.png) |",
        "",
        "---",
        "",
    ]
    for title, paras, shots in SCENARIOS:
        lines.append(f"## {title}\n")
        for para in paras:
            lines.append(para + "\n")
        for png, cap in shots:
            lines += [f"![{cap}](screenshots/demo/{png})", "", f"*{cap}*", ""]
        lines.append("---\n")
    lines += [
        "## 结语",
        "",
        "从一次个人的手动修正，到一条全团队默认遵守的治理规则——运行证据让治理不再依赖文档与会议，而是由一线行为自然生长出来。",
        "",
        "*本手册由系统真实运行画面自动生成（`DEMO_MODE=presentation python scripts/capture_demo.py`）。*",
        "",
    ]
    DOC.write_text("\n".join(lines), encoding="utf-8")

if __name__ == "__main__":
    main()
