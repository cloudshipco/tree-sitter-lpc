# Plan: LPC Tree-sitter Grammar + Formatter

## Goal
Create a tree-sitter grammar for LPC (LDMud flavor) and a Topiary-based auto-formatter.

---

## Phase 1: Project Setup [DONE]

- [x] Create repository
- [x] Initialize git
- [x] Add .gitignore, CLAUDE.md, PLAN.md
- [x] Install tree-sitter CLI
- [x] Create package.json
- [x] Create initial grammar.js structure

## Phase 2: Grammar Conversion [DONE - MANUAL]

- [x] Downloaded yacc-to-tree-sitter tool
- [x] Attempted conversion - FAILED (StackOverflow on 23k line grammar)
- [x] Wrote grammar manually based on tree-sitter-c patterns

## Phase 3: Lexer Rules [DONE]

- [x] Identifiers
- [x] Numbers (int, float, hex)
- [x] Strings (with escape sequences)
- [x] Comments (// and /* */)
- [x] Operators
- [x] Keywords

## Phase 4: Grammar Refinement [DONE]

- [x] Add precedence rules
- [x] Handle LPC-specific constructs:
  - [x] inherit statements
  - [x] Closures (: ... :)
  - [x] Function refs (#'func)
  - [x] Closure args ($1, $2)
  - [x] Mappings ([ ... ])
  - [x] Arrays ({ ... })
  - [x] Range subscripts [0..7]
  - [x] Case ranges (90..100)
  - [x] Preprocessor directives (including inside functions)

## Phase 5: Testing [IN PROGRESS]

Current results against a real mudlib:
- cmds/std: 70/103 files (68%) zero errors
- cmds/wiz: 53/88 files (60%)
- inherit: 8/27 files (30%)
- secure/player: 3/11 files (27%)

Known issues:
- [ ] ANSI color macro concatenation (BD BE pattern)
- [ ] Some complex preprocessor usage

## Phase 6: Topiary Integration [DONE]

- [x] Compiled native library (libtree-sitter-lpc.dylib)
- [x] Create queries/formatting.scm
- [x] Configure Topiary (.topiary/languages.ncl)
- [x] Test formatting on real code
- [ ] Verify formatted code compiles in LDMud

Usage:
```bash
cat file.c | topiary format --configuration .topiary/languages.ncl --query queries/formatting.scm --language lpc
```

---

## Success Criteria

1. `tree-sitter parse` succeeds on 90%+ of the mudlib's .c files
2. Topiary produces consistent, readable output
3. Formatted code compiles without errors in LDMud

## Resources

- [Tree-sitter docs](https://tree-sitter.github.io/tree-sitter/)
- [Topiary docs](https://topiary.tweag.io/book/)
- [yacc-to-tree-sitter](https://github.com/miks1965/yacc-to-tree-sitter)
- LDMud grammar: `<ldmud>/src/prolang.y` (from an LDMud source checkout)
