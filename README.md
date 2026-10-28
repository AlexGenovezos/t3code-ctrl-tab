# T3 Code Ctrl+Tab thread switcher

A VS Code–style most-recently-used thread switcher for the [T3 Code](https://github.com/pingdotgg/t3code) desktop app (macOS, Nightly).

- Hold **Ctrl** and tap **Tab** to walk back through recently opened threads (**Ctrl+Shift+Tab** goes the other way).
- Let go of **Ctrl** to open the highlighted thread.
- **Escape** or switching away from the window cancels.

Rows show the project's favicon, the thread title and the project name.

This is an unofficial add-on. It does not modify the app: the official build keeps auto-updating as normal.

## How it works

1. `launch.sh` starts `T3 Code (Nightly)` with `--remote-debugging-port=9333`, Chromium's standard DevTools port. The port listens on localhost only.
2. `inject.mjs` connects to that port over the Chrome DevTools Protocol. It adds `switcher.js` to every T3 Code window, including new windows and reloads. It exits when the app quits.
3. `switcher.js` is plain page JavaScript. It:
   - records which threads you open
   - reads titles and icons from the sidebar
   - draws its own overlay
   - switches threads by changing the page's URL hash

   It doesn't use any of the app's internals.

## Install

Requires macOS, Node.js 22+ (for the built-in `WebSocket`), and `T3 Code (Nightly)` in `/Applications`.

```sh
git clone https://github.com/AlexGenovezos/t3code-ctrl-tab.git
cd t3code-ctrl-tab
./install.sh
```

This builds `~/Applications/T3 Code Ctrl-Tab.app`, a launcher that runs `launch.sh` from your clone.

## Use

1. Quit T3 Code. Quitting stops its bundled server and any running agents.
2. Open **T3 Code Ctrl-Tab** instead of the regular icon.
3. Open a couple of threads. The switcher only knows threads you've opened since installing it.

If T3 Code is already running without the debug port, the launcher shows an alert instead of quitting it for you.

The injector logs to `~/Library/Logs/t3-ctrl-tab.log`. Set `T3_CDP_PORT` to use a different port.

## Caveats

- **Restarts lose it.** If T3 Code is opened normally, or restarts itself after an update, the switcher isn't there. Quit and reopen through the launcher.
- **Local programs can control the app.** While the debugging port is open, any process on your Mac can drive the app through it. It isn't reachable from the network.
- **Only threads you've seen in the sidebar appear.** The switcher reads the sidebar for titles and icons. A deleted thread can stay in the list until it ages out of the last 30.
- **App updates can break it.** It depends on T3 Code's sidebar markup (`li[data-thread-item]`) and hash routes (`#/<environmentId>/<threadId>`). If the app changes those, the switcher will need updating.

## Test

`test/run.sh` loads the switcher into a mock T3 Code window in a throwaway Electron app. It then drives the keyboard over CDP and checks:

- recent-thread order
- cycling in both directions
- opening the thread on Ctrl release
- Escape cancelling
- surviving a reload

```sh
test/run.sh                      # uses `npx electron`
ELECTRON=/path/to/Electron test/run.sh
```

## Built-in version

`upstream/ctrl-tab-switcher.patch` is the same feature built into T3 Code itself, written against upstream `main`. It's kept here in case the feature is accepted upstream. See the [ideas discussion](https://github.com/pingdotgg/t3code/discussions/9751).

## License

MIT
