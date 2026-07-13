for init in "$HOME/.zplug/init.zsh" "${HOMEBREW_PREFIX:+$HOMEBREW_PREFIX/opt/zplug/init.zsh}"; do
  [[ -r "$init" ]] || continue
  source "$init"
  break
done

(( $+functions[zplug] )) || return

zplug "modules/history", from:prezto
zplug "modules/terminal", from:prezto
zplug "modules/editor", from:prezto
zplug "modules/directory", from:prezto
zplug "modules/completion", from:prezto
zplug "plugins/git", from:prezto
zplug "zsh-users/zsh-completions", defer:0
zplug "zsh-users/zsh-autosuggestions", defer:2, on:"zsh-users/zsh-completions"
zplug "zsh-users/zsh-syntax-highlighting", defer:3, on:"zsh-users/zsh-autosuggestions"
zplug "zsh-users/zsh-history-substring-search", defer:3, on:"zsh-users/zsh-syntax-highlighting"
zplug "dracula/zsh", as:theme

if zplug check >/dev/null 2>&1; then
  zplug load
fi
