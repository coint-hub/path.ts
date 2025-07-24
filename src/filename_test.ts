import { assertEquals } from "@std/assert";
import { validate, type ValidateError } from "./filename.ts";
import { Result } from "@result/result";

Deno.test("validate - empty name", () => {
  assertEquals(
    validate(""),
    Result.err<ValidateError[]>([{ kind: "EMPTY" }]),
  );
});

Deno.test("validate - valid names", () => {
  assertEquals(validate("document.txt"), Result.ok("document.txt"));
  assertEquals(validate("photo.jpg"), Result.ok("photo.jpg"));
  assertEquals(validate("my-file_123"), Result.ok("my-file_123"));
});

Deno.test("validate - reserved names", () => {
  assertEquals(
    validate("."),
    Result.err<ValidateError[]>([{ kind: "RESERVED", name: "." }]),
  );
  assertEquals(
    validate(".."),
    Result.err<ValidateError[]>([{ kind: "RESERVED", name: ".." }]),
  );
});

Deno.test("validate - path separator", () => {
  assertEquals(
    validate("folder/file.txt"),
    Result.err<ValidateError[]>([{ kind: "CONTAINS_PATH_SEPARATOR" }]),
  );
});

Deno.test("validate - null character", () => {
  assertEquals(
    validate("file\0name"),
    Result.err<ValidateError[]>([
      { kind: "CONTAINS_NULL" },
      { kind: "CONTROL_CHAR", code: 0 },
    ]),
  );
});

Deno.test("validate - Windows invalid characters", () => {
  assertEquals(
    validate("file*name?.txt"),
    Result.err<ValidateError[]>([
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
    validate('file<>:"|*?.txt'),
    Result.err<ValidateError[]>([
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
    validate("file\x01name.txt"),
    Result.err<ValidateError[]>([{ kind: "CONTROL_CHAR", code: 1 }]),
  );
});

Deno.test("validate - length exceeds 255 characters", () => {
  const longName = "a".repeat(256);
  assertEquals(
    validate(longName),
    Result.err<ValidateError[]>([
      { kind: "TOO_LONG", max: 255, actual: 256 },
      { kind: "UTF8_TOO_LONG", max: 255, actual: 256 },
    ]),
  );
});

Deno.test("validate - exactly 255 characters", () => {
  const maxName = "a".repeat(255);
  assertEquals(validate(maxName), Result.ok(maxName));
});

Deno.test("validate - UTF-8 byte length exceeds 255", () => {
  // Using emoji that takes 4 bytes in UTF-8
  const emojiName = "😀".repeat(64); // 64 * 4 = 256 bytes
  assertEquals(
    validate(emojiName),
    Result.err<ValidateError[]>([{ kind: "UTF8_TOO_LONG", max: 255, actual: 256 }]),
  );
});

Deno.test("validate - multiple errors", () => {
  assertEquals(
    validate("file/name*test\0"),
    Result.err<ValidateError[]>([
      { kind: "CONTAINS_PATH_SEPARATOR" },
      { kind: "CONTAINS_NULL" },
      { kind: "INVALID_CHAR", chars: ["*"], filesystem: "FAT32/exFAT/NTFS" },
      { kind: "CONTROL_CHAR", code: 0 },
    ]),
  );
});
