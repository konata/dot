import { recipe, support } from "../kernel/desktop/recipe"

export default recipe("ghostty", "Ghostty.app", support("com.mitchellh.ghostty"), {
  files: ["config"],
})
