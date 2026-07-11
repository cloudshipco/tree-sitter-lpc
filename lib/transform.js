/**
 * Shared transform functions for LPC formatting
 * Used by both the CLI tool and LSP server
 */

// Transform code - Pass 1: String concatenation
function transformStringConcat(text, parser) {
  const tree = parser.parse(text);
  const transforms = [];

  const walk = (node) => {
    if (node.type === "concatenated_string") {
      const parts = [];
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child.type === "string_literal" || child.type === "identifier") {
          parts.push(child);
        }
      }

      for (let i = 0; i < parts.length - 1; i++) {
        const current = parts[i];
        const next = parts[i + 1];
        const textBetween = text.substring(current.endIndex, next.startIndex);

        if (!textBetween.includes("+")) {
          const hasNewline = textBetween.includes("\n");
          if (hasNewline) {
            const newlineIndex = textBetween.indexOf("\n");
            const afterNewline = textBetween.substring(newlineIndex);
            transforms.push({
              start: current.endIndex,
              end: next.startIndex,
              replacement: " +" + afterNewline,
            });
          } else {
            transforms.push({
              start: current.endIndex,
              end: next.startIndex,
              replacement: " + ",
            });
          }
        }
      }
    }

    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i));
    }
  };

  walk(tree.rootNode);
  transforms.sort((a, b) => b.start - a.start);

  let result = text;
  for (const t of transforms) {
    result = result.substring(0, t.start) + t.replacement + result.substring(t.end);
  }

  return result;
}

// Transform code - Pass 2: Structural transforms (braces, blank lines)
// All transforms are pure insertions, so they never overlap and arbitrary
// nesting is handled in a single pass. Topiary reflows the whitespace.
function transformStructural(text, parser) {
  const tree = parser.parse(text);
  const transforms = [];

  const isCompoundStatement = (node) => node && node.type === "compound_statement";

  const blockStatements = [
    "if_statement",
    "while_statement",
    "for_statement",
    "foreach_statement",
    "switch_statement",
  ];

  // Wrap a single-statement body with braces via two insertions
  const wrapWithBraces = (body) => {
    transforms.push({
      start: body.startIndex,
      end: body.startIndex,
      replacement: "{ ",
      kind: "brace",
    });
    transforms.push({
      start: body.endIndex,
      end: body.endIndex,
      replacement: " }",
      kind: "brace",
    });
  };

  // Insert a blank line before `node` when its preceding statement-like
  // sibling doesn't already provide one. Shared by the return-statement and
  // block-statement rules so exclusions live in one place.
  const maybeInsertBlankLineBefore = (node, parentCompound) => {
    let prevSibling = null;
    for (let i = 0; i < parentCompound.childCount; i++) {
      const child = parentCompound.child(i);
      if (child.startIndex === node.startIndex) break;
      if (child.type.includes("statement") || child.type === "declaration") {
        prevSibling = child;
      }
    }
    if (!prevSibling) return;
    // Block statements already get a blank line inserted after them, and a
    // case label owns its first statement
    if (blockStatements.includes(prevSibling.type)) return;
    if (prevSibling.type === "case_statement") return;

    const textBetween = text.substring(prevSibling.endIndex, node.startIndex);
    // Check for actual blank line (two consecutive newlines with only whitespace between)
    if (!/\n\s*\n/.test(textBetween)) {
      transforms.push({
        start: prevSibling.endIndex,
        end: prevSibling.endIndex,
        replacement: "\n\n",
        kind: "blank",
      });
    }
  };

  const walk = (node, parentCompound) => {
    // Add braces to single-statement if/while/for/foreach
    if (
      node.type === "if_statement" ||
      node.type === "while_statement" ||
      node.type === "for_statement" ||
      node.type === "foreach_statement"
    ) {
      const statementChildren = [];
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child.type.endsWith("_statement") || child.type === "compound_statement") {
          statementChildren.push(child);
        }
      }

      const body = statementChildren[0];
      const elseBody = statementChildren[1];

      if (body && !isCompoundStatement(body)) {
        wrapWithBraces(body);
      }
      if (elseBody && !isCompoundStatement(elseBody) && elseBody.type !== "if_statement") {
        wrapWithBraces(elseBody);
      }
    }

    // Blank-line rules only apply to DIRECT children of a compound statement
    // (a return inside an unbraced if belongs to the if, not the compound)
    const isDirectChild = parentCompound && node.parent &&
      node.parent.id === parentCompound.id;

    // Add blank line before return statements (when preceded by non-block statement)
    if (node.type === "return_statement" && isDirectChild) {
      maybeInsertBlankLineBefore(node, parentCompound);
    }

    // Add blank line before block statements (when preceded by non-block statement)
    if (blockStatements.includes(node.type) && isDirectChild) {
      maybeInsertBlankLineBefore(node, parentCompound);
    }

    // Add blank line after block statements
    if (blockStatements.includes(node.type) && isDirectChild) {
      let nextSibling = null;
      let foundSelf = false;
      for (let i = 0; i < parentCompound.childCount; i++) {
        const child = parentCompound.child(i);
        if (foundSelf) {
          // Include comments, statements, and declarations as potential next siblings
          if (child.type === "comment" ||
              child.type.includes("statement") ||
              child.type === "declaration") {
            nextSibling = child;
            break;
          }
        }
        if (child.startIndex === node.startIndex) {
          foundSelf = true;
        }
      }

      if (nextSibling) {
        const textBetween = text.substring(node.endIndex, nextSibling.startIndex);
        if (!/\n\s*\n/.test(textBetween)) {
          transforms.push({
            start: node.endIndex,
            end: node.endIndex,
            replacement: "\n\n",
            kind: "blank",
          });
        }
      }
    }

    // Blank line before each top-level function, measured from the start of
    // its attached doc-comment group (comments directly above the function
    // with no blank line between). The formatting query preserves this via
    // @allow_blank_line_before; inserting before the group keeps doc
    // comments attached to their functions.
    if (node.type === "source_file") {
      const items = [];
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child.isNamed) items.push(child);
      }
      for (let i = 0; i < items.length; i++) {
        if (items[i].type !== "function_definition") continue;
        // Walk back over comments attached to this function
        let anchorIdx = i;
        while (
          anchorIdx > 0 &&
          items[anchorIdx - 1].type === "comment" &&
          !/\n\s*\n/.test(text.substring(items[anchorIdx - 1].endIndex, items[anchorIdx].startIndex))
        ) {
          anchorIdx--;
        }
        if (anchorIdx === 0) continue;
        const prev = items[anchorIdx - 1];
        const between = text.substring(prev.endIndex, items[anchorIdx].startIndex);
        if (!/\n\s*\n/.test(between)) {
          transforms.push({
            start: prev.endIndex,
            end: prev.endIndex,
            replacement: "\n\n",
            kind: "blank",
          });
        }
      }
    }

    const newParentCompound = node.type === "compound_statement" ? node : parentCompound;
    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i), newParentCompound);
    }
  };

  walk(tree.rootNode, null);

  // Apply from end to start. Insertions never overlap, but several can land
  // at the SAME offset (a close brace and a following blank line; nested
  // close braces). The transform applied LAST ends up LEFTMOST in the
  // output, so at equal offsets we order: blanks (rightmost, applied first),
  // then braces outer-to-inner (walk push order, inner applied last).
  const KIND_PRIORITY = { blank: 0, brace: 1 };
  transforms.forEach((t, i) => { t.pushIndex = i; });
  transforms.sort((a, b) =>
    (b.start - a.start) ||
    (KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]) ||
    (a.pushIndex - b.pushIndex)
  );

  let result = text;
  for (const t of transforms) {
    result = result.substring(0, t.start) + t.replacement + result.substring(t.end);
  }

  return result;
}

// Transform code (two passes: string concat first, then structural)
function transformCode(text, parser) {
  if (!parser) {
    return text;
  }
  // Pass 1: Convert implicit string concatenation to explicit +
  const afterStringConcat = transformStringConcat(text, parser);
  // Pass 2: Add braces and blank lines (re-parses to get correct positions)
  return transformStructural(afterStringConcat, parser);
}

// Unique placeholder for line continuations in strings
const LINE_CONT_PLACEHOLDER = "__LPC_LINE_CONT_7f3a9b__";

// Pre-process: Replace line continuations in strings with placeholder
// This runs BEFORE Topiary to prevent it from stripping the newlines
// Since strings are now single tokens, we use regex to find backslash-newline
// sequences within string literals
function preProcessLineContinuations(text, parser) {
  if (!parser) {
    return text;
  }

  const tree = parser.parse(text);
  const transforms = [];

  const walk = (node) => {
    if (node.type === "string_literal") {
      // Find all backslash-newline sequences within this string
      const stringText = text.substring(node.startIndex, node.endIndex);
      const regex = /\\\r?\n/g;
      let match;
      while ((match = regex.exec(stringText)) !== null) {
        transforms.push({
          start: node.startIndex + match.index,
          end: node.startIndex + match.index + match[0].length,
          replacement: LINE_CONT_PLACEHOLDER,
        });
      }
    }

    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i));
    }
  };

  walk(tree.rootNode);
  transforms.sort((a, b) => b.start - a.start);

  let result = text;
  for (const t of transforms) {
    result = result.substring(0, t.start) + t.replacement + result.substring(t.end);
  }

  return result;
}

// Post-process: Restore line continuations from placeholder
// This runs AFTER Topiary to restore the backslash-newline sequences
function postProcessLineContinuations(text) {
  return text.replace(new RegExp(LINE_CONT_PLACEHOLDER, "g"), "\\\n");
}

// Lex-lite line scan for the post-Topiary text passes. For each line,
// produce a "code view" with string/char-literal/comment contents blanked
// out (same length, so columns line up) plus flags:
//   startsInsideString  — line starts inside a multi-line string literal
//                         (its content must NEVER be touched)
//   startsInsideComment — line starts inside a block comment (may be
//                         re-indented along with surrounding code)
//   isPreproc           — preprocessor directive line (incl. backslash
//                         continuations); stays at column 0, contributes
//                         no braces, and carries no quote state over
function analyzeLines(text) {
  const lines = text.split("\n");
  const analyzed = [];
  let inString = false;
  let inBlockComment = false;
  let inPreprocContinuation = false;

  for (const raw of lines) {
    const startsInsideString = inString;
    const startsInsideComment = inBlockComment;

    // Preprocessor lines are opaque: quotes in a #define/#include must not
    // leak lexer state into the rest of the file (an odd number of quotes
    // would otherwise poison every following line)
    const isPreproc = !inString && !inBlockComment &&
      (inPreprocContinuation || /^\s*#/.test(raw));
    if (isPreproc) {
      inPreprocContinuation = raw.endsWith("\\");
      analyzed.push({
        raw,
        code: "",
        startsInsideString: false,
        startsInsideComment: false,
        isPreproc: true,
      });
      continue;
    }
    inPreprocContinuation = false;

    let code = "";
    let inLineComment = false;

    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (inString) {
        if (ch === "\\" && i + 1 < raw.length) {
          code += "  ";
          i++;
        } else if (ch === '"') {
          code += '"';
          inString = false;
        } else {
          code += " ";
        }
      } else if (inBlockComment) {
        if (ch === "*" && raw[i + 1] === "/") {
          code += "  ";
          i++;
          inBlockComment = false;
        } else {
          code += " ";
        }
      } else if (inLineComment) {
        code += " ";
      } else if (ch === '"') {
        code += '"';
        inString = true;
      } else if (ch === "'") {
        // Char literal ('x', '\n', '\033') — blank it; a quoted symbol
        // ('foo) has no closing quote and is left as-is
        let close = -1;
        if (raw[i + 1] === "\\") {
          for (let j = i + 3; j <= i + 6 && j < raw.length; j++) {
            if (raw[j] === "'") {
              close = j;
              break;
            }
          }
        } else if (raw[i + 2] === "'") {
          close = i + 2;
        }
        if (close !== -1) {
          code += " ".repeat(close - i + 1);
          i = close;
        } else {
          code += ch;
        }
      } else if (ch === "/" && raw[i + 1] === "/") {
        code += "//";
        i++;
        inLineComment = true;
      } else if (ch === "/" && raw[i + 1] === "*") {
        code += "  ";
        i++;
        inBlockComment = true;
      } else {
        code += ch;
      }
    }

    analyzed.push({
      raw,
      code,
      startsInsideString,
      startsInsideComment,
      isPreproc: false,
    });
  }

  return analyzed;
}

// Post-process: Add indentation to continuation lines after binary operators
// This runs AFTER Topiary to fix continuation indentation
function postProcessContinuationIndent(text, indentStr = "  ") {
  const analyzed = analyzeLines(text);
  const result = [];

  // Track the "base" indent level for multi-line continuations
  let continuationBaseIndent = null;

  for (let i = 0; i < analyzed.length; i++) {
    const { raw, code, startsInsideString, startsInsideComment } = analyzed[i];

    // Never touch a line that starts inside a string or block comment
    if (startsInsideString || startsInsideComment) {
      result.push(raw);
      continuationBaseIndent = null;
      continue;
    }

    const trimmedLine = code.trim();

    // A full-line comment or preprocessor line (empty code view) is passed
    // through WITHOUT resetting the continuation base, so a comment sitting
    // between two operands doesn't strip the continuation indent from the
    // operand that follows it
    if (trimmedLine.length === 0) {
      result.push(raw);
      continue;
    }

    // Find the previous line that carries actual code, skipping blank/
    // comment/preproc lines, to decide whether this line is a continuation
    let prev = null;
    for (let j = i - 1; j >= 0; j--) {
      const cand = analyzed[j];
      if (cand.startsInsideString || cand.startsInsideComment) break;
      if (cand.code.trim().length > 0) {
        prev = cand;
        break;
      }
    }
    // Operator check uses the code view, so a string or comment that merely
    // CONTAINS a trailing "+"/"-"/"&&"/"||" never counts as a continuation
    const trimmedPrev = prev ? prev.code.trim() : "";

    // Check if previous line ends with a binary operator (continuation)
    // But NOT if it's a preprocessor line or comment
    const endsWithOperator = !trimmedPrev.startsWith("#") &&
                            !trimmedPrev.startsWith("//") &&
                            !trimmedPrev.startsWith("/*") &&
                            !trimmedPrev.endsWith("*/") &&
                            (trimmedPrev.endsWith("+") ||
                             trimmedPrev.endsWith("-") ||
                             trimmedPrev.endsWith("||") ||
                             trimmedPrev.endsWith("&&"));

    if (endsWithOperator) {
      const prevIndent = prev.raw.match(/^(\s*)/)[1];
      const currIndent = raw.match(/^(\s*)/)[1];

      // First continuation line - set base indent
      if (continuationBaseIndent === null) {
        continuationBaseIndent = prevIndent;
      }

      // Continuation should be base + one indent level
      const targetIndent = continuationBaseIndent + indentStr;

      // Only adjust if current indent is less than or equal to base.
      // trimStart only: trailing whitespace may be STRING CONTENT when this
      // line opens a multi-line string literal
      if (currIndent.length <= continuationBaseIndent.length) {
        result.push(targetIndent + raw.trimStart());
      } else {
        result.push(raw);
      }
    } else {
      result.push(raw);
      continuationBaseIndent = null;
    }
  }

  return result.join("\n");
}

// Post-process: Add indentation to case body lines
// This runs AFTER Topiary to properly indent code inside switch cases.
// Topiary emits case bodies at the same indent as their label; this pass
// shifts each body right by one indent level. Brace depth (not indentation)
// decides where a body ends, so blocks inside a case body and nested
// switches are handled; lines inside multi-line strings are never touched.
function postProcessCaseIndent(text, indentStr = "  ") {
  const analyzed = analyzeLines(text);
  const result = [];

  // Stack of brace depths at which a case body is active
  const caseStack = [];
  let depth = 0;

  for (const { raw, code, startsInsideString, startsInsideComment, isPreproc } of analyzed) {
    // Scan braces on the code view: track depth after the line and the
    // minimum depth reached during it (a lone "}" dips before any "{")
    let lineMinDepth = depth;
    let lineEndDepth = depth;
    for (const ch of code) {
      if (ch === "{") {
        lineEndDepth++;
      } else if (ch === "}") {
        lineEndDepth--;
        if (lineEndDepth < lineMinDepth) {
          lineMinDepth = lineEndDepth;
        }
      }
    }

    // A line that dips below a case body's entry depth closes its switch
    while (caseStack.length > 0 && lineMinDepth < caseStack[caseStack.length - 1]) {
      caseStack.pop();
    }

    if (startsInsideString || isPreproc) {
      // String content must never be touched; directives stay at column 0
      result.push(raw);
    } else {
      const trimmed = code.trim();
      const isCaseLabel = !startsInsideComment &&
        /^(case\s+.+:|default\s*:)/.test(trimmed);

      let shift = caseStack.length;
      if (isCaseLabel) {
        if (caseStack.length > 0 && depth === caseStack[caseStack.length - 1]) {
          // Sibling label of the switch we're already in: label lines sit
          // at the switch's indent, shifted only by outer case bodies
          shift = caseStack.length - 1;
        } else {
          // First label of a (possibly nested) switch. Record the depth
          // AFTER the label line, so "case 1: {" keeps its opening and
          // closing braces at matching (label) indent
          caseStack.push(lineEndDepth);
        }
      }

      // Shift on the RAW line's emptiness: a full-line block comment blanks
      // to nothing in the code view but still belongs to the case body
      if (raw.trim().length === 0 || shift === 0) {
        result.push(raw);
      } else {
        result.push(indentStr.repeat(shift) + raw);
      }
    }

    depth = lineEndDepth;
  }

  return result.join("\n");
}

// Check for syntax errors
function checkSyntax(text, filename, parser) {
  const tree = parser.parse(text);
  const errors = [];
  const lines = text.split("\n");

  const getErrorContext = (node) => {
    // Get the text at the error location
    const errorText = text.substring(node.startIndex, node.endIndex);
    const truncated = errorText.length > 40
      ? errorText.substring(0, 40) + "..."
      : errorText;

    // Clean up for display (escape newlines)
    return truncated.replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  };

  const getParentContext = (node) => {
    // Walk up to find a meaningful parent
    let parent = node.parent;
    while (parent && (parent.type === "ERROR" || parent.type === "source_file")) {
      parent = parent.parent;
    }
    return parent ? parent.type : null;
  };

  const findErrors = (node, depth = 0) => {
    if (node.type === "ERROR" || node.isMissing) {
      const start = node.startPosition;
      const end = node.endPosition;

      let message;
      if (node.isMissing) {
        message = `Missing ${node.type}`;
      } else {
        const context = getErrorContext(node);
        const parentType = getParentContext(node);

        if (parentType) {
          message = `Unexpected \`${context}\` in ${parentType.replace(/_/g, " ")}`;
        } else if (context.trim()) {
          message = `Unexpected \`${context}\``;
        } else {
          message = "Syntax error";
        }
      }

      errors.push({
        file: filename,
        line: start.row + 1,
        column: start.column + 1,
        endLine: end.row + 1,
        endColumn: end.column + 1,
        message,
        // Include the source line for context
        sourceLine: lines[start.row] || "",
      });
    }
    for (let i = 0; i < node.childCount; i++) {
      findErrors(node.child(i), depth + 1);
    }
  };

  findErrors(tree.rootNode);
  return errors;
}

// Check for warnings (style issues that don't prevent compilation)
function checkWarnings(text, filename, parser) {
  const tree = parser.parse(text);
  const warnings = [];
  const lines = text.split("\n");

  // Standard escape characters that have meaning
  // n, r, t, b, f, v, 0-7 - control characters (0-7 are octal)
  // \, ', " - literal escapes
  // e - ANSI escape (LPC extension)
  // x - hex escape (followed by digits)
  const standardEscapes = /^[nrtbfve0-7\\'\"x]$/;

  const findWarnings = (node) => {
    // Check escape sequences in strings (now we scan string content with regex)
    if (node.type === "string_literal") {
      const stringText = text.substring(node.startIndex, node.endIndex);
      // Find all escape sequences in the string
      const escapeRegex = /\\(.)/g;
      let match;
      while ((match = escapeRegex.exec(stringText)) !== null) {
        const escapedChar = match[1];
        // Skip line continuations (backslash followed by newline)
        if (escapedChar === "\n" || escapedChar === "\r") continue;
        // Skip hex escapes
        if (escapedChar === "x") continue;

        if (!standardEscapes.test(escapedChar)) {
          // Calculate line/column from position in string
          const posInFile = node.startIndex + match.index;
          let lineNum = 0;
          let colNum = 0;
          let pos = 0;
          for (let i = 0; i < lines.length; i++) {
            if (pos + lines[i].length + 1 > posInFile) {
              lineNum = i;
              colNum = posInFile - pos;
              break;
            }
            pos += lines[i].length + 1; // +1 for newline
          }
          warnings.push({
            file: filename,
            line: lineNum + 1,
            column: colNum + 1,
            message: `unnecessary escape '\\${escapedChar}' in string`,
            sourceLine: lines[lineNum] || "",
          });
        }
      }
    }

    for (let i = 0; i < node.childCount; i++) {
      findWarnings(node.child(i));
    }
  };

  findWarnings(tree.rootNode);
  return warnings;
}

// Check if code has preprocessor directives inside function bodies.
// Reformatting around such directives isn't safe (the directive splits a
// statement list Topiary would reflow), so callers skip these files.
// Two detections:
//   (1) structural — a preproc node nested under any compound statement;
//   (2) directives the grammar could NOT parse in position (e.g. #pragma in
//       a body, #if/#else selecting between two function headers) show up
//       as ERROR nodes, so any directive line intersecting an ERROR node
//       also counts.
// This is a SAFETY guard: it fails closed (a parser is required).
function hasNestedPreprocessor(text, parser) {
  if (!parser) {
    throw new Error("hasNestedPreprocessor requires an initialized parser");
  }

  const tree = parser.parse(text);
  let found = false;
  const errorRanges = [];

  const walk = (node, insideBlock) => {
    if (found) {
      return;
    }
    if (insideBlock && node.type.startsWith("preproc_")) {
      found = true;
      return;
    }
    if (node.type === "ERROR") {
      errorRanges.push([node.startIndex, node.endIndex]);
    }
    const nextInsideBlock = insideBlock || node.type === "compound_statement";
    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i), nextInsideBlock);
    }
  };

  walk(tree.rootNode, false);
  if (found) {
    return true;
  }

  if (errorRanges.length > 0) {
    const directive = /^[ \t]*#[ \t]*(if|ifdef|ifndef|elif|else|endif|define|undef|pragma|include|echo)\b/gm;
    let match;
    while ((match = directive.exec(text)) !== null) {
      const pos = match.index;
      if (errorRanges.some(([start, end]) => pos >= start && pos < end)) {
        return true;
      }
    }
  }

  return false;
}

// Thrown by formatText when a file can't be formatted safely; callers
// treat it as a clean "skipped", not a formatting failure
class NestedPreprocessorError extends Error {
  constructor() {
    super("Cannot format code with nested preprocessor directives");
    this.name = "NestedPreprocessorError";
  }
}

// The ONE format pipeline, shared by the CLI and the LSP so they can never
// drift. `runTopiary(text)` is injected — the CLI runs Topiary as an async
// child process, the LSP synchronously — and may return a promise or a
// string. Throws NestedPreprocessorError for files that must be skipped.
async function formatText(text, parser, runTopiary) {
  if (!parser) {
    throw new Error("formatText requires an initialized parser");
  }
  if (hasNestedPreprocessor(text, parser)) {
    throw new NestedPreprocessorError();
  }
  const transformed = transformCode(text, parser);
  const withPlaceholders = preProcessLineContinuations(transformed, parser);
  const formatted = await runTopiary(withPlaceholders);
  const withLineCont = postProcessLineContinuations(formatted);
  const withCaseIndent = postProcessCaseIndent(withLineCont);
  return postProcessContinuationIndent(withCaseIndent);
}

module.exports = {
  formatText,
  NestedPreprocessorError,
  transformCode,
  transformStringConcat,
  transformStructural,
  preProcessLineContinuations,
  postProcessLineContinuations,
  postProcessContinuationIndent,
  postProcessCaseIndent,
  checkSyntax,
  checkWarnings,
  hasNestedPreprocessor,
};
