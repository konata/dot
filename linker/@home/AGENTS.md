## Code Style

When writing or rewriting code for this user, follow these language-agnostic style rules unless the user's explicit request says otherwise.

Prefer domain names over mechanical role names. Identifiers should say what the value is in the problem domain, not merely how it is used inside the function. Prefer one precise word for variables, functions, and classes; fall back to two words only when one word loses important meaning. Avoid mechanical verb+noun, gerund+noun, and noun+noun piles when the receiver, type, argument, or surrounding module already supplies that context: prefer `shared()` over `getInstance()`, `echo()` over `writeLog()`, and `from(String)` over `fromString(String str)`. Replace placeholder names like `data`, `item`, `tmp`, `arg`, `dst`, `manager`, or abbreviated forms as soon as a precise domain word exists. Avoid abbreviations; if the full word feels too long, choose a better word instead of shortening it.

Trust the language's idioms, especially when they make the code shorter. Use the most natural, expressive primitives of the language and ecosystem in front of you: destructuring, pattern matching, comprehensions, iterator chains, generators, coroutines, async/await, option/result helpers, context managers, query builders, standard parsers, typed APIs, or framework-native helpers when they fit. Prefer the idiom that removes boilerplate while preserving the main idea. Do not write Java-style code in Python, Python-style code in TypeScript, callback-style code where async/await is clearer, imperative boilerplate in a functional language, or string hacks where the language has a structured tool.

For local scripts, one-off automation, validation helpers, data transforms, and other code meant to be run directly, prefer Bun with JavaScript when it is practical. If Bun/JavaScript and Python are equally suitable for the task, choose Bun/JavaScript. Use Python only when it has a clear practical advantage, such as an existing project context, a required library, or substantially simpler implementation.

Prefer dense, readable code over verbose ceremony. Short code is desirable when it stays clear. Collapse simple expressions, guards, adapters, and tiny callbacks to one line when they fit at a reasonable width. Multi-statement one-liners are acceptable in languages where they are idiomatic and do not hide control flow. Do not expand three obvious lines into twelve "for readability"; real readability comes from good names, locality, and idiom.

Use early exits for guards and keep the happy path flat. Handle exceptional, empty, or already-done cases first, then let the main behavior fall through without needless nesting. A compact guard is better than an `if/else` that gives equal visual weight to the rare path and the normal path.

Prefer expression/functional composition when it clarifies the flow. Use map/filter/reduce-style operations, pipelines, fluent chains, comprehensions, and small local expressions to turn data step by step. Do not force loops, mutable temporaries, and staged setup variables when the language has a clear expression form. Conversely, do not perform clever functional contortions when a direct loop is the idiomatically clearest answer.

Keep the main flow linear. The decisive path should read top-to-bottom with as little jumping as possible, including asynchronous code. Prefer `async`/`await`, coroutines, generators, streams, task groups, and structured concurrency when they express the workflow linearly. Avoid scattering the primary story across callbacks, event handlers, nested promises, distant helpers, mutable shared state, or framework ceremony when a short sequential expression can show the same logic directly.

Do not abstract prematurely. Extract a helper only when it has multiple real call sites, when it names a concept that genuinely clarifies the code, or when it isolates a meaningful boundary. One-off wrappers, single-use templates, and generic "utility" functions are noise when the inline code is already clear.

Avoid defensive padding and fake robustness. Do not add null checks, existence checks, fallback defaults, validation helpers, logs, retries, catch-all branches, or compatibility shims for states that the surrounding code already guarantees or that can reasonably be inferred as irrelevant. Correct-but-useless code is still noise. If an invariant is guaranteed, trust it. If it is not guaranteed and matters, fail loudly with a useful error instead of silently continuing.

Destructure and name structure directly. Prefer destructuring, named fields, typed records, pattern matching, tuple/object unpacking, enum variants, tagged unions, `match`/`case`, iterator yields, coroutine results, and async task results over repeated indexing like `parts[0]`, tuple position guessing, callback payload spelunking, or dictionary spelunking. Let the code show the shape of the data at the point it is unpacked.

Keep literals and templates visually aligned with their surrounding code. Multi-line strings, embedded queries, generated snippets, and structured literals should preserve readable indentation in source while using the language's normal dedent/strip/template mechanism to produce clean output.

Comments must be high-signal or absent. Keep comments that explain intent, invariants, tradeoffs, surprising constraints, or file/section purpose. Delete comments that narrate the line, restate names, preserve dead code, or explain what the language syntax already says.

Name configuration by data shape, not by consumer action. Keys, fields, and options should describe the thing they contain, not the verb a downstream caller performs on it. If the container or type already communicates "pattern", "handler", "path", or "factory", do not repeat that in every key unless it disambiguates real alternatives.

Overall philosophy: trust the reader, trust the inputs that are actually guaranteed, trust reasonable inference, and trust the language. The preferred result is compact, idiomatic, domain-named code with a short linear main flow and very little ceremony. Every extra branch, helper, fallback, log, compatibility path, comment, or temporary variable is a claim that the reader must care about it; make that claim only when it is true.

