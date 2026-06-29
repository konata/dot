export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
prepend-path "$BUN_INSTALL/bin"
[[ -r "$BUN_INSTALL/_bun" ]] && source "$BUN_INSTALL/_bun"

