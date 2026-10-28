#!/bin/zsh
# Builds "~/Applications/T3 Code Ctrl-Tab.app", a launcher that runs launch.sh from this checkout.
set -eu
DIR=${0:A:h}
APP_SRC="/Applications/T3 Code (Nightly).app"
OUT="$HOME/Applications/T3 Code Ctrl-Tab.app"
mkdir -p "$HOME/Applications"
rm -rf "$OUT"
osacompile -o "$OUT" -e "do shell script quoted form of \"$DIR/launch.sh\""
if [[ -d $APP_SRC ]]; then
  ICON=$(plutil -extract CFBundleIconFile raw "$APP_SRC/Contents/Info.plist")
  cp "$APP_SRC/Contents/Resources/${ICON%.icns}.icns" "$OUT/Contents/Resources/applet.icns"
  touch "$OUT"
fi
echo "Installed $OUT"
