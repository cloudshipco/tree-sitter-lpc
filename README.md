# tree-sitter-lpc

A [tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for LPC (Lars Pensjo C), specifically the LDMud flavor used in MUD development.

## Features

- Full LPC syntax support including:
  - Function definitions and declarations
  - Variable declarations with modifiers (`static`, `private`, `nosave`, etc.)
  - Control flow (`if`, `while`, `for`, `foreach`, `switch`, `do-while`)
  - LPC-specific constructs:
    - `inherit` statements
    - Array literals `({ 1, 2, 3 })`
    - Mapping literals `([ "key": value ])`
    - Closure literals `(: expression :)`
    - Function references `#'function_name`
    - Closure arguments `$1`, `$2`, etc.
    - Range subscripts `array[0..5]`
    - Case ranges `case 1..10:`
    - Union types `object|int *find(string|int key)`
    - Default parameter values `void f(int x = 1)`
    - `foreach` variants (inferred type, key/value pairs, multi-value mappings)
    - `catch` expressions (including modifiers like `catch(expr; publish)`)
  - Preprocessor directives (`#include`, `#define`, `#ifdef`, `#pragma`, etc.),
    including multi-line `#define` with backslash continuations

## Installation

### Prerequisites

- Node.js 18+
- tree-sitter CLI: `npm install -g tree-sitter-cli`
- [Topiary](https://topiary.tweag.io/) for formatting: `cargo install topiary-cli`

### Build

```bash
npm install

# Generate parser
npx tree-sitter generate

# Build WASM (for Node.js tools)
npx tree-sitter build --wasm

# Build native library (for Topiary)
cc -shared -fPIC -I src src/parser.c -o libtree-sitter-lpc.dylib  # macOS
cc -shared -fPIC -I src src/parser.c -o libtree-sitter-lpc.so     # Linux
```

## Command-Line Tools

### lpc-fmt

Format and check LPC files:

```bash
# Check syntax (errors and warnings)
./bin/lpc-fmt check file.c

# Check a whole directory recursively, errors only, report to a file
./bin/lpc-fmt check -q -o report.txt src/

# Format to stdout
./bin/lpc-fmt format file.c

# Format in place
./bin/lpc-fmt format -w file.c

# Format a whole directory in place (parallel, with progress bar)
./bin/lpc-fmt format -w src/

# Format from stdin
cat file.c | ./bin/lpc-fmt format
```

Options:

- `-w, --write` — write formatted output back to the file
- `--level=error|warning` — minimum level to report (default: `warning`)
- `-q, --quiet` — errors only (same as `--level=error`)
- `-o, --output=FILE` — write the check report to a file
- `--no-progress` — disable the progress indicator

`check` reports parse errors with context (e.g. ``Unexpected `foo` in function
definition``) plus warnings such as non-standard string escape sequences.
Files with preprocessor directives inside function bodies are skipped by
`format` — they can't be formatted safely.

### tree-sitter parse

View the AST of a file:

```bash
npx tree-sitter parse file.c
```

## Formatting Style

The formatter applies:

- **2-space indentation**
- **Spaces around operators**: `a + b`, `x == y`, `x = 1`
- **Spaces after keywords**: `if (`, `for (`, `return `
- **Spaces after commas**: `foo(a, b, c)`
- **Braces on control statements**: Single-statement `if`/`while`/`for` get
  braces, at any nesting depth
- **Blank lines**: After block statements, before `return`, and before block
  statements (`if`/`while`/`for`/`switch`) that follow a plain statement —
  but never directly after a `case` label; top-level functions get a blank
  line before their doc-comment group
- **Case body indentation**: Code inside `case:` is indented
- **Array/mapping spacing**: `({ 1, 2, 3 })` preserves internal spaces
- **Multi-line preservation**: Arrays/mappings written across multiple lines stay multi-line
- **String concatenation**: Implicit `"a" "b"` becomes explicit `"a" + "b"`
- **Line continuations**: Backslash-newline inside strings is preserved

## Language Server (LSP)

Provides diagnostics (parse errors) and formatting for editors.

### Setup

```bash
cd lsp
npm install
npm run build
```

### Neovim Configuration

```lua
-- In your Neovim config
vim.api.nvim_create_autocmd({ "BufRead", "BufNewFile" }, {
  pattern = { "*.c" },
  callback = function()
    -- Only set filetype to lpc for files in your MUD directories
    local path = vim.fn.expand("%:p")
    if path:match("mudlib") or path:match("your%-mud%-dir") then
      vim.bo.filetype = "lpc"
    end
  end,
})

vim.api.nvim_create_autocmd("FileType", {
  pattern = "lpc",
  callback = function()
    vim.lsp.start({
      name = "lpc-lsp",
      cmd = { "node", vim.fn.expand("~/path/to/tree-sitter-lpc/lsp/dist/server.js"), "--stdio" },
      root_dir = vim.fn.getcwd(),
    })
  end,
})
```

## Testing

Run the grammar corpus tests (in `test/corpus/`):

```bash
npx tree-sitter test
```

Run the formatter test suite:

```bash
node test/formatter/test-formatter.js
```

## Project Structure

```
tree-sitter-lpc/
├── grammar.js              # Tree-sitter grammar definition
├── src/parser.c            # Generated parser (do not edit)
├── bin/lpc-fmt             # CLI formatting tool
├── lib/transform.js        # Shared transform/post-processing functions
├── queries/
│   ├── formatting.scm      # Topiary formatting rules
│   └── highlights.scm      # Syntax highlighting
├── lsp/
│   └── src/server.ts       # Language server
├── test/
│   ├── corpus/             # Grammar test cases (tree-sitter test)
│   └── formatter/          # Formatter test suite
├── .topiary/
│   └── languages.ncl       # Topiary language configuration
└── nvim-setup.lua          # Neovim configuration example
```

## Known Limitations

- ANSI color macro concatenation patterns (`RED_F"text"`) are not supported
  (these are invalid in recent LDMud versions anyway)
- Some complex preprocessor usage may not parse correctly
- Files with preprocessor conditionals inside function bodies are skipped by
  the formatter (reformatting around `#ifdef` branches isn't safe)
- No semantic analysis (type checking, unused variable detection)

## Future Ideas

- Static type checking
- Go to definition / find references
- Code completion
- Unused variable warnings

## License

MIT

## See Also

- [Tree-sitter](https://tree-sitter.github.io/tree-sitter/)
- [Topiary](https://topiary.tweag.io/)
- [LDMud](https://www.ldmud.eu/)
