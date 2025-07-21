# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

path.ts is an object-oriented filesystem path management library for TypeScript/Deno, inspired by Python's pathlib. The library emphasizes:
- Type safety
- Explicit error handling using Result monads (no exceptions)

## Commands

### Testing
- `deno test` - Run all tests
- `deno test filename_test.ts` - Run specific test file
- `deno task doctest` - Run doctests from JSDoc examples
- `deno task doctest filename.ts` - Run doctests for specific file

### Development
- When testing is requested without specific framework mentioned, use Deno's built-in test runner
- Tests follow the pattern `*_test.ts`

## Architecture

The library uses the Result monad pattern from `@result/result` for error handling instead of throwing exceptions. This ensures all errors are handled explicitly and type-safely.

Current modules:
- `filename.ts` - Validates filenames/directory names across multiple filesystems (FAT32, exFAT, NTFS, APFS, ext2/3/4, XFS)
- `mod.ts` - Main export file

## Code Standards

- All public functions should have JSDoc documentation with examples
- JSDoc examples should be executable as doctests
- Validation functions return error arrays (empty array = valid)
- Reference external sources (e.g., Wikipedia for filesystem limits) in comments and JSDoc

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
