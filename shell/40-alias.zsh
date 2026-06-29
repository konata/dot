alias cleanupds="find . -type f -name '*.DS_Store' -ls -delete"
alias ..="cd .."
alias ...="cd ../.."
alias ....="cd ../../.."
alias .....="cd ../../../.."
alias -- -="cd -"
alias cd.='cd "$(realpath .)"'
alias l="eza -b"
alias ll="eza -abl"
alias lt="eza -bT -L 2"
alias reload="source ~/.zshrc"
alias aliases="alias | sed 's/=.*//'"
alias fnames="functions | sed -n 's/^\\([^ ]*\\) ().*/\\1/p'"
alias paths='print -l ${(s/:/)PATH}'
alias ag=rg
alias op=open
alias zip="zip -x '*.DS_Store' -x '*__MACOSX*' -x '*.AppleDouble*'"
alias cpwd="pwd | tr -d '\n' | pbcopy"

ff() {
  fzf --bind "enter:execute(echo -n {} | pbcopy)+abort"
}

ga() {
  [[ -n "$1" ]] || { echo "usage: ga BRANCH" >&2; return 2; }
  local branch="$1"
  local suffix="${branch//\//@}"
  local root="${PWD:t}"
  local target="../${root}@${suffix}"
  git worktree add -b "$branch" "$target"
  cd "$target" || return
}

gd() {
  local worktree="${PWD:t}"
  local root="${worktree%%@*}"
  [[ "$root" != "$worktree" ]] || { echo "current directory is not a @ worktree" >&2; return 1; }

  printf "remove worktree folder %s? [y/N] " "$worktree"
  read -r answer
  [[ "$answer" == [Yy]* ]] || return

  cd "../$root" || return
  git worktree remove "$worktree" --force
}
