{
  languages = {
    lpc = {
      extensions = ["c"],
      grammar = {
        # Note: Update this path to your local build location
        # macOS: libtree-sitter-lpc.dylib
        # Linux: libtree-sitter-lpc.so
        source = {
          path = "./libtree-sitter-lpc.dylib",
        },
      },
      indent = "    ",
    },
  },
}
