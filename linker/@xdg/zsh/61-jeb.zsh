export JEB_HOME="${JEB_HOME:-$HOME/cask/jeb}"

_jeb_jdk() {
  [[ -n "${JEB_JAVA_HOME:-}" ]] && { print -r -- "$JEB_JAVA_HOME"; return; }

  local jdk version
  for jdk in "${JAVA_HOME:-}" /Library/Java/JavaVirtualMachines/*/Contents/Home(N); do
    [[ -x "$jdk/bin/java" ]] || continue
    version="$("$jdk/bin/java" -version 2>&1)"
    [[ "$version" == *'version "17.'* ]] && print -r -- "$jdk" && return
  done
}

_jeb() {
  local jdk="$(_jeb_jdk)"
  if [[ -n "$jdk" ]]; then
    JAVA_HOME="$jdk" "$@"
  else
    "$@"
  fi
}

jeb() {
  {
    trap '' TTIN TTOU TSTP
    _jeb "$JEB_HOME/jeb_macos.sh" "$@"
  } </dev/null >/dev/null 2>&1 &!
}
