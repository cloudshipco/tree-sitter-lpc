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
(char_literal) @character

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

; ============================================
; LDMud Built-in Efuns
; ============================================
; These are highlighted as @function.builtin when called

(call_expression
  (identifier) @function.builtin
  (#any-of? @function.builtin
    ; A
    "abs" "acos" "add_action" "all_environment" "all_inventory"
    "allocate" "and_bits" "apply" "asin" "assoc" "atan" "atan2"
    "attach_erq_demon"
    ; B
    "binary_message" "bind_lambda" "blueprint" "break_point"
    ; C
    "call_other" "call_out" "call_out_info" "call_resolved"
    "caller_stack" "caller_stack_depth" "capitalize" "cat" "catch"
    "ceil" "clear_bit" "clone_object" "clonep" "clones" "closurep"
    "command" "command_stack" "command_stack_depth" "copy" "copy_bits"
    "copy_file" "cos" "count_bits" "crypt" "ctime"
    ; D
    "db_affected_rows" "db_close" "db_coldefs" "db_connect"
    "db_conv_string" "db_error" "db_exec" "db_fetch" "db_handles"
    "db_insert_id" "debug_info" "debug_message" "deep_copy"
    "deep_inventory" "destruct" "disable_commands"
    ; E
    "ed" "enable_commands" "environment" "exec" "execute_command"
    "exp" "expand_define" "explode" "extern_call"
    ; F
    "file_size" "filter" "filter_indices" "filter_objects"
    "find_call_out" "find_input_to" "find_object" "first_inventory"
    "floatp" "floor" "funcall" "function_exists" "functionlist"
    ; G
    "garbage_collection" "get_dir" "get_error_file" "get_eval_cost"
    "get_extra_wizinfo" "get_type_info" "gmtime"
    ; H
    "heart_beat_info"
    ; I
    "implode" "include_list" "inherit_list" "input_to" "input_to_info"
    "insert_alist" "interactive" "intersect_alist" "intp" "invert_bits"
    ; L
    "lambda" "last_bit" "last_instructions" "limited" "living"
    "load_name" "load_object" "localtime" "log" "lower_case"
    ; M
    "m_add" "m_allocate" "m_contains" "m_delete" "m_entry" "m_indices"
    "m_reallocate" "m_values" "make_shared_string" "map" "map_indices"
    "map_objects" "mappingp" "max" "md5" "member" "min" "mkdir"
    "mkmapping" "move_object"
    ; N
    "negate" "next_bit" "next_inventory" "notify_fail"
    ; O
    "object_info" "object_name" "object_time" "objectp" "or_bits"
    "order_alist"
    ; P
    "pointerp" "pow" "present" "present_clone" "previous_object"
    "printf" "process_string" "program_name" "program_time"
    ; Q
    "query_actions" "query_command" "query_editing" "query_idle"
    "query_input_pending" "query_ip_name" "query_ip_number"
    "query_limits" "query_load_average" "query_mud_port"
    "query_notify_fail" "query_once_interactive" "query_shadowing"
    "query_snoop" "query_udp_port" "query_verb" "quote"
    ; R
    "raise_error" "random" "read_bytes" "read_file" "referencep"
    "regexp" "regexplode" "regmatch" "regreplace" "remove_action"
    "remove_call_out" "remove_input_to" "remove_interactive" "rename"
    "rename_object" "replace_program" "restore_object" "restore_value"
    "rm" "rmdir" "rmember" "rusage"
    ; S
    "save_object" "save_value" "say" "send_erq" "send_udp" "set_bit"
    "set_buffer_size" "set_combine_charset" "set_connection_charset"
    "set_driver_hook" "set_environment" "set_extra_wizinfo"
    "set_extra_wizinfo_size" "set_heart_beat" "set_is_wizard"
    "set_light" "set_limits" "set_modify_command" "set_next_reset"
    "set_prompt" "set_this_object" "set_this_player" "sgn" "shadow"
    "shutdown" "sin" "sizeof" "snoop" "sort_array" "sprintf" "sqrt"
    "sscanf" "stringp" "strlen" "strrstr" "strstr" "swap"
    "symbol_function" "symbol_variable" "symbolp"
    ; T
    "tail" "tan" "tell_object" "tell_room" "terminal_colour" "test_bit"
    "this_interactive" "this_object" "this_player" "throw" "time"
    "to_array" "to_float" "to_int" "to_object" "to_string" "trace"
    "traceprefix" "transpose_array" "trim" "typeof"
    ; U
    "unbound_lambda" "unique_array" "unmkmapping" "unquote" "unshadow"
    "upper_case" "users" "utime"
    ; V
    "variable_exists" "variable_list"
    ; W
    "walk_mapping" "widthof" "wizlist_info" "write" "write_bytes"
    "write_file"
    ; X
    "xor_bits"
  ))

; ============================================
; LPC Applies (driver callbacks)
; ============================================
; Function definitions with these names get special highlighting

(function_definition
  (function_declarator
    (identifier) @function.builtin)
  (#any-of? @function.builtin
    ; Object applies
    "create" "reset" "init" "clean_up" "heart_beat" "__INIT"
    "catch_msg" "catch_tell" "exit" "id" "logon" "modify_command"
    ; Query applies
    "query_weight" "query_prevent_shadow" "add_weight"
    "can_put_and_get" "drop" "get" "prevent_insert"
    ; Master applies
    "compile_object" "connect" "dangling_lfun_closure" "disconnect"
    "epilog" "external_master_reload" "flag" "get_bb_uid"
    "get_ed_buffer_save_file_name" "get_master_uid" "get_simul_efun"
    "get_wiz_name" "heart_beat_error" "inaugurate_master"
    "include_file" "inherit_file" "log_error" "make_path_absolute"
    "notify_shutdown" "preload" "prepare_destruct" "privilege_violation"
    "query_allow_shadow" "receive_udp" "remove_player"
    "retrieve_ed_setup" "runtime_error" "save_ed_setup" "slow_shutdown"
    "stale_erq" "valid_exec" "valid_query_snoop" "valid_read"
    "valid_snoop" "valid_trace" "valid_write" "creator_file"
  ))
