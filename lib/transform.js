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

    // Add blank line before return statements
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
  transforms.sort((a, b) => b.start - a.start);

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
  const afterStructural = transformStructural(afterStringConcat, parser);
  return afterStructural;
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

// Check for syntax errors
function checkSyntax(text, filename, parser) {
  const tree = parser.parse(text);
  const errors = [];

  const findErrors = (node) => {
    if (node.type === "ERROR" || node.isMissing) {
      const start = node.startPosition;
      const end = node.endPosition;
      errors.push({
        file: filename,
        line: start.row + 1,
        column: start.column + 1,
        endLine: end.row + 1,
        endColumn: end.column + 1,
        message: node.isMissing ? `Missing: ${node.type}` : "Syntax error",
      });
    }
    for (let i = 0; i < node.childCount; i++) {
      findErrors(node.child(i));
    }
  };

  findErrors(tree.rootNode);
  return errors;
}

module.exports = {
  transformCode,
  transformStringConcat,
  transformStructural,
  postProcessContinuationIndent,
  checkSyntax,
};
