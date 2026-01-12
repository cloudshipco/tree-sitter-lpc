; tree-sitter-lpc highlight queries for Neovim
; See :h treesitter-highlight-groups

; Keywords
[
  "if"
  "else"
  "while"
  "do"
  "for"
  "foreach"
  "switch"
  "case"
  "default"
  "break"
  "continue"
  "return"
  "inherit"
] @keyword

; Types
[
  "void"
  "int"
  "float"
  "string"
  "object"
  "mapping"
  "mixed"
  "status"
  "closure"
  "symbol"
  "bytes"
] @type

; Modifiers
[
  "static"
  "private"
  "protected"
  "public"
  "nosave"
  "virtual"
  "varargs"
  "deprecated"
  "visible"
  "nomask"
] @keyword.modifier

; Operators
[
  "+"
  "-"
  "*"
  "/"
  "%"
  "="
  "+="
  "-="
  "*="
  "/="
  "%="
  "&="
  "|="
  "^="
  "<<="
  ">>="
  "||="
  "&&="
  "=="
  "!="
  "<"
  ">"
  "<="
  ">="
  "&&"
  "||"
  "!"
  "&"
  "|"
  "^"
  "~"
  "<<"
  ">>"
  "++"
  "--"
  "->"
  "."
  "::"
  "?"
  ":"
  ".."
] @operator

; Delimiters
[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
  "({"
  "})"
  "(["
  "])"
  "(:"
  ":)"
] @punctuation.bracket

[
  ";"
  ","
] @punctuation.delimiter

; Preprocessor
[
  "#include"
  "#define"
  "#undef"
  "#ifdef"
  "#ifndef"
  "#if"
  "#else"
  "#elif"
  "#endif"
] @keyword.directive

(system_lib_string) @string.special
(preproc_arg) @none

; Literals
(number_literal) @number
(string_literal) @string
(string_content) @string
(char_literal) @character
(escape_sequence) @string.escape

; Comments
(comment) @comment

; Functions
(function_definition
  (function_declarator
    (identifier) @function))

(function_declaration
  (function_declarator
    (identifier) @function))

(call_expression
  (identifier) @function.call)

(call_expression
  (field_expression
    (identifier) @function.call .))

(call_expression
  (scope_resolution
    (identifier) @function.call .))

; Variables and parameters
(parameter_declaration
  (identifier) @variable.parameter)

(declarator
  (identifier) @variable)

(identifier) @variable

; LPC-specific
(inherit_statement
  (string_literal) @string.special)

(inherit_statement
  (identifier) @type)

(function_ref
  (identifier) @function)

(closure_argument) @variable.builtin

; Field access
(field_expression
  "."
  (identifier) @property)

(field_expression
  "->"
  (identifier) @property)

; Mapping entries
(mapping_entry
  . (_) @property)
