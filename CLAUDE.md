# tree-sitter-lpc

Tree-sitter grammar for LPC (Lars Pensjo C), specifically the LDMud flavor used by Dragonheart MUD.

## Purpose

1. **Auto-formatting** - Via Topiary, to standardize LPC code style
2. **Structural editing** - Via ast-grep, for reliable code transformations
3. **Syntax highlighting** - For editors (VS Code, Neovim, etc.)

## Project Structure

```
tree-sitter-lpc/
├── grammar.js          # Main grammar definition
├── src/                # Generated parser (don't edit manually)
├── queries/
│   ├── highlights.scm  # Syntax highlighting
│   └── formatting.scm  # Topiary formatting rules
├── lib/
│   └── transform.js    # Shared transform functions (used by CLI and LSP)
├── bin/
│   └── lpc-fmt         # CLI formatter tool
├── lsp/
│   └── src/server.ts   # LSP server for editor integration
├── .topiary/
│   └── languages.ncl   # Topiary language configuration
├── test/
│   └── corpus/         # Test cases
├── package.json
└── Cargo.toml          # For Rust/Topiary integration
```

## Commands

```bash
# Generate parser from grammar
tree-sitter generate

# Run tests
tree-sitter test

# Parse a file (show AST)
tree-sitter parse path/to/file.c

# Parse and show errors only
tree-sitter parse path/to/file.c 2>&1 | grep ERROR

# Format with lpc-fmt CLI
bin/lpc-fmt format path/to/file.c          # Print to stdout
bin/lpc-fmt format -w path/to/file.c       # Write in place
bin/lpc-fmt check path/to/file.c           # Check syntax only

# Format with Topiary directly (lower level)
topiary format --language lpc path/to/file.c
```

## Formatter (lpc-fmt)

The `bin/lpc-fmt` CLI wraps Topiary with additional transforms:

The whole pipeline lives in `formatText()` (lib/transform.js) and is shared
by the CLI and the LSP — change it there, not in the callers.

**Transforms applied (before Topiary):**
- Convert implicit string concat to explicit: `"a" "b"` → `"a" + "b"`
- Add braces to single-statement if/while/for/foreach (any nesting depth)
- Add blank lines before return statements and before/after block
  statements (if/while/for/switch) — except directly after a `case` label
- Add blank line before each top-level function's doc-comment group
- Protect backslash-newline continuations in strings with a placeholder

**Post-processing (after Topiary):**
- Indent case bodies (brace-depth based; string content never touched)
- Fix continuation line indentation for multi-line expressions
- Restore string line continuations from the placeholder

**CLI extras:** accepts directories (recursive over `*.c`, parallel format
with progress bar), `check` reports warnings (e.g. non-standard string
escapes) with `--level`/`-q`/`-o` options, and files with preprocessor
directives inside function bodies are skipped as unsafe to format.

**Formatting style:**
- 2-space indentation
- Braces required on all control structures
- Blank line before return (when preceded by non-block statement)
- Blank line after block statements
- Multi-line arrays/mappings preserved from input

## LSP Server

The `lsp/` directory contains a Language Server Protocol implementation for editor integration.

**Features:**
- Syntax error diagnostics (via tree-sitter parsing)
- Document formatting (same transforms as CLI)

**Setup for Neovim:**
```lua
vim.api.nvim_create_autocmd("FileType", {
  pattern = "lpc",
  callback = function()
    vim.lsp.start({
      name = "lpc",
      cmd = { "node", vim.fn.expand("~/Code/cloudship/tree-sitter-lpc/lsp/dist/server.js"), "--stdio" },
      root_dir = vim.fn.getcwd(),
    })
  end,
})
```

**Building:**
```bash
cd lsp && npm install && npm run build
```

## Development Workflow

1. Edit `grammar.js`
2. Run `tree-sitter generate`
3. Test with `tree-sitter parse` on real LPC files
4. Add test cases to `test/corpus/`
5. Run `tree-sitter test`

## Source Grammar

Based on LDMud's yacc grammar:
- `/Users/jamespickard/Code/dragonheart/ldmud/src/prolang.y` (23k lines)
- `/Users/jamespickard/Code/dragonheart/ldmud/src/lex.c` (lexer, 9k lines)

## LPC-Specific Syntax

Key constructs that differ from standard C:

| Construct | Example |
|-----------|---------|
| Inherit | `inherit "/path/to/file";` |
| Closures | `function f = (: this_player() :);` |
| Mappings | `mapping m = ([ "key": "value" ]);` |
| Arrays | `mixed *arr = ({ 1, 2, 3 });` |
| String concat | `"hello" " " "world"` (implicit) |
| Preprocessor | `#include`, `#define`, `#ifdef` |

## Test Files

Real LPC files for testing (from dragonheart):
- `libs/orderandchaos/inherit/room.c` - Room base class
- `libs/orderandchaos/inherit/living.c` - NPC/player base
- `libs/orderandchaos/cmds/std/look.c` - Simple command
- `libs/orderandchaos/secure/simul_efun.c` - Complex file
