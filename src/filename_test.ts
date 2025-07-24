import { assertEquals } from "@std/assert";
import { fileNameValidate, type FileNameValidateError } from "./filename.ts";
import { Result } from "@result/result";

Deno.test("validate - empty name", () => {
  assertEquals(
    fileNameValidate(""),
    Result.err<FileNameValidateError[]>([{ kind: "EMPTY" }]),
  );
});

Deno.test("validate - valid names", () => {
  assertEquals(fileNameValidate("document.txt"), Result.ok("document.txt"));
  assertEquals(fileNameValidate("photo.jpg"), Result.ok("photo.jpg"));
  assertEquals(fileNameValidate("my-file_123"), Result.ok("my-file_123"));
});

Deno.test("validate - reserved names", () => {
  assertEquals(
    fileNameValidate("."),
    Result.err<FileNameValidateError[]>([{ kind: "RESERVED", name: "." }]),
  );
  assertEquals(
    fileNameValidate(".."),
    Result.err<FileNameValidateError[]>([{ kind: "RESERVED", name: ".." }]),
  );
});

Deno.test("validate - path separator", () => {
  assertEquals(
    fileNameValidate("folder/file.txt"),
    Result.err<FileNameValidateError[]>([{ kind: "CONTAINS_PATH_SEPARATOR" }]),
  );
});

Deno.test("validate - null character", () => {
  assertEquals(
    fileNameValidate("file\0name"),
    Result.err<FileNameValidateError[]>([
      { kind: "CONTAINS_NULL" },
      { kind: "CONTROL_CHAR", code: 0 },
    ]),
  );
});

Deno.test("validate - Windows invalid characters", () => {
  assertEquals(
    fileNameValidate("file*name?.txt"),
    Result.err<FileNameValidateError[]>([
      {
        kind: "INVALID_CHAR",
        chars: ["*", "?"],
        filesystem: "FAT32/exFAT/NTFS",
      },
    ]),
  );
});

Deno.test("validate - multiple Windows invalid characters", () => {
  assertEquals(
    fileNameValidate('file<>:"|*?.txt'),
    Result.err<FileNameValidateError[]>([
      {
        kind: "INVALID_CHAR",
        chars: ['"', "*", ":", "<", ">", "?", "|"],
        filesystem: "FAT32/exFAT/NTFS",
      },
    ]),
  );
});

Deno.test("validate - control characters", () => {
  assertEquals(
    fileNameValidate("file\x01name.txt"),
    Result.err<FileNameValidateError[]>([{ kind: "CONTROL_CHAR", code: 1 }]),
  );
});

Deno.test("validate - length exceeds 255 characters", () => {
  const longName = "a".repeat(256);
  assertEquals(
    fileNameValidate(longName),
    Result.err<FileNameValidateError[]>([
      { kind: "TOO_LONG", max: 255, actual: 256 },
      { kind: "UTF8_TOO_LONG", max: 255, actual: 256 },
    ]),
  );
});

Deno.test("validate - exactly 255 characters", () => {
  const maxName = "a".repeat(255);
  assertEquals(fileNameValidate(maxName), Result.ok(maxName));
});

Deno.test("validate - UTF-8 byte length exceeds 255", () => {
  // Using emoji that takes 4 bytes in UTF-8
  const emojiName = "😀".repeat(64); // 64 * 4 = 256 bytes
  assertEquals(
    fileNameValidate(emojiName),
    Result.err<FileNameValidateError[]>([{
      kind: "UTF8_TOO_LONG",
      max: 255,
      actual: 256,
    }]),
  );
});

Deno.test("validate - multiple errors", () => {
  assertEquals(
    fileNameValidate("file/name*test\0"),
    Result.err<FileNameValidateError[]>([
      { kind: "CONTAINS_PATH_SEPARATOR" },
      { kind: "CONTAINS_NULL" },
      { kind: "INVALID_CHAR", chars: ["*"], filesystem: "FAT32/exFAT/NTFS" },
      { kind: "CONTROL_CHAR", code: 0 },
    ]),
  );
});
