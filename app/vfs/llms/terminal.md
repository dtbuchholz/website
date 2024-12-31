# Terminal commands

The terminal provides several commands to help you navigate and interact with files:

## Navigation commands

- `cd [path]`: Change directory to the specified path
- `ls [path]`: List contents of current directory or specified path
- `pwd`: Print current working directory

## AI commands

AI commands are available for all files and directories under the `ai <subcommand>` namespace:

- `ai ask <path> <question>`: Ask a question about the file/directory (with double quotes around the question)
- `ai summarize <path>`: Generate a summary of the file/directory

There also exists an AI-assisted command under the `about` namespace:

- `about`: Show information about the author

## Miscellaneous

- `help`: Show available commands and usage
- `clear`: Clear the terminal screen
