// limits refrence from wikipedia - https://en.wikipedia.org/wiki/Comparison_of_file_systems#Limits

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
 * @returns Array of validation error messages. Empty array if the name is valid.
 * 
 * @example Valid name
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { validate } from "./filename.ts";
 * 
 * assertEquals(validate("document.txt"), []);
 * assertEquals(validate("my-project"), []);
 * ```
 * 
 * @example Invalid name with Windows characters
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { validate } from "./filename.ts";
 * 
 * const errors = validate('file:name.txt');
 * assertEquals(errors, ['Name contains characters invalid on FAT32/exFAT/NTFS: :']);
 * ```
 * 
 * @example Name too long
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { validate } from "./filename.ts";
 * 
 * const longName = "a".repeat(256);
 * const errors = validate(longName);
 * assertEquals(errors.length, 2); // Character limit and UTF-8 byte limit
 * ```
 */
export function validate(name: string): string[] {
  const errors: string[] = [];

  // Generic length limit (255 is common across many filesystems)
  if (name.length > 255) {
    errors.push(`Name exceeds 255 characters (${name.length} characters)`);
  }

  // Check for empty name
  if (name.length === 0) {
    errors.push("Name cannot be empty");
  }

  // Check for reserved names
  if (name === "." || name === "..") {
    errors.push(`"${name}" is a reserved name`);
  }

  // Check for path separator
  if (name.includes("/")) {
    errors.push('Name cannot contain "/" character');
  }

  // Check for null character (invalid on all filesystems)
  if (name.includes('\0')) {
    errors.push('Name cannot contain null character');
  }

  // Check for characters invalid on FAT32/exFAT/NTFS
  const windowsInvalidChars = ['"', '*', ':', '<', '>', '?', '\\', '|'];
  const foundInvalidChars = windowsInvalidChars.filter(char => name.includes(char));
  if (foundInvalidChars.length > 0) {
    errors.push(`Name contains characters invalid on FAT32/exFAT/NTFS: ${foundInvalidChars.join(' ')}`);
  }

  // Check for control characters (0x00-0x1F) - invalid on exFAT
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i);
    if (code >= 0x00 && code <= 0x1F) {
      errors.push(`Name contains control character (code ${code}) which is invalid on exFAT`);
      break; // Only report once
    }
  }

  // Check UTF-8 byte length for APFS (255 UTF-8 bytes)
  const utf8ByteLength = new TextEncoder().encode(name).length;
  if (utf8ByteLength > 255) {
    errors.push(`Name exceeds 255 UTF-8 bytes for APFS (${utf8ByteLength} bytes)`);
  }

  // Note: ext2/3/4 and XFS only restrict NUL and '/', which are already covered

  return errors;
}
