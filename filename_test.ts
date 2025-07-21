import { assertEquals } from "@std/assert";
import { validate } from "./filename.ts";

Deno.test("validate - empty name", () => {
  const errors = validate("");
  assertEquals(errors, ["Name cannot be empty"]);
});

Deno.test("validate - valid names", () => {
  assertEquals(validate("document.txt"), []);
  assertEquals(validate("photo.jpg"), []);
  assertEquals(validate("my-file_123"), []);
});

Deno.test("validate - reserved names", () => {
  assertEquals(validate("."), ['"." is a reserved name']);
  assertEquals(validate(".."), ['".." is a reserved name']);
});

Deno.test("validate - path separator", () => {
  const errors = validate("folder/file.txt");
  assertEquals(errors, ['Name cannot contain "/" character']);
});

Deno.test("validate - null character", () => {
  const errors = validate("file\0name");
  assertEquals(errors, [
    'Name cannot contain null character',
    'Name contains control character (code 0) which is invalid on exFAT'
  ]);
});

Deno.test("validate - Windows invalid characters", () => {
  const errors = validate('file*name?.txt');
  assertEquals(errors, ['Name contains characters invalid on FAT32/exFAT/NTFS: * ?']);
});

Deno.test("validate - multiple Windows invalid characters", () => {
  const errors = validate('file<>:"|*?.txt');
  assertEquals(errors, ['Name contains characters invalid on FAT32/exFAT/NTFS: " * : < > ? |']);
});

Deno.test("validate - control characters", () => {
  const errors = validate("file\x01name.txt");
  assertEquals(errors, ["Name contains control character (code 1) which is invalid on exFAT"]);
});

Deno.test("validate - length exceeds 255 characters", () => {
  const longName = "a".repeat(256);
  const errors = validate(longName);
  assertEquals(errors, [
    "Name exceeds 255 characters (256 characters)",
    "Name exceeds 255 UTF-8 bytes for APFS (256 bytes)"
  ]);
});

Deno.test("validate - exactly 255 characters", () => {
  const maxName = "a".repeat(255);
  assertEquals(validate(maxName), []);
});

Deno.test("validate - UTF-8 byte length exceeds 255", () => {
  // Using emoji that takes 4 bytes in UTF-8
  const emojiName = "😀".repeat(64); // 64 * 4 = 256 bytes
  const errors = validate(emojiName);
  assertEquals(errors, ["Name exceeds 255 UTF-8 bytes for APFS (256 bytes)"]);
});

Deno.test("validate - multiple errors", () => {
  const errors = validate("file/name*test\0");
  errors.sort();
  
  const expectedErrors = [
    'Name cannot contain "/" character',
    'Name cannot contain null character',
    'Name contains characters invalid on FAT32/exFAT/NTFS: *',
    'Name contains control character (code 0) which is invalid on exFAT'
  ];
  expectedErrors.sort();
  
  assertEquals(errors, expectedErrors);
});