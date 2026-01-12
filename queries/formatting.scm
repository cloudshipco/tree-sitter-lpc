; Topiary formatting rules for LPC
; See: https://topiary.tweag.io/book/guides/writing-a-query.html

; ============================================
; COMMENTS
; ============================================

; Comments get their own line and can have blank lines before them
(comment) @append_hardline @allow_blank_line_before

; ============================================
; TOP-LEVEL SPACING
; ============================================

; Blank line before function definitions
(
  (_) @append_delimiter
  .
  (function_definition)
  (#delimiter! "\n")
)
(function_definition) @append_hardline

; Allow blank lines after block statements (preserves from input)
; Note: Must use explicit node types as (_) wildcard doesn't work with @allow_blank_line_before
(compound_statement
  [
    (if_statement)
    (while_statement)
    (for_statement)
    (foreach_statement)
    (switch_statement)
  ]
  .
  (expression_statement) @allow_blank_line_before
)
(compound_statement
  [
    (if_statement)
    (while_statement)
    (for_statement)
    (foreach_statement)
    (switch_statement)
  ]
  .
  (declaration) @allow_blank_line_before
)
(compound_statement
  [
    (if_statement)
    (while_statement)
    (for_statement)
    (foreach_statement)
    (switch_statement)
  ]
  .
  (if_statement) @allow_blank_line_before
)
(compound_statement
  [
    (if_statement)
    (while_statement)
    (for_statement)
    (foreach_statement)
    (switch_statement)
  ]
  .
  (while_statement) @allow_blank_line_before
)
(compound_statement
  [
    (if_statement)
    (while_statement)
    (for_statement)
    (foreach_statement)
    (switch_statement)
  ]
  .
  (for_statement) @allow_blank_line_before
)
(compound_statement
  [
    (if_statement)
    (while_statement)
    (for_statement)
    (foreach_statement)
    (switch_statement)
  ]
  .
  (return_statement) @allow_blank_line_before
)

(declaration) @append_hardline
(inherit_statement) @prepend_hardline @append_hardline

; Space after inherit keyword
(inherit_statement
  "inherit" @append_space
)

; ============================================
; PREPROCESSOR
; ============================================

; Preprocessor on its own line, with newline after
(preproc_include) @append_hardline
(preproc_define) @append_hardline
(preproc_ifdef) @append_hardline
(preproc_if) @append_hardline
(preproc_undef) @append_hardline

; #else and #endif need newlines
(preproc_else
  ["#else" "#elif"] @prepend_hardline @append_hardline
)
(preproc_ifdef
  "#endif" @prepend_hardline @append_hardline
)
(preproc_if
  "#endif" @prepend_hardline @append_hardline
)

; Newline after #if/#ifdef condition
(preproc_if
  "#if" @append_space
  (preproc_arg) @append_hardline
)
(preproc_ifdef
  ["#ifdef" "#ifndef"] @append_space
  (identifier) @append_hardline
)

; Space after #include
(preproc_include
  "#include" @append_space
)

; Space after #define
(preproc_define
  "#define" @append_space
)

; Space before macro value
(preproc_define
  (preproc_arg) @prepend_space
)

; No space between macro name and params (for function-like macros)
(preproc_define
  (preproc_params) @prepend_antispace
)

; ============================================
; BRACES AND BLOCKS
; ============================================

; Opening brace: space before, newline after
(compound_statement
  "{" @prepend_space @append_hardline @append_indent_start
)

; Closing brace: newline before, dedent, space after (for else)
(compound_statement
  "}" @prepend_hardline @prepend_indent_end @append_space
)

; ============================================
; STATEMENTS
; ============================================

; Each statement on its own line
(expression_statement) @append_hardline @allow_blank_line_before
(return_statement) @append_hardline @allow_blank_line_before
(break_statement) @append_hardline
(continue_statement) @append_hardline
(if_statement) @append_hardline @allow_blank_line_before
(while_statement) @append_hardline
(for_statement) @append_hardline
(foreach_statement) @append_hardline
(switch_statement) @append_hardline @allow_blank_line_before
(do_statement) @append_hardline
; Case statements get their own line (indentation handled in post-processing)
(case_statement) @append_hardline

; ============================================
; CONTROL FLOW KEYWORDS
; ============================================

; Space after keywords
(if_statement "if" @append_space)
(if_statement ")" @append_space)
(if_statement "else" @append_space)
(while_statement "while" @append_space)
(while_statement ")" @append_space)
(for_statement "for" @append_space)
(for_statement ";" @append_space)
(for_statement ")" @append_space)
(foreach_statement "foreach" @append_space)
(foreach_statement ")" @append_space)
(switch_statement "switch" @append_space)
(do_statement "while" @append_space)
(return_statement "return" @append_space)
(case_statement "case" @append_space)

; ============================================
; OPERATORS
; ============================================

; Binary operators: space on both sides, preserve input newlines
(binary_expression
  ["+" "-" "*" "/" "%" "||" "&&" "|" "^" "&" "==" "!=" ">" ">=" "<=" "<" "<<" ">>"]
  @prepend_space @append_space @append_input_softline
)

; Assignment operators: space on both sides
(assignment_expression
  ["=" "+=" "-=" "*=" "/=" "%=" "&=" "|=" "^=" "<<=" ">>="]
  @prepend_space @append_space
)

; Conditional operator: spaces around ? and :
(conditional_expression
  "?" @prepend_space @append_space
  ":" @prepend_space @append_space
)

; ============================================
; COMMAS AND SEMICOLONS
; ============================================

; Space after comma, not before
"," @append_space

; No space before semicolon
";" @prepend_antispace

; ============================================
; PARENTHESES
; ============================================

; No space inside parentheses
(parenthesized_expression
  "(" @append_antispace
  ")" @prepend_antispace
)

(parameter_list
  "(" @append_antispace
  ")" @prepend_antispace
)

; Space between type and name in parameters
(parameter_declaration
  (type_specifier) @append_space
)

; Call expressions - preserve multi-line formatting
(call_expression
  "(" @append_antispace @append_input_softline @append_indent_start
  ")" @prepend_input_softline @prepend_indent_end @prepend_antispace
)

; ============================================
; FUNCTION DEFINITIONS
; ============================================

; Space after modifier
(function_definition
  (modifier) @append_space
)

(function_declaration
  (modifier) @append_space
)

; Space between type and name
(function_definition
  (type_specifier) @append_space
)

(function_declaration
  (type_specifier) @append_space
)

; ============================================
; DECLARATIONS
; ============================================

; Space after modifier in declarations
(declaration
  (modifier) @append_space
)

; Space after type in declarations
(declaration
  (type_specifier) @append_space
)

; Space around = in declarator initializers
(declarator
  "=" @prepend_space @append_space
)

; ============================================
; LPC-SPECIFIC: ARRAYS AND MAPPINGS
; ============================================

; Array literal: preserve multi-line formatting, keep space on single-line
(array_literal
  "({" @append_spaced_softline @append_indent_start
  "})" @prepend_spaced_softline @prepend_indent_end
)

; Mapping literal: preserve multi-line formatting, keep space on single-line
(mapping_literal
  "([" @append_spaced_softline @append_indent_start
  "])" @prepend_spaced_softline @prepend_indent_end
)

; Preserve newlines after commas in arrays/mappings
(array_literal
  "," @append_input_softline
)
(mapping_literal
  "," @append_input_softline
)

; Mapping entry: space after colon
(mapping_entry
  ":" @append_space
)

; ============================================
; LPC-SPECIFIC: CLOSURES
; ============================================

; Closure literal: space inside (: :)
(closure_literal
  "(:" @append_space
  ":)" @prepend_space
)

; ============================================
; SUBSCRIPTS AND RANGES
; ============================================

; No space inside brackets
(subscript_expression
  "[" @append_antispace
  "]" @prepend_antispace
)

; Range operator: space around ..
(subscript_expression
  ".." @prepend_space @append_space
)

; No spaces around .. in case ranges (they're written as 0..8 not 0 .. 8)
(case_statement
  ".." @prepend_antispace @append_antispace
)

; ============================================
; STRING CONCATENATION
; ============================================

; Space between parts in concatenated strings (MACRO "str" MACRO)
(concatenated_string
  (string_literal) @prepend_space @append_space
)
(concatenated_string
  (identifier) @prepend_space @append_space
)

; ============================================
; FIELD ACCESS
; ============================================

; No space around -> or .
(field_expression
  "->" @prepend_antispace @append_antispace
)

(field_expression
  "." @prepend_antispace @append_antispace
)
