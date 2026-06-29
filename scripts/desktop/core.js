import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { copyFile, lstat, mkdir, readdir, rm } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"

const dot = resolve(import.meta.dir, "../..")
const home = homedir()
const support = join(home, "Library", "Application Support")

class CliError extends Error {
  constructor(message, code = 1) {
    super(message)
    this.code = code
  }
}

function command(name) {
  return spawnSync("zsh", ["-lc", `command -v ${name}`], { stdio: "ignore" }).status === 0
}

function appPath(adapter) {
  return [join("/Applications", adapter.app), join(home, "Applications", adapter.app)]
    .find(path => existsSync(path))
}

function label(adapter) {
  return adapter.app.replace(/\.app$/, "")
}

function known(adapters, id) {
  const adapter = new Map(adapters.map(adapter => [adapter.id, adapter])).get(String(id ?? "").toLowerCase())
  if (adapter) return adapter
  throw new CliError(`unknown desktop app: ${id ?? ""}\nsupported desktop apps: ${adapters.map(adapter => adapter.id).join(", ")}`, 2)
}

function context(adapter, options = {}) {
  const repo = (...parts) => join(dot, "backups", adapter.id, ...parts)
  const target = (...parts) => join(support, ...adapter.root, ...parts)

  return {
    force: options.force ?? false,
    dryRun: options.dryRun ?? false,
    app: () => Boolean(appPath(adapter)),
    command,
    exists: name => existsSync(repo(name)),
    async output(tool, args) {
      const result = spawnSync(tool, args, { encoding: "utf8" })
      if (result.status === 0) return result.stdout
      throw new CliError((result.stderr || `${tool} ${args.join(" ")} failed`).trim())
    },
    async run(tool, args) {
      const result = spawnSync(tool, args, { stdio: "inherit" })
      if (result.status !== 0) throw new CliError(`${tool} ${args.join(" ")} failed`)
    },
    async write(name, text) {
      if (options.dryRun) return console.log(`save generated ${relative(dot, repo(name))}`)
      await mkdir(dirname(repo(name)), { recursive: true })
      await Bun.write(repo(name), text)
      console.log(`write ${relative(dot, repo(name))}`)
    },
    async lines(name) {
      return Bun.file(repo(name)).text()
        .then(text => text.split(/\r?\n/).map(line => line.trim()).filter(Boolean))
        .catch(() => [])
    },
    repo,
    target,
  }
}

async function available(adapter, state = context(adapter)) {
  return adapter.available ? await adapter.available(state) : state.app()
}

export async function list(adapters) {
  for (const adapter of adapters) {
    const state = context(adapter)
    console.log(`${await available(adapter, state) ? "ok" : "missing"} ${adapter.id} (${label(adapter)})`)
  }
}

export async function doctor(adapters, id) {
  const adapter = known(adapters, id)
  const state = context(adapter)

  console.log(`${adapter.id}: ${label(adapter)}`)
  console.log(`app: ${appPath(adapter) ?? "missing"}`)
  console.log(`root: ${state.target()}`)
  console.log(`repo: ${state.repo()}`)
  console.log(`available: ${await available(adapter, state) ? "yes" : "no"}`)

  for (const name of adapter.files ?? []) {
    console.log(`${existsSync(state.target(name)) ? "source" : "missing"} ${name}`)
  }
}

export async function save(adapters, id, ...args) {
  const adapter = known(adapters, id)
  const options = {
    dryRun: args.includes("--dry-run"),
  }
  const unknown = args.filter(arg => arg !== "--dry-run")
  if (unknown.length) throw new CliError(`unknown save option: ${unknown.join(" ")}`)

  const state = context(adapter, options)
  if (!(await available(adapter, state))) throw new CliError(`${adapter.id} is not available`)

  if (!options.dryRun) {
    await rm(state.repo(), { recursive: true, force: true })
    await mkdir(state.repo(), { recursive: true })
  }

  await snapshot(adapter, state)
  await (options.dryRun ? adapter._save?.(state) : adapter.save?.(state))
}

export async function restore(adapters, id, ...args) {
  const adapter = known(adapters, id)
  const options = {
    force: args.includes("--force"),
    dryRun: args.includes("--dry-run"),
  }
  const unknown = args.filter(arg => !["--force", "--dry-run"].includes(arg))
  if (unknown.length) throw new CliError(`unknown restore option: ${unknown.join(" ")}`)

  const state = context(adapter, options)
  if (!(await available(adapter, state))) throw new CliError(`${adapter.id} is not available`)
  await recover(adapter, state)
  await (options.dryRun ? adapter._restore?.(state) : adapter.restore?.(state))
}

async function snapshot(adapter, state) {
  for (const name of adapter.files ?? []) {
    const source = state.target(name)
    const stat = await lstat(source).catch(() => null)
    if (!stat) {
      console.log(`skip missing ${source}`)
      continue
    }

    if (state.dryRun) {
      await preview(source, state.repo(name))
      continue
    }

    await copy(source, state.repo(name), { overwrite: true })
    console.log(`save ${relative(home, source)} -> ${relative(dot, state.repo(name))}`)
  }
}

async function recover(adapter, state) {
  if (!adapter.files?.length) return

  const entries = await plan(adapter, state.repo, state.target)
  const conflicts = entries.filter(entry => entry.action === "conflict")

  if (conflicts.length && !state.force && !state.dryRun) {
    console.error("restore would overwrite existing files:")
    for (const entry of conflicts) console.error(`  ${entry.target}`)
    console.error("rerun with --force to allow these writes")
    throw new CliError("")
  }

  if (!entries.length) return console.log(`nothing to restore for ${adapter.id}`)

  report(entries)
  if (state.dryRun) return

  for (const name of adapter.files ?? []) {
    const source = state.repo(name)
    if (!existsSync(source)) continue
    await copy(source, state.target(name), { overwrite: state.force })
  }
}

async function plan(adapter, repo, target) {
  const entries = []

  for (const name of adapter.files ?? []) {
    const source = repo(name)
    const stat = await lstat(source).catch(() => null)
    if (!stat) continue
    await walk(source, target(name), entries)
  }

  return entries
}

async function preview(source, target) {
  const stat = await lstat(source)
  if (!stat.isDirectory()) return console.log(`save ${relative(home, source)} -> ${relative(dot, target)}`)

  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue
    await preview(join(source, entry.name), join(target, entry.name))
  }
}

function report(entries) {
  for (const entry of entries) {
    const verb = entry.action === "conflict" ? "overwrite" : entry.action
    console.log(`${verb} ${entry.target}`)
  }
}

async function walk(source, target, entries) {
  const sourceStat = await lstat(source)
  const targetStat = await lstat(target).catch(() => null)

  if (sourceStat.isDirectory()) {
    if (targetStat && !targetStat.isDirectory()) {
      entries.push({ action: "conflict", source, target })
      return
    }

    if (!targetStat) entries.push({ action: "mkdir", source, target })

    for (const entry of await readdir(source, { withFileTypes: true })) {
      if (entry.name === ".DS_Store") continue
      await walk(join(source, entry.name), join(target, entry.name), entries)
    }
    return
  }

  if (!targetStat) return entries.push({ action: "write", source, target })
  entries.push({ action: "conflict", source, target })
}

async function copy(source, target, options = {}) {
  const sourceStat = await lstat(source)
  const targetStat = await lstat(target).catch(() => null)

  if (sourceStat.isDirectory()) {
    if (targetStat && !targetStat.isDirectory()) {
      if (!options.overwrite) throw new Error(`target exists: ${target}`)
      await rm(target, { recursive: true, force: true })
    }

    await mkdir(target, { recursive: true })
    for (const entry of await readdir(source, { withFileTypes: true })) {
      if (entry.name === ".DS_Store") continue
      await copy(join(source, entry.name), join(target, entry.name), options)
    }
    return
  }

  if (targetStat) {
    if (!options.overwrite) throw new Error(`target exists: ${target}`)
    await rm(target, { recursive: true, force: true })
  }

  await mkdir(dirname(target), { recursive: true })
  await copyFile(source, target)
}
