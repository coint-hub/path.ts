import { assert, assertEquals } from "@std/assert";
import { Directory } from "./path.ts";
import { assertStrictEquals } from "@std/assert/strict-equals";

Deno.test("Directory.build - valid paths", () => {
  const result = Directory.build("/home/user/documents");
  assert(result.success);
  assertEquals(result.value.name, "documents");
  assertEquals(result.value.parent?.name, "user");
  assertEquals(result.value.parent?.parent?.name, "home");
  assertEquals(result.value.parent?.parent?.parent?.name, "");
  assertEquals(result.value.parent?.parent?.parent?.parent, undefined);
});

Deno.test("Directory.build - root", () => {
  const result = Directory.build("/");
  assert(result.success);
  assertEquals(result.value.name, "");
  assertEquals(result.value.parent, undefined);
});

Deno.test("Directory.build - not absolute", () => {
  const result = Directory.build("relative/path");
  assert(!result.success);
  assertEquals(result.error.kind, "NOT_ABSOLUTE_PATH");
});

Deno.test("Directory.build - invalid segments", () => {
  const result = Directory.build("/home//user*name");
  assert(!result.success);
  assertStrictEquals(result.error.kind, "INVALID_PATH_SEGMENT");
  assertEquals(result.error.pathSegmentErrors.length, 2);
});

Deno.test("Directory.build - trailing slash", () => {
  const result = Directory.build("/home/user/");
  assert(!result.success);
  assertEquals(result.error.kind, "INVALID_TRAILING_SLASH");
});
