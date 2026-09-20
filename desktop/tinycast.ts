import { homedir } from "node:os"
import { join } from "node:path"
import { recipe, support } from "../kernel/desktop/recipe"

// Settings, hotkeys and custom commands live in the defaults plist — captured
// as xml1 text for diffable snapshots; per-extension preferences are plain JSON
// under extension-data/.
const plist = join(homedir(), "Library/Preferences/com.tinycast.app.plist")

export default recipe("tinycast", "Tinycast.app", support("com.tinycast.app"), {
  files: ["extension-data"],
  async save(c) {
    await c.write("settings.plist", await c.output("plutil", ["-convert", "xml1", "-o", "-", plist]))
  },
  async restore(c) {
    await c.run("defaults", ["import", "com.tinycast.app", c.repo("settings.plist")])
  },
  async ["@save"](c) {
    await c.write("settings.plist")
  },
  async ["@restore"](c) {
    if (c.exists("settings.plist")) console.log(`restore defaults from ${c.repo("settings.plist")}`)
  },
})
