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

      if (prevSibling && !blockStatements.includes(prevSibling.type)) {
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

      if (prevSibling && !blockStatements.includes(prevSibling.type)) {
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

  // Sort by start position descending (apply from end to start)
  transforms.sort((a, b) => b.start - a.start);

  // Remove overlapping transforms (keep the outer one, skip inner ones)
  // Since we're sorted by start descending, later transforms have smaller start positions
  // An overlap occurs when transform[i].start < transform[j].end for j > i
  const filteredTransforms = [];
  for (const t of transforms) {
    // Check if this transform overlaps with any already-kept transform
    const overlaps = filteredTransforms.some(kept =>
      t.start < kept.end && t.end > kept.start
    );
    if (!overlaps) {
      filteredTransforms.push(t);
    }
  }

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
  // Pass 2: Add braces and blank lines (re-parses to get correct positions)
  const afterStructural = transformStructural(afterStringConcat, parser);
  return afterStructural;
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

// Post-process: Add indentation to continuation lines after binary operators
// This runs AFTER Topiary to fix continuation indentation
function postProcessContinuationIndent(text, indentStr = "  ") {
  const lines = text.split("\n");
  const result = [];

  // Track the "base" indent level for multi-line continuations
  let continuationBaseIndent = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : "";
    const trimmedLine = line.trim();
    const trimmedPrev = prevLine.trim();

    // Skip empty lines and preprocessor directives
    if (trimmedLine.length === 0 || trimmedLine.startsWith("#")) {
      result.push(line);
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
      const prevIndent = prevLine.match(/^(\s*)/)[1];
      const currIndent = line.match(/^(\s*)/)[1];

      // First continuation line - set base indent
      if (continuationBaseIndent === null) {
        continuationBaseIndent = prevIndent;
      }

      // Continuation should be base + one indent level
      const targetIndent = continuationBaseIndent + indentStr;

      // Only adjust if current indent is less than or equal to base
      if (currIndent.length <= continuationBaseIndent.length) {
        result.push(targetIndent + trimmedLine);
      } else {
        result.push(line);
      }
    } else {
      result.push(line);
      continuationBaseIndent = null;
    }
  }

  return result.join("\n");
}

// Post-process: Add indentation to case body lines
// This runs AFTER Topiary to properly indent code inside switch cases
function postProcessCaseIndent(text, indentStr = "  ") {
  const lines = text.split("\n");
  const result = [];

  // Stack of case indent levels - when we see "case X:" at indent N,
  // we push N and subsequent lines at indent N get extra indent
  let caseIndentLevel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const currentIndent = line.match(/^(\s*)/)[1];

    // Check if this is a case or default label
    const isCaseLabel = /^(case\s+.+:|default:)/.test(trimmed);

    if (isCaseLabel) {
      // This is a case label - don't indent it, but track the indent level
      caseIndentLevel = currentIndent.length;
      result.push(line);
    } else if (caseIndentLevel !== null) {
      // We're inside a case body

      // Check if this line ends the case context (closing brace at or before case level)
      if (trimmed === "}" && currentIndent.length <= caseIndentLevel) {
        // This closes the switch - stop case indentation
        caseIndentLevel = null;
        result.push(line);
      } else if (trimmed.length === 0) {
        // Empty line - preserve as-is
        result.push(line);
      } else if (currentIndent.length === caseIndentLevel) {
        // Line at case level that's not a case label - indent it
        result.push(currentIndent + indentStr + trimmed);
      } else {
        // Line already has more indent - preserve it
        result.push(line);
      }
    } else {
      result.push(line);
    }
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
};
