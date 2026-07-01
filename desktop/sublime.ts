import { recipe } from "../kernel/desktop/recipe"

export default recipe("sublime", "Sublime Text.app", "Sublime Text/Packages/User", {
  files: [
    "Preferences.sublime-settings",
    "Default (OSX).sublime-keymap",
    "Package Control.sublime-settings",
  ],
})
