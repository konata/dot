import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { doctor as inspect, list, restore as restoreAdapter, save as saveAdapter } from "./core.js"

const definitions = resolve(import.meta.dir, "../../desktop")
const adapters = await Array.fromAsync(new Bun.Glob("*.js").scan({ cwd: definitions }))
  .then(files => Promise.all(files.sort().map(file => import(pathToFileURL(join(definitions, file)).href))))
  .then(modules => modules.map(module => module.default).sort((left, right) => left.id.localeCompare(right.id)))

export const desktop = () => list(adapters)
export const doctor = id => inspect(adapters, id)
export const save = (id, ...args) => saveAdapter(adapters, id, ...args)
export const restore = (id, ...args) => restoreAdapter(adapters, id, ...args)
