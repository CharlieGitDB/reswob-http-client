# Pre-commit Setup Documentation

## Overview

This project now has automated code formatting and linting before every commit.

## What's Installed

### Dependencies

- **husky**: Git hooks management
- **lint-staged**: Run linters on staged files only
- **prettier**: Code formatter
- **eslint-config-prettier**: Disables ESLint rules that conflict with Prettier
- **eslint-plugin-prettier**: Runs Prettier as an ESLint rule

### Configuration Files

- `.prettierrc.json`: Prettier configuration with Windows CRLF line endings
- `.prettierignore`: Files to exclude from formatting
- `.gitattributes`: Git line ending configuration
- `.husky/pre-commit`: Pre-commit hook script

### Package.json Scripts

- `npm run lint:fix`: Fix ESLint issues automatically
- `npm run format`: Format all files with Prettier
- `npm run format:check`: Check if files are formatted correctly

## How It Works

### Pre-commit Hook

When you run `git commit`, the pre-commit hook automatically:

1. **Backs up** the current state
2. **Runs ESLint** with auto-fix on staged `.ts` and `.js` files
3. **Runs Prettier** to format staged `.ts`, `.js`, `.json`, `.md`, `.html`, and `.css` files
4. **Applies changes** and stages them
5. **Completes the commit** if everything passes

### File Types Processed

- **TypeScript/JavaScript** (`.ts`, `.js`): ESLint auto-fix + Prettier formatting
- **Config/Documentation** (`.json`, `.md`, `.html`, `.css`): Prettier formatting only

## Usage

### Normal Development

Just commit as usual - formatting and linting happens automatically:

```bash
git add .
git commit -m "Your commit message"
```

### Manual Formatting

```bash
# Format all files
npm run format

# Check if files are formatted
npm run format:check

# Fix linting issues
npm run lint:fix
```

### Bypassing (Not Recommended)

If you need to bypass the pre-commit hook in an emergency:

```bash
git commit --no-verify -m "Emergency commit"
```

## Benefits

- **Consistent Code Style**: All code follows the same formatting rules
- **Automatic Error Fixing**: Many linting errors are fixed automatically
- **No Manual Work**: Developers don't need to remember to format code
- **Clean History**: All commits have properly formatted code
- **Team Consistency**: Everyone follows the same standards automatically
