import { plistish } from "../kernel/desktop/recipe"

// All settings and shortcuts live in the defaults plist; the support root holds
// only AppCenter telemetry, and the license plist stays out on purpose.
export default plistish("alttab", "AltTab.app", "com.lwouis.alt-tab-macos")
