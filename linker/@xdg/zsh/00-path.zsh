typeset -U path PATH
path=(/usr/local/bin /usr/local/sbin /usr/bin /usr/sbin /bin /sbin $path)

prepend-path() {
  [[ -d "$1" ]] || return
  path=("$1" ${path:#$1})
}

prepend-path "$HOME/bin"
prepend-path "$HOME/exec"
prepend-path "$HOME/.local/bin"
export PATH
