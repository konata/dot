[[ -n "${DOT_SHELL_LOADED:-}" ]] && return
export DOT_SHELL_LOADED=1
export DOT_HOME="${DOT_HOME:-$HOME/dot}"

dot() { bun "$DOT_HOME/kernel/dot.js" "$@" }

for file in "$HOME"/.config/zsh/[0-9][0-9]-*.zsh(N); do
  source "$file"
done

for file in "$HOME"/.privately/*.rc(N); do
  source "$file"
done
