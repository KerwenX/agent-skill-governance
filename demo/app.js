/* ============================================================
   SkillOS · 应用逻辑（状态、导航、视图渲染、交互、动画）
   ============================================================ */

/* ---------- 全局状态 ---------- */
const state = {
    end: 'user',
    subTabs: { user: 'workbench', dev: 'workbench' },
    gcv: 1,
    filingCandidateAdded: false,
    filingPublished: false,
    localRefinementFormed: false,
    revalidationShown: false,
    loadedSkills: new Set(MY_SKILL_IDS),
    events: [],
    runs: [],
    clusters: EVIDENCE_CLUSTERS.map(c => ({ ...c })),
    history: INITIAL_HISTORY.map(h => ({ ...h })),
    defaults: [],
    invariants: [{ id: 'inv1', name: '官方财报数据只读', detail: 'official_filing: read-only · OverridePermission=0' }],
    chipsCollapsed: false,
    focus: false,
};

const SUB_TABS = {
    user: [
        { id: 'workbench', label: '工作台', icon: 'run' },
        { id: 'skills', label: '我的技能', icon: 'box' },
        { id: 'contract', label: '有效契约', icon: 'shield' },
        { id: 'records', label: '运行记录', icon: 'clock' },
    ],
    dev: [
        { id: 'workbench', label: '工作台', icon: 'run' },
        { id: 'library', label: '技能库', icon: 'box' },
        { id: 'contract-editor', label: '契约管理', icon: 'edit' },
        { id: 'evidence', label: '证据看板', icon: 'chart' },
        { id: 'history', label: '治理历史', icon: 'clock' },
    ],
};

/* ---------- 工具 ---------- */
const $ = (id) => document.getElementById(id);
function updateGcvBadge() { const el = $('gcv-ver'); if (el) el.textContent = 'GC_G^' + state.gcv; }
function now() { const d = new Date(); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':'); }
function skill(id) { return SKILLS.find(s => s.id === id); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

const ICONS = {
    run: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
    box: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>',
    shield: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>',
    clock: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    edit: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>',
    chart: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>',
};

/* ---------- 抽屉 / 弹窗 ---------- */
function openDrawer(title, html) { $('drawer-title').textContent = title; $('drawer-body').innerHTML = html; $('drawer-mask').classList.remove('hidden'); requestAnimationFrame(() => $('drawer').classList.remove('translate-x-full')); }
function closeDrawer() { $('drawer').classList.add('translate-x-full'); $('drawer-mask').classList.add('hidden'); }
function openModal(title, html) { $('modal-title').textContent = title; $('modal-body').innerHTML = html; $('modal-mask').classList.remove('hidden'); $('modal').classList.remove('hidden'); }
function closeModal() { $('modal-mask').classList.add('hidden'); $('modal').classList.add('hidden'); }

/* ---------- 端切换（带方向语义） ---------- */
function switchEnd(to) {
    if (to === state.end) return;
    const up = (state.end === 'user' && to === 'dev');
    $('dir-text').textContent = up ? '证据上行' : '契约下行';
    $('dir-sub').textContent = up ? 'User → Developer' : 'Developer → User';
    $('dir-icon').innerHTML = up
        ? '<path stroke-linecap="round" stroke-linejoin="round" d="M7 17L17 7M17 7H8M17 7v9"/>'
        : '<path stroke-linecap="round" stroke-linejoin="round" d="M7 7l10 10M17 7v9H8"/>';
    $('dir-icon').className = 'w-7 h-7 mx-auto mb-1.5 ' + (up ? 'text-amber-400' : 'text-indigo-400');
    const pill = $('dir-pill');
    pill.style.animation = 'none'; void pill.offsetWidth;
    pill.classList.add('dir-in');
    setTimeout(() => pill.classList.remove('dir-in'), 950);

    state.end = to;
    $('tab-user').className = 'press px-4 py-1.5 rounded-md text-[13px] font-semibold ' + (to === 'user' ? 'text-white bg-indigo-600' : 'text-slate-300');
    $('tab-dev').className = 'press px-4 py-1.5 rounded-md text-[13px] font-semibold ' + (to === 'dev' ? 'text-white bg-indigo-600' : 'text-slate-300');
    if (to === 'user') triggerRevalidation();
    render();
}

function switchSubTab(id) {
    state.subTabs[state.end] = id;
    render();
}

/* ---------- 渲染：子 tab + 视图 ---------- */
function render() {
    updateGcvBadge();
    const tabs = SUB_TABS[state.end];
    $('sub-tabs').innerHTML = tabs.map(t =>
        `<button class="subtab press flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-semibold ${state.subTabs[state.end] === t.id ? 'active' : 'text-slate-500'}" data-tab="${t.id}">${ICONS[t.icon]}${t.label}</button>`
    ).join('');
    document.querySelectorAll('#sub-tabs .subtab').forEach(b => b.addEventListener('click', () => switchSubTab(b.dataset.tab)));

    const view = $('view');
    const v = state.end === 'user' ? renderUserView(state.subTabs.user) : renderDevView(state.subTabs.dev);
    view.innerHTML = `<div class="view-fade h-full">${v}</div>`;
    afterRender(state.end, state.subTabs[state.end]);
}

/* ============================================================
   用户端视图
   ============================================================ */
function renderUserView(tab) {
    switch (tab) {
        case 'skills': return viewUserSkills();
        case 'contract': return viewUserContract();
        case 'records': return viewUserRecords();
        default: return viewUserWorkbench();
    }
}

function viewUserWorkbench() {
    const chips = SCENARIOS.map(sc => `<button class="chip press text-[12px] px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 font-medium" data-id="${sc.id}">${sc.label}</button>`).join('');
    const chipsBlock = `
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <button id="chip-toggle" class="press flex items-center gap-1 text-[12px] font-bold text-slate-600 hover:text-indigo-600">
                任务场景 <span class="text-slate-400 font-normal">(${SCENARIOS.length})</span>
                <svg id="chip-chev" class="w-3.5 h-3.5 transition-transform ${state.chipsCollapsed ? '' : 'rotate-180'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
            </button>
            ${state.chipsCollapsed ? '<span class="text-[11px] text-slate-400">点击展开</span>' : '<span class="text-[11px] text-slate-400">运行后自动收起</span>'}
        </div>
        <div id="chips-body" class="${state.chipsCollapsed ? 'hidden' : ''} flex flex-wrap gap-1.5 mt-1.5">${chips}</div>`;

    const empty = `<div class="text-center py-16 text-slate-400">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center mb-3"><svg class="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>
        <p class="text-[15px] font-semibold text-slate-500">发起一个任务开始</p>
        <p class="text-[13px] mt-1">展开任务场景选择预置任务，或直接输入，观察技能运行与治理的逐步计算</p></div>`;

    // 聚焦运行：全宽大屏展示执行过程
    if (state.focus) {
        const runs = state.runs.length ? state.runs.map(r => runCardHTML(r.task, r.stages, r.type, r.done, r.t, true)).join('') : empty;
        return `<div class="h-full flex flex-col">
            <div class="shrink-0 px-5 py-3 border-b border-slate-100 bg-white">
                <div class="flex items-center gap-2">
                    <input id="task-input" type="text" placeholder="描述任务，回车运行…" autocomplete="off" class="flex-1 h-11 px-4 text-[15px] rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none bg-slate-50">
                    <button id="task-send" class="press h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-semibold flex items-center gap-1.5">${ICONS.run}运行</button>
                    <button id="focus-toggle" class="press h-11 px-4 rounded-xl border border-slate-300 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 flex items-center gap-1.5">${ICONS.box}显示侧栏</button>
                </div>
                ${chipsBlock}
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto scroll-thin px-5 py-4 space-y-4 bg-slate-50/40" id="run-stream">${runs}</div>
        </div>`;
    }

    // 三栏（默认）
    const runs = state.runs.length ? state.runs.map(r => runCardHTML(r.task, r.stages, r.type, r.done, r.t, false)).join('') : empty;
    return `
    <div class="h-full grid grid-cols-[220px_1fr_260px]">
        <aside class="border-r border-slate-100 flex flex-col bg-white">
            <div class="p-3 border-b border-slate-100">
                <div class="flex items-center gap-2.5 mb-2">
                    <div class="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[15px]">林</div>
                    <div class="leading-tight"><p class="text-[14px] font-bold text-slate-800">林晓</p><p class="text-[11px] text-slate-400">我的智能工作台</p></div>
                </div>
                <div class="flex flex-wrap gap-1">
                    <span class="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2 py-0.5">权限: 财报只读</span>
                    <span class="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">资源: 内部数据源</span>
                </div>
            </div>
            <div class="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <p class="text-[13px] font-bold text-slate-700">已加载技能</p>
                <span class="text-[11px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 mono" id="skill-count">${state.loadedSkills.size}</span>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto scroll-thin p-2 space-y-1">
                ${[...state.loadedSkills].map(id => skillRow(id)).join('')}
            </div>
        </aside>
        <section class="flex flex-col bg-white min-w-0">
            <div class="px-4 py-2.5 border-b border-slate-100">
                <p class="text-[13px] font-bold text-slate-800 mb-2">发起任务</p>
                <div class="flex gap-2">
                    <input id="task-input" type="text" placeholder="描述任务，回车运行…" autocomplete="off" class="flex-1 h-10 px-3 text-[14px] rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none bg-slate-50">
                    <button id="task-send" class="press h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[14px] font-semibold flex items-center gap-1.5">${ICONS.run}运行</button>
                    <button id="focus-toggle" class="press h-10 px-3 rounded-xl border border-slate-300 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 flex items-center gap-1.5">${ICONS.box}聚焦</button>
                </div>
                ${chipsBlock}
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto scroll-thin px-4 py-3 space-y-3 bg-slate-50/40" id="run-stream">${runs}</div>
        </section>
        <aside class="border-l border-slate-100 flex flex-col bg-white">
            <div class="px-3 py-2 border-b border-slate-100 flex items-center gap-1.5">
                ${ICONS.shield.replace('w-3.5 h-3.5','w-3.5 h-3.5 text-emerald-500')}
                <p class="text-[13px] font-bold text-slate-700">有效契约 GC_eff</p>
            </div>
            <div class="p-2.5 space-y-2 border-b border-slate-100" id="contract-panel">${contractPanelHTML()}</div>
            <div class="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <p class="text-[13px] font-bold text-slate-700">治理事件流</p>
                <span id="ev-count" class="text-[11px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">${state.events.length}</span>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto scroll-thin p-2 space-y-1.5" id="event-stream">${eventsHTML()}</div>
        </aside>
    </div>`;
}

function skillRow(id) {
    const s = skill(id);
    return `<button class="hit w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 text-left" onclick="skillDetail('${s.id}')">
        <span class="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
        <div class="min-w-0 flex-1"><p class="text-[12.5px] font-semibold text-slate-700 mono truncate">${s.name}</p><p class="text-[11px] text-slate-400 truncate">${s.cn} · ${s.ver}</p></div>
    </button>`;
}

function contractPanelHTML() {
    const rows = [];
    rows.push(`<div class="border border-red-200 bg-red-50 rounded-lg px-2.5 py-1.5"><div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span><p class="text-[12px] font-bold text-red-700">GlobalInvariant</p></div><p class="text-[11px] text-slate-600 mt-0.5 mono">官方财报数据只读，不可放宽</p></div>`);
    if (state.gcv >= 2) rows.push(`<div class="border border-indigo-200 bg-indigo-50 rounded-lg px-2.5 py-1.5"><div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span><p class="text-[12px] font-bold text-indigo-700">GlobalDefault</p></div><p class="text-[11px] text-slate-600 mt-0.5 mono">official_filing ⇒ ir-search</p></div>`);
    if (state.localRefinementFormed) {
        rows.push(`<div class="border border-amber-200 bg-amber-50 rounded-lg px-2.5 py-1.5"><div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span><p class="text-[12px] font-bold text-amber-700">LocalRefinement</p></div><p class="text-[11px] text-slate-600 mt-0.5 mono">${state.gcv >= 2 ? 'internal-filing 优先内部源' : 'official_filing ⇒ ir-search'}</p></div>`);
    } else {
        rows.push(`<div class="border border-dashed border-slate-200 rounded-lg px-2.5 py-2 text-[11px] text-slate-400">尚未形成局部治理规则</div>`);
    }
    return rows.join('');
}

function eventsHTML() {
    if (!state.events.length) return `<p class="text-[11px] text-slate-400 text-center py-6">暂无治理事件</p>`;
    return state.events.map(e => {
        const c = { n:'#64748b', w:'#f59e0b', g:'#6366f1', o:'#10b981', u:'#0ea5e9', d:'#8b5cf6', r:'#ef4444' }[e.tone] || '#64748b';
        const tc = { n:'text-slate-600', w:'text-amber-700', g:'text-indigo-700', o:'text-emerald-700', u:'text-sky-700', d:'text-violet-700', r:'text-red-700' }[e.tone] || 'text-slate-600';
        return `<div class="hit flex gap-2 px-1 py-1.5 rounded-lg hover:bg-slate-50" onclick="eventDetail(${state.events.indexOf(e)})">
            <span class="w-2 h-2 rounded-full mt-1.5 shrink-0" style="background:${c}"></span>
            <div class="min-w-0 leading-tight"><div class="flex items-center gap-1.5"><p class="text-[12px] font-semibold ${tc}">${e.title}</p><span class="text-[9px] text-slate-300 mono ml-auto">${e.t}</span></div>
            ${e.detail ? `<p class="text-[11px] text-slate-500 mt-0.5 truncate">${e.detail}</p>` : ''}</div>
        </div>`;
    }).join('');
}

/* 我的技能 */
function viewUserSkills() {
    return `<div class="h-full overflow-y-auto scroll-thin p-5">
        <div class="max-w-3xl mx-auto">
            <div class="flex items-center justify-between mb-4">
                <div><h2 class="text-[18px] font-bold text-slate-800">我的技能</h2><p class="text-[12px] text-slate-400 mt-0.5">管理当前 Agent 已加载的技能，可随时加载/卸载</p></div>
                <span class="text-[12px] bg-slate-100 text-slate-500 rounded-full px-3 py-1">已加载 ${state.loadedSkills.size} / ${SKILLS.length}</span>
            </div>
            <div class="grid grid-cols-2 gap-2.5">
                ${SKILLS.map(s => {
                    const loaded = state.loadedSkills.has(s.id);
                    return `<div class="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg ${loaded ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'} flex items-center justify-center font-bold text-[13px]">${s.name.slice(0,1).toUpperCase()}</div>
                        <div class="min-w-0 flex-1">
                            <p class="text-[13px] font-bold text-slate-800 mono truncate">${s.name}</p>
                            <p class="text-[11px] text-slate-400 truncate">${s.cn} · ${s.ver}</p>
                        </div>
                        <button class="press text-[11px] font-semibold px-3 py-1.5 rounded-lg ${loaded ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}" onclick="toggleSkill('${s.id}')">${loaded ? '已加载' : '加载'}</button>
                        <button class="hit text-[11px] text-indigo-500 px-2 py-1.5 rounded-lg hover:bg-indigo-50" onclick="skillDetail('${s.id}')">详情</button>
                    </div>`;
                }).join('')}
            </div>
        </div>
    </div>`;
}

/* 有效契约 */
function viewUserContract() {
    const localState = !state.localRefinementFormed ? '未形成' : (state.gcv >= 2 ? 'ActiveRefinement' : 'Active');
    return `<div class="h-full overflow-y-auto scroll-thin p-5">
        <div class="max-w-3xl mx-auto space-y-4">
            <div><h2 class="text-[18px] font-bold text-slate-800">有效治理契约 GC_eff</h2>
            <p class="text-[12px] text-slate-400 mt-0.5 mono">GC_eff = GlobalInvariant ∧ Resolve(GlobalDefault, LocalRefinement)</p></div>
            <div class="grid grid-cols-3 gap-3">
                <div class="bg-white border border-red-200 rounded-xl p-4"><div class="flex items-center gap-2 mb-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500"></span><p class="font-bold text-red-700 text-[14px]">GlobalInvariant</p></div><p class="text-[12px] text-slate-600 leading-relaxed">全局不变量，不可放宽：权限上限、高风险资源互斥、安全隔离。<b class="text-red-600">OverridePermission=0</b>。</p></div>
                <div class="bg-white border border-indigo-200 rounded-xl p-4"><div class="flex items-center gap-2 mb-1.5"><span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span><p class="font-bold text-indigo-700 text-[14px]">GlobalDefault</p></div><p class="text-[12px] text-slate-600 leading-relaxed">全局默认规则，可被更具体上下文的局部规则细化覆盖。</p>${state.gcv >= 2 ? '<p class="text-[11px] mono text-indigo-600 mt-1.5">official_filing ⇒ ir-search</p>' : '<p class="text-[11px] text-slate-400 mt-1.5">暂无</p>'}</div>
                <div class="bg-white border border-amber-200 rounded-xl p-4"><div class="flex items-center gap-2 mb-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span><p class="font-bold text-amber-700 text-[14px]">LocalRefinement</p></div><p class="text-[12px] text-slate-600 leading-relaxed">针对用户特有权限/资源/任务的局部细化。</p><p class="text-[11px] mono text-amber-600 mt-1.5">${state.localRefinementFormed ? (state.gcv >= 2 ? 'internal-filing 优先内部源' : 'official_filing ⇒ ir-search') : '未形成'}</p></div>
            </div>
            ${lifecyclePanel(localState)}
        </div>
    </div>`;
}

/* 运行记录 */
function viewUserRecords() {
    const runs = state.runs.length ? state.runs.map((r, i) => `<div class="bg-white border border-slate-200 rounded-xl p-3 mb-2.5">
        <div class="flex items-center gap-2"><div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-[12px] font-bold">林</div>
        <div class="min-w-0 flex-1"><p class="text-[13px] font-semibold text-slate-800">${esc(r.task)}</p><p class="text-[11px] text-slate-400">${r.t} · ${r.type ? CONSTRAINT_META[r.type].label : '常规执行'}</p></div>
        <button class="hit text-[11px] text-indigo-500 px-2 py-1 rounded-lg hover:bg-indigo-50" onclick="runDetail(${i})">查看轨迹</button></div>
    </div>`).join('') : `<p class="text-[13px] text-slate-400 text-center py-10">暂无运行记录</p>`;

    return `<div class="h-full overflow-y-auto scroll-thin p-5">
        <div class="max-w-3xl mx-auto space-y-4">
            <div><h2 class="text-[18px] font-bold text-slate-800">运行记录</h2><p class="text-[12px] text-slate-400 mt-0.5">历史任务与治理事件、证据上报记录</p></div>
            <div>
                <p class="text-[13px] font-bold text-slate-700 mb-2">历史任务（${state.runs.length}）</p>
                ${runs}
            </div>
            <div>
                <p class="text-[13px] font-bold text-slate-700 mb-2">治理事件时间线</p>
                <div class="bg-white border border-slate-200 rounded-xl p-4">${state.events.length ? state.events.map(e => {
                    const c = { n:'#64748b', w:'#f59e0b', g:'#6366f1', o:'#10b981', u:'#0ea5e9', d:'#8b5cf6', r:'#ef4444' }[e.tone] || '#64748b';
                    return `<div class="flex gap-2.5 py-1.5 border-b border-slate-50 last:border-0"><span class="w-2 h-2 rounded-full mt-1.5 shrink-0" style="background:${c}"></span><div class="min-w-0"><p class="text-[12px] font-semibold text-slate-700">${e.title}</p>${e.detail ? `<p class="text-[11px] text-slate-500">${e.detail}</p>` : ''}</div><span class="text-[10px] text-slate-300 mono ml-auto">${e.t}</span></div>`;
                }).join('') : '<p class="text-[12px] text-slate-400">暂无事件</p>'}</div>
            </div>
        </div>
    </div>`;
}

/* ============================================================
   开发者端视图
   ============================================================ */
function renderDevView(tab) {
    switch (tab) {
        case 'library': return viewDevLibrary();
        case 'contract-editor': return viewDevContractEditor();
        case 'evidence': return viewDevEvidence();
        case 'history': return viewDevHistory();
        default: return viewDevWorkbench();
    }
}

function viewDevWorkbench() {
    return `<div class="h-full grid grid-cols-[220px_1fr_260px]">
        <aside class="border-r border-slate-100 flex flex-col bg-white">
            <div class="p-3 border-b border-slate-100">
                <div class="flex items-center gap-2.5"><div class="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-[15px]">王</div>
                <div class="leading-tight"><p class="text-[14px] font-bold text-slate-800">王工</p><p class="text-[11px] text-slate-400">技能生态维护者</p></div></div>
                <span class="inline-block mt-2 text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full px-2 py-0.5">全局作用域</span>
            </div>
            <div class="px-3 py-2 border-b border-slate-100 flex items-center justify-between"><p class="text-[13px] font-bold text-slate-700">共享技能库</p><span class="text-[11px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 mono">${SKILLS.length}</span></div>
            <div class="flex-1 min-h-0 overflow-y-auto scroll-thin p-2 space-y-1">${SKILLS.map(s => skillRow(s.id)).join('')}</div>
        </aside>
        <section class="flex flex-col bg-white min-w-0">
            <div class="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <div><p class="text-[14px] font-bold text-slate-800">全局治理候选</p><p class="text-[11px] text-slate-400">多用户运行证据聚合 · 确认后发布全局契约</p></div>
                <span id="cand-count" class="text-[11px] ${state.filingCandidateAdded && !state.filingPublished ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'} border rounded-full px-2 py-0.5 font-semibold">待处理 ${state.filingCandidateAdded && !state.filingPublished ? 1 : 0}</span>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto scroll-thin px-4 py-3 space-y-3 bg-slate-50/40" id="candidate-queue">${candidateQueueHTML()}</div>
        </section>
        <aside class="border-l border-slate-100 flex flex-col bg-white">
            <div class="px-3 py-2 border-b border-indigo-100 bg-indigo-50/60 flex items-center justify-between"><p class="text-[13px] font-bold text-indigo-800">全局契约 GC_G</p><span id="gcv-badge" class="text-[10px] mono bg-indigo-600 text-white rounded-full px-2 py-0.5">v${state.gcv}</span></div>
            <div class="p-2.5 space-y-2 border-b border-slate-100">${globalContractHTML()}</div>
            <div class="px-3 py-2 border-b border-slate-100"><p class="text-[13px] font-bold text-slate-700">发布历史</p></div>
            <div class="flex-1 min-h-0 overflow-y-auto scroll-thin p-2 space-y-1.5">${historyHTML()}</div>
        </aside>
    </div>`;
}

function candidateQueueHTML() {
    if (!state.filingCandidateAdded) {
        return `<div class="text-center py-14 text-slate-400"><svg class="w-12 h-12 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg><p class="text-[14px] font-semibold text-slate-500">暂无待处理候选</p><p class="text-[12px] mt-1">用户端运行证据聚合后会出现在这里</p></div>`;
    }
    if (state.filingPublished) {
        return `<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 fade-in"><div class="flex items-center gap-2"><svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><p class="text-[14px] font-bold text-emerald-800">Cluster_IR 已升级为全局规则并发布</p></div><p class="text-[12px] text-emerald-700 mt-1.5">official_filing ⇒ ir-search 已进入 GC_G^2，正向依赖该契约的用户端传播。</p></div>`;
    }
    return `<div class="bg-white border border-indigo-200 rounded-xl shadow-sm p-4 fade-in">
        <div class="flex items-start justify-between"><div><div class="flex items-center gap-2"><span class="text-[14px] font-bold text-slate-800">全局治理候选 · Cluster_IR</span><span class="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">路由不稳定</span></div><p class="text-[12px] text-slate-500 mt-0.5 mono">web-search × ir-search</p></div><span class="text-[11px] mono text-slate-400">${now()}</span></div>
        <div class="grid grid-cols-4 gap-2 mt-3">${[['3','独立用户'],['60%','用户覆盖'],['100%','结果一致'],['0.87','G_k≥0.70']].map(([v,l],i)=>`<div class="rounded-lg p-2 text-center ${i===3?'bg-amber-50':'bg-slate-50'}"><p class="text-[16px] font-bold ${i===3?'text-amber-600':'text-slate-700'} mono">${v}</p><p class="text-[10px] text-slate-400">${l}</p></div>`).join('')}</div>
        <div class="mt-3 bg-indigo-50/60 border border-indigo-100 rounded-lg px-3 py-2.5"><p class="text-[11px] font-bold text-indigo-700 mb-1">推荐治理动作</p><p class="text-[13px] text-slate-600 mono">official_filing ⇒ ir-search <span class="text-indigo-600">(Priority)</span></p></div>
        <div class="flex gap-2 mt-3">
            <button class="press flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold" onclick="approveFiling()">确认升级为全局规则</button>
            <button class="press px-3 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-[13px] font-semibold" onclick="rejectFiling()">拒绝</button>
            <button class="press px-3 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-[13px] font-semibold" onclick="evidenceDetail('Cluster_IR')">证据</button>
        </div>
    </div>`;
}

function globalContractHTML() {
    const rows = [`<div class="flex items-center gap-1.5 px-1"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span><p class="text-[12px] font-bold text-red-700">全局不变量</p></div><p class="text-[11px] text-slate-600 mono pl-3">official_filing: read-only · Override=0</p>`];
    if (state.defaults.length) {
        state.defaults.forEach(d => rows.push(`<div class="flex items-center gap-1.5 px-1 mt-2"><span class="w-1.5 h-1.5 rounded-full" style="background:${CONSTRAINT_META[d.type].color}"></span><p class="text-[12px] font-bold text-slate-700">${CONSTRAINT_META[d.type].label}</p></div><p class="text-[11px] text-slate-600 mono pl-3">${esc(d.subject)} ${esc(d.action)}</p>`));
    } else {
        rows.push(`<div class="mt-2 px-1 py-1.5 rounded bg-slate-50 border border-dashed border-slate-200 text-[11px] text-slate-400">暂无全局默认规则</div>`);
    }
    return rows.join('');
}

function historyHTML() {
    if (!state.history.length) return `<p class="text-[11px] text-slate-400 text-center py-6">暂无发布记录</p>`;
    return state.history.map(h => `<div class="border-l-2 border-indigo-300 pl-2.5 py-1"><p class="text-[11px] text-slate-600 leading-snug">${esc(h.text)}</p><p class="text-[9px] text-slate-400 mono">${h.t}</p></div>`).join('');
}

/* 技能库 */
function viewDevLibrary() {
    return `<div class="h-full overflow-y-auto scroll-thin p-5">
        <div class="max-w-4xl mx-auto space-y-4">
            <div class="flex items-center justify-between">
                <div><h2 class="text-[18px] font-bold text-slate-800">共享技能库</h2><p class="text-[12px] text-slate-400 mt-0.5">浏览、检索技能，查看技能执行契约与关系</p></div>
                <div class="flex gap-2"><input id="skill-search" type="text" placeholder="搜索技能…" class="h-9 px-3 text-[13px] rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none bg-white w-48"><button class="press h-9 px-3 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold" onclick="newSkill()">+ 新建技能</button></div>
            </div>
            <div id="skill-grid" class="grid grid-cols-3 gap-2.5">${skillGridHTML('')}</div>
            <div class="bg-white border border-slate-200 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2"><p class="text-[14px] font-bold text-slate-800">技能关系图</p><span class="text-[11px] text-slate-400">点击节点查看关联</span></div>
                <div id="rel-graph" class="w-full overflow-x-auto scroll-thin">${relationGraphSVG()}</div>
            </div>
        </div>
    </div>`;
}

function skillGridHTML(keyword) {
    const list = SKILLS.filter(s => !keyword || s.name.includes(keyword) || s.cn.includes(keyword) || s.tag.includes(keyword));
    if (!list.length) return `<p class="text-[13px] text-slate-400 col-span-3 text-center py-8">无匹配技能</p>`;
    return list.map(s => `<div class="bg-white border border-slate-200 rounded-xl p-3 hit" onclick="skillDetail('${s.id}')">
        <div class="flex items-center gap-2 mb-1.5"><div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[12px]">${s.name.slice(0,1).toUpperCase()}</div><div class="min-w-0"><p class="text-[12.5px] font-bold text-slate-800 mono truncate">${s.name}</p><p class="text-[10px] text-slate-400 mono">${s.ver}</p></div></div>
        <p class="text-[11px] text-slate-500 leading-snug line-clamp-2">${esc(s.desc)}</p>
        <span class="inline-block mt-1.5 text-[10px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">${s.tag}</span>
    </div>`).join('');
}

/* 契约管理（可视化编辑器） */
function viewDevContractEditor() {
    return `<div class="h-full overflow-y-auto scroll-thin p-5">
        <div class="max-w-4xl mx-auto space-y-4">
            <div class="flex items-center justify-between">
                <div><h2 class="text-[18px] font-bold text-slate-800">契约管理</h2><p class="text-[12px] text-slate-400 mt-0.5">可视化编辑全局治理契约，发布后沿依赖向用户端传播</p></div>
                <div class="flex gap-2"><span class="text-[12px] bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full px-3 py-1.5 mono">GC_G v${state.gcv}</span><button class="press px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold" onclick="publishContract()">发布新版本</button></div>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-red-500"></span><p class="text-[14px] font-bold text-slate-800">全局不变量（不可放宽）</p></div>
                <div class="p-4 space-y-2">${state.invariants.map(inv => `<div class="flex items-center gap-3 border border-red-200 bg-red-50/40 rounded-lg px-3 py-2.5"><div class="min-w-0 flex-1"><p class="text-[13px] font-bold text-slate-800">${esc(inv.name)}</p><p class="text-[11px] text-slate-500 mono">${esc(inv.detail)}</p></div><span class="text-[10px] bg-red-100 text-red-700 rounded-full px-2 py-0.5">不可覆盖</span></div>`).join('')}</div>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between"><div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-indigo-500"></span><p class="text-[14px] font-bold text-slate-800">全局默认规则</p></div><button class="press text-[12px] px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold" onclick="openAddRule()">+ 添加规则</button></div>
                <div class="p-4 space-y-2" id="rule-list">${state.defaults.length ? state.defaults.map(ruleHTML).join('') : '<p class="text-[12px] text-slate-400 text-center py-6">暂无默认规则，点击右上角添加</p>'}</div>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl p-4">
                <p class="text-[13px] font-bold text-slate-700 mb-2">约束类型（专利行为矩阵）</p>
                <div class="grid grid-cols-3 gap-2">${Object.entries(CONSTRAINT_META).map(([k, m]) => `<div class="border border-slate-100 rounded-lg px-2.5 py-2"><div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full" style="background:${m.color}"></span><p class="text-[12px] font-bold text-slate-700">${m.label}</p></div><p class="text-[11px] text-slate-500 mt-0.5">${m.desc}</p></div>`).join('')}</div>
            </div>
        </div>
    </div>`;
}

function ruleHTML(d) {
    const m = CONSTRAINT_META[d.type];
    return `<div class="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-2.5">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${m.color}"></span>
        <div class="min-w-0 flex-1">
            <p class="text-[13px] font-bold text-slate-800">${m.label} <span class="text-[11px] font-normal text-slate-400">${esc(d.predicate)}</span></p>
            <p class="text-[11px] text-slate-500 mono">${esc(d.subject)} ${esc(d.action)}</p>
        </div>
        <button class="hit text-[11px] text-slate-500 px-2 py-1 rounded-lg hover:bg-slate-100" onclick="editRule('${d.id}')">编辑</button>
        <button class="hit text-[11px] text-red-500 px-2 py-1 rounded-lg hover:bg-red-50" onclick="deleteRule('${d.id}')">删除</button>
    </div>`;
}

/* 证据看板 */
function viewDevEvidence() {
    return `<div class="h-full overflow-y-auto scroll-thin p-5">
        <div class="max-w-4xl mx-auto space-y-4">
            <div><h2 class="text-[18px] font-bold text-slate-800">证据看板</h2><p class="text-[12px] text-slate-400 mt-0.5">跨用户运行证据聚类与全局升级评分 G_k = αF + βC + γR + δQ</p></div>
            <div class="grid grid-cols-2 gap-3">
                ${state.clusters.map(c => clusterCardHTML(c)).join('')}
            </div>
            <div class="bg-white border border-slate-200 rounded-xl p-4">
                <p class="text-[14px] font-bold text-slate-800 mb-3">升级评分 G_k 对比</p>
                ${evidenceChartSVG()}
            </div>
        </div>
    </div>`;
}

function clusterCardHTML(c) {
    const published = c.status === 'published';
    const st = published ? '<span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">已发布全局</span>' : (c.status === 'pending' ? '<span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">待审批</span>' : '<span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">局部事项</span>');
    return `<div class="bg-white border border-slate-200 rounded-xl p-3.5 hit" onclick="evidenceDetail('${c.id}')">
        <div class="flex items-center justify-between mb-1.5"><p class="text-[13px] font-bold text-slate-800 mono">${c.id}</p>${st}</div>
        <p class="text-[11px] text-slate-500 mono">${c.pair}</p>
        <p class="text-[11px] text-slate-400 mt-0.5">${c.type}</p>
        <div class="grid grid-cols-4 gap-1.5 mt-2.5">${[['F',c.F],['C',(c.C*100)+'%'],['R',(c.R*100)+'%'],['G',c.G.toFixed(2)]].map(([k,v])=>`<div class="bg-slate-50 rounded-lg p-1.5 text-center"><p class="text-[14px] font-bold text-slate-700 mono">${v}</p><p class="text-[9px] text-slate-400">${k}</p></div>`).join('')}</div>
    </div>`;
}

/* 治理历史 */
function viewDevHistory() {
    return `<div class="h-full overflow-y-auto scroll-thin p-5">
        <div class="max-w-4xl mx-auto space-y-4">
            <div><h2 class="text-[18px] font-bold text-slate-800">治理历史</h2><p class="text-[12px] text-slate-400 mt-0.5">发布历史、契约生命周期与审计记录</p></div>
            <div class="bg-white border border-slate-200 rounded-xl p-4">
                <p class="text-[14px] font-bold text-slate-800 mb-3">契约生命周期状态机</p>
                ${lifecycleMachineHTML()}
            </div>
            <div class="bg-white border border-slate-200 rounded-xl p-4">
                <p class="text-[14px] font-bold text-slate-800 mb-2">发布历史</p>
                ${state.history.length ? state.history.map(h => `<div class="border-l-2 border-indigo-300 pl-3 py-1.5"><p class="text-[12px] text-slate-600">${esc(h.text)}</p><p class="text-[10px] text-slate-400 mono">${h.t}</p></div>`).join('') : '<p class="text-[12px] text-slate-400">暂无记录</p>'}
            </div>
        </div>
    </div>`;
}

/* ---------- 生命周期状态机 ---------- */
function lifecyclePanel(current) {
    const states = ['Candidate','Active','Stale','Revalidating'];
    const terminals = ['Retired','ActiveRefinement','Conflict'];
    return `<div class="bg-white border border-slate-200 rounded-xl p-4">
        <p class="text-[14px] font-bold text-slate-800 mb-3">局部契约生命周期</p>
        <div class="flex flex-wrap items-center gap-2 text-[12px] font-bold">
            ${states.map((s, i) => `<span class="life-dot px-3 py-1.5 rounded-lg ${s === current ? 'bg-indigo-600 text-white on' : (states.indexOf(current) > i || s === 'Active' && current !== '未形成' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400')}">${s}</span>${i < states.length - 1 ? '<svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>' : ''}`).join('')}
        </div>
        <div class="flex flex-wrap items-center gap-2 text-[12px] font-bold mt-3">
            <span class="text-slate-400">终态 →</span>
            ${terminals.map(t => `<span class="px-3 py-1.5 rounded-lg ${t === current ? 'bg-amber-500 text-white' : (t === 'Retired' ? 'bg-slate-200 text-slate-600' : t === 'ActiveRefinement' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}">${t}</span>`).join('')}
        </div>
        <p class="text-[11px] text-slate-400 mt-3">当前局部契约状态：<b class="text-slate-600">${current}</b></p>
    </div>`;
}

function lifecycleMachineHTML() {
    const flow = ['Candidate','Verified','Active','Stale','Revalidating'];
    const ends = ['Retired','ActiveRefinement','Conflict','RolledBack'];
    return `<div class="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
        ${flow.map((s, i) => `<span class="px-2.5 py-1 rounded-lg ${i === 0 ? 'bg-slate-100 text-slate-500' : i <= 2 ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}">${s}</span>${i < flow.length - 1 ? '<span class="text-slate-300">→</span>' : ''}`).join('')}
        <span class="text-slate-300 mx-1">→</span>
        ${ends.map(t => `<span class="px-2.5 py-1 rounded-lg ${t === 'Retired' ? 'bg-slate-200 text-slate-600' : t === 'ActiveRefinement' ? 'bg-amber-100 text-amber-700' : t === 'Conflict' ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-700'}">${t}</span>`).join('<span class="text-slate-300">/</span>')}
    </div>`;
}

/* ---------- 技能关系图（SVG） ---------- */
function relationGraphSVG() {
    const nodes = ['web-search','ir-search','internal-filing','internal-knowledge','ocr-skill','pdf-analyzer','bank-account-sync','portfolio-analyzer','stock-price-query','report-exporter','cache-market','service-restart','config-hot-reload'];
    const W = 880, H = 300, cx = W / 2, cy = H / 2, rx = W / 2 - 70, ry = H / 2 - 40;
    const pos = {};
    nodes.forEach((id, i) => { const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2; pos[id] = { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }; });
    const edges = RELATIONS.map(r => { const a = pos[r.from], b = pos[r.to]; const m = REL_TYPE_META[r.type]; return `<line class="rel-edge" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${m.color}" stroke-width="1.5" opacity=".55" data-type="${r.type}"/>`; }).join('');
    const nodeEls = nodes.map(id => { const p = pos[id]; return `<g class="rel-node" data-id="${id}" transform="translate(${p.x},${p.y})" onclick="relNodeClick('${id}')">
        <circle r="16" fill="${state.loadedSkills.has(id) ? '#eef2ff' : '#f8fafc'}" stroke="#cbd5e1"/>
        <text text-anchor="middle" dy="4" font-size="9" fill="#334155" font-weight="600">${id.slice(0,2).toUpperCase()}</text>
    </g>`; }).join('');
    const legend = Object.entries(REL_TYPE_META).map(([k, m]) => `<span class="inline-flex items-center gap-1 text-[10px] text-slate-500 mr-2"><span class="w-2 h-2 rounded-full" style="background:${m.color}"></span>${m.label}</span>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="w-full" style="min-width:640px">${edges}${nodeEls}</svg><div class="mt-2">${legend}</div>`;
}

/* ---------- 证据评分图表（SVG） ---------- */
function evidenceChartSVG() {
    const W = 720, H = 180, max = 1;
    const bars = state.clusters.map((c, i) => {
        const bw = 60, gap = 90, x = 40 + i * (bw + gap);
        const h = (c.G / max) * 120;
        const y = H - 40 - h;
        const col = c.status === 'published' ? '#10b981' : (c.status === 'pending' ? '#f59e0b' : '#6366f1');
        return `<g class="bar-grow" style="animation-delay:${i * 0.1}s">
            <rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="6" fill="${col}" opacity=".85"/>
            <text x="${x + bw / 2}" y="${y - 6}" text-anchor="middle" font-size="12" font-weight="700" fill="#334155">${c.G.toFixed(2)}</text>
            <text x="${x + bw / 2}" y="${H - 20}" text-anchor="middle" font-size="9" fill="#64748b">${c.id.replace('Cluster_','')}</text>
        </g>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="w-full"><line x1="30" y1="${H - 40}" x2="${W - 20}" y2="${H - 40}" stroke="#e2e8f0" stroke-width="1"/>${bars}<text x="30" y="${H - 40 - 125}" font-size="9" fill="#94a3b8">τ_G = 0.70（升级阈值）</text><line x1="30" y1="${H - 40 - 0.7 * 120}" x2="${W - 20}" y2="${H - 40 - 0.7 * 120}" stroke="#ef4444" stroke-width="1" stroke-dasharray="4 4"/></svg>`;
}

/* ============================================================
   交互逻辑
   ============================================================ */
function runScenario(id) {
    const sc = SCENARIOS.find(x => x.id === id);
    if (!sc) return;
    const run = { task: sc.label, stages: sc.stages, type: sc.type, t: now(), done: false };
    state.runs.unshift(run);
    state.chipsCollapsed = true;
    state.focus = true;
    pushEvent('n', '任务已发起', sc.label);
    sc.stages.forEach(s => {
        if (s.tone === 'w') pushEvent('w', '检测到技能关系异常', s.text.replace('检测到', '').trim());
        if (s.tone === 'g') pushEvent('g', '已应用治理规则', CONSTRAINT_META[sc.type].label);
        if (s.tone === 'u') pushEvent('u', '运行证据已上报', 'LE_i → 治理中心');
        if (s.tone === 'r') pushEvent('r', '任务被拦截', '全局不变量约束生效');
    });
    if (sc.id === 'filing' && !state.localRefinementFormed) { state.localRefinementFormed = true; }
    if (sc.crossEnd && !state.filingCandidateAdded) {
        state.filingCandidateAdded = true;
        state.clusters[0].status = 'pending';
        $('notif-dot') && $('notif-dot').classList.remove('hidden');
    }
    render();
    animateLatestRun();
}

function runCardHTML(task, stages, type, done, t, big) {
    const cm = type ? CONSTRAINT_META[type] : null;
    const dot = big ? 'w-[24px] h-[24px]' : 'w-[18px] h-[18px]';
    const chk = big ? 'w-3 h-3' : 'w-2.5 h-2.5';
    const stepTxt = big ? 'text-[15px]' : 'text-[12px]';
    const descTxt = big ? 'text-[15px]' : 'text-[13px]';
    const pad = big ? 'px-4 py-3' : 'px-3 py-2';
    const pl = big ? 'pl-11' : 'pl-7';
    const leftLine = big ? 'left-[11px]' : 'left-[8px]';
    const titleTxt = big ? 'text-[17px]' : 'text-[14px]';
    const stageHtml = stages.map((s, i) => {
        const tone = TONE[s.tone];
        const last = i === stages.length - 1;
        return `<div class="stage-item ${done ? '' : 'stage-hidden'} relative ${pl} ${last ? '' : (big ? 'pb-3.5' : 'pb-2.5')}" data-i="${i}">
            ${last ? '' : `<span class="absolute ${leftLine} top-6 bottom-0 w-px bg-slate-200"></span>`}
            <span class="stage-spinner ${done ? 'hidden' : ''} absolute left-0 ${big ? 'top-1.5' : 'top-1.5'} ${dot} border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
            <span class="stage-done absolute left-0 top-1.5 ${dot} rounded-full ${tone.dot} ${done ? 'flex' : 'hidden'} items-center justify-center ${s.flicker ? 'route-flicker' : ''}">
                <svg class="${chk} text-white" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            </span>
            <div class="${tone.bg} rounded-lg ${pad} hit" onclick="stageDetail(this)">
                <div class="flex items-center gap-2"><span class="${stepTxt} font-bold ${tone.txt}">${s.step}</span>${(s.tone === 'g' && cm) ? `<span class="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style="background:${cm.color}">${cm.label}</span>` : ''}<span class="stage-state ${big ? 'text-[12px]' : 'text-[10px]'} ${done ? 'text-emerald-500' : 'text-slate-400'} mono ml-auto">${done ? '完成' : '等待中'}</span></div>
                <p class="${descTxt} text-slate-600 mt-1 leading-snug">${s.text}</p>
            </div>
        </div>`;
    }).join('');
    return `<div class="bg-white rounded-xl border border-slate-200 shadow-sm fade-in overflow-hidden" data-run="${esc(task)}">
        <div class="${big ? 'px-4 pt-3 pb-2' : 'px-3 pt-2.5 pb-1.5'} flex items-center gap-3 border-b border-slate-100">
            <div class="${big ? 'w-9 h-9 text-[15px]' : 'w-7 h-7 text-[13px]'} rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">林</div>
            <div class="min-w-0 flex-1 leading-tight"><p class="text-[12px] text-slate-400">林晓 · ${t || now()}</p><p class="${titleTxt} font-semibold text-slate-800">${esc(task)}</p></div>
            ${cm ? `<span class="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style="background:${cm.color}">${cm.label}</span>` : ''}
            <span class="run-status shrink-0 ${big ? 'text-[12px]' : 'text-[11px]'} ${done ? 'text-emerald-600' : 'text-indigo-500'}">${done ? '执行完成' : '执行中'}</span>
        </div>
        <div class="${big ? 'px-4 py-4' : 'px-3 py-3'}">${stageHtml}</div>
    </div>`;
}

const TONE = {
    n: { dot:'bg-slate-400', txt:'text-slate-700', bg:'bg-slate-100' },
    w: { dot:'bg-amber-500', txt:'text-amber-700', bg:'bg-amber-50' },
    g: { dot:'bg-indigo-500', txt:'text-indigo-700', bg:'bg-indigo-50' },
    o: { dot:'bg-emerald-500', txt:'text-emerald-700', bg:'bg-emerald-50' },
    u: { dot:'bg-sky-500', txt:'text-sky-700', bg:'bg-sky-50' },
    r: { dot:'bg-red-500', txt:'text-red-700', bg:'bg-red-50' },
};

function animateLatestRun() {
    const card = document.querySelector('#run-stream .fade-in');
    if (!card) return;
    const items = card.querySelectorAll('.stage-item');
    items.forEach((item, i) => {
        setTimeout(() => {
            item.classList.remove('stage-hidden');
            const spinner = item.querySelector('.stage-spinner');
            const done = item.querySelector('.stage-done');
            const stateEl = item.querySelector('.stage-state');
            spinner.classList.remove('hidden');
            if (stateEl) { stateEl.textContent = '计算中'; stateEl.className = 'stage-state text-[10px] text-indigo-400 mono ml-auto run-pulse'; }
            setTimeout(() => {
                spinner.classList.add('hidden');
                done.classList.remove('hidden'); done.classList.add('flex');
                if (stateEl) { stateEl.textContent = '完成'; stateEl.className = 'stage-state text-[10px] text-emerald-500 mono ml-auto'; }
            }, 500);
        }, i * 750);
    });
    setTimeout(() => {
        const rs = card.querySelector('.run-status');
        if (rs) rs.innerHTML = '<svg class="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>执行完成';
        rs.className = 'run-status shrink-0 text-[11px] text-emerald-600';
        if (state.runs[0]) state.runs[0].done = true;
    }, items.length * 750 + 600);
}

function runGeneric(task) {
    const stages = [
        { step:'检索', tone:'n', text:'已从技能库检索到匹配技能' },
        { step:'路由', tone:'n', text:'路由至单一适用技能，无冲突' },
        { step:'执行', tone:'o', text:'任务执行完成' },
        { step:'结果', tone:'o', text:'未检测到技能关系异常' },
    ];
    state.runs.unshift({ task, stages, type: null, t: now(), done: false });
    state.chipsCollapsed = true;
    state.focus = true;
    pushEvent('n', '任务已发起', task);
    pushEvent('o', '执行完成', '未检测到技能关系冲突');
    render();
    animateLatestRun();
}

function pushEvent(tone, title, detail) {
    state.events.unshift({ tone, title, detail, t: now() });
}

/* 事件详情 */
function eventDetail(i) {
    const e = state.events[i];
    if (!e) return;
    openDrawer('治理事件', `<p class="text-[14px] font-semibold text-slate-800">${esc(e.title)}</p>
        <p class="text-[12px] text-slate-400 mono mt-1">${e.t}</p>
        ${e.detail ? `<p class="text-[13px] text-slate-600 mt-3 leading-relaxed">${esc(e.detail)}</p>` : ''}
        <div class="mt-4 p-3 bg-slate-50 rounded-xl"><p class="text-[11px] font-bold text-slate-500 mb-1">事件说明</p><p class="text-[12px] text-slate-500 leading-relaxed">治理引擎在智能体运行过程中产生的可审计事件，用于追踪技能关系治理与双端协同过程。</p></div>`);
}

/* 技能详情 */
function skillDetail(id) {
    const s = skill(id);
    if (!s) return;
    const rels = RELATIONS.filter(r => r.from === id || r.to === id);
    openDrawer('技能详情 · ' + s.name, `<div class="flex items-center gap-2 mb-3"><span class="text-[11px] bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5">${esc(s.tag)}</span><span class="text-[11px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 mono">${s.ver}</span></div>
        <p class="text-[15px] text-slate-800 font-bold">${esc(s.cn)}</p>
        <p class="text-[13px] text-slate-500 mt-1.5 leading-relaxed">${esc(s.desc)}</p>
        <div class="mt-4"><p class="text-[12px] font-bold text-slate-600 mb-2">技能执行契约 SC</p>
        <pre class="mono text-[12px] leading-relaxed bg-slate-900 text-emerald-400 rounded-xl p-3 overflow-x-auto">{
  "id": "${s.id}",
  "version": "${s.ver}",
  "category": "${s.tag}",
  "capability": "D",
  "trigger": "T",
  "precondition": "P",
  "resources": "R",
  "dependencies": "Dep",
  "permissions": "Perm"
}</pre></div>
        ${rels.length ? `<div class="mt-4"><p class="text-[12px] font-bold text-slate-600 mb-2">关联技能关系（${rels.length}）</p>${rels.map(r => { const other = skill(r.from === id ? r.to : r.from); const m = REL_TYPE_META[r.type]; return `<div class="flex items-center gap-2 py-1.5 border-b border-slate-50"><span class="w-2 h-2 rounded-full" style="background:${m.color}"></span><p class="text-[12px] text-slate-600">${m.label} · <span class="mono">${other.name}</span></p></div>`; }).join('')}</div>` : ''}`);
}

/* 运行详情 */
function runDetail(i) {
    const r = state.runs[i];
    if (!r) return;
    openDrawer('运行轨迹 · ' + r.task, `<div class="space-y-2">${r.stages.map((s, j) => { const t = TONE[s.tone]; return `<div class="flex gap-2.5"><span class="w-5 h-5 rounded-full ${t.dot} flex items-center justify-center shrink-0 mt-0.5"><svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span><div><p class="text-[12px] font-bold ${t.txt}">${s.step}</p><p class="text-[12px] text-slate-600">${s.text}</p></div></div>`; }).join('')}</div>`);
}

/* 阶段详情 */
function stageDetail(el) {
    const txt = el.querySelector('p').innerText;
    const step = el.querySelector('span.font-bold').innerText;
    openDrawer('运行阶段 · ' + step, `<p class="text-[13px] text-slate-600 leading-relaxed">${esc(txt)}</p><div class="mt-4 p-3 bg-slate-50 rounded-xl"><p class="text-[11px] font-bold text-slate-500 mb-1.5">阶段说明</p><p class="text-[12px] text-slate-500 leading-relaxed">Agent 技能运行链路的一个阶段，治理引擎在此依据全局契约与局部细化规则约束技能的检索/路由/规划/执行。</p></div>`);
}

/* 技能加载/卸载 */
function toggleSkill(id) {
    if (state.loadedSkills.has(id)) state.loadedSkills.delete(id); else state.loadedSkills.add(id);
    render();
}

/* 技能搜索 */
function bindSkillSearch() {
    const inp = $('skill-search');
    if (inp) inp.addEventListener('input', () => { $('skill-grid').innerHTML = skillGridHTML(inp.value.trim()); });
}

/* 关系图节点 */
function relNodeClick(id) {
    const rels = RELATIONS.filter(r => r.from === id || r.to === id);
    const neighbors = new Set(rels.map(r => r.from === id ? r.to : r.from));
    document.querySelectorAll('.rel-node').forEach(g => {
        const nid = g.getAttribute('data-id');
        g.classList.toggle('highlight', nid === id || neighbors.has(nid));
    });
    openDrawer('技能关系 · ' + skill(id).name, rels.length ? rels.map(r => { const other = skill(r.from === id ? r.to : r.from); const m = REL_TYPE_META[r.type]; return `<div class="flex items-center gap-2.5 py-2 border-b border-slate-50"><span class="w-2.5 h-2.5 rounded-full" style="background:${m.color}"></span><div><p class="text-[13px] font-bold text-slate-700">${m.label}</p><p class="text-[11px] text-slate-500 mono">${r.from} ⇄ ${r.to} · ${other ? other.cn : ''}</p></div></div>`; }).join('') : '<p class="text-[12px] text-slate-400">无关联关系</p>');
}

/* 证据详情 */
function evidenceDetail(id) {
    const c = state.clusters.find(x => x.id === id);
    if (!c) return;
    openDrawer('证据聚类 · ' + c.id, `<p class="text-[13px] text-slate-600 mono mb-3">${c.pair} · ${c.type}</p>
        <div class="grid grid-cols-4 gap-2 mb-4">${[['重复频率 F', c.F], ['用户覆盖 C', (c.C*100)+'%'], ['结果一致 R', (c.R*100)+'%'], ['证据质量 Q', c.Q.toFixed(2)]].map(([l,v])=>`<div class="bg-slate-50 rounded-lg p-2 text-center"><p class="text-[16px] font-bold text-slate-700 mono">${v}</p><p class="text-[9px] text-slate-400">${l}</p></div>`).join('')}</div>
        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl"><p class="text-[12px] font-bold text-amber-700">升级评分 G_k = ${c.G.toFixed(2)} ${c.G >= 0.7 ? '≥ τ_G 0.70（满足升级条件）' : '< τ_G 0.70（保持局部）'}</p><p class="text-[11px] text-slate-500 mt-1">G_k = αF + βC + γR + δQ，用于判断局部问题是否具有跨用户普遍性。</p></div>`);
}

/* 审批 */
function approveFiling() {
    state.filingPublished = true;
    state.gcv = 2;
    state.clusters[0].status = 'published';
    state.defaults.push({ id: 'd' + Date.now(), type: 'Priority', subject: 'ir-search', predicate: 'official_filing', action: '优先于 web-search' });
    state.history.unshift({ text: '发布 GC_G^2 · 新增 official_filing ⇒ ir-search（Priority）', t: now() });
    $('notif-dot') && $('notif-dot').classList.add('hidden');
    render();
    setTimeout(() => {
        pushEvent('d', '全局契约 GC_G^2 已发布', '检测到 official_filing 路由规则变化');
        pushEvent('d', '局部规则 GC_L^A 依赖已变化', 'ParentContract GC_G^1 → GC_G^2');
        pushEvent('d', 'GC_L^A 状态迁移', 'Active → Stale → Revalidating');
        pushEvent('g', '重验证完成', '全局已覆盖；因含内部数据源，保留为局部细化');
        render();
    }, 700);
}
function rejectFiling() {
    state.filingCandidateAdded = false;
    state.clusters[0].status = 'local';
    state.history.unshift({ text: '已拒绝候选 Cluster_IR，保持为局部治理事项', t: now() });
    $('notif-dot') && $('notif-dot').classList.add('hidden');
    render();
}

/* 契约编辑器：规则增删改 */
function openAddRule() {
    const typeOptions = Object.entries(CONSTRAINT_META).map(([k, m]) => `<option value="${k}">${m.label}</option>`).join('');
    openModal('添加全局默认规则', `
        <div class="space-y-3">
            <div><label class="text-[12px] font-bold text-slate-600">约束类型</label><select id="rule-type" class="mt-1 w-full h-10 px-3 text-[13px] rounded-lg border border-slate-300 focus:border-indigo-500 outline-none">${typeOptions}</select></div>
            <div><label class="text-[12px] font-bold text-slate-600">主体技能（Subject）</label><select id="rule-subject" class="mt-1 w-full h-10 px-3 text-[13px] rounded-lg border border-slate-300 focus:border-indigo-500 outline-none">${SKILLS.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
            <div><label class="text-[12px] font-bold text-slate-600">生效条件（Predicate）</label><input id="rule-predicate" type="text" placeholder="如 official_filing" class="mt-1 w-full h-10 px-3 text-[13px] rounded-lg border border-slate-300 focus:border-indigo-500 outline-none"></div>
            <div><label class="text-[12px] font-bold text-slate-600">动作（Action）</label><input id="rule-action" type="text" placeholder="如 优先于 web-search" class="mt-1 w-full h-10 px-3 text-[13px] rounded-lg border border-slate-300 focus:border-indigo-500 outline-none"></div>
            <div class="flex gap-2 pt-2"><button class="press flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold" onclick="saveRule()">保存规则</button><button class="press px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-[13px]" onclick="closeModal()">取消</button></div>
        </div>`);
}
function saveRule() {
    const type = $('rule-type').value;
    const subject = skill($('rule-subject').value).name;
    const predicate = $('rule-predicate').value.trim() || '通用';
    const action = $('rule-action').value.trim() || CONSTRAINT_META[type].label;
    state.defaults.push({ id: 'd' + Date.now(), type, subject, predicate, action });
    closeModal();
    render();
    toast('已添加规则 ' + CONSTRAINT_META[type].label);
}
function editRule(id) {
    const d = state.defaults.find(x => x.id === id);
    if (!d) return;
    const typeOptions = Object.entries(CONSTRAINT_META).map(([k, m]) => `<option value="${k}" ${k === d.type ? 'selected' : ''}>${m.label}</option>`).join('');
    openModal('编辑规则', `<div class="space-y-3">
        <div><label class="text-[12px] font-bold text-slate-600">约束类型</label><select id="rule-type" class="mt-1 w-full h-10 px-3 text-[13px] rounded-lg border border-slate-300 outline-none">${typeOptions}</select></div>
        <div><label class="text-[12px] font-bold text-slate-600">生效条件</label><input id="rule-predicate" type="text" value="${esc(d.predicate)}" class="mt-1 w-full h-10 px-3 text-[13px] rounded-lg border border-slate-300 outline-none"></div>
        <div><label class="text-[12px] font-bold text-slate-600">动作</label><input id="rule-action" type="text" value="${esc(d.action)}" class="mt-1 w-full h-10 px-3 text-[13px] rounded-lg border border-slate-300 outline-none"></div>
        <div class="flex gap-2 pt-2"><button class="press flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold" onclick="updateRule('${d.id}')">保存</button><button class="press px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-[13px]" onclick="closeModal()">取消</button></div></div>`);
}
function updateRule(id) {
    const d = state.defaults.find(x => x.id === id);
    if (!d) return;
    d.type = $('rule-type').value;
    d.predicate = $('rule-predicate').value.trim() || '通用';
    d.action = $('rule-action').value.trim() || CONSTRAINT_META[d.type].label;
    closeModal(); render(); toast('规则已更新');
}
function deleteRule(id) {
    state.defaults = state.defaults.filter(x => x.id !== id);
    render(); toast('规则已删除');
}

/* 发布 */
function publishContract() {
    if (!state.defaults.length) { toast('请先添加至少一条默认规则'); return; }
    state.gcv++;
    state.history.unshift({ text: `发布 GC_G^${state.gcv} · 更新全局默认规则`, t: now() });
    pushEvent('d', `全局契约 GC_G^${state.gcv} 已发布`, '治理规则变化向用户端传播');
    render();
    toast(`已发布 GC_G^${state.gcv}`);
}

/* 新建技能 */
function newSkill() {
    openModal('新建技能', `<div class="space-y-3">
        <div><label class="text-[12px] font-bold text-slate-600">技能标识</label><input id="ns-id" type="text" placeholder="skill-name" class="mt-1 w-full h-10 px-3 text-[13px] rounded-lg border border-slate-300 outline-none mono"></div>
        <div><label class="text-[12px] font-bold text-slate-600">中文名</label><input id="ns-cn" type="text" placeholder="技能中文名" class="mt-1 w-full h-10 px-3 text-[13px] rounded-lg border border-slate-300 outline-none"></div>
        <div><label class="text-[12px] font-bold text-slate-600">分类</label><select id="ns-tag" class="mt-1 w-full h-10 px-3 text-[13px] rounded-lg border border-slate-300 outline-none"><option>搜索</option><option>金融</option><option>文档</option><option>私有</option><option>业务</option><option>运维</option><option>输出</option></select></div>
        <p class="text-[11px] text-slate-400">新建技能将触发开发者端治理，检测与共享技能库的关系。</p>
        <div class="flex gap-2 pt-2"><button class="press flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold" onclick="createSkill()">创建</button><button class="press px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-[13px]" onclick="closeModal()">取消</button></div></div>`);
}
function createSkill() {
    const id = $('ns-id').value.trim().replace(/\s+/g, '-');
    const cn = $('ns-cn').value.trim();
    if (!id || !cn) { toast('请填写技能标识与中文名'); return; }
    SKILLS.push({ id, name: id, cn, ver: 'v1.0', tag: $('ns-tag').value, desc: '新建技能，等待关系治理' });
    closeModal(); render(); toast('技能已创建，触发开发者端治理');
}

/* 通知 */
function openNotif() {
    const items = [];
    if (state.filingCandidateAdded && !state.filingPublished) items.push(['候选待审批', 'Cluster_IR 等待确认升级', '#f59e0b']);
    if (state.filingPublished) items.push(['契约已发布', `GC_G^${state.gcv} 已向用户端传播`, '#10b981']);
    openDrawer('通知', items.length ? items.map(([t, d, c]) => `<div class="flex gap-2.5 py-2.5 border-b border-slate-100"><span class="w-2 h-2 rounded-full mt-1.5 shrink-0" style="background:${c}"></span><div><p class="text-[13px] font-semibold text-slate-700">${t}</p><p class="text-[12px] text-slate-500">${d}</p></div></div>`).join('') : '<p class="text-[13px] text-slate-400 text-center py-10">暂无通知</p>');
}

/* 全局契约 diff */
function openGcvDiff() {
    openDrawer('全局契约版本', `<div class="flex items-center gap-2 mb-3"><span class="mono px-2 py-0.5 rounded bg-slate-100 text-slate-500">GC_G^1</span><svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg><span class="mono px-2 py-0.5 rounded ${state.gcv >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}">GC_G^${state.gcv}</span></div>
        ${state.gcv >= 2 ? '<p class="text-[13px] text-slate-600 leading-relaxed">本次演化新增全局默认规则，由用户端证据驱动，发布后沿治理契约依赖向用户端传播。</p>' : '<p class="text-[13px] text-slate-500 leading-relaxed">当前为初始契约 GC_G^1，尚无跨用户证据驱动的全局默认规则。</p>'}`);
}

/* 重验证（切回用户端时触发） */
function triggerRevalidation() {
    if (!state.filingPublished || state.revalidationShown) return;
    state.revalidationShown = true;
    pushEvent('d', '全局契约 GC_G^2 已发布', '检测到 official_filing 路由规则变化');
    pushEvent('d', '局部规则 GC_L^A 依赖已变化', 'ParentContract GC_G^1 → GC_G^2');
    pushEvent('d', 'GC_L^A 状态迁移', 'Active → Stale → Revalidating');
    pushEvent('g', '重验证完成', '全局已覆盖；因含内部数据源，保留为局部细化');
}

/* Toast */
let toastTimer = null;
function toast(msg) {
    let t = $('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl shadow-2xl z-[70] pop-in'; document.body.appendChild(t); }
    t.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), 2200);
}

/* ---------- 重置 ---------- */
function resetDemo() {
    state.end = 'user';
    state.subTabs = { user: 'workbench', dev: 'workbench' };
    state.gcv = 1;
    state.filingCandidateAdded = false;
    state.filingPublished = false;
    state.localRefinementFormed = false;
    state.revalidationShown = false;
    state.loadedSkills = new Set(MY_SKILL_IDS);
    state.events = [];
    state.runs = [];
    state.clusters = EVIDENCE_CLUSTERS.map(c => ({ ...c }));
    state.history = INITIAL_HISTORY.map(h => ({ ...h }));
    state.defaults = [];
    state.chipsCollapsed = false;
    state.focus = false;
    $('tab-user').className = 'press px-4 py-1.5 rounded-md text-[13px] font-semibold text-white bg-indigo-600';
    $('tab-dev').className = 'press px-4 py-1.5 rounded-md text-[13px] font-semibold text-slate-300';
    $('notif-dot') && $('notif-dot').classList.add('hidden');
    render();
    toast('已重置演示状态');
}

/* ---------- 渲染后绑定 ---------- */
function afterRender(end, tab) {
    if (end === 'user' && tab === 'workbench') {
        document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => runScenario(c.dataset.id)));
        const send = $('task-send'), inp = $('task-input');
        if (send) send.addEventListener('click', sendTask);
        if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') sendTask(); });
        const ct = $('chip-toggle');
        if (ct) ct.addEventListener('click', () => { state.chipsCollapsed = !state.chipsCollapsed; render(); });
        const ft = $('focus-toggle');
        if (ft) ft.addEventListener('click', () => { state.focus = !state.focus; render(); });
    }
    if (end === 'dev' && tab === 'library') bindSkillSearch();
    if (end === 'dev' && tab === 'workbench') { /* 候选按钮已在 HTML 中 inline onclick */ }
}

function sendTask() {
    const inp = $('task-input');
    const text = inp.value.trim();
    if (!text) return;
    const sc = SCENARIOS.find(s => s.keywords.some(k => text.includes(k)));
    if (sc) runScenario(sc.id); else runGeneric(text);
}

/* ---------- 初始化 ---------- */
function init() {
    $('tab-user').addEventListener('click', () => switchEnd('user'));
    $('tab-dev').addEventListener('click', () => switchEnd('dev'));
    $('hdr-gcv').addEventListener('click', openGcvDiff);
    $('hdr-notif').addEventListener('click', openNotif);
    $('btn-reset').addEventListener('click', resetDemo);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); closeModal(); } });
    pushEvent('n', '系统就绪', 'Agent 与治理引擎运行中');
    render();
}
init();
