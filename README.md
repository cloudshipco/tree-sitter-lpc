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
  - Preprocessor directives (`#include`, `#define`, `#ifdef`, etc.)

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
# Check syntax
./bin/lpc-fmt check file.c

# Format to stdout
./bin/lpc-fmt format file.c

# Format in place
./bin/lpc-fmt format -w file.c

# Format from stdin
cat file.c | ./bin/lpc-fmt format
```

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
- **Braces on control statements**: Single-statement `if`/`while`/`for` get braces
- **Blank lines**: After block statements, before `return`
- **Case body indentation**: Code inside `case:` is indented
- **Array/mapping spacing**: `({ 1, 2, 3 })` preserves internal spaces
- **String concatenation**: Implicit `"a" "b"` becomes explicit `"a" + "b"`

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
    if path:match("dragonheart") or path:match("mudlib") then
      vim.bo.filetype = "lpc"
    end
  end,
})

vim.api.nvim_create_autocmd("FileType", {
  pattern = "lpc",
  callback = function()
    vim.lsp.start({
      name = "lpc-lsp",
      cmd = { "node", vim.fn.expand("~/Code/cloudship/tree-sitter-lpc/lsp/dist/server.js"), "--stdio" },
      root_dir = vim.fn.getcwd(),
    })
  end,
})
```

## Testing

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
│   └── formatter/          # Formatter test suite
├── .topiary/
│   └── languages.ncl       # Topiary language configuration
└── nvim-setup.lua          # Neovim configuration example
```

## Known Limitations

- ANSI color macro concatenation patterns (`RED_F"text"`) are not supported
  (these are invalid in recent LDMud versions anyway)
- Some complex preprocessor usage may not parse correctly
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
