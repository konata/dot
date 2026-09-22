import { plistish } from "../kernel/desktop/recipe"

// Settings, hotkeys and custom commands live in the defaults plist;
// per-extension preferences are plain JSON under extension-data/.
export default plistish("tinycast", "Tinycast.app", "com.tinycast.app", ["extension-data"])
