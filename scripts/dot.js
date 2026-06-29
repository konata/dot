#!/usr/bin/env bun
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { chmod, copyFile, lstat, mkdir, readlink, rename, rm, symlink } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"
import { $ } from "bun"

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
  console.log(`usage: dot <command>

commands:
	  doctor   show missing core tools and link state
	  install  brew bundle install/Brewfile.core
	  link     link home/* and config/*, copy bin/* into ~/bin
	  macos    apply low-side-effect macOS defaults
	  macos:opinionated
	           apply personal macOS preferences
	  unlink   remove links owned by this tree`)
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
  try {
    return await Bun.file(source).text() === await Bun.file(target).text()
  } catch {
    return false
  }
}

async function files(root) {
  return Array.fromAsync(new Bun.Glob("**/*").scan({ cwd: root, onlyFiles: true, dot: true }))
    .then(names => names.filter(name => !name.includes(".DS_Store")))
}

async function links() {
  const homes = (await files(join(dot, "home")))
    .map(name => [join(dot, "home", name), join(home, name)])

  const configs = (await files(join(dot, "config")))
    .map(name => [join(dot, "config", name), join(home, ".config", name)])

  return [...homes, ...configs]
}

async function connect(source, target) {
  const stat = await lstat(target).catch(() => null)

  if (stat?.isSymbolicLink()) {
    const current = resolve(dirname(target), await readlink(target))
    if (current === source) return console.log(`ok ${target}`)
    await rm(target)
  } else if (stat) {
    await rename(target, `${target}.bak.${stamp}`)
  }

  await mkdir(dirname(target), { recursive: true })
  await symlink(source, target)
  console.log(`link ${target} -> ${source}`)
}

async function link() {
  for (const pair of await links()) await connect(...pair)
  await copyBins()
  console.log("examples/ contains starter files; copy them manually when needed")
}

async function unlink() {
  for (const [, target] of await links()) {
    if (!(await owned(target))) continue
    await rm(target)
    console.log(`unlink ${target}`)
  }
}

async function doctor() {
  console.log(`dot: ${dot}`)
  console.log(`shim: ${existsSync(join(home, ".zshrc")) ? "~/.zshrc exists" : "~/.zshrc missing"}`)
  console.log(`bin: ${await binState()}`)

  for (const name of commands) {
    console.log(`${command(name) ? "ok" : "missing"} ${name}`)
  }

  for (const [source, target] of await links()) {
    const name = relative(dot, source)
    console.log(`${await owned(target) ? "owned" : "external"} ${name} -> ${target}`)
  }

  for (const [source, target] of await bins()) {
    console.log(`${await same(source, target) ? "copied" : "external"} ${relative(dot, source)} -> ${target}`)
  }
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
    console.log(`copy ${target} <- ${source}`)
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

  if (stat?.isSymbolicLink()) {
    await rename(target, `${target}.bak.${stamp}`)
  } else if (stat && !stat.isDirectory()) {
    await rename(target, `${target}.bak.${stamp}`)
  }

  await mkdir(target, { recursive: true })
}

const tasks = {
  doctor,
  install,
  link,
  unlink,
  macos,
  "macos:opinionated": () => macos("opinionated.zsh"),
}
const task = process.argv[2] ?? "help"

if (task === "help" || task === "-h" || task === "--help") {
  help()
} else if (tasks[task]) {
  await tasks[task]()
} else {
  help()
  process.exitCode = 2
}
