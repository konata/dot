(( $+commands[yazi] )) || return

y() {
  local record directory
  record="$(mktemp -t yazi-cwd.XXXXXX)"
  command yazi "$@" --cwd-file="$record"
  IFS= read -r -d '' directory <"$record"
  [[ "$directory" != "$PWD" && -d "$directory" ]] && builtin cd -- "$directory"
  command rm -f -- "$record"
}
