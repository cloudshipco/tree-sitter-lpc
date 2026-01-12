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

# Format with Topiary (once configured)
topiary format --language lpc path/to/file.c
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
