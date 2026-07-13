#!/usr/bin/env zsh
() {
  emulate -L zsh -o errexit -o nounset -o pipefail

  local brew
  local -a brews
  export DOT_HOME="${${(%):-%x}:A:h}"

  [[ ":${ZSH_EVAL_CONTEXT:-}:" == *:file:* ]] || {
    print -u2 "source this file to keep dot in your current shell:"
    print -u2 "  source $DOT_HOME/bootstrap.zsh"
    return 2
  }

  brews=(
    "${commands[brew]:-}"
    /opt/homebrew/bin/brew
    /home/linuxbrew/.linuxbrew/bin/brew
    "$HOME/.linuxbrew/bin/brew"
    /usr/local/bin/brew
  )

  for brew in $brews; do
    [[ -n "$brew" ]] || continue
    [[ -x "$brew" ]] && eval "$("$brew" shellenv)"
    command -v brew >/dev/null 2>&1 && break
  done

  if ! command -v brew >/dev/null 2>&1; then
    [[ "$OSTYPE" == darwin* || "$OSTYPE" == linux* ]] || {
      print -u2 "automatic Homebrew bootstrap is unsupported on $OSTYPE"
      return 1
    }
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    for brew in $brews; do
      [[ -n "$brew" && -x "$brew" ]] || continue
      eval "$("$brew" shellenv)"
      break
    done
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
