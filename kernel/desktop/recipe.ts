export type Context = {
  dry: boolean
  quiet: boolean
  changes: string[]
  app(): boolean
  command(name: string): boolean
  exists(name: string): boolean
  output(tool: string, args: string[]): Promise<string>
  run(tool: string, args: string[]): Promise<void>
  write(name: string, text?: string): Promise<void>
  lines(name: string): Promise<string[]>
  repo(...parts: string[]): string
  target(...parts: string[]): string
}

type Step = (context: Context) => void | Promise<void>

type Options = {
  files?: string[]
  ignore?: string[]
  available?(context: Context): boolean | Promise<boolean>
  save?: Step
  restore?: Step
  ["@save"]?: Step
  ["@restore"]?: Step
}

export type Recipe = { id: string; app: string; root: string[]; files: string[]; ignore: string[] } & Options

// root is relative to $HOME; use support() for the common ~/Library/Application Support case
export function recipe(id: string, app: string, root: string, options: Options = {}): Recipe {
  return { id, app, root: root.split("/"), ...options, files: options.files ?? [], ignore: options.ignore ?? [] }
}

// a path under ~/Library/Application Support, as a $HOME-relative root
export function support(path: string): string {
  return `Library/Application Support/${path}`
}

// VS Code-family editors live in Application Support; back up settings + the extension list via the CLI
export function vscodish(id: string, app: string, root: string, cli: string, files: string[] = ["settings.json"]): Recipe {
  return recipe(id, app, support(root), {
    files,
    available: c => c.app() && c.command(cli),
    async save(c) {
      const ids = (await c.output(cli, ["--list-extensions"])).split(/\r?\n/).map(line => line.trim()).filter(Boolean).sort().join("\n")
      await c.write("extensions.txt", `${ids}\n`)
    },
    async restore(c) {
      for (const id of await c.lines("extensions.txt")) await c.run(cli, ["--install-extension", id])
    },
    async ["@save"](c) { await c.write("extensions.txt") },
    async ["@restore"](c) {
      if (c.exists("extensions.txt")) console.log(`restore extensions from ${c.repo("extensions.txt")}`)
    },
  })
}
