export type Context = {
  dry: boolean
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

type Hooks = {
  available?(context: Context): boolean | Promise<boolean>
  save?: Step
  restore?: Step
  ["@save"]?: Step
  ["@restore"]?: Step
}

export type Recipe = { id: string; app: string; root: string[]; files: string[] } & Hooks

export function recipe(id: string, app: string, root: string, files: string[] = [], hooks: Hooks = {}): Recipe {
  return { id, app, root: root.split("/"), files, ...hooks }
}
