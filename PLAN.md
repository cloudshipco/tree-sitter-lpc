# Plan: LPC Tree-sitter Grammar + Formatter

## Goal
Create a tree-sitter grammar for LPC (LDMud flavor) and a Topiary-based auto-formatter.

---

## Phase 1: Project Setup [CURRENT]

- [x] Create repository
- [x] Initialize git
- [x] Add .gitignore, CLAUDE.md, PLAN.md
- [ ] Install tree-sitter CLI
- [ ] Create package.json
- [ ] Create initial grammar.js structure

## Phase 2: Grammar Conversion

- [ ] Download yacc-to-tree-sitter tool
- [ ] Run conversion on prolang.y
- [ ] Format and review output
- [ ] Identify what needs manual fixes

## Phase 3: Lexer Rules

Add token definitions to grammar.js:
- [ ] Identifiers
- [ ] Numbers (int, float, hex)
- [ ] Strings (with escape sequences)
- [ ] Comments (// and /* */)
- [ ] Operators
- [ ] Keywords

## Phase 4: Grammar Refinement

- [ ] Fix conversion errors
- [ ] Add precedence rules
- [ ] Handle LPC-specific constructs:
  - [ ] inherit statements
  - [ ] Closures (: ... :)
  - [ ] Mappings ([ ... ])
  - [ ] Arrays ({ ... })
  - [ ] String concatenation
  - [ ] Preprocessor directives

## Phase 5: Testing

- [ ] Create test corpus
- [ ] Parse sample files from dragonheart
- [ ] Fix parse errors
- [ ] Achieve 90%+ success rate on real files

## Phase 6: Topiary Integration

- [ ] Add Cargo.toml for Rust bindings
- [ ] Create queries/formatting.scm
- [ ] Configure Topiary
- [ ] Test formatting on real code
- [ ] Verify formatted code compiles

---

## Success Criteria

1. `tree-sitter parse` succeeds on 90%+ of dragonheart .c files
2. Topiary produces consistent, readable output
3. Formatted code compiles without errors in LDMud

## Resources

- [Tree-sitter docs](https://tree-sitter.github.io/tree-sitter/)
- [Topiary docs](https://topiary.tweag.io/book/)
- [yacc-to-tree-sitter](https://github.com/miks1965/yacc-to-tree-sitter)
- LDMud grammar: `~/Code/dragonheart/ldmud/src/prolang.y`
