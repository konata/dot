import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { copyFile, lstat, mkdir, readdir, rename, rm } from "node:fs/promises"
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

function appPath(recipe) {
  return [join("/Applications", recipe.app), join(home, "Applications", recipe.app)]
    .find(path => existsSync(path))
}

function label(recipe) {
  return recipe.app.replace(/\.app$/, "")
}

function known(recipes, id) {
  const recipe = new Map(recipes.map(recipe => [recipe.id, recipe])).get(String(id ?? "").toLowerCase())
  if (recipe) return recipe
  throw new CliError(`unknown desktop app: ${id ?? ""}\nsupported desktop apps: ${recipes.map(recipe => recipe.id).join(", ")}`, 2)
}

function context(recipe, options = {}) {
  const repo = (...parts) => join(dot, "backups", recipe.id, ...parts)
  const target = (...parts) => join(support, ...recipe.root, ...parts)

  return {
    dry: options.dry ?? false,
    app: () => Boolean(appPath(recipe)),
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
      if (options.dry) return console.log(`save generated ${relative(dot, repo(name))}`)
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

async function available(recipe, state = context(recipe)) {
  return recipe.available ? await recipe.available(state) : state.app()
}

export async function list(recipes) {
  for (const recipe of recipes) {
    const state = context(recipe)
    console.log(`${await available(recipe, state) ? "ok" : "missing"} ${recipe.id} (${label(recipe)})`)
  }
}

export async function doctor(recipes, id) {
  const recipe = known(recipes, id)
  const state = context(recipe)

  console.log(`${recipe.id}: ${label(recipe)}`)
  console.log(`app: ${appPath(recipe) ?? "missing"}`)
  console.log(`root: ${state.target()}`)
  console.log(`repo: ${state.repo()}`)
  console.log(`available: ${await available(recipe, state) ? "yes" : "no"}`)

  for (const name of recipe.files ?? []) {
    console.log(`${existsSync(state.target(name)) ? "source" : "missing"} ${name}`)
  }
}

export async function save(recipes, id, ...args) {
  const recipe = known(recipes, id)
  const options = {
    dry: args.includes("--dry"),
  }
  const unknown = args.filter(arg => arg !== "--dry")
  if (unknown.length) throw new CliError(`unknown save option: ${unknown.join(" ")}`)

  const state = context(recipe, options)
  if (!(await available(recipe, state))) throw new CliError(`${recipe.id} is not available`)

  if (!options.dry) {
    await rm(state.repo(), { recursive: true, force: true })
    await mkdir(state.repo(), { recursive: true })
  }

  await snapshot(recipe, state)
  await (options.dry ? recipe["@save"]?.(state) : recipe.save?.(state))
}

export async function restore(recipes, id, ...args) {
  const recipe = known(recipes, id)
  const options = {
    dry: args.includes("--dry"),
  }
  const unknown = args.filter(arg => arg !== "--dry")
  if (unknown.length) throw new CliError(`unknown restore option: ${unknown.join(" ")}`)

  const state = context(recipe, options)
  if (!(await available(recipe, state))) throw new CliError(`${recipe.id} is not available`)
  await recover(recipe, state)
  await (options.dry ? recipe["@restore"]?.(state) : recipe.restore?.(state))
}

async function snapshot(recipe, state) {
  for (const name of recipe.files ?? []) {
    const source = state.target(name)
    const stat = await lstat(source).catch(() => null)
    if (!stat) {
      console.log(`skip missing ${source}`)
      continue
    }

    if (state.dry) {
      await preview(source, state.repo(name))
      continue
    }

    await copy(source, state.repo(name), { overwrite: true })
    console.log(`save ${relative(home, source)} -> ${relative(dot, state.repo(name))}`)
  }
}

async function recover(recipe, state) {
  if (!recipe.files?.length) return

  const entries = await plan(recipe, state.repo, state.target)
  if (!entries.length) return console.log(`nothing to restore for ${recipe.id}`)

  report(entries)
  if (state.dry) return

  const stamp = new Date().toISOString().replaceAll(/[-:T.Z]/g, "").slice(0, 14)
  const saved = []
  for (const { action, source, target } of entries) {
    if (action === "mkdir") {
      await mkdir(target, { recursive: true })
      continue
    }
    if (action === "overwrite") {
      const backup = `${target}.bak.${stamp}`
      await rename(target, backup)
      saved.push(relative(home, backup))
    }
    await copy(source, target, { overwrite: true })
  }

  if (saved.length) {
    console.log("moved existing files aside before overwrite:")
    for (const path of saved) console.log(`  ${path}`)
  }
}

async function plan(recipe, repo, target) {
  const entries = []

  for (const name of recipe.files ?? []) {
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
  for (const { action, target } of entries) console.log(`${action} ${target}`)
}

async function same(left, right) {
  const [a, b] = await Promise.all([Bun.file(left).bytes(), Bun.file(right).bytes()])
  return a.length === b.length && a.every((byte, index) => byte === b[index])
}

async function walk(source, target, entries) {
  const sourceStat = await lstat(source)
  const targetStat = await lstat(target).catch(() => null)

  if (sourceStat.isDirectory()) {
    if (targetStat && !targetStat.isDirectory()) {
      entries.push({ action: "overwrite", source, target })
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
  if (targetStat.isDirectory()) return entries.push({ action: "overwrite", source, target })
  if (await same(source, target)) return
  entries.push({ action: "overwrite", source, target })
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
