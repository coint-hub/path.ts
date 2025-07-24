import { assertEquals } from "@std/assert";
import { fileNameValidate } from "./filename.ts";
import { err, ok } from "@coint/simple";
import { FileNameValidateError } from "../mod.ts";

Deno.test("validate - empty name", () => {
  assertEquals(
    fileNameValidate(""),
    err<FileNameValidateError[]>([{ kind: "EMPTY" }]),
  );
});

Deno.test("validate - valid names", () => {
  assertEquals(fileNameValidate("document.txt"), ok("document.txt"));
  assertEquals(fileNameValidate("photo.jpg"), ok("photo.jpg"));
  assertEquals(fileNameValidate("my-file_123"), ok("my-file_123"));
});

Deno.test("validate - reserved names", () => {
  assertEquals(
    fileNameValidate("."),
    err<FileNameValidateError[]>([{ kind: "RESERVED", name: "." }]),
  );
  assertEquals(
    fileNameValidate(".."),
    err<FileNameValidateError[]>([{ kind: "RESERVED", name: ".." }]),
  );
});

Deno.test("validate - path separator", () => {
  assertEquals(
    fileNameValidate("folder/file.txt"),
    err<FileNameValidateError[]>([{ kind: "CONTAINS_PATH_SEPARATOR" }]),
  );
});

Deno.test("validate - null character", () => {
  assertEquals(
    fileNameValidate("file\0name"),
    err<FileNameValidateError[]>([
      { kind: "CONTAINS_NULL" },
      { kind: "CONTROL_CHAR", code: 0 },
    ]),
  );
});

Deno.test("validate - Windows invalid characters", () => {
  assertEquals(
    fileNameValidate("file*name?.txt"),
    err<FileNameValidateError[]>([
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
    err<FileNameValidateError[]>([
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
    err<FileNameValidateError[]>([{ kind: "CONTROL_CHAR", code: 1 }]),
  );
});

Deno.test("validate - length exceeds 255 characters", () => {
  const longName = "a".repeat(256);
  assertEquals(
    fileNameValidate(longName),
    err<FileNameValidateError[]>([
      { kind: "TOO_LONG", max: 255, actual: 256 },
      { kind: "UTF8_TOO_LONG", max: 255, actual: 256 },
    ]),
  );
});

Deno.test("validate - exactly 255 characters", () => {
  const maxName = "a".repeat(255);
  assertEquals(fileNameValidate(maxName), ok(maxName));
});

Deno.test("validate - UTF-8 byte length exceeds 255", () => {
  // Using emoji that takes 4 bytes in UTF-8
  const emojiName = "😀".repeat(64); // 64 * 4 = 256 bytes
  assertEquals(
    fileNameValidate(emojiName),
    err<FileNameValidateError[]>([{
      kind: "UTF8_TOO_LONG",
      max: 255,
      actual: 256,
    }]),
  );
});

Deno.test("validate - multiple errors", () => {
  assertEquals(
    fileNameValidate("file/name*test\0"),
    err<FileNameValidateError[]>([
      { kind: "CONTAINS_PATH_SEPARATOR" },
      { kind: "CONTAINS_NULL" },
      {
        kind: "INVALID_CHAR",
        chars: ["*"],
        filesystem: "FAT32/exFAT/NTFS",
      },
      { kind: "CONTROL_CHAR", code: 0 },
    ]),
  );
});
