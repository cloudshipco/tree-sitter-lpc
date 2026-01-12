; Topiary formatting rules for LPC
; See: https://topiary.tweag.io/book/guides/writing-a-query.html

; ============================================
; COMMENTS
; ============================================

; Comments get their own line
(comment) @append_hardline

; ============================================
; TOP-LEVEL SPACING
; ============================================

; Blank line between top-level definitions
(function_definition) @append_hardline @append_hardline
(function_declaration) @append_hardline @append_hardline
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

; Space after #include
(preproc_include
  "#include" @append_space
)

; Space after #define
(preproc_define
  "#define" @append_space
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
(expression_statement) @append_hardline
(return_statement) @append_hardline
(break_statement) @append_hardline
(continue_statement) @append_hardline
(if_statement) @append_hardline
(while_statement) @append_hardline
(for_statement) @append_hardline
(foreach_statement) @append_hardline
(switch_statement) @append_hardline
(do_statement) @append_hardline
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

; Binary operators: space on both sides
(binary_expression
  ["+" "-" "*" "/" "%" "||" "&&" "|" "^" "&" "==" "!=" ">" ">=" "<=" "<" "<<" ">>"]
  @prepend_space @append_space
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

(call_expression
  "(" @append_antispace
  ")" @prepend_antispace
)

; ============================================
; FUNCTION DEFINITIONS
; ============================================

; Space between type and name
(function_definition
  (type_specifier) @append_space
)

; ============================================
; DECLARATIONS
; ============================================

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

; Array literal: no space after ({ or before })
(array_literal
  "({" @append_antispace
  "})" @prepend_antispace
)

; Mapping literal: no space after ([ or before ])
(mapping_literal
  "([" @append_antispace
  "])" @prepend_antispace
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
; FIELD ACCESS
; ============================================

; No space around -> or .
(field_expression
  "->" @prepend_antispace @append_antispace
)

(field_expression
  "." @prepend_antispace @append_antispace
)
