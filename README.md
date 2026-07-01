# dot

A macOS dotfile manager built on bun and Homebrew: shell modules, selected app
configs, package lists, small wrappers, and macOS defaults. Local mutable state
lives outside the repository.

## Bootstrap

Core packages are in `install/Brewfile.core`; optional GUI apps and fonts are in
`install/Brewfile.gui.optional`.

```sh
dot link
dot install
```

## Layout

```text
home/       files linked into $HOME
config/     selected files linked into $HOME/.config
desktop/    desktop app recipes (*.ts)
backups/    saved desktop app snapshots
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

Roughly in setup order:

```sh
dot link                  # symlink home/ + config/, copy bin/ into ~/bin
dot install               # brew bundle from install/Brewfile.core
dot macos                 # macOS defaults; macos:opinionated adds personal prefs
dot macos:opinionated
dot doctor                # core tools + link state; `dot doctor cursor` for one recipe
dot desktop               # list app recipes with snapshot state

dot restore cursor --dry  # preview; without --dry, changed files move to <name>.bak.<stamp>
dot restore cursor

dot save cursor --dry     # preview; a repeat save with no change prints "nothing to save"
dot save cursor

dot unlink                # remove every symlink this repo owns
```

## Desktop Backups

Desktop app recipes live in `desktop/*.ts` and are discovered automatically; each
calls the typed `recipe()` factory (`scripts/desktop/recipe.ts`). Snapshots are
stored in `backups/<app>`. Supported apps are currently `cursor`, `kiro`, and
`sublime`.

`save <app>` diffs each file against its backup and copies only what changed,
pruning stale entries and reporting `nothing to save` when in sync. `restore
<app>` skips files already matching, and for the rest moves the existing file
aside to `<name>.bak.<stamp>` before writing, then reports what moved. There is
intentionally no `restore all`. Both commands support `--dry`.

Each recipe declares `files` for normal file-based backup, plus optional
`available`, `save`, and `restore` hooks; `@save` / `@restore` are dry-run-only
previews. Cursor, Code, and Kiro use this to save extension IDs into
`extensions.txt` and reinstall them on restore.

```ts
// desktop/code.ts
import { recipe } from "../scripts/desktop/recipe"

export default recipe("code", "Visual Studio Code.app", "Code/User",
  ["settings.json"],
  {
    available: c => c.app() && c.command("code"),
    async save(c) {
      const ids = (await c.output("code", ["--list-extensions"])).trim()
      await c.write("extensions.txt", `${ids}\n`)
    },
    async restore(c) {
      for (const id of await c.lines("extensions.txt")) await c.run("code", ["--install-extension", id])
    },
    async ["@save"](c) { await c.write("extensions.txt") },
  })
```

`recipe(id, app, root, files, hooks)`:

- `id` — the command name and the `backups/<id>` snapshot folder
- `app` — the `.app` bundle name, looked up under `/Applications` and
  `~/Applications` to decide availability
- `root` — path **under `~/Library/Application Support`** holding the app's
  config (`"Code/User"` → `~/Library/Application Support/Code/User`)
- `files` — names (files or directories) under `root` to back up
- `hooks` — optional `available` / `save` / `restore`, plus dry-only
  `@save` / `@restore`

A file-only recipe needs just the first three arguments — `sublime.ts` passes a
`files` list and no hooks.

A `files` entry can also be a directory: it is backed up and restored
recursively, so a folder of many or unpredictably-named files (say a Clash
`profiles/` directory of proxy `.yaml`s) just needs the folder name, not each
file.

```ts
export default recipe("clash", "Clash Verge.app", "io.github.clash-verge-rev.clash-verge",
  ["profiles"])  // whole folder, any number of files, no hooks
```

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
