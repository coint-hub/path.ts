import { assert, assertEquals } from "@std/assert";
import { AbstractPath, Directory, File, SymbolicLink } from "./path.ts";
import { ok } from "./result.ts";

Deno.test("Path.file()", () => {
  const result = AbstractPath.file("valid.txt");
  assertEquals(result, ok(new File("valid.txt")));

  const invalidResult = AbstractPath.file("invalid:txt");
  assert(!invalidResult.success);
});

Deno.test("Path.directory()", () => {
  const result = AbstractPath.directory("valid_dir");
  assertEquals(result, ok(new Directory("valid_dir")));

  const invalidResult = AbstractPath.directory("invalid<dir");
  assert(!invalidResult.success);
});

Deno.test("Path.symbolickLink()", () => {
  const result = AbstractPath.symbolickLink("valid_link");
  assertEquals(result, ok(new SymbolicLink("valid_link")));

  const invalidResult = AbstractPath.symbolickLink("invalid|link");
  assert(!invalidResult.success);
});
