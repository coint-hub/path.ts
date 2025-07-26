# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

path.ts is an object-oriented filesystem path management library for
TypeScript/Deno, inspired by Python's pathlib. The library emphasizes:

- Type safety
- Explicit error handling using Result monads (no exceptions)

## Commands

### Testing

- `deno test` - Run all tests
- `deno test filename_test.ts` - Run specific test file
- `deno task doctest` - Run doctests from JSDoc examples
- `deno task doctest filename.ts` - Run doctests for specific file
- `deno task verify` - Comprehensive project verification

### Development

- When testing is requested without specific framework mentioned, use Deno's
  built-in test runner
- Tests follow the pattern `*_test.ts`
- `deno lint` - Run code linting
- After code writing, always run lint, test, and doctest to ensure code quality
  and correctness

## Architecture

The library uses the Result monad pattern from `@result/result` for error
handling instead of throwing exceptions. This ensures all errors are handled
explicitly and type-safely.

Current modules:

- `filename.ts` - Validates filenames/directory names across multiple
  filesystems (FAT32, exFAT, NTFS, APFS, ext2/3/4, XFS)
- `path.ts` - Core path management with Directory and File classes
- `mod.ts` - Main export file

### Key Implementation Patterns

- `mkdirp()`: Simple recursive pattern - ensure parent exists first, then create self
- Error handling: Check for "Not a directory" in error messages to detect file-in-path scenarios

## Code Standards

- All public functions should have JSDoc documentation with examples
- JSDoc examples should be executable as doctests
- Validation functions return error arrays (empty array = valid)
- Reference external sources (e.g., Wikipedia for filesystem limits) in comments
  and JSDoc
- Use consistent formatting for ternary operators - split across multiple lines for readability
- In switch statements, use braces for all case blocks: `case "FOO": { ... }`
- Keep error messages concise and avoid JSON.stringify for error objects
- Structure if/else blocks to handle the error cases first, success case last

## Commit Message Guidelines

- Follow Conventional Commits specification
  - Use clear, concise, and descriptive commit messages
  - Structure: `<type>(<scope>): <description>`
  - Common types include:
    - `feat`: New feature
    - `fix`: Bug fix
    - `docs`: Documentation changes
    - `style`: Code formatting
    - `refactor`: Code refactoring
    - `test`: Adding or modifying tests
    - `chore`: Maintenance tasks

## Testing Patterns

- assertEquals support deep equals

## Result Type Handling

When working with Result types in this codebase, you MUST handle all possible cases exhaustively:

### Basic Pattern
```typescript ignore
const result = someFunction();
if (result.success) {
  // Handle success case - use result.value
} else {
  // Handle error case - use result.error
}
```

### Error Handling with Switch
When a Result has multiple error types, use a switch statement to handle each case:

```typescript ignore
const result = await dir.mkdir();
if (result.success) {
  if (result.value) {
    // Directory was created
  } else {
    // Directory already existed
  }
} else {
  // Handle all error cases exhaustively
  switch (result.error.kind) {
    case "FILE_EXISTS":
      // A file exists at this path
      break;
    case "PERMISSION_DENIED":
      // No permission to create
      break;
    case "PARENT_NOT_FOUND":
      // Parent directory doesn't exist
      break;
    case "IO_ERROR":
      // General I/O error with message
      console.error(result.error.message);
      break;
  }
}
```

### Important Rules
- NEVER ignore error cases - always handle them explicitly
- When adding new error types, ensure all switch statements are updated
- Use TypeScript's exhaustiveness checking to ensure all cases are handled
- Forward errors when appropriate (e.g., in higher-level functions)
- Document all possible error types in JSDoc comments

### Exhaustive Case Handling
When handling error types in switch statements, use `ExhaustiveCaseError` from `@coint/simple` to ensure all cases are covered:

```typescript ignore
switch (result.error.kind) {
  case "FILE_EXISTS": {
    return err({ kind: "FILE_EXISTS" });
  }
  case "IO_ERROR": {
    return err(result.error);
  }
  default: {
    throw new ExhaustiveCaseError(result.error);
  }
}
```

This pattern ensures that if a new error type is added to the union, TypeScript will catch any switch statements that don't handle it. The `ExhaustiveCaseError` will never be thrown at runtime if all cases are handled properly - it's a compile-time safety check.

## Development Workflow

- Do not try to git add, I will stage for you
