#!/usr/bin/env bun
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { chmod, copyFile, lstat, mkdir, readlink, rename, rm, symlink } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"
import { $ } from "bun"
import { desktop, doctor as desktopDoctor, restore as restoreDesktop, save as saveDesktop, status as desktopStatus } from "./desktop/index.js"
import { bold, dim, green, mark, red, yellow } from "./ui.js"

const dot = resolve(import.meta.dir, "..")
const home = homedir()
const stamp = new Date().toISOString().replaceAll(/[-:T.Z]/g, "").slice(0, 14)

const commands = [
  "git",
  "bun",
  "uv",
  "mise",
  "rg",
  "ast-grep",
  "fd",
  "jq",
  "yq",
  "delta",
  "zoxide",
  "direnv",
  "xh",
  "sd",
  "hyperfine",
  "just",
  "git-absorb",
  "atuin",
  "prettier",
  "fzf",
  "bat",
  "tree",
  "eza",
]

function help() {
  const groups = [
    ["setup", [
      ["install", "brew bundle install/Brewfile.core"],
      ["link", "link home/* and config/*, copy bin/* into ~/bin"],
      ["loader", "copy loader/home/* into ~ (backs up anything it overwrites)"],
      ["unlink", "remove links owned by this tree"],
      ["macos", "apply low-side-effect macOS defaults"],
      ["macos:opinionated", "apply personal macOS preferences"],
    ]],
    ["desktop", [
      ["desktop", "list desktop app snapshots"],
      ["save", "save one snapshot; pass --dry to preview"],
      ["restore", "restore one snapshot; existing files move aside to .bak; --dry to preview"],
    ]],
    ["status", [
      ["status", "drift: repo uncommitted changes + live app config vs backup"],
      ["doctor", "core tool + link state, or doctor <app> to inspect one recipe"],
    ]],
  ]

  const width = Math.max(...groups.flatMap(([, items]) => items.map(([name]) => name.length)))
  const body = groups
    .map(([title, items]) => `  ${title}\n` + items.map(([name, desc]) => `    ${name.padEnd(width)}  ${desc}`).join("\n"))
    .join("\n\n")

  console.log(`usage: dot <command>\n\n${body}`)
}

function command(name) {
  return spawnSync("zsh", ["-lc", `command -v ${name}`], { stdio: "ignore" }).status === 0
}

async function owned(target) {
  const stat = await lstat(target).catch(() => null)
  if (!stat?.isSymbolicLink()) return false
  const current = resolve(dirname(target), await readlink(target))
  return current === dot || current.startsWith(`${dot}/`)
}

async function same(source, target) {
  return Promise.all([Bun.file(source).text(), Bun.file(target).text()])
    .then(([left, right]) => left === right)
    .catch(() => false)
}

async function files(root) {
  return Array.fromAsync(new Bun.Glob("**/*").scan({ cwd: root, onlyFiles: true, dot: true }))
    .then(names => names.filter(name => !name.includes(".DS_Store")))
}

// home/ mirrors $HOME verbatim (home/.config/... → ~/.config/...)
async function links() {
  return (await files(join(dot, "home")))
    .map(name => [join(dot, "home", name), join(home, name)])
}

async function connect(source, target) {
  const stat = await lstat(target).catch(() => null)

  if (stat?.isSymbolicLink()) {
    const current = resolve(dirname(target), await readlink(target))
    if (current === source) return console.log(`${mark.ok} ${dim(relative(home, target))}`)
    await rm(target)
  } else if (stat) {
    await rename(target, `${target}.bak.${stamp}`)
  }

  await mkdir(dirname(target), { recursive: true })
  await symlink(source, target)
  console.log(`${mark.add} ${dim(relative(home, target))} ${dim(`→ ${relative(dot, source)}`)}`)
}

async function link() {
  for (const pair of await links()) await connect(...pair)
  await copyBins()
  console.log(dim("run `dot loader` to place the ~ loaders"))
}

async function loaders() {
  return (await files(join(dot, "loader", "home")))
    .map(name => [join(dot, "loader", "home", name), join(home, name)])
}

// one-time init: place the loaders, backing up anything already there (identical → skip)
async function loader() {
  for (const [source, target] of await loaders()) {
    const stat = await lstat(target).catch(() => null)
    if (stat && (await same(source, target))) { console.log(`${mark.ok} ${dim(relative(home, target))}`); continue }
    if (stat) await rename(target, `${target}.bak.${stamp}`)
    await mkdir(dirname(target), { recursive: true })
    await copyFile(source, target)
    console.log(stat ? `${mark.change} ${dim(relative(home, target))} ${dim("(backed up)")}` : `${mark.add} ${dim(relative(home, target))}`)
  }
}

async function unlink() {
  for (const [, target] of await links()) {
    if (!(await owned(target))) continue
    await rm(target)
    console.log(`${mark.drop} ${dim(relative(home, target))}`)
  }
}

async function doctor(id) {
  if (id) return desktopDoctor(id)

  console.log(bold("dot") + " " + dim(dot))
  console.log(`${dim("shim")} ${existsSync(join(home, ".zshrc")) ? green("~/.zshrc") : red("~/.zshrc missing")}`)
  console.log(`${dim("bin ")} ${dim(await binState())}`)

  for (const name of commands) {
    console.log(`${command(name) ? mark.ok : mark.bad} ${name}`)
  }

  for (const [source, target] of await links()) {
    const linked = await owned(target)
    console.log(`${linked ? mark.ok : mark.change} ${relative(dot, source)} ${dim(`→ ${relative(home, target)}`)}${linked ? "" : yellow(" external")}`)
  }

  for (const [source, target] of await bins()) {
    const copied = await same(source, target)
    console.log(`${copied ? mark.ok : mark.change} ${relative(dot, source)} ${dim(`→ ${relative(home, target)}`)}${copied ? "" : yellow(" external")}`)
  }
}

async function status(id) {
  const porcelain = spawnSync("git", ["-C", dot, "status", "--porcelain"], { encoding: "utf8" }).stdout.trim()
  console.log(bold("repo") + dim(" — uncommitted"))
  if (!porcelain) console.log(`  ${mark.ok} ${dim("clean")}`)
  else for (const line of porcelain.split("\n")) console.log(`  ${mark.change} ${dim(line.trimStart())}`)

  console.log(bold("apps") + dim(" — live vs backup"))
  await desktopStatus(id)
}

async function install() {
  await $`brew bundle --file=${join(dot, "install", "Brewfile.core")}`
}

async function macos(file = "defaults.zsh") {
  await $`zsh ${join(dot, "macos", file)}`
}

async function bins() {
  return (await files(join(dot, "bin")))
    .map(name => [join(dot, "bin", name), join(home, "bin", name)])
}

async function copyBins() {
  await prepareBin()
  for (const [source, target] of await bins()) {
    await copyFile(source, target)
    await chmod(target, 0o755)
    console.log(`${mark.add} ${dim(relative(home, target))}`)
  }
}

async function binState() {
  const target = join(home, "bin")
  const stat = await lstat(target).catch(() => null)
  if (!stat) return "~/bin missing"
  if (stat.isSymbolicLink()) return `~/bin symlink -> ${await readlink(target)}`
  if (stat.isDirectory()) return "~/bin directory"
  return "~/bin exists but is not a directory"
}

async function prepareBin() {
  const target = join(home, "bin")
  const stat = await lstat(target).catch(() => null)
  if (stat && !stat.isDirectory()) await rename(target, `${target}.bak.${stamp}`)
  await mkdir(target, { recursive: true })
}

const tasks = {
  desktop,
  doctor,
  install,
  link,
  loader,
  unlink,
  macos,
  "macos:opinionated": () => macos("opinionated.zsh"),
  restore: restoreDesktop,
  save: saveDesktop,
  status,
}
const [task = "help", ...args] = process.argv.slice(2)

if (task === "help" || task === "-h" || task === "--help") {
  help()
} else if (tasks[task]) {
  await tasks[task](...args).catch(error => {
    if (error?.message) console.error(`${mark.bad} ${red(error.message)}`)
    process.exitCode = error?.code ?? 1
  })
} else {
  help()
  process.exitCode = 2
}
