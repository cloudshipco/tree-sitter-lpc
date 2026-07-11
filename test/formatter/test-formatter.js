#!/usr/bin/env node
/**
 * Test suite for lpc-fmt formatter
 * Run with: node test/formatter/test-formatter.js
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = path.dirname(path.dirname(__dirname));
const LPC_FMT = path.join(ROOT, "bin/lpc-fmt");

let passed = 0;
let failed = 0;

function test(name, input, expected) {
  try {
    const result = execSync(`node "${LPC_FMT}" format`, {
      input,
      encoding: "utf-8",
      cwd: ROOT,
    }).trim();

    const expectedTrimmed = expected.trim();

    if (result === expectedTrimmed) {
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✗ ${name}`);
      console.log("  Expected:");
      expectedTrimmed.split("\n").forEach(l => console.log(`    ${l}`));
      console.log("  Got:");
      result.split("\n").forEach(l => console.log(`    ${l}`));
      failed++;
    }
  } catch (e) {
    console.log(`✗ ${name} (error: ${e.message})`);
    failed++;
  }
}

console.log("=== Formatter Tests ===\n");

// String concatenation tests
console.log("String Concatenation:");

test("implicit concat becomes explicit",
  `void f() { x = "a" "b"; }`,
  `void f() {
  x = "a" + "b";
}`);

test("multi-line string concat with continuation indent",
  `void f() {
    x = "hello"
        "world";
}`,
  `void f() {
  x = "hello" +
    "world";
}`);

test("macro string concat",
  `void f() { x = PREFIX "middle" SUFFIX; }`,
  `void f() {
  x = PREFIX + "middle" + SUFFIX;
}`);

// Brace addition tests
console.log("\nBrace Addition:");

test("single-statement if gets braces",
  `void f() { if (x) return 1; }`,
  `void f() {
  if (x) {
    return 1;
  }
}`);

test("single-statement else gets braces",
  `void f() { if (x) { a(); } else b(); }`,
  `void f() {
  if (x) {
    a();
  } else {
    b();
  }
}`);

test("else-if chain preserved",
  `void f() { if (x) a(); else if (y) b(); else c(); }`,
  `void f() {
  if (x) {
    a();
  } else if (y) {
    b();
  } else {
    c();
  }
}`);

test("single-statement while gets braces",
  `void f() { while (x) do_thing(); }`,
  `void f() {
  while (x) {
    do_thing();
  }
}`);

test("single-statement for gets braces",
  `void f() { for (i = 0; i < 10; i++) do_thing(); }`,
  `void f() {
  for (i = 0; i < 10; i++) {
    do_thing();
  }
}`);

// Blank line tests
console.log("\nBlank Lines:");

test("blank line before return",
  `void f() { x = 1; return x; }`,
  `void f() {
  x = 1;

  return x;
}`);

test("blank line after if block",
  `void f() { if (x) { a(); } b(); }`,
  `void f() {
  if (x) {
    a();
  }

  b();
}`);

test("blank line after if before comment",
  `void f() { if (x) { a(); } // comment
b(); }`,
  `void f() {
  if (x) {
    a();
  }

  // comment
  b();
}`);

test("no extra blank line when already present",
  `void f() {
  if (x) { a(); }

  b();
}`,
  `void f() {
  if (x) {
    a();
  }

  b();
}`);

test("blank line before for loop",
  `void f() { string x; for (int i = 0; i < 10; i++) { a(); } }`,
  `void f() {
  string x;

  for (int i = 0; i < 10; i++) {
    a();
  }
}`);

test("blank line before while loop",
  `void f() { x = 1; while (x) { a(); } }`,
  `void f() {
  x = 1;

  while (x) {
    a();
  }
}`);

// Multi-line preservation tests
console.log("\nMulti-line Preservation:");

test("multi-line array preserved",
  `void f() { x = ({
    1,
    2,
    3,
}); }`,
  `void f() {
  x = ({
    1,
    2,
    3,
  });
}`);

test("single-line array stays single-line with spaces",
  `void f() { x = ({ 1, 2, 3 }); }`,
  `void f() {
  x = ({ 1, 2, 3 });
}`);

test("multi-line mapping preserved",
  `void f() { x = ([
    "a": 1,
    "b": 2,
]); }`,
  `void f() {
  x = ([
    "a": 1,
    "b": 2,
  ]);
}`);

// Indentation tests
console.log("\nIndentation:");

test("2-space indentation",
  `void f() { if (x) { if (y) { a(); } } }`,
  `void f() {
  if (x) {
    if (y) {
      a();
    }
  }
}`);

// Switch/case tests
console.log("\nSwitch/Case:");

test("case body is indented",
  `void f() { switch (x) { case 0: printf("a"); break; default: printf("b"); } }`,
  `void f() {
  switch (x) {
    case 0:
      printf("a");
      break;
    default:
      printf("b");
  }
}`);

test("case range preserved",
  `void f() { switch (x) { case 0..8: printf("a"); break; } }`,
  `void f() {
  switch (x) {
    case 0..8:
      printf("a");
      break;
  }
}`);

test("blank line before switch preserved",
  `void f() {
  x = 1;

  switch (y) { case 0: break; }
}`,
  `void f() {
  x = 1;

  switch (y) {
    case 0:
      break;
  }
}`);

// Regression tests from the 2026-07 review pass
console.log("\nReview Regressions:");

test("elif chain preserved",
  `#if FOO
int x;
#elif BAR
int y;
#else
int z;
#endif`,
  `#if FOO
int x;
#elif BAR
int y;
#else
int z;
#endif`);

test("ifdef with numeric argument",
  `#ifdef 0
int x;
#endif`,
  `#ifdef 0
int x;
#endif`);

test("doc comment stays attached to function",
  `// Returns the counter
int get_counter() {
  return counter;
}`,
  `// Returns the counter
int get_counter() {
  return counter;
}`);

test("nested single-statement structures all get braces",
  `void f() { while (x) if (y) a(); }`,
  `void f() {
  while (x) {
    if (y) {
      a();
    }
  }
}`);

test("case body with if block indents correctly",
  `void f() { switch (x) { case 1: if (y) { a(); } break; case 2: b(); } }`,
  `void f() {
  switch (x) {
    case 1:
      if (y) {
        a();
      }
      break;
    case 2:
      b();
  }
}`);

test("multi-line string content in case body preserved",
  `void f() {
  switch (x) {
    case 1:
      s = "abc
    def";
      break;
  }
}`,
  `void f() {
  switch (x) {
    case 1:
      s = "abc
    def";
      break;
  }
}`);

test("top-level ifdef after function is still formatted",
  `mixed *items = ({ });
void f() { work(); }
#ifdef FOO
int x;
#endif`,
  `mixed *items = ({ });

void f() {
  work();
}
#ifdef FOO
int x;
#endif`);

test("char literal with octal escape",
  `void f() { x = '\\033'; }`,
  `void f() {
  x = '\\033';
}`);

// Regression tests from the second review pass (formatText extraction round)
console.log("\nReview Regressions (round 2):");

function testIdempotent(name, input) {
  try {
    const once = execSync(`node "${LPC_FMT}" format`, { input, encoding: "utf-8", cwd: ROOT });
    const twice = execSync(`node "${LPC_FMT}" format`, { input: once, encoding: "utf-8", cwd: ROOT });
    if (once === twice) {
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✗ ${name} (output changed on second format)`);
      failed++;
    }
  } catch (e) {
    console.log(`✗ ${name} (error: ${e.message})`);
    failed++;
  }
}

test("trailing spaces inside multi-line string survive continuation indent",
  `void f() {
  msg = header +
"line one${"   "}
line two";
}`,
  `void f() {
  msg = header +
    "line one${"   "}
line two";
}`);

test("functions separated by doc comment keep blank line",
  `int f() {
  return 1;
}
// Doc for g
int g() {
  return 2;
}`,
  `int f() {
  return 1;
}

// Doc for g
int g() {
  return 2;
}`);

test("odd quote in #define does not poison case indent",
  `#define OPEN_QUOTE "
void f() {
  switch (x) {
    case 1:
      s = "}";
      break;
  }
}`,
  `#define OPEN_QUOTE "

void f() {
  switch (x) {
    case 1:
      s = "}";
      break;
  }
}`);

test("block comment in case body is indented with the body",
  `void f() {
  switch (x) {
    case 1:
      /* explain */
      do_thing();
      break;
  }
}`,
  `void f() {
  switch (x) {
    case 1:
      /* explain */
      do_thing();
      break;
  }
}`);

testIdempotent("deeply nested single-statement ifs (12 levels)",
  `void f() { if (a) if (b) if (c) if (d) if (e) if (g) if (h) if (i) if (j) if (k) if (l) if (m) x(); }`);

testIdempotent("mixed block statements and returns",
  `void f() { x = 1; while (x) if (y) a(); return x; }`);

test("comment between continuation lines keeps continuation indent",
  `void f() {
  x = aaaa +
  /* note */
  bbbb;
}`,
  `void f() {
  x = aaaa +
  /* note */
    bbbb;
}`);

// Summary
console.log("\n=== Results ===");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
