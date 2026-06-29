#!/bin/zsh
set -euo pipefail

export DOT_HOME="${DOT_HOME:-$HOME/dot}"

if ! command -v brew >/dev/null 2>&1; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

if ! command -v bun >/dev/null 2>&1; then
  brew install bun
fi

exec bun "$DOT_HOME/scripts/dot.js" "$@"

