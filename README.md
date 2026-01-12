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

- Node.js (for tree-sitter CLI)
- tree-sitter CLI: `npm install -g tree-sitter-cli`

### Generate Parser

```bash
npm install
npx tree-sitter generate
```

### Build Native Library (for Topiary)

```bash
# macOS ARM64
cc -arch arm64 -shared -fPIC -I src src/parser.c -o libtree-sitter-lpc.dylib

# macOS x86_64
cc -arch x86_64 -shared -fPIC -I src src/parser.c -o libtree-sitter-lpc.dylib

# Linux
cc -shared -fPIC -I src src/parser.c -o libtree-sitter-lpc.so
```

## Usage

### Parsing Files

```bash
npx tree-sitter parse path/to/file.c
```

### Formatting with Topiary

This grammar includes [Topiary](https://topiary.tweag.io/) formatting rules.

1. Install Topiary:
   ```bash
   cargo install topiary-cli
   ```

2. Format LPC files:
   ```bash
   cat file.c | topiary format \
     --configuration .topiary/languages.ncl \
     --query queries/formatting.scm \
     --language lpc
   ```

### Formatting Style

The formatter applies:
- 4-space indentation
- Spaces around binary operators (`a + b`, `x == y`)
- Spaces after keywords (`if (`, `for (`, `return `)
- Spaces after commas
- Consistent brace placement (`} else {`)
- No spaces inside parentheses or brackets

## Neovim Integration

This grammar works with Neovim's built-in tree-sitter support. See `nvim-setup.lua` for:
- Tree-sitter parser registration
- Filetype detection for LPC files
- LSP configuration

### Quick Setup

1. Install the parser:
   ```vim
   :TSInstall lpc
   ```

2. Copy the contents of `nvim-setup.lua` to your Neovim config.

3. Highlight queries are in `queries/highlights.scm`.

## Language Server (LSP)

A simple LSP server is included that provides:
- **Diagnostics** - Parse errors from tree-sitter
- **Formatting** - Via Topiary

### LSP Setup

```bash
cd lsp
npm install
npm run build
```

The LSP runs as:
```bash
node ~/Code/cloudship/tree-sitter-lpc/lsp/dist/server.js --stdio
```

See `nvim-setup.lua` for Neovim LSP configuration.

## Project Structure

```
tree-sitter-lpc/
├── grammar.js              # Tree-sitter grammar definition
├── src/
│   └── parser.c            # Generated parser (do not edit)
├── queries/
│   ├── formatting.scm      # Topiary formatting rules
│   └── highlights.scm      # Neovim syntax highlighting
├── lsp/
│   └── src/server.ts       # Language server
├── .topiary/
│   └── languages.ncl       # Topiary language configuration
├── nvim-setup.lua          # Neovim configuration example
├── test/
│   └── sample.c            # Sample LPC file for testing
└── libtree-sitter-lpc.dylib  # Native library (generated)
```

## Known Limitations

- ANSI color macro concatenation patterns (`RED_F"text"`) are not supported
  (these are invalid in recent LDMud versions anyway)
- Some complex preprocessor usage may not parse correctly

## Testing

Parse success rate on real LPC codebases:
- `cmds/std`: ~66% of files parse and format correctly
- Most failures are due to deprecated ANSI macro patterns

## License

MIT

## See Also

- [Tree-sitter](https://tree-sitter.github.io/tree-sitter/)
- [Topiary](https://topiary.tweag.io/)
- [LDMud](https://www.ldmud.eu/)
