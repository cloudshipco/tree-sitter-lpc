#!/usr/bin/env node

import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  DocumentFormattingParams,
  TextEdit,
  Range,
  Position,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

// Import shared transform functions
const transformModule = require("../../lib/transform.js");
const {
  transformCode,
  preProcessLineContinuations,
  postProcessLineContinuations,
  postProcessContinuationIndent,
  postProcessCaseIndent,
  checkSyntax,
  hasNestedPreprocessor,
} = transformModule;

// Create connection
const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Tree-sitter setup
let parser: any;

// Paths - these will be configured
let treeSitterLpcPath = "";
let topiaryConfigPath = "";
let topiaryQueryPath = "";

connection.onInitialize(async (params: InitializeParams) => {
  // Default paths (can be overridden via settings)
  const homeDir = process.env.HOME || "";
  treeSitterLpcPath = path.join(homeDir, "Code/cloudship/tree-sitter-lpc");
  topiaryConfigPath = path.join(treeSitterLpcPath, ".topiary/languages.ncl");
  topiaryQueryPath = path.join(treeSitterLpcPath, "queries/formatting.scm");

  // Initialize tree-sitter
  try {
    const { Parser, Language } = require("web-tree-sitter");
    await Parser.init();

    const wasmPath = path.join(treeSitterLpcPath, "tree-sitter-lpc.wasm");
    if (fs.existsSync(wasmPath)) {
      const LPC = await Language.load(wasmPath);
      parser = new Parser();
      parser.setLanguage(LPC);
      connection.console.log("Tree-sitter LPC parser initialized");
    } else {
      connection.console.warn(`WASM file not found: ${wasmPath}`);
    }
  } catch (e) {
    connection.console.error(`Failed to initialize tree-sitter: ${e}`);
  }

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      documentFormattingProvider: true,
    },
  };
  return result;
});

// Validate document and report diagnostics
async function validateDocument(textDocument: TextDocument): Promise<void> {
  if (!parser) {
    return;
  }

  const text = textDocument.getText();
  const diagnostics: Diagnostic[] = [];

  try {
    const errors = checkSyntax(text, textDocument.uri, parser);
    for (const e of errors) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: Position.create(e.line - 1, e.column - 1),
          end: Position.create(e.endLine - 1, e.endColumn - 1),
        },
        message: e.message,
        source: "lpc",
      });
    }
  } catch (e) {
    connection.console.error(`Parse error: ${e}`);
  }
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

// Document change handler
documents.onDidChangeContent((change) => {
  validateDocument(change.document);
});

// Formatting handler
connection.onDocumentFormatting(
  async (params: DocumentFormattingParams): Promise<TextEdit[]> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return [];
    }

    // Same guard as the CLI: directives inside function bodies can't be
    // reformatted safely (Topiary would move them off column 1)
    if (hasNestedPreprocessor(document.getText(), parser)) {
      connection.console.warn(
        "Not formatting: preprocessor directives inside function bodies"
      );
      return [];
    }

    // Transform code first (add braces, blank lines, explicit +),
    // then protect string line continuations from Topiary
    const transformed = transformCode(document.getText(), parser);
    const text = preProcessLineContinuations(transformed, parser);

    try {
      // Check if topiary is available
      execSync("which topiary", { encoding: "utf-8" });
    } catch {
      connection.console.warn("Topiary not found in PATH");
      return [];
    }

    // Check if config files exist
    if (!fs.existsSync(topiaryConfigPath) || !fs.existsSync(topiaryQueryPath)) {
      connection.console.warn("Topiary config files not found");
      return [];
    }

    try {
      // Run topiary from tree-sitter-lpc directory so relative paths work
      const formatted = execSync(
        `topiary format --configuration "${topiaryConfigPath}" --query "${topiaryQueryPath}" --language lpc`,
        {
          input: text,
          encoding: "utf-8",
          maxBuffer: 10 * 1024 * 1024, // 10MB
          cwd: treeSitterLpcPath, // Run from tree-sitter-lpc dir
        }
      );

      // Post-process: restore line continuations, then fix case body and
      // continuation indentation (same order as bin/lpc-fmt)
      const withLineCont = postProcessLineContinuations(formatted);
      const withCaseIndent = postProcessCaseIndent(withLineCont);
      const postProcessed = postProcessContinuationIndent(withCaseIndent);

      // Return full document replacement
      const lastChar = document.getText().length;

      return [
        TextEdit.replace(
          Range.create(Position.create(0, 0), document.positionAt(lastChar)),
          postProcessed
        ),
      ];
    } catch (e: any) {
      connection.console.error(`Formatting failed: ${e.message}`);
      return [];
    }
  }
);

// Listen
documents.listen(connection);
connection.listen();
