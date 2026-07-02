typeset -U path PATH
path=(/bin /usr/bin /usr/local/bin /sbin /usr/sbin)

prepend-path() {
  [[ -d "$1" ]] || return
  path=("$1" ${path:#$1})
}

prepend-path "$HOME/bin"
prepend-path "$HOME/exec"
prepend-path "$HOME/.local/bin"
export PATH

