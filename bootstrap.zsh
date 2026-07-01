#!/bin/zsh
() {
  emulate -L zsh -o errexit -o nounset -o pipefail

  local brew
  export DOT_HOME="${${(%):-%x}:A:h}"

  [[ ":${ZSH_EVAL_CONTEXT:-}:" == *:file:* ]] || {
    print -u2 "source this file to keep dot in your current shell:"
    print -u2 "  source $DOT_HOME/bootstrap.zsh"
    return 2
  }

  for brew in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    command -v brew >/dev/null 2>&1 && break
    [[ -x "$brew" ]] && eval "$("$brew" shellenv)"
  done

  if ! command -v brew >/dev/null 2>&1; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv 2>/dev/null)"
  fi

  if ! command -v brew >/dev/null 2>&1; then
    print -u2 "Homebrew installed, but brew is still not on PATH"
    return 1
  fi

  if ! command -v bun >/dev/null 2>&1; then
    brew install bun
    rehash
  fi

  dot() {
    bun "$DOT_HOME/kernel/dot.js" "$@"
  }

  (( $# )) && { dot "$@"; return }
  print "dot is ready in this shell"
} "$@"
