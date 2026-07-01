import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { doctor as inspect, list, restore as restoreRecipe, save as saveRecipe } from "./core.js"

const definitions = resolve(import.meta.dir, "../../desktop")
const recipes = await Array.fromAsync(new Bun.Glob("*.ts").scan({ cwd: definitions }))
  .then(files => Promise.all(files.sort().map(file => import(pathToFileURL(join(definitions, file)).href))))
  .then(modules => modules.map(module => module.default).sort((left, right) => left.id.localeCompare(right.id)))

export const desktop = () => list(recipes)
export const doctor = id => inspect(recipes, id)
export const save = (id, ...args) => saveRecipe(recipes, id, ...args)
export const restore = (id, ...args) => restoreRecipe(recipes, id, ...args)
