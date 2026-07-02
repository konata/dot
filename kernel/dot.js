#!/usr/bin/env bun
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { copyFile, lstat, mkdir, readlink, rename, rm, symlink } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"
import { $ } from "bun"
import { desktop, doctor as desktopDoctor, restore as restoreDesktop, save as saveDesktop, status as desktopStatus } from "./desktop/index.js"
import { bold, dim, green, mark, red, yellow } from "./ui.js"

const dot = resolve(import.meta.dir, "..")
const home = homedir()
const stamp = new Date().toISOString().replaceAll(/[-:T.Z]/g, "").slice(0, 14)

const brewfile = join(dot, "install", "brew.json")

function help() {
  const groups = [
    ["setup", [
      ["install", "brew install from install/brew.json (default: formulae; pass cask/all)"],
      ["link", "symlink home/ (incl. .config) into ~"],
      ["loader", "copy loader/@home/* into ~ (backs up anything it overwrites)"],
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
      ["doctor", "formulae tools + link state, or doctor <app> to inspect one recipe"],
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

function run(tool, args) {
  const result = spawnSync(tool, args, { stdio: "inherit" })
  if (result.status !== 0) throw new Error(`${tool} ${args.join(" ")} failed`)
}

async function catalog() {
  return Bun.file(brewfile).json()
}

function formula(spec) {
  if (typeof spec === "string") return { name: spec, cli: spec }
  const [[name, cli]] = Object.entries(spec)
  return { name, cli }
}

async function brews(group = "formulae") {
  const manifest = await catalog()
  const formulae = manifest.formulae.map(formula).map(({ name }) => name)
  if (group === "formulae") return { formulae, cask: [] }
  if (group === "cask") return { formulae: [], cask: manifest.cask }
  if (group === "all") return { formulae, cask: manifest.cask }
  throw Object.assign(new Error(`unknown install group: ${group}\nsupported install groups: ${Object.keys(manifest).join(", ")}, all`), { code: 2 })
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

// linker/@home mirrors $HOME verbatim and symlinks it in (linker/@home/.config/X → ~/.config/X)
async function links() {
  const root = join(dot, "linker", "@home")
  return (await files(root)).map(name => [join(root, name), join(home, name)])
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
  console.log(dim("run `dot loader` to place the ~ loaders"))
}

// loader/@home mirrors $HOME too, but the loaders are copied in, not linked
async function loaders() {
  const root = join(dot, "loader", "@home")
  return (await files(root)).map(name => [join(root, name), join(home, name)])
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

  for (const { cli } of (await catalog()).formulae.map(formula)) {
    if (!cli) continue
    const name = cli
    console.log(`${command(name) ? mark.ok : mark.bad} ${name}`)
  }

  for (const [source, target] of await links()) {
    const linked = await owned(target)
    console.log(`${linked ? mark.ok : mark.change} ${relative(dot, source)} ${dim(`→ ${relative(home, target)}`)}${linked ? "" : yellow(" external")}`)
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

async function install(group = "formulae") {
  const { formulae, cask } = await brews(group)

  if (formulae.length) run("brew", ["install", ...formulae])
  if (cask.length) run("brew", ["install", "--cask", ...cask])
}

async function macos(file = "defaults.zsh") {
  await $`zsh ${join(dot, "macos", file)}`
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
