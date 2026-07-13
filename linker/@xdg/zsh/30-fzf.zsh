export FZF_DEFAULT_OPTS="
--layout=reverse
--info=inline
--height=80%
--multi
--preview-window=:hidden
--preview '([[ -f {} ]] && bat --style=numbers --color=always --line-range :200 {}) || ([[ -d {} ]] && tree -C {} | head -200) || echo {}'
--color='hl:148,hl+:154,pointer:032,marker:010,bg+:237,gutter:008'
--prompt='> '
--bind '?:toggle-preview'
--bind 'ctrl-a:select-all'
--bind 'ctrl-y:execute-silent(echo -n {+} | clip)'
--bind 'ctrl-e:execute(echo {+} | xargs -o vim)'
"
