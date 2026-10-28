// Ctrl+Tab most-recently-used thread switcher for the T3 Code desktop renderer.
// Injected over CDP by inject.mjs; touches only the DOM and location.hash.
(() => {
  if (window.__t3CtrlTab) return;
  window.__t3CtrlTab = true;

  const MRU_KEY = "t3-ctrl-tab:mru";
  const META_KEY = "t3-ctrl-tab:meta";
  const MRU_LIMIT = 30;
  // First hash segments that are two-segment routes but not threads.
  const NON_THREAD_ROOTS = new Set(["settings", "draft", "projects"]);

  const load = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const save = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };

  let mru = load(MRU_KEY, []);
  // threadKey -> { title, project, iconHtml }; sidebar rows are virtualized, so cache on sight.
  const meta = load(META_KEY, {});

  const currentThreadKey = () => {
    const path = location.hash.replace(/^#/, "").split("?")[0];
    const parts = path.split("/").filter(Boolean);
    if (parts.length !== 2 || NON_THREAD_ROOTS.has(parts[0])) return null;
    return `${decodeURIComponent(parts[0])}:${decodeURIComponent(parts[1])}`;
  };

  const rowFor = (key) => document.querySelector(`li[data-thread-item="${CSS.escape(key)}"]`);

  const scrapeRow = (li) => {
    const key = li.getAttribute("data-thread-item");
    if (!key) return;
    const title = li.querySelector(".sr-only")?.textContent?.trim();
    if (!title) return;
    const icon = li.querySelector("img.size-4:not(.hidden), .size-4");
    const project = li.querySelector("span.truncate.text-xs")?.textContent?.trim();
    meta[key] = {
      title,
      project: project || meta[key]?.project || "",
      iconHtml: icon ? icon.outerHTML : meta[key]?.iconHtml || "",
    };
  };

  const scrapeAll = () => {
    document.querySelectorAll("li[data-thread-item]").forEach(scrapeRow);
    for (const key of Object.keys(meta)) if (!mru.includes(key)) delete meta[key];
    save(META_KEY, meta);
  };

  const recordVisit = () => {
    const key = currentThreadKey();
    if (key === null) return;
    if (mru[0] !== key) {
      mru = [key, ...mru.filter((k) => k !== key)].slice(0, MRU_LIMIT);
      save(MRU_KEY, mru);
    }
    // The row may render a frame after navigation.
    setTimeout(() => {
      const li = rowFor(key);
      if (li) {
        scrapeRow(li);
        save(META_KEY, meta);
      }
    }, 300);
  };

  const style = document.createElement("style");
  style.textContent = `
    .t3ct-root { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none;
      display: flex; flex-direction: column; align-items: center; padding: 96px 16px 0; }
    :where(.t3ct-panel) { background: var(--popover); }
    .t3ct-panel { width: 100%; max-width: 36rem; max-height: 420px; overflow-y: auto;
      margin: 0; padding: 8px; list-style: none; border: 1px solid var(--border);
      border-radius: 1rem; color: var(--foreground); box-shadow: 0 16px 48px rgb(0 0 0 / 0.25); }
    .t3ct-row { display: flex; align-items: center; gap: 8px; min-height: 32px;
      padding: 6px 8px; border-radius: 6px; font-size: 0.875rem; user-select: none; }
    .t3ct-row[data-active] { background: var(--accent); color: var(--accent-foreground); }
    .t3ct-icon { display: inline-flex; width: 16px; height: 16px; flex-shrink: 0;
      align-items: center; justify-content: center; }
    .t3ct-icon > * { width: 16px; height: 16px; }
    .t3ct-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .t3ct-title, .t3ct-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .t3ct-sub { font-size: 0.75rem; color: var(--muted-foreground); }
  `;

  let session = null; // { keys, index }
  let root = null;

  const escapeHtml = (s) =>
    s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  const render = () => {
    if (session === null) {
      root?.remove();
      root = null;
      return;
    }
    if (!style.isConnected) document.head.append(style);
    if (root === null) {
      root = document.createElement("div");
      root.className = "t3ct-root";
      document.body.append(root);
    }
    const current = currentThreadKey();
    const rows = session.keys.map((key, index) => {
      const m = meta[key] ?? { title: "Untitled thread", project: "", iconHtml: "" };
      const sub = [m.project, key === current ? "Current" : ""].filter(Boolean).join(" · ");
      return `<li class="t3ct-row"${index === session.index ? " data-active" : ""}>
        <span class="t3ct-icon">${m.iconHtml}</span>
        <span class="t3ct-text"><span class="t3ct-title">${escapeHtml(m.title)}</span>${
          sub ? `<span class="t3ct-sub">${escapeHtml(sub)}</span>` : ""
        }</span></li>`;
    });
    root.innerHTML = `<ul class="t3ct-panel dialog-glass" aria-label="Recent threads">${rows.join("")}</ul>`;
    root.querySelector("[data-active]")?.scrollIntoView({ block: "nearest" });
  };

  const close = () => {
    session = null;
    render();
  };

  // Settled threads render after the Settled shelf header, or not at all while it's collapsed,
  // so only rows above the header count. Null when the sidebar has no shelf to judge by.
  const unsettledThreadKeys = () => {
    const header = document.querySelector('[data-testid="sidebar-settled-header"]');
    if (!header) return null;
    const keys = new Set();
    for (const li of document.querySelectorAll("li[data-thread-item]")) {
      if (header.compareDocumentPosition(li) & Node.DOCUMENT_POSITION_PRECEDING) {
        keys.add(li.getAttribute("data-thread-item"));
      }
    }
    return keys;
  };

  const open = (direction) => {
    scrapeAll();
    const current = currentThreadKey();
    const unsettled = unsettledThreadKeys();
    const others = mru.filter((k) => k !== current && meta[k] && (!unsettled || unsettled.has(k)));
    if (others.length === 0) return;
    if (current === null) {
      session = { keys: others, index: direction === 1 ? 0 : others.length - 1 };
    } else {
      const keys = [current, ...others];
      session = { keys, index: (keys.length + direction) % keys.length };
    }
    render();
  };

  const step = (direction) => {
    const n = session.keys.length;
    session = { ...session, index: (session.index + direction + n) % n };
    render();
  };

  const commit = () => {
    const key = session?.keys[session.index];
    close();
    if (!key || key === currentThreadKey()) return;
    const sep = key.indexOf(":");
    location.hash = `#/${encodeURIComponent(key.slice(0, sep))}/${encodeURIComponent(key.slice(sep + 1))}`;
  };

  window.addEventListener(
    "keydown",
    (event) => {
      if (session !== null && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== "Tab" || !event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      const direction = event.shiftKey ? -1 : 1;
      if (session === null) open(direction);
      else step(direction);
    },
    true,
  );
  window.addEventListener(
    "keyup",
    (event) => {
      if (session !== null && !event.ctrlKey && !event.metaKey && !event.altKey) commit();
    },
    true,
  );
  window.addEventListener("blur", close);
  // The router navigates with pushState, which fires no hashchange.
  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      recordVisit();
      return result;
    };
  }
  window.addEventListener("hashchange", recordVisit);
  window.addEventListener("popstate", recordVisit);
  recordVisit();
})();
