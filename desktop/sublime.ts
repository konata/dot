import { platform, recipe, support } from "../kernel/desktop/recipe"

export default recipe("sublime", "Sublime Text.app", platform({
  darwin: support("Sublime Text/Packages/User"),
  default: ".config/sublime-text/Packages/User",
}), {
  files: [
    "Preferences.sublime-settings",
    "Package Control.sublime-settings",
  ],
  available: c => c.command("subl"),
})
