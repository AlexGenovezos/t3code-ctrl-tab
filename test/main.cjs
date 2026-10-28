const { app, BrowserWindow, protocol } = require("electron");
protocol.registerSchemesAsPrivileged([{ scheme: "t3code", privileges: { standard: true, secure: true } }]);
const rows = [["env1:tA", "Alpha thread", "repo-a"], ["env1:tB", "Beta thread", "repo-b"], ["env2:tC", "Gamma <b>x</b>", "repo-c"]]
  .map(([k, t, p]) => `<li data-thread-item="${k}"><div role="button"><span class="sr-only">${t.replace(/</g,"&lt;")}</span><img class="size-4" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><span class="truncate text-xs">${p}</span></div></li>`).join("");
const html = `<!doctype html><html><head></head><body><ul>${rows}</ul><textarea id="ta"></textarea></body></html>`;
app.whenReady().then(() => {
  protocol.handle("t3code", () => new Response(html, { headers: { "content-type": "text/html" } }));
  new BrowserWindow({ width: 800, height: 600, show: true }).loadURL("t3code://app/index.html#/env1/tA");
});
