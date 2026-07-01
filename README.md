# dot

A macOS dotfile manager built on bun and Homebrew: shell modules, selected app
configs, package lists, small wrappers, and macOS defaults. Local mutable state
lives outside the repository.

## Bootstrap

On a fresh machine `bootstrap.zsh` is the cold start — it installs Homebrew and
bun if missing, then execs `dot`, so it works before `dot` (or bun) exists. Run
through it until `dot` is on your PATH:

```sh
git clone git@github.com:konata/dot.git ~/dot
~/dot/bootstrap.zsh link
~/dot/bootstrap.zsh loader
~/dot/bootstrap.zsh install
```

After a new shell `dot` is on your PATH — see [Commands](#commands). Core packages
are in `install/Brewfile.core`; optional GUI apps and fonts in
`install/Brewfile.gui.optional`.

## Layout

```text
home/       mirror of $HOME, linked in (incl. home/.config/ → ~/.config/)
desktop/    desktop app recipes (*.ts)
backups/    saved desktop app snapshots
shell/      zsh modules loaded by shell/init.zsh
install/    Brewfiles
macos/      explicit macOS defaults scripts
kernel/     dot CLI + recipe engine
bin/        command wrappers symlinked into ~/bin
loader/     ~ loaders, copied manually
```

Each `~` config file is a thin **loader**: it pulls in the tracked source — shell
modules under `shell/`, or the `_`-prefixed cores under `home/.config/`
(`home/.config/git/_config`, `home/.config/vim/_vimrc`). Third-party edits and tool writes
(`git config --global`, installer appends) then land in the loader, never in the repo.
`~/.zshrc`, `~/.gitconfig`, `~/.vimrc`, and `~/.ideavimrc` are all loaders; a fresh
loader is nearly empty since the content lives in the repo.

```zsh
# ~/.zshrc
export DOT_HOME="${DOT_HOME:-$HOME/dot}"
[[ -r "$DOT_HOME/shell/init.zsh" ]] && source "$DOT_HOME/shell/init.zsh"
```

`dot loader` places them into `~` (they are copied, not linked, so your local
edits and tool writes stay out of the repo). It is a one-time init step; anything
already there is backed up to `<name>.bak.<stamp>` before being overwritten.

```sh
dot loader
```

## Commands

Roughly the order you'd run on a new machine:

```sh
dot link                  # symlink home/ (incl. .config/) and bin/ into ~/bin
dot loader                # place ~ loaders (backs up anything it overwrites)
dot install               # brew bundle from install/Brewfile.core
dot macos                 # macOS defaults; macos:opinionated adds personal prefs
dot macos:opinionated
dot doctor                # core tools + link state; `dot doctor cursor` for one recipe
dot desktop               # list app recipes with snapshot state
dot status                # drift: repo uncommitted changes + live app config vs backup

dot restore cursor --dry  # preview; without --dry, changed files move to <name>.bak.<stamp>
dot restore cursor

dot save cursor --dry     # preview; a repeat save with no change prints "nothing to save"
dot save cursor

dot unlink                # remove every symlink this repo owns
```

## Desktop Backups

Desktop app recipes live in `desktop/*.ts` and are discovered automatically; each
calls the typed `recipe()` factory (`kernel/desktop/recipe.ts`). Snapshots are
stored in `backups/<app>`. Supported apps are currently `code`, `cursor`, `kiro`,
and `sublime`.

`save <app>` diffs each file against its backup and copies only what changed,
pruning stale entries and reporting `nothing to save` when in sync. `restore
<app>` skips files already matching, and for the rest moves the existing file
aside to `<name>.bak.<stamp>` before writing. Both take `--dry`. Binary files are
backed up too, with a warning. There is intentionally no `restore all`.

`status` reports drift in two parts: the repo's uncommitted changes (`git`), and
per recipe whether the live config still matches its backup — the latter catches
edits you made but never saved, which git can't see because the app config is
copied, not symlinked. Extension lists aren't diffed; run `save` to refresh them.

`recipe(id, app, root, options?)`:

- `id` — the command name and the `backups/<id>` snapshot folder
- `app` — the `.app` bundle name, looked up under `/Applications` and
  `~/Applications` to decide availability
- `root` — path **under `~/Library/Application Support`** holding the app's
  config (`"Code/User"` → `~/Library/Application Support/Code/User`)
- `options.files` — include patterns (names, directories, or `Bun.Glob` globs)
  relative to `root`; **omit to take everything under `root`**. A directory is
  backed up recursively, so a folder of many or unpredictably-named files just
  needs the folder name.
- `options.ignore` — exclude globs applied after the includes (exclude wins)
- `options.available` / `save` / `restore` — optional hooks; `@save` / `@restore`
  are dry-run-only previews

A `desktop/*.ts` file `export default`s one recipe, or an array to group related
apps in one file — a whole file looks like this:

```ts
import { recipe } from "../kernel/desktop/recipe"

export default [
  // only files — list exactly what to back up
  recipe("sublime", "Sublime Text.app", "Sublime Text/Packages/User", {
    files: ["Preferences.sublime-settings", "Default (OSX).sublime-keymap"],
  }),

  // only ignore — everything under root, minus the noise
  recipe("clash", "Clash Verge.app", "io.github.clash-verge-rev.clash-verge", {
    ignore: ["*.log", "cache/**"],
  }),

  // with hooks — save extension IDs and reinstall them on restore
  recipe("code", "Visual Studio Code.app", "Code/User", {
    files: ["settings.json"],
    available: c => c.app() && c.command("code"),
    async save(c) {
      const ids = (await c.output("code", ["--list-extensions"])).trim()
      await c.write("extensions.txt", `${ids}\n`)
    },
    async restore(c) {
      for (const id of await c.lines("extensions.txt")) await c.run("code", ["--install-extension", id])
    },
    async ["@save"](c) { await c.write("extensions.txt") },
  }),
]
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
