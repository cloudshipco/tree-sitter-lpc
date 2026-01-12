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

    preproc_ifdef: $ => seq(
      choice('#ifdef', '#ifndef'),
      $.identifier,
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
    preproc_arg: $ => token(prec(-1, /\S[^\n]*/)),

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
    ),

    // =========================================
    // TYPES
    // =========================================
    _type: $ => seq(
      $.type_specifier,
      optional('*'),  // Array/pointer marker
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
    foreach_statement: $ => seq(
      'foreach',
      '(',
      $._type,
      $.identifier,
      optional(seq(',', $._type, $.identifier)),  // key, value
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
      $.function_ref,  // #'func_name
      $.closure_argument,  // $1, $2, etc. can be used in expressions
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
      $.scope_resolution,
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
      commaSep($._expression),
      ')',
    )),

    // LPC array subscript with range support
    // Supports: arr[i], arr[start..end], arr[<i], arr[start..<end], arr[<start..<end]
    // The < prefix means "from end of array"
    _range_index: $ => seq(optional('<'), $._expression),
    subscript_expression: $ => prec(PREC.SUBSCRIPT, seq(
      $._expression,
      '[',
      $._range_index,
      optional(seq('..', optional($._range_index))),  // LPC range syntax
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
    array_literal: $ => seq(
      '({',
      commaSep($._expression),
      optional(','),
      '})',
    ),

    // Mapping literal: ([ "key": value ])
    mapping_literal: $ => seq(
      '([',
      commaSep($.mapping_entry),
      optional(','),
      '])',
    ),

    mapping_entry: $ => seq(
      $._expression,
      ':',
      $._expression,
    ),

    // Closure literal: (: expr :) or (: $1 + $2 :)
    closure_literal: $ => seq(
      '(:',
      optional($._expression),
      ':)',
    ),

    // Function reference closure: #'func_name
    function_ref: $ => seq(
      "#'",
      $.identifier,
    ),

    closure_argument: $ => /\$[0-9]+/,

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

    string_literal: $ => seq(
      '"',
      repeat(choice(
        $.string_content,
        $.escape_sequence,
      )),
      '"',
    ),

    // Named node for string content (Topiary needs named nodes to preserve content)
    string_content: $ => /[^"\\]+/,

    char_literal: $ => seq(
      "'",
      choice(
        /[^'\\]/,
        $.escape_sequence,
      ),
      "'",
    ),

    escape_sequence: $ => token.immediate(seq(
      '\\',
      choice(
        /['"\\abfnrtv]/,
        /[0-7]{1,3}/,
        /x[0-9a-fA-F]{1,2}/,
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
