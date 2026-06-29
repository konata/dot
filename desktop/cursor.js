export default {
  id: "cursor",
  app: "Cursor.app",
  root: ["Cursor", "User"],
  files: ["settings.json", "keybindings.json", "snippets"],
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
  async _save(context) {
    await context.write("extensions.txt")
  },
  async _restore(context) {
    if (context.exists("extensions.txt")) console.log(`restore extensions from ${context.repo("extensions.txt")}`)
  },
}
