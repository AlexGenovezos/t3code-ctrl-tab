#!/bin/zsh
# Starts T3 Code (Nightly) with a localhost CDP port and injects the Ctrl+Tab switcher.
# If Nightly is already running with the port, only (re)injects; without it, refuses rather
# than quitting the app (that would stop its server and any running agents).
set -eu
DIR=${0:A:h}
APP="T3 Code (Nightly)"
PORT=${T3_CDP_PORT:-9333}
LOG="$HOME/Library/Logs/t3-ctrl-tab.log"
NODE=$(command -v node || echo /opt/homebrew/bin/node)

if ! curl -sf "http://127.0.0.1:$PORT/json/version" >/dev/null; then
  if [[ $(osascript -e "application \"$APP\" is running") == true ]]; then
    osascript -e "display alert \"$APP is already running without the Ctrl+Tab debug port.\" message \"Quit it (this stops running agents), then open this launcher again.\""
    exit 1
  fi
  open -a "$APP" --args --remote-debugging-port="$PORT"
fi

PIDFILE="$DIR/.inject.pid"
[[ -f $PIDFILE ]] && kill "$(cat "$PIDFILE")" 2>/dev/null || true
T3_CDP_PORT=$PORT nohup "$NODE" "$DIR/inject.mjs" >>"$LOG" 2>&1 &
echo $! >"$PIDFILE"
