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

// files defaults to everything under root; ignore prunes from it (exclude wins)
export function recipe(id: string, app: string, root: string, options: Options = {}): Recipe {
  return { id, app, root: root.split("/"), ...options, files: options.files ?? [], ignore: options.ignore ?? [] }
}
