-- Neovim tree-sitter + LSP setup for LPC
--
-- INSTALLATION:
-- 1. Copy this file's contents to your Neovim config
-- 2. Replace <TREE_SITTER_LPC_PATH> with your actual path
-- 3. Run :TSInstall lpc (after restarting Neovim)
-- 4. For highlighting: copy queries/highlights.scm to:
--    ~/.config/nvim/queries/lpc/highlights.scm

-- ============================================
-- TREE-SITTER SETUP
-- ============================================

local parser_config = require("nvim-treesitter.parsers").get_parser_configs()

parser_config.lpc = {
  install_info = {
    url = "<TREE_SITTER_LPC_PATH>", -- e.g., "~/Code/tree-sitter-lpc"
    files = { "src/parser.c" },
    branch = "main",
    generate_requires_npm = false,
    requires_generate_from_grammar = true,
  },
  filetype = "lpc",
}

-- Associate .c files in specific directories with LPC filetype
-- (since LPC uses .c extension)
vim.filetype.add({
  pattern = {
    -- Adjust these patterns to match your LPC project paths
    [".*/orderandchaos/.*%.c$"] = "lpc",
    [".*/mudlib/.*%.c$"] = "lpc",
  },
})

-- Or manually set filetype for a buffer:
-- :set filetype=lpc

-- ============================================
-- LSP SETUP
-- ============================================

-- Option 1: Using lspconfig (if you have it)
-- local lspconfig = require("lspconfig")
-- local configs = require("lspconfig.configs")
--
-- if not configs.lpc_ls then
--   configs.lpc_ls = {
--     default_config = {
--       cmd = { "node", vim.fn.expand("<TREE_SITTER_LPC_PATH>/lsp/dist/server.js"), "--stdio" },
--       filetypes = { "lpc" },
--       root_dir = function(fname)
--         return lspconfig.util.find_git_ancestor(fname) or vim.fn.getcwd()
--       end,
--       settings = {},
--     },
--   }
-- end
-- lspconfig.lpc_ls.setup({})

-- Option 2: Manual LSP setup (no lspconfig needed)
vim.api.nvim_create_autocmd("FileType", {
  pattern = "lpc",
  callback = function()
    vim.lsp.start({
      name = "lpc-language-server",
      cmd = { "node", vim.fn.expand("<TREE_SITTER_LPC_PATH>/lsp/dist/server.js"), "--stdio" },
      root_dir = vim.fs.dirname(vim.fs.find({ ".git", "mudlib" }, { upward = true })[1]),
    })
  end,
})

-- Format on save (optional)
vim.api.nvim_create_autocmd("BufWritePre", {
  pattern = "*.c",
  callback = function()
    if vim.bo.filetype == "lpc" then
      vim.lsp.buf.format({ async = false })
    end
  end,
})

-- Keymaps for LSP (add to your existing LSP keymaps or use these)
-- vim.keymap.set("n", "<leader>f", vim.lsp.buf.format, { desc = "Format buffer" })
