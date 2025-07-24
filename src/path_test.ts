import { assert, assertEquals } from "@std/assert";
import { AbstractPath, Directory, File, SymbolicLink } from "./path.ts";
import { Result } from "@result/result";

Deno.test("Path.file()", () => {
  const result = AbstractPath.file("valid.txt");
  assertEquals(result, Result.ok(new File("valid.txt")));

  const invalidResult = AbstractPath.file("invalid:txt");
  assert(invalidResult.isErr);
});

Deno.test("Path.directory()", () => {
  const result = AbstractPath.directory("valid_dir");
  assertEquals(result, Result.ok(new Directory("valid_dir")));

  const invalidResult = AbstractPath.directory("invalid<dir");
  assert(invalidResult.isErr);
});

Deno.test("Path.symbolickLink()", () => {
  const result = AbstractPath.symbolickLink("valid_link");
  assertEquals(result, Result.ok(new SymbolicLink("valid_link")));

  const invalidResult = AbstractPath.symbolickLink("invalid|link");
  assert(invalidResult.isErr);
});
