import { recipe } from "../scripts/desktop/recipe"

export default recipe("cursor", "Cursor.app", "Cursor/User",
  ["settings.json", "keybindings.json", "snippets"],
  {
    available: context => context.app() && context.command("cursor"),
    async save(context) {
      const extensions = (await context.output("cursor", ["--list-extensions"]))
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .sort()
        .join("\n")

      await context.write("extensions.txt", `${extensions}\n`)
    },
    async restore(context) {
      for (const extension of await context.lines("extensions.txt")) {
        await context.run("cursor", ["--install-extension", extension])
      }
    },
    async ["@save"](context) {
      await context.write("extensions.txt")
    },
    async ["@restore"](context) {
      if (context.exists("extensions.txt")) console.log(`restore extensions from ${context.repo("extensions.txt")}`)
    },
  })
