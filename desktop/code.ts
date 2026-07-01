import { recipe } from "../kernel/desktop/recipe"

export default recipe("code", "Visual Studio Code.app", "Code/User", {
  files: ["settings.json"],
  available: c => c.app() && c.command("code"),
  async save(c) {
    const ids = (await c.output("code", ["--list-extensions"]))
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .sort()
      .join("\n")

    await c.write("extensions.txt", `${ids}\n`)
  },
  async restore(c) {
    for (const id of await c.lines("extensions.txt")) await c.run("code", ["--install-extension", id])
  },
  async ["@save"](c) {
    await c.write("extensions.txt")
  },
  async ["@restore"](c) {
    if (c.exists("extensions.txt")) console.log(`restore extensions from ${c.repo("extensions.txt")}`)
  },
})
