#!/bin/zsh
# Runs switcher.js against a mock T3 Code window in a throwaway Electron app.
# Uses $ELECTRON if set, otherwise `npx electron`.
set -u
cd ${0:A:h}
rm -rf .ud
if [[ -n ${ELECTRON:-} ]]; then
  env -u ELECTRON_RUN_AS_NODE "$ELECTRON" main.cjs --remote-debugging-port=9444 --user-data-dir="$PWD/.ud" >electron.log 2>&1 &
else
  env -u ELECTRON_RUN_AS_NODE npx --yes electron main.cjs --remote-debugging-port=9444 --user-data-dir="$PWD/.ud" >electron.log 2>&1 &
fi
EPID=$!
T3_CDP_PORT=9444 node ../inject.mjs >inject.log 2>&1 &
IPID=$!
for i in {1..240}; do grep -q injected inject.log 2>/dev/null && break; sleep 0.25; done
node drive.mjs
STATUS=$?
kill $EPID $IPID 2>/dev/null
wait 2>/dev/null
rm -rf .ud
exit $STATUS
