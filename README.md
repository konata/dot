# dot

A portable CLI environment built on Zsh, Bun, and Homebrew. It manages shell
modules, selected app configs, and a cross-platform package list while keeping
local mutable state outside the repository.

## Bootstrap

On a fresh machine `bootstrap.zsh` is the cold start — it installs Homebrew and
bun if missing, points `DOT_HOME` at this checkout, and defines `dot()` in the
current shell so the commands below run before your zsh config is set up:

```sh
git clone git@github.com:konata/dot.git ~/dot
source ~/dot/bootstrap.zsh
dot link
dot loader
dot install
```

Linux needs `zsh`, `git`, `curl`, `file`, `procps`, and the distribution's
compiler toolchain before bootstrap. Homebrew installs under
`/home/linuxbrew/.linuxbrew` by default; both bootstrap and shell startup
discover that path automatically.

Enter Zsh before sourcing the bootstrap (`exec zsh`), or make it the login
shell with `chsh -s "$(command -v zsh)"` and start a new session.

Source it; direct execution cannot define a function in your shell, and
re-sourcing is safe. In every later shell, `~/.config/zsh/init.zsh` (loaded via
the `~/.zshrc` loader) defines `dot()` for you — see [Commands](#commands).
Homebrew packages live in `install/brew.json`; `dot install` installs the shared
formula list on macOS or Linux.

## Compatibility

- macOS and Linux share the same Zsh, XDG links, formulae, editor settings, and
  desktop snapshot commands.
- Linux desktop configs resolve under `~/.config`; macOS desktop configs resolve
  under `~/Library/Application Support` where required.
- `clip` uses `pbcopy` on macOS and `wl-copy`, `xclip`, or `xsel` on Linux.
  Install one of those Linux clipboard tools with the system package manager.
- `op` uses `open` on macOS and `xdg-open` or `gio open` on Linux.
- Android defaults to `~/Android/Sdk` on Linux; Harmony activates only an
  existing SDK root; JEB selects `jeb_linux.sh` and requires `JEB_HOME` to point
  at an installed Linux distribution.
- Homebrew casks and macOS defaults are intentionally absent from this branch.
  Install GUI applications and fonts through the host system.
- The macOS-only `mole` formula, `hidutil` Caps Lock tuning, and empty Sublime
  OSX keymap were removed rather than carried as inactive Linux config.
- FreeBSD is not a supported bootstrap target: Homebrew and Bun do not provide
  the same supported installation path there. The plain config files remain
  reusable, but the `dot` CLI cannot currently be promised end to end.

## Layout

```text
linker/     tree symlinked into ~ (@home → $HOME, @xdg → ~/.config)
loader/     tree copied into ~ — the loaders (@home → $HOME)
desktop/    desktop app recipes (*.ts)
backups/    saved desktop app snapshots
install/    Homebrew package manifest
kernel/     dot CLI + recipe engine
```

`@home/` and `@xdg/` are **mount points** — like a FileProvider — each naming the
target root its subtree resolves against (`@home` → `$HOME`, `@xdg` → `~/.config`).
So the tree self-describes its mapping: `linker/@xdg/git/_config` →
`~/.config/git/_config`, `linker/@home/AGENTS.md` → `~/AGENTS.md`. `linker/` and
`loader/` differ only in mechanism: `linker/` is symlinked (the file *is* the live
config), `loader/` is copied (the loaders, which absorb local edits so they never
dirty the repo).

Each `~` config file is a thin **loader**: it pulls in the tracked core under
`linker/@xdg/` — the zsh modules in `linker/@xdg/zsh/`, or the `_`-prefixed files
(`linker/@xdg/git/_config`, `linker/@xdg/vim/_vimrc`). Third-party edits and tool
writes (`git config --global`, installer appends) then land in the loader, never in
the repo. `~/.zshrc`, `~/.gitconfig`, `~/.vimrc`, and `~/.ideavimrc` are all loaders;
a fresh loader is nearly empty since the content lives in the repo.

```zsh
# ~/.zshrc
[[ -r ~/.config/zsh/init.zsh ]] && source ~/.config/zsh/init.zsh
```

`dot loader` places them into `~` (they are copied, not linked, so your local
edits and tool writes stay out of the repo). It is a one-time init step; anything
already there is backed up to `<name>.<stamp>.dotbackup` before being overwritten.

```sh
dot loader
```

## Commands

Roughly the order you'd run on a new machine:

```sh
dot link                  # symlink home/ (incl. .config/) into ~
dot loader                # place ~ loaders (backs up anything it overwrites)
dot install               # brew install formulae from install/brew.json
dot doctor                # formulae tools + link state; `dot doctor cursor` for one recipe
dot desktop               # list app recipes with snapshot state
dot status                # drift: repo uncommitted changes + live app config vs backup

dot restore cursor --dry  # preview; without --dry, changed files move to <name>.<stamp>.dotbackup
dot restore cursor

dot save cursor --dry     # preview; a repeat save with no change prints "nothing to save"
dot save cursor

dot unlink                # remove every symlink this repo owns
```

## Desktop Backups

Desktop app recipes live in `desktop/*.ts` and are discovered automatically; each
calls the typed `recipe()` factory (`kernel/desktop/recipe.ts`). Snapshots are
stored in `backups/<app>`. Supported apps are currently `code`, `cursor`, `ghostty`,
`kiro`, and `sublime`.

`save <app>` diffs each file against its backup and copies only what changed,
pruning stale entries and reporting `nothing to save` when in sync. `restore
<app>` skips files already matching, and for the rest moves the existing file
aside to `<name>.<stamp>.dotbackup` before writing. Both take `--dry`. Binary files are
backed up too, with a warning. There is intentionally no `restore all`.

`status` reports drift in two parts: the repo's uncommitted changes (`git`), and
per recipe whether the live config still matches its backup — the latter catches
edits you made but never saved, which git can't see because the app config is
copied, not symlinked. Extension lists aren't diffed; run `save` to refresh them.

`recipe(id, app, root, options?)`:

- `id` — the command name and the `backups/<id>` snapshot folder
- `app` — the display name and, on macOS, the `.app` bundle name
- `root` — a **`$HOME`-relative** path to the app's config; `support("Code/User")`
  targets `~/Library/Application Support/Code/User` on macOS and
  `~/.config/Code/User` on Linux
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
import { recipe, support } from "../kernel/desktop/recipe"

export default [
  // only files — list exactly what to back up
  recipe("sublime", "Sublime Text.app", support("Sublime Text/Packages/User"), {
    files: ["Preferences.sublime-settings"],
    available: c => c.command("subl"),
  }),

  // only ignore — everything under root, minus the noise
  recipe("clash", "Clash Verge.app", support("io.github.clash-verge-rev.clash-verge"), {
    ignore: ["*.log", "cache/**"],
  }),

  // with hooks — save extension IDs and reinstall them on restore
  recipe("code", "Visual Studio Code.app", support("Code/User"), {
    files: ["settings.json"],
    available: c => c.command("code"),
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
~/.config/zsh/[0-9][0-9]-*.zsh
~/.privately/*.rc
```

Conventions:

- `*.rc` is auto-sourced for env vars, aliases, functions, and guarded PATH.
- `*.sh` is manual for one-time mutations.
- Binary/private assets can live there and be referenced from `*.rc`.
