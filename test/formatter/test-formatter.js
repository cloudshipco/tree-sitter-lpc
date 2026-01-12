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

test("single-line array stays single-line",
  `void f() { x = ({ 1, 2, 3 }); }`,
  `void f() {
  x = ({1, 2, 3});
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

// Summary
console.log("\n=== Results ===");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
