export JEB_HOME="${JEB_HOME:-$HOME/cask/jeb}"

_jeb_jdk() {
  [[ -n "${JEB_JAVA_HOME:-}" ]] && { print -r -- "$JEB_JAVA_HOME"; return; }

  local jdk version
  for jdk in \
    "${JAVA_HOME:-}" \
    /Library/Java/JavaVirtualMachines/*/Contents/Home(N) \
    /usr/lib/jvm/*(N) \
    "$HOME"/.sdkman/candidates/java/*(N); do
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
  local launcher
  case "$OSTYPE" in
    darwin*) launcher="$JEB_HOME/jeb_macos.sh" ;;
    linux*)  launcher="$JEB_HOME/jeb_linux.sh" ;;
    *)       echo "JEB launcher is unsupported on $OSTYPE" >&2; return 1 ;;
  esac
  [[ -x "$launcher" ]] || { echo "JEB launcher not found: $launcher" >&2; return 1; }

  {
    trap '' TTIN TTOU TSTP
    _jeb "$launcher" "$@"
  } </dev/null >/dev/null 2>&1 &!
}
