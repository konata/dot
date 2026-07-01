const enabled = (process.stdout.isTTY || process.env.FORCE_COLOR) && !process.env.NO_COLOR && process.env.TERM !== "dumb"
const paint = code => text => (enabled ? `\x1b[${code}m${text}\x1b[0m` : text)

export const dim = paint("2")
export const bold = paint("1")
export const green = paint("32")
export const yellow = paint("33")
export const red = paint("31")

// status glyphs — green present/add, yellow change/drop, dim skip, red absent
export const mark = {
  ok: green("✓"),
  add: green("+"),
  change: yellow("~"),
  drop: yellow("-"),
  skip: dim("·"),
  bad: red("✗"),
}
