// Drives the mock app over CDP: visits threads, then exercises Ctrl+Tab.
const PORT = 9444;
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === "page" && t.url.startsWith("t3code:"));
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener("message", ({ data }) => { const m = JSON.parse(data); pending.get(m.id)?.(m); });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result.result.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CTRL = 2, SHIFT = 8;
const key = (type, k, code, vk, modifiers) => send("Input.dispatchKeyEvent", { type, key: k, code, windowsVirtualKeyCode: vk, modifiers });
const ctrlDown = () => key("rawKeyDown", "Control", "ControlLeft", 17, CTRL);
const ctrlUp = () => key("keyUp", "Control", "ControlLeft", 17, 0);
const tab = (mods = CTRL) => key("rawKeyDown", "Tab", "Tab", 9, mods).then(() => key("keyUp", "Tab", "Tab", 9, mods));
const overlay = () => ev(`[...document.querySelectorAll('.t3ct-row')].map(r => (r.hasAttribute('data-active') ? '>' : ' ') + r.querySelector('.t3ct-title').textContent).join('|') || null`);
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${JSON.stringify(got)}${ok ? "" : ` (want ${JSON.stringify(want)})`}`); if (!ok) process.exitCode = 1; };

await ev(`history.pushState(null, '', '#/env1/tB')`); await sleep(400);
await ev(`location.hash = '#/settings/general'`); await sleep(100);
await ev(`location.hash = '#/env2/tC'`); await sleep(400);
check("mru", await ev(`JSON.parse(localStorage.getItem('t3-ctrl-tab:mru'))`), ["env2:tC", "env1:tB", "env1:tA"]);

await ev(`document.getElementById('ta').focus()`);
await ctrlDown(); await tab();
check("open forward", await overlay(), " Gamma <b>x</b>|>Beta thread| Alpha thread");
await tab();
check("step forward", await overlay(), " Gamma <b>x</b>| Beta thread|>Alpha thread");
await ctrlUp(); await sleep(100);
check("commit", [await ev("location.hash"), await overlay()], ["#/env1/tA", null]);

await ctrlDown(); await tab(CTRL | SHIFT);
check("open reverse", await overlay(), " Alpha thread| Gamma <b>x</b>|>Beta thread");
await key("rawKeyDown", "Escape", "Escape", 27, CTRL);
await ctrlUp(); await sleep(100);
check("escape cancels", [await ev("location.hash"), await overlay()], ["#/env1/tA", null]);

await ctrlDown(); await tab(); await tab(); await ctrlUp(); await sleep(100);
check("double tap", await ev("location.hash"), "#/env1/tB");
check("icon cached", await ev(`JSON.parse(localStorage.getItem('t3-ctrl-tab:meta'))['env1:tA'].iconHtml.startsWith('<img')`), true);

await send("Page.reload"); await sleep(800);
check("survives reload", await ev("window.__t3CtrlTab === true"), true);
await ctrlDown(); await tab(); await ctrlUp(); await sleep(100);
check("after reload", await ev("location.hash"), "#/env1/tA");
ws.close();
