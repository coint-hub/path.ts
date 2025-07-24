/**
 * Validates a filename or directory name for compatibility across multiple filesystems.
 * Checks against common restrictions that would make a name invalid on various platforms.
 *
 * Validated filesystems include:
 * - FAT32
 * - exFAT
 * - NTFS
 * - APFS
 * - ext2/ext3/ext4
 * - XFS
 *
 * @see {@link https://en.wikipedia.org/wiki/Comparison_of_file_systems#Limits} - Filesystem limits reference
 *
 * @param name - The filename or directory name to validate
 * @returns Result containing the validated name or an array of validation errors
 *
 * @example Valid name
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { fileNameValidate } from "./filename.ts";
 * import { Result, ok, err } from "@coint/simple";
 *
 * assertEquals(
 *   fileNameValidate("document.txt"),
 *   ok("document.txt")
 * );
 * ```
 *
 * @example Invalid name with Windows characters
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { fileNameValidate, type FileNameValidateError } from "./filename.ts";
 * import { Result, ok, err } from "@coint/simple";
 *
 * assertEquals(
 *   fileNameValidate('file:name.txt'),
 *   err<FileNameValidateError[]>([{
 *     kind: 'INVALID_CHAR',
 *     chars: [':'],
 *     filesystem: 'FAT32/exFAT/NTFS'
 *   }])
 * );
 * ```
 *
 * @example Name too long
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { fileNameValidate, type FileNameValidateError } from "./filename.ts";
 * import { Result, ok, err } from "@coint/simple";
 *
 * const longName = "a".repeat(256);
 * assertEquals(
 *   fileNameValidate(longName),
 *   err<FileNameValidateError[]>([
 *     { kind: 'TOO_LONG', max: 255, actual: 256 },
 *     { kind: 'UTF8_TOO_LONG', max: 255, actual: 256 }
 *   ])
 * );
 * ```
 */
import { err, ok, Result } from "@coint/simple";

export function fileNameValidate(name: string): FileNameValidationResult {
  const errors: FileNameValidateError[] = [];

  // Check for empty name
  if (name.length === 0) {
    errors.push({ kind: "EMPTY" });
  }

  // Generic length limit (255 is common across many filesystems)
  if (name.length > 255) {
    errors.push({ kind: "TOO_LONG", max: 255, actual: name.length });
  }

  // Check for reserved names
  if (name === "." || name === "..") {
    errors.push({ kind: "RESERVED", name });
  }

  // Check for path separator
  if (name.includes("/")) {
    errors.push({ kind: "CONTAINS_PATH_SEPARATOR" });
  }

  // Check for null character (invalid on all filesystems)
  if (name.includes("\0")) {
    errors.push({ kind: "CONTAINS_NULL" });
  }

  // Check for characters invalid on FAT32/exFAT/NTFS
  const windowsInvalidChars = ['"', "*", ":", "<", ">", "?", "\\", "|"];
  const foundInvalidChars = windowsInvalidChars.filter((char) =>
    name.includes(char)
  );
  if (foundInvalidChars.length > 0) {
    errors.push({
      kind: "INVALID_CHAR",
      chars: foundInvalidChars,
      filesystem: "FAT32/exFAT/NTFS",
    });
  }

  // Check for control characters (0x00-0x1F) - invalid on exFAT
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i);
    if (code >= 0x00 && code <= 0x1F) {
      errors.push({ kind: "CONTROL_CHAR", code });
      break; // Only report once
    }
  }

  // Check UTF-8 byte length for APFS (255 UTF-8 bytes)
  const utf8ByteLength = new TextEncoder().encode(name).length;
  if (utf8ByteLength > 255) {
    errors.push({ kind: "UTF8_TOO_LONG", max: 255, actual: utf8ByteLength });
  }

  // Note: ext2/3/4 and XFS only restrict NUL and '/', which are already covered

  if (errors.length) {
    return err(errors);
  }

  return ok(name);
}

export type FileNameValidateError =
  | { kind: "TOO_LONG"; max: number; actual: number }
  | { kind: "EMPTY" }
  | { kind: "RESERVED"; name: string }
  | { kind: "CONTAINS_PATH_SEPARATOR" }
  | { kind: "CONTAINS_NULL" }
  | { kind: "INVALID_CHAR"; chars: string[]; filesystem: string }
  | { kind: "CONTROL_CHAR"; code: number }
  | { kind: "UTF8_TOO_LONG"; max: number; actual: number };

export type FileNameValidationResult = Result<string, FileNameValidateError[]>;
