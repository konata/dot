import { platform, recipe, support } from "../kernel/desktop/recipe"

export default recipe("ghostty", "Ghostty.app", platform({
  darwin: support("com.mitchellh.ghostty"),
  default: ".config/ghostty",
}), {
  files: ["config"],
  available: c => c.command("ghostty") || c.app(),
})
