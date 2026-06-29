export JEB_HOME="${JEB_HOME:-$HOME/cask/jeb}"

jeb() {
  "$JEB_HOME/jeb_macos.sh" "$@" >/dev/null 2>&1 &
}

kfc() {
  "$JEB_HOME/jeb_macos.sh" -c --srv2 --script="$JEB_HOME/coreplugins/kfc.py"
}

