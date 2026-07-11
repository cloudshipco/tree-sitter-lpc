/**
 * @file LPC grammar for tree-sitter
 * @author James Pickard
 * @license MIT
 *
 * LPC (Lars Pensjo C) grammar for LDMud flavor.
 * Based on tree-sitter-c structure with LPC-specific constructs.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  PAREN_DECLARATOR: -10,
  COMMA: -3,  // Lowest precedence operator
  ASSIGNMENT: -2,
  CONDITIONAL: -1,
  DEFAULT: 0,
  LOGICAL_OR: 1,
  LOGICAL_AND: 2,
  INCLUSIVE_OR: 3,
  EXCLUSIVE_OR: 4,
  BITWISE_AND: 5,
  EQUAL: 6,
  RELATIONAL: 7,
  SHIFT: 9,
  ADD: 10,
  MULTIPLY: 11,
  CAST: 12,
  SIZEOF: 13,
  UNARY: 14,
  CALL: 15,
  FIELD: 16,
  SUBSCRIPT: 17,
};

module.exports = grammar({
  name: 'lpc',

  conflicts: $ => [
    [$.type_specifier, $._expression],
    [$._expression, $.concatenated_string],
    [$.type_specifier, $._string_concat_part],
    [$._type],  // Allow * to be ambiguous between type and declarator
  ],

  extras: $ => [
    /\s|\\\r?\n/,
    $.comment,
  ],

  word: $ => $.identifier,

  rules: {
    // Entry point
    source_file: $ => repeat($._top_level_item),

    _top_level_item: $ => choice(
      $.function_definition,
      $.function_declaration,
      $.declaration,
      $.inherit_statement,
      $.preproc_include,
      $.preproc_define,
      $.preproc_ifdef,
      $.preproc_if,
      $.preproc_undef,
      $.preproc_pragma,
    ),

    // =========================================
    // LPC-SPECIFIC: Inherit statement
    // =========================================
    inherit_statement: $ => seq(
      optional($.modifier),
      'inherit',
      choice($.string_literal, $.identifier),
      ';'
    ),

    // =========================================
    // PREPROCESSOR
    // =========================================
    preproc_include: $ => seq(
      '#include',
      choice(
        $.system_lib_string,
        $.string_literal,
      ),
      /\n/
    ),

    preproc_define: $ => seq(
      '#define',
      $.identifier,
      optional($.preproc_params),
      optional($.preproc_arg),
      /\n/
    ),

    preproc_undef: $ => seq(
      '#undef',
      $.identifier,
      /\n/
    ),

    // #pragma directive (save_types, strong_types, etc.)
    preproc_pragma: $ => seq(
      '#pragma',
      optional($.preproc_arg),
      /\n/
    ),

    preproc_ifdef: $ => seq(
      choice('#ifdef', '#ifndef'),
      choice($.identifier, $.number_literal),  // Allow #ifdef 0 pattern
      /\n/,
      repeat($._preproc_body_item),
      optional($.preproc_else),
      '#endif',
      /\n?/
    ),

    preproc_if: $ => seq(
      '#if',
      $.preproc_arg,
      /\n/,
      repeat($._preproc_body_item),
      optional($.preproc_else),
      '#endif',
      /\n?/
    ),

    preproc_else: $ => seq(
      choice('#else', seq('#elif', $.preproc_arg)),
      /\n/,
      repeat($._preproc_body_item),
      optional($.preproc_else),  // Allow #elif ... #elif ... #else chains
    ),

    // Body items can be either top-level items or statements (for #if inside functions)
    _preproc_body_item: $ => choice(
      $._top_level_item,
      $._statement,
    ),

    preproc_params: $ => seq(
      token.immediate('('),
      commaSep($.identifier),
      ')'
    ),

    // Match non-whitespace start, then rest of line (avoids capturing leading space)
    // Supports backslash line continuation: \<newline> continues to next line
    preproc_arg: $ => token(prec(-1, /\S([^\n\\]|\\(.|\n))*/)),

    system_lib_string: $ => /<[^>\n]+>/,

    // =========================================
    // DECLARATIONS
    // =========================================
    declaration: $ => seq(
      optional($.modifier),
      $._type,
      commaSep1($.declarator),
      ';'
    ),

    function_definition: $ => seq(
      optional($.modifier),
      optional($._type),
      $.function_declarator,
      $.compound_statement,
    ),

    // Function forward declaration (no body)
    function_declaration: $ => seq(
      optional($.modifier),
      optional($._type),
      $.function_declarator,
      ';',
    ),

    declarator: $ => seq(
      optional('*'),  // Pointer declarator (e.g., int *a, *b;)
      $.identifier,
      optional(seq('=', $._expression)),
    ),

    function_declarator: $ => prec(1, seq(
      $.identifier,
      $.parameter_list,
    )),

    parameter_list: $ => seq(
      '(',
      commaSep($.parameter_declaration),
      ')',
    ),

    parameter_declaration: $ => seq(
      optional($.modifier),
      $._type,
      optional($.identifier),
      optional(seq('...', optional($.identifier))),
      optional(seq('=', $._expression)),  // Default parameter value
    ),

    // =========================================
    // TYPES
    // =========================================
    // Supports union types: object|int*, string|int|float
    // First type_specifier with optional *, then optionally more |type* parts
    _type: $ => seq(
      $.type_specifier,
      optional('*'),
      repeat(seq('|', $.type_specifier, optional('*'))),
    ),

    type_specifier: $ => choice(
      'void',
      'int',
      'float',
      'string',
      'object',
      'mapping',
      'mixed',
      'status',
      'closure',
      'symbol',
      'bytes',
      $.identifier,  // Custom types
    ),

    modifier: $ => repeat1(choice(
      'static',
      'private',
      'protected',
      'public',
      'nosave',
      'virtual',
      'varargs',
      'deprecated',
      'visible',
      'nomask',
    )),

    // =========================================
    // STATEMENTS
    // =========================================
    compound_statement: $ => seq(
      '{',
      repeat($._block_item),
      '}',
    ),

    _block_item: $ => choice(
      $.declaration,
      $._statement,
      // Preprocessor can appear inside blocks too
      $.preproc_if,
      $.preproc_ifdef,
      $.preproc_define,
      $.preproc_include,
      $.preproc_undef,
    ),

    _statement: $ => choice(
      $.compound_statement,
      $.expression_statement,
      $.if_statement,
      $.switch_statement,
      $.case_statement,
      $.while_statement,
      $.do_statement,
      $.for_statement,
      $.foreach_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
    ),

    expression_statement: $ => seq(
      optional($._expression),
      ';',
    ),

    if_statement: $ => prec.right(seq(
      'if',
      '(',
      $._expression,
      ')',
      $._statement,
      optional(seq('else', $._statement)),
    )),

    switch_statement: $ => seq(
      'switch',
      '(',
      $._expression,
      ')',
      $.compound_statement,
    ),

    case_statement: $ => prec.left(seq(
      choice(
        seq('case', $._expression, optional(seq('..', $._expression))),
        'default',
      ),
      ':',
    )),

    while_statement: $ => seq(
      'while',
      '(',
      $._expression,
      ')',
      $._statement,
    ),

    do_statement: $ => seq(
      'do',
      $._statement,
      'while',
      '(',
      $._expression,
      ')',
      ';',
    ),

    for_statement: $ => seq(
      'for',
      '(',
      choice(
        seq(optional($._expression), ';'),  // Traditional: for (i = 0; ...)
        seq($._type, $.declarator, ';'),     // C99-style: for (int i = 0; ...)
      ),
      optional($._expression),
      ';',
      optional($._expression),
      ')',
      $._statement,
    ),

    // LPC-specific foreach
    // Supports: foreach(x : expr)              // type inferred as mixed
    //           foreach(type x : expr)
    //           foreach(type k, type v : expr)
    //           foreach(k, v1, v2, ... : expr)  // multi-value mappings
    foreach_statement: $ => seq(
      'foreach',
      '(',
      optional($._type),  // Type is optional (defaults to mixed)
      $.identifier,
      repeat(seq(',', optional($._type), $.identifier)),  // Additional variables
      ':',
      $._expression,
      ')',
      $._statement,
    ),

    return_statement: $ => seq(
      'return',
      optional($._expression),
      ';',
    ),

    break_statement: $ => seq('break', ';'),
    continue_statement: $ => seq('continue', ';'),

    // =========================================
    // EXPRESSIONS
    // =========================================
    _expression: $ => choice(
      $.identifier,
      $.number_literal,
      $.string_literal,
      $.char_literal,
      $.concatenated_string,
      $.array_literal,
      $.mapping_literal,
      $.closure_literal,
      $.inline_closure,  // function int(object o) { ... }
      $.function_ref,  // #'func_name
      $.closure_argument,  // $1, $2, etc. can be used in expressions
      $.quoted_symbol,  // 'symbol for lambda expressions
      $.parenthesized_expression,
      $.unary_expression,
      $.binary_expression,
      $.assignment_expression,
      $.conditional_expression,
      $.call_expression,
      $.subscript_expression,
      $.field_expression,
      $.update_expression,
      $.cast_expression,
      $.sizeof_expression,
      $.catch_expression,
      $.scope_resolution,
      $.comma_expression,
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    unary_expression: $ => prec.left(PREC.UNARY, seq(
      choice('!', '~', '-', '+', '&', '*'),
      $._expression,
    )),

    binary_expression: $ => {
      const table = [
        ['+', PREC.ADD],
        ['-', PREC.ADD],
        ['*', PREC.MULTIPLY],
        ['/', PREC.MULTIPLY],
        ['%', PREC.MULTIPLY],
        ['||', PREC.LOGICAL_OR],
        ['&&', PREC.LOGICAL_AND],
        ['|', PREC.INCLUSIVE_OR],
        ['^', PREC.EXCLUSIVE_OR],
        ['&', PREC.BITWISE_AND],
        ['==', PREC.EQUAL],
        ['!=', PREC.EQUAL],
        ['>', PREC.RELATIONAL],
        ['>=', PREC.RELATIONAL],
        ['<=', PREC.RELATIONAL],
        ['<', PREC.RELATIONAL],
        ['<<', PREC.SHIFT],
        ['>>', PREC.SHIFT],
      ];

      return choice(...table.map(([op, precedence]) =>
        prec.left(precedence, seq($._expression, op, $._expression))
      ));
    },

    assignment_expression: $ => prec.right(PREC.ASSIGNMENT, seq(
      $._expression,
      choice('=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '||=', '&&='),
      $._expression,
    )),

    // Comma operator: evaluates left, then right, returns right
    // Used in: return x, 1; for(i=0, j=1; ...; i++, j++)
    comma_expression: $ => prec.left(PREC.COMMA, seq(
      $._expression,
      ',',
      $._expression,
    )),

    conditional_expression: $ => prec.right(PREC.CONDITIONAL, seq(
      $._expression,
      '?',
      $._expression,
      ':',
      $._expression,
    )),

    call_expression: $ => prec(PREC.CALL, seq(
      $._expression,
      '(',
      commaSep($._call_argument),
      ')',
    )),

    // Call argument can be a regular expression or a spread expression (arr...)
    _call_argument: $ => choice(
      $.spread_expression,
      $._expression,
    ),

    // Spread operator: unpacks array into individual arguments
    // e.g., func(args...) expands args array into separate arguments
    spread_expression: $ => prec(PREC.UNARY, seq($._expression, '...')),

    // LPC array subscript with range support
    // Supports: arr[i], arr[start..end], arr[<i], arr[start..<end], arr[<start..<end]
    // The < prefix means "from end of array"
    // Also supports multi-value mapping access: mapping[key, field]
    _range_index: $ => seq(optional('<'), $._expression),
    subscript_expression: $ => prec(PREC.SUBSCRIPT, seq(
      $._expression,
      '[',
      $._range_index,
      optional(choice(
        seq('..', optional($._range_index)),  // LPC range syntax: arr[start..end]
        seq(',', $._expression),              // Multi-value mapping: map[key, field]
      )),
      ']',
    )),

    field_expression: $ => prec(PREC.FIELD, seq(
      $._expression,
      choice('->', '.'),
      $.identifier,
    )),

    update_expression: $ => prec.left(PREC.UNARY, choice(
      seq($._expression, choice('++', '--')),
      seq(choice('++', '--'), $._expression),
    )),

    cast_expression: $ => prec(PREC.CAST, seq(
      '(',
      $._type,
      ')',
      $._expression,
    )),

    sizeof_expression: $ => prec(PREC.SIZEOF, seq(
      'sizeof',
      '(',
      $._expression,
      ')',
    )),

    // LPC catch expression: catch(expr) or catch(expr;) or catch(expr; modifiers)
    // Modifiers can be: nolog, publish, reserve <expr>
    catch_expression: $ => prec(PREC.CALL, seq(
      'catch',
      '(',
      $._expression,
      optional(seq(';', optional($.catch_modifiers))),
      ')',
    )),

    catch_modifiers: $ => repeat1(choice(
      'nolog',
      'publish',
      seq('reserve', $._expression),
    )),

    // LPC scope resolution ::func or Parent::func
    scope_resolution: $ => prec(PREC.CALL, seq(
      optional($.identifier),
      '::',
      $.identifier,
    )),

    // =========================================
    // LPC-SPECIFIC LITERALS
    // =========================================

    // Array literal: ({ 1, 2, 3 })
    // Opening is single token, closing allows whitespace between } and )
    array_literal: $ => seq(
      $.array_open,
      commaSep($._expression),
      optional(','),
      $.array_close,
    ),
    array_open: $ => '({',
    array_close: $ => seq('}', ')'),

    // Mapping literal: ([ "key": value ])
    mapping_literal: $ => seq(
      $.mapping_open,
      commaSep($.mapping_entry),
      optional(','),
      $.mapping_close,
    ),
    mapping_open: $ => '([',
    mapping_close: $ => seq(']', ')'),

    // Mapping entry: key: value or just key (for subtraction like map -= ([key]))
    // Supports multi-value mappings: key: val1; val2; val3
    mapping_entry: $ => seq(
      $._expression,
      optional(seq(
        ':',
        $._expression,
        repeat(seq(';', $._expression)),  // additional values for multi-dim mappings
      )),
    ),

    // Closure literal: (: expr :) or (: $1 + $2 :)
    closure_literal: $ => seq(
      $.closure_open,
      optional($._expression),
      $.closure_close,
    ),
    closure_open: $ => '(:',
    closure_close: $ => seq(':', ')'),

    // Inline closure: function int(object o) { return ...; }
    // Modern LDMud anonymous function syntax
    inline_closure: $ => seq(
      'function',
      optional($._type),
      $.parameter_list,
      $.compound_statement,
    ),

    // Function reference closure: #'func_name or #'operator
    // LDMud allows operators like #'>, #'<, #'+, #'-, etc.
    // Also supports namespace qualifiers: #'efun::func, #'::func
    function_ref: $ => seq(
      "#'",
      choice(
        seq(optional(choice('efun', $.identifier)), '::', $.identifier),  // namespace::func
        $.identifier,
        // Operators that can be used as closures
        '+', '-', '*', '/', '%',
        '<', '>', '<=', '>=', '==', '!=',
        '&', '|', '^', '~',
        '<<', '>>',
        '&&', '||', '!',
        '?',       // conditional operator
        ',',       // comma operator
        '({', '})',  // array constructor
        '([', '])',  // mapping constructor
        // Indexing operators
        '[', ']',
        '[,]',     // multi-index
        '[..]',    // range [start..end]
        '[..<]',   // range [start..<end] (end from back)
        '[<..]',   // range [<start..end] (start from back)
        '[<..<]',  // range [<start..<end] (both from back)
        '[<]',     // index from back
      ),
    ),

    closure_argument: $ => /\$[0-9]+/,

    // Quoted symbol: 'symbol (used in lambda expressions)
    // Must be a token to distinguish from char_literal
    // Lower precedence than char_literal so 'a' matches char_literal first
    quoted_symbol: $ => token(prec(-1, seq("'", /[a-zA-Z_][a-zA-Z0-9_]*/))),

    // =========================================
    // LITERALS
    // =========================================
    number_literal: $ => {
      const hex = /0[xX][0-9a-fA-F]+/;
      const decimal = /[0-9]+/;
      // Float must have at least one digit after decimal (to avoid matching 0.. as 0.)
      const float = /[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?/;
      return token(choice(hex, float, decimal));
    },

    // String literal as a single token to prevent comments from being inserted inside
    // Supports escape sequences and backslash-newline line continuations
    string_literal: $ => token(seq(
      '"',
      repeat(choice(
        /[^"\\]+/,           // String content (not " or \)
        /\\[0-7]{1,3}/,      // Octal escape: \0, \177
        /\\x[0-9a-fA-F]{1,2}/, // Hex escape: \x1B, \xFF
        /\\./,               // Other escapes: \n, \t, \\, \"
        /\\\r?\n/,           // Line continuation
      )),
      '"',
    )),

    // Character literal - must be higher precedence than quoted_symbol
    // Use a token to match the entire 'x' or '\n' pattern atomically
    char_literal: $ => token(seq(
      "'",
      choice(
        /[^'\\]/,
        /\\[0-7]{1,3}/,        // Octal escape: '\033'
        /\\x[0-9a-fA-F]{1,2}/, // Hex escape: '\x1B'
        /\\./,                 // Other escapes: '\n', '\\'
      ),
      "'",
    )),

    escape_sequence: $ => token.immediate(seq(
      '\\',
      choice(
        /[0-7]{1,3}/,           // Octal: \0, \177, etc.
        /x[0-9a-fA-F]{1,2}/,    // Hex: \x1B, \xFF, etc.
        /./,                     // Any other char: \n, \t, \|, etc.
      ),
    )),

    // Adjacent string literals/macros are concatenated
    // Supports patterns like: "str" "str", MACRO "str", "str" MACRO, MACRO "str" MACRO
    _string_concat_part: $ => choice($.string_literal, $.identifier),
    concatenated_string: $ => prec.right(seq(
      $._string_concat_part,
      repeat1($._string_concat_part),
    )),

    // =========================================
    // IDENTIFIERS AND COMMENTS
    // =========================================
    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    comment: $ => token(choice(
      seq('//', /.*/),
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),
    )),
  },
});

/**
 * Comma-separated list (0 or more)
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}

/**
 * Comma-separated list (1 or more)
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
