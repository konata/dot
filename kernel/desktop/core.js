import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { copyFile, lstat, mkdir, rename, rm } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"
import { bold, dim, green, mark, red, yellow } from "../ui.js"

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
  const recipe = recipes.find(recipe => recipe.id === String(id ?? "").toLowerCase())
  if (recipe) return recipe
  throw new CliError(`unknown desktop app: ${id ?? ""}\nsupported desktop apps: ${recipes.map(recipe => recipe.id).join(", ")}`, 2)
}

function context(recipe, options = {}) {
  const repo = (...parts) => join(dot, "backups", recipe.id, ...parts)
  const target = (...parts) => join(support, ...recipe.root, ...parts)
  const changes = []

  return {
    dry: options.dry ?? false,
    quiet: options.quiet ?? false,
    changes,
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
      if (options.dry) { changes.push(name); if (!options.quiet) console.log(`${mark.change} ${dim(relative(dot, repo(name)))} ${dim("(regenerate)")}`); return }
      if (existsSync(repo(name)) && (await Bun.file(repo(name)).text()) === text) return
      changes.push(name)
      await mkdir(dirname(repo(name)), { recursive: true })
      await Bun.write(repo(name), text)
      if (!options.quiet) console.log(`${mark.add} ${dim(relative(dot, repo(name)))}`)
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
    const live = await available(recipe, state)
    console.log(`${live ? mark.ok : mark.bad} ${recipe.id} ${dim(`(${label(recipe)})`)}`)
  }
}

export async function doctor(recipes, id) {
  const recipe = known(recipes, id)
  const state = context(recipe)

  const live = await available(recipe, state)
  console.log(bold(`${recipe.id} ${dim(`(${label(recipe)})`)}`))
  console.log(`${dim("app ")} ${appPath(recipe) ?? red("missing")}`)
  console.log(`${dim("root")} ${dim(state.target())}`)
  console.log(`${dim("repo")} ${dim(state.repo())}`)
  console.log(`${dim("live")} ${live ? green("yes") : red("no")}`)

  if (recipe.ignore.length) console.log(`${dim("ignore")} ${dim(recipe.ignore.join(", "))}`)

  if (!recipe.files.length) console.log(`${dim("files")} ${dim("all under root")}`)
  else for (const name of recipe.files) console.log(`${existsSync(state.target(name)) ? mark.ok : mark.skip} ${name}`)
}

// live-vs-backup drift per recipe: a quiet dry snapshot, reporting whether a save would change anything
export async function status(recipes, id) {
  for (const recipe of id ? [known(recipes, id)] : recipes) {
    const state = context(recipe, { dry: true, quiet: true })
    if (!(await available(recipe, state))) { console.log(`  ${mark.skip} ${recipe.id} ${dim("(unavailable)")}`); continue }
    await snapshot(recipe, state)
    const drift = state.changes.length
    console.log(`  ${drift ? mark.change : mark.ok} ${recipe.id} ${dim(drift ? `drift — dot save ${recipe.id}` : "in sync")}`)
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

  await snapshot(recipe, state)
  await (options.dry ? recipe["@save"]?.(state) : recipe.save?.(state))
  if (!state.changes.length) console.log(`${mark.skip} ${dim(`nothing to save for ${recipe.id}`)}`)
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

const GLOBBY = /[*?[\]{}]/

// expand include patterns into a set of file paths relative to base (a bare dir means everything under it)
async function expand(patterns, base) {
  const files = new Set()
  if (!existsSync(base)) return files
  for (const pattern of patterns) {
    let glob = pattern
    if (!GLOBBY.test(pattern)) {
      const stat = await lstat(join(base, pattern)).catch(() => null)
      if (!stat) continue
      if (!stat.isDirectory()) { files.add(pattern); continue }
      glob = `${pattern}/**`
    }
    for await (const rel of new Bun.Glob(glob).scan({ cwd: base, dot: true, onlyFiles: true })) files.add(rel)
  }
  return files
}

function excluder(recipe) {
  // never capture our own artifacts: .DS_Store and restore's <name>.bak.<stamp>
  const globs = ["**/.DS_Store", "**/*.bak.[0-9]*", ...recipe.ignore].map(pattern => new Bun.Glob(pattern))
  return rel => globs.some(glob => glob.match(rel))
}

// the files a recipe covers under base: includes (default everything) minus ignore
async function selection(recipe, base) {
  const excluded = excluder(recipe)
  const files = await expand(recipe.files.length ? recipe.files : ["**"], base)
  return [...files].filter(rel => !excluded(rel)).sort()
}

async function same(left, right) {
  const [a, b] = await Promise.all([Bun.file(left).bytes(), Bun.file(right).bytes()])
  return a.length === b.length && a.every((byte, index) => byte === b[index])
}

async function binary(path) {
  return (await Bun.file(path).bytes()).subarray(0, 8000).includes(0)
}

async function snapshot(recipe, state) {
  const rels = await selection(recipe, state.target())
  for (const rel of rels) {
    const source = state.target(rel)
    const dest = state.repo(rel)
    const present = existsSync(dest)
    if (present && (await same(source, dest))) continue
    state.changes.push(dest)
    if (!state.quiet) {
      console.log(`${present ? mark.change : mark.add} ${dim(relative(dot, dest))}`)
      if (await binary(source)) console.warn(`  ${mark.bad} ${yellow(`binary — ${relative(home, source)}`)}`)
    }
    if (state.dry) continue
    await mkdir(dirname(dest), { recursive: true })
    await copyFile(source, dest)
  }
  if (recipe.files.length) await prune(recipe, state, new Set(rels))
}

// drop backup files that fell out of an explicit directory/glob include; literal files and hook artifacts are left alone
async function prune(recipe, state, keep) {
  const scopes = []
  for (const pattern of recipe.files) {
    if (GLOBBY.test(pattern)) { scopes.push(new Bun.Glob(pattern)); continue }
    const stat = await lstat(state.repo(pattern)).catch(() => null)
    if (stat?.isDirectory()) scopes.push(new Bun.Glob(`${pattern}/**`))
  }
  if (!scopes.length || !existsSync(state.repo())) return
  for await (const rel of new Bun.Glob("**").scan({ cwd: state.repo(), dot: true, onlyFiles: true })) {
    if (keep.has(rel) || !scopes.some(glob => glob.match(rel))) continue
    state.changes.push(state.repo(rel))
    if (!state.quiet) console.log(`${mark.drop} ${dim(relative(dot, state.repo(rel)))}`)
    if (!state.dry) await rm(state.repo(rel), { force: true })
  }
}

async function recover(recipe, state) {
  const rels = await selection(recipe, state.repo())
  const stamp = new Date().toISOString().replaceAll(/[-:T.Z]/g, "").slice(0, 14)
  const saved = []
  for (const rel of rels) {
    const source = state.repo(rel)
    const target = state.target(rel)
    const present = existsSync(target)
    if (present && (await same(source, target))) continue
    state.changes.push(target)
    if (!state.quiet) console.log(`${present ? mark.change : mark.add} ${dim(relative(home, target))}`)
    if (state.dry) continue
    if (present) {
      const backup = `${target}.bak.${stamp}`
      await rename(target, backup)
      saved.push(relative(home, backup))
    }
    await mkdir(dirname(target), { recursive: true })
    await copyFile(source, target)
  }

  if (!state.changes.length) return console.log(`${mark.skip} ${dim(`nothing to restore for ${recipe.id}`)}`)
  if (saved.length && !state.quiet) {
    console.log(dim("moved aside before overwrite:"))
    for (const path of saved) console.log(`  ${mark.drop} ${dim(path)}`)
  }
}
