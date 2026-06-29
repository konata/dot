# dot

Personal macOS setup: shell modules, selected app configs, package lists, small
wrappers, and macOS defaults. Mutable local state stays outside the repository.

## Bootstrap

Core packages are in `install/Brewfile.core`; optional GUI apps and fonts are in
`install/Brewfile.gui.optional`.

```sh
bun run install
bun run link
```

## Layout

```text
home/       files linked into $HOME
config/     selected files linked into $HOME/.config
desktop/    desktop app support definitions
backups/    saved desktop app support snapshots
shell/      zsh modules loaded by shell/init.zsh
install/    Brewfiles
macos/      explicit macOS defaults scripts
scripts/    Bun management commands
bin/        command wrappers copied into ~/bin
examples/   starter files laid out like their target roots
vim/        Vim config loaded by home/.vimrc
```

`~/.zshrc` stays as a local shim, so third-party shell edits stay out of this
repo:

```zsh
export DOT_HOME="${DOT_HOME:-$HOME/dot}"
[[ -r "$DOT_HOME/shell/init.zsh" ]] && source "$DOT_HOME/shell/init.zsh"
```

Starter files are copied manually:

```sh
cp ~/dot/examples/home/.zshrc ~/.zshrc
cp ~/dot/examples/home/.vimrc ~/.vimrc
cp ~/dot/examples/home/.gitconfig.local ~/.gitconfig.local
```

## Commands

```sh
bun run desktop
bun run doctor
bun run install
bun run link
bun run save -- cursor --dry-run
bun run save -- cursor
bun run restore -- cursor --dry-run
bun run restore -- cursor --force
bun run unlink
bun run macos
bun run macos:opinionated
```

`link` links `home/` into `$HOME`, `config/` into `$HOME/.config`, and copies
`bin/` wrappers into `~/bin`. Existing regular files are backed up.

## Desktop Backups

Desktop app definitions live in `desktop/*.js` and are discovered automatically.
Snapshots are stored in `backups/<app>`. Supported apps are currently `cursor`
and `sublime`.

`save <app>` replaces the previous snapshot for that app. `restore <app>` merges
directories, requires `--force` before overwriting files, and intentionally has
no `restore all`. Both commands support `--dry-run`.

Each definition can declare `files` for normal file-based backup. App-specific
work uses `save` / `restore`; dry-run-only previews use `_save` / `_restore`.
Cursor uses this to save extension IDs into `extensions.txt` and reinstall them
on restore.

## Private Layer

`~/.privately` is an optional supplement for secrets, licensed tools, private
assets, and host-specific patches.

Load order:

```text
~/dot/shell/[0-9][0-9]-*.zsh
~/.privately/*.rc
```

Conventions:

- `*.rc` is auto-sourced for env vars, aliases, functions, and guarded PATH.
- `*.sh` is manual for one-time mutations.
- Binary/private assets can live there and be referenced from `*.rc`.
