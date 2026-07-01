import { recipe } from "../scripts/desktop/recipe"

export default recipe("kiro", "Kiro.app", "Kiro/User",
  ["settings.json"],
  {
    available: context => context.app() && context.command("kiro"),
    async save(context) {
      const extensions = (await context.output("kiro", ["--list-extensions"]))
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .sort()
        .join("\n")

      await context.write("extensions.txt", `${extensions}\n`)
    },
    async restore(context) {
      for (const extension of await context.lines("extensions.txt")) {
        await context.run("kiro", ["--install-extension", extension])
      }
    },
    async ["@save"](context) {
      await context.write("extensions.txt")
    },
    async ["@restore"](context) {
      if (context.exists("extensions.txt")) console.log(`restore extensions from ${context.repo("extensions.txt")}`)
    },
  })
