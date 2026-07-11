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
function transformStructural(text, parser) {
  const tree = parser.parse(text);
  const transforms = [];

  const getNodeText = (node) => text.substring(node.startIndex, node.endIndex);
  const isCompoundStatement = (node) => node && node.type === "compound_statement";

  const getIndentation = (offset) => {
    let lineStart = offset;
    while (lineStart > 0 && text[lineStart - 1] !== "\n") {
      lineStart--;
    }
    let indent = "";
    while (lineStart < text.length && (text[lineStart] === " " || text[lineStart] === "\t")) {
      indent += text[lineStart];
      lineStart++;
    }
    return indent;
  };

  const blockStatements = [
    "if_statement",
    "while_statement",
    "for_statement",
    "foreach_statement",
    "switch_statement",
  ];

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
        const indent = getIndentation(node.startIndex);
        const bodyIndent = indent + "  ";
        const bodyText = getNodeText(body).trim();
        transforms.push({
          start: body.startIndex,
          end: body.endIndex,
          replacement: `{\n${bodyIndent}${bodyText}\n${indent}}`,
        });
      }

      if (elseBody && !isCompoundStatement(elseBody) && elseBody.type !== "if_statement") {
        const indent = getIndentation(node.startIndex);
        const bodyIndent = indent + "  ";
        const elseText = getNodeText(elseBody).trim();
        transforms.push({
          start: elseBody.startIndex,
          end: elseBody.endIndex,
          replacement: `{\n${bodyIndent}${elseText}\n${indent}}`,
        });
      }
    }

    // Add blank line before return statements (when preceded by non-block statement)
    if (node.type === "return_statement" && parentCompound) {
      let prevSibling = null;
      for (let i = 0; i < parentCompound.childCount; i++) {
        const child = parentCompound.child(i);
        if (child.startIndex === node.startIndex) break;
        if (child.type.includes("statement") || child.type === "declaration") {
          prevSibling = child;
        }
      }

      if (prevSibling && !blockStatements.includes(prevSibling.type) &&
          prevSibling.type !== "case_statement") {
        const textBetween = text.substring(prevSibling.endIndex, node.startIndex);
        // Check for actual blank line (two consecutive newlines with only whitespace between)
        const hasBlankLine = /\n\s*\n/.test(textBetween);
        if (!hasBlankLine) {
          // Insert a blank line (two newlines) before the return statement
          transforms.push({
            start: prevSibling.endIndex,
            end: prevSibling.endIndex,
            replacement: "\n\n",
          });
        }
      }
    }

    // Add blank line before block statements (when preceded by non-block statement)
    if (blockStatements.includes(node.type) && parentCompound) {
      let prevSibling = null;
      for (let i = 0; i < parentCompound.childCount; i++) {
        const child = parentCompound.child(i);
        if (child.startIndex === node.startIndex) break;
        if (child.type.includes("statement") || child.type === "declaration") {
          prevSibling = child;
        }
      }

      if (prevSibling && !blockStatements.includes(prevSibling.type) &&
          prevSibling.type !== "case_statement") {
        const textBetween = text.substring(prevSibling.endIndex, node.startIndex);
        const hasBlankLine = /\n\s*\n/.test(textBetween);
        if (!hasBlankLine) {
          transforms.push({
            start: prevSibling.endIndex,
            end: prevSibling.endIndex,
            replacement: "\n\n",
          });
        }
      }
    }

    // Add blank line after block statements
    if (blockStatements.includes(node.type) && parentCompound) {
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
        // Check for actual blank lines (empty lines), not just newline count
        // A blank line is a line with only whitespace
        const hasBlankLine = /\n\s*\n/.test(textBetween);
        if (!hasBlankLine) {
          // Insert a blank line (two newlines) after the block statement
          transforms.push({
            start: node.endIndex,
            end: node.endIndex,
            replacement: "\n\n",
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

  // Remove overlapping transforms, keeping the OUTER (larger-span) one.
  // The dropped inner edits are re-discovered on the next fixpoint
  // iteration in transformCode, after the outer edit has been applied.
  transforms.sort((a, b) => (b.end - b.start) - (a.end - a.start));
  const filteredTransforms = [];
  for (const t of transforms) {
    const overlaps = filteredTransforms.some(kept =>
      t.start < kept.end && t.end > kept.start
    );
    if (!overlaps) {
      filteredTransforms.push(t);
    }
  }

  // Sort by start position descending (apply from end to start)
  filteredTransforms.sort((a, b) => b.start - a.start);

  let result = text;
  for (const t of filteredTransforms) {
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
  // Pass 2: Add braces and blank lines (re-parses to get correct positions).
  // Iterate to a fixpoint: nested single-statement structures need one pass
  // per nesting level, because overlapping edits keep only the outer one.
  let result = afterStringConcat;
  for (let iteration = 0; iteration < 10; iteration++) {
    const next = transformStructural(result, parser);
    if (next === result) {
      break;
    }
    result = next;
  }
  return result;
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
// out (same length, so columns line up) plus whether the line STARTS inside
// a multi-line string or block comment. The passes below use the code view
// for all structural decisions and never touch lines that start inside a
// literal — a formatter must never rewrite string content.
function analyzeLines(text) {
  const lines = text.split("\n");
  const analyzed = [];
  let inString = false;
  let inBlockComment = false;

  for (const raw of lines) {
    const startsInsideToken = inString || inBlockComment;
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

    analyzed.push({ raw, code, startsInsideToken });
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
    const { raw, code, startsInsideToken } = analyzed[i];

    // Never touch a line that starts inside a string or block comment
    if (startsInsideToken) {
      result.push(raw);
      continuationBaseIndent = null;
      continue;
    }

    const prev = i > 0 ? analyzed[i - 1] : null;
    const trimmedLine = code.trim();
    // Operator check uses the code view, so a string or comment that merely
    // CONTAINS a trailing "+"/"-"/"&&"/"||" never counts as a continuation
    const trimmedPrev = prev && !prev.startsInsideToken ? prev.code.trim() : "";

    // Skip empty lines and preprocessor directives
    if (trimmedLine.length === 0 || trimmedLine.startsWith("#")) {
      result.push(raw);
      continuationBaseIndent = null;
      continue;
    }

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

      // Only adjust if current indent is less than or equal to base
      if (currIndent.length <= continuationBaseIndent.length) {
        result.push(targetIndent + raw.trim());
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

  for (const { raw, code, startsInsideToken } of analyzed) {
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

    if (startsInsideToken) {
      // Inside a multi-line string or comment: emit verbatim
      result.push(raw);
    } else {
      const trimmed = code.trim();
      const isCaseLabel = /^(case\s+.+:|default\s*:)/.test(trimmed);

      let shift = caseStack.length;
      if (isCaseLabel) {
        if (caseStack.length > 0 && depth === caseStack[caseStack.length - 1]) {
          // Sibling label of the switch we're already in: label lines sit
          // at the switch's indent, shifted only by outer case bodies
          shift = caseStack.length - 1;
        } else {
          // First label of a (possibly nested) switch
          caseStack.push(depth);
        }
      }

      if (trimmed.length === 0 || shift === 0) {
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
// Structural check: a preproc node nested under any compound statement.
function hasNestedPreprocessor(text, parser) {
  if (!parser) {
    return false;
  }

  const tree = parser.parse(text);
  let found = false;

  const walk = (node, insideBlock) => {
    if (found) {
      return;
    }
    if (insideBlock && node.type.startsWith("preproc_")) {
      found = true;
      return;
    }
    const nextInsideBlock = insideBlock || node.type === "compound_statement";
    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i), nextInsideBlock);
    }
  };

  walk(tree.rootNode, false);
  return found;
}

module.exports = {
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
