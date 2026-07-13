if [[ -z "${HOMEBREW_PREFIX:-}" ]]; then
  for prefix in /opt/homebrew /home/linuxbrew/.linuxbrew "$HOME/.linuxbrew" /usr/local; do
    [[ -x "$prefix/bin/brew" ]] || continue
    export HOMEBREW_PREFIX="$prefix"
    break
  done
fi

[[ -n "${HOMEBREW_PREFIX:-}" ]] || return
prepend-path "$HOMEBREW_PREFIX/bin"
prepend-path "$HOMEBREW_PREFIX/sbin"
