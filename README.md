# dot

Personal macOS environment setup.

It keeps shell modules, selected app configs, package lists, small command
wrappers, and macOS defaults in one place. Mutable local state stays outside the
repository.

## Tools

Core packages are managed by `install/Brewfile.core`:

- runtime and package tools: `bun`, `uv`, `mise`
- shell helpers: `zplug`, `fzf`, `zoxide`, `direnv`, `atuin`
- search and data tools: `ripgrep`, `ast-grep`, `fd`, `jq`, `yq`, `sd`, `xh`
- Git tools: `gh`, `git-lfs`, `git-delta`, `git-absorb`
- command utilities: `hyperfine`, `just`, `prettier`, `bat`, `tree`, `eza`

Optional GUI apps and fonts live in `install/Brewfile.gui.optional`.

## Layout

```text
home/       files linked into $HOME
config/     selected files linked into $HOME/.config
shell/      zsh modules loaded by shell/init.zsh
install/    Brewfiles
macos/      explicit macOS defaults scripts
scripts/    Bun management commands
bin/        command wrappers copied into ~/bin
examples/   starter files laid out like their target roots
vim/        Vim config loaded by home/.vimrc
```

`~/.zshrc` is intentionally a local shim. This keeps third-party shell edits out
of the repository:

```zsh
export DOT_HOME="${DOT_HOME:-$HOME/dot}"
[[ -r "$DOT_HOME/shell/init.zsh" ]] && source "$DOT_HOME/shell/init.zsh"
```

Templates are copied manually:

```sh
cp ~/dot/examples/home/.zshrc ~/.zshrc
cp ~/dot/examples/home/.vimrc ~/.vimrc
cp ~/dot/examples/home/.gitconfig.local ~/.gitconfig.local
```

Put the real Git identity in `~/.gitconfig.local`; `home/.gitconfig` includes
it.

## Commands

```sh
bun run doctor
bun run install
bun run link
bun run unlink
bun run macos
bun run macos:opinionated
```

`link` links every file under `home/` to `$HOME`, and every file under `config/`
to `$HOME/.config`. It copies wrappers from `bin/` into `~/bin`, so `~/bin` can
remain a local executable directory. If an existing target is a regular file,
it is backed up before the link is created.

`install` installs core Homebrew packages. macOS defaults stay as separate
commands because they mutate system state.

## Private Layer

`~/.privately` is an optional private supplement for secrets, licensed tools,
private assets, and host-specific patches.

Load order:

```text
~/dot/shell/[0-9][0-9]-*.zsh
~/.privately/*.rc
```

Conventions:

- `*.rc` is auto-sourced. Use it for environment variables, aliases, functions,
  and guarded PATH additions.
- `*.sh` is manual. Use it for one-time mutations such as writing cookies,
  changing Git config, initializing tools, or repairing local state.
- Binary/private assets can live there and should be referenced by path from
  `*.rc`.
