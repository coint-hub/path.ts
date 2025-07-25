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

Deno.test("Directory.fullPath", () => {
  const root = Directory.build("/");
  assert(root.success);
  assertEquals(root.value.fullPath, "/");

  const home = Directory.build("/home");
  assert(home.success);
  assertEquals(home.value.fullPath, "/home");

  const deep = Directory.build("/home/user/documents");
  assert(deep.success);
  assertEquals(deep.value.fullPath, "/home/user/documents");
});

Deno.test("Directory.directory() - valid name", () => {
  const parent = Directory.build("/home");
  assert(parent.success);

  const child = parent.value.directory("user");
  assert(child.success);
  assertEquals(child.value.name, "user");
  assertEquals(child.value.fullPath, "/home/user");
});

Deno.test("Directory.directory() - invalid name", () => {
  const parent = Directory.build("/home");
  assert(parent.success);

  const invalidChild = parent.value.directory("user/");
  assert(!invalidChild.success);
  assertEquals(invalidChild.error, [{ kind: "CONTAINS_PATH_SEPARATOR" }]);
});

Deno.test("Directory.exists() - directory exists", async () => {
  // Create a temporary directory
  const tempDir = await Deno.makeTempDir();

  const dir = Directory.build(tempDir);
  assert(dir.success);

  const result = await dir.value.exists();
  assert(result.success);
  assertEquals(result.value, true);

  // Cleanup
  await Deno.remove(tempDir);
});

Deno.test("Directory.exists() - directory does not exist", async () => {
  const dir = Directory.build("/this/path/should/not/exist/at/all");
  assert(dir.success);

  const result = await dir.value.exists();
  assert(result.success);
  assertEquals(result.value, false);
});

Deno.test("Directory.exists() - file exists at path", async () => {
  // Create a temporary file
  const tempFile = await Deno.makeTempFile();

  const dir = Directory.build(tempFile);
  assert(dir.success);

  const result = await dir.value.exists();
  assert(!result.success);
  assertEquals(result.error.kind, "FILE_EXISTS");

  // Cleanup
  await Deno.remove(tempFile);
});

Deno.test("Directory.mkdir() - creates new directory", async () => {
  const tempDir = await Deno.makeTempDir();
  const parentDir = Directory.build(tempDir);
  assert(parentDir.success);
  
  const newDirResult = parentDir.value.directory("test-dir");
  assert(newDirResult.success);
  
  const result = await newDirResult.value.mkdir();
  assert(result.success);
  assertEquals(result.value, true); // Created
  
  // Verify it was created
  const stat = await Deno.stat(newDirResult.value.fullPath);
  assert(stat.isDirectory);
  
  // Cleanup
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("Directory.mkdir() - directory already exists", async () => {
  const tempDir = await Deno.makeTempDir();
  const dir = Directory.build(tempDir);
  assert(dir.success);
  
  const result = await dir.value.mkdir();
  assert(result.success);
  assertEquals(result.value, false); // Already exists
  
  // Cleanup
  await Deno.remove(tempDir);
});

Deno.test("Directory.mkdir() - file exists at path", async () => {
  const tempFile = await Deno.makeTempFile();
  
  const dir = Directory.build(tempFile);
  assert(dir.success);
  
  const result = await dir.value.mkdir();
  assert(!result.success);
  assertEquals(result.error.kind, "FILE_EXISTS");
  
  // Cleanup
  await Deno.remove(tempFile);
});

Deno.test("Directory.mkdir() - parent not found", async () => {
  const nonExistentParent = "/this/parent/does/not/exist";
  const dir = Directory.build(nonExistentParent + "/child");
  assert(dir.success);
  
  const result = await dir.value.mkdir();
  assert(!result.success);
  assertEquals(result.error.kind, "PARENT_NOT_FOUND");
});

Deno.test("Directory.mkdirp() - creates nested directories", async () => {
  const tempDir = await Deno.makeTempDir();
  const nestedPath = `${tempDir}/a/b/c/d`;
  const dir = Directory.build(nestedPath);
  assert(dir.success);
  
  const result = await dir.value.mkdirp();
  assert(result.success);
  assertEquals(result.value, true); // Created
  
  // Verify all directories were created
  const stat = await Deno.stat(nestedPath);
  assert(stat.isDirectory);
  
  // Cleanup
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("Directory.mkdirp() - directory already exists", async () => {
  const tempDir = await Deno.makeTempDir();
  const dir = Directory.build(tempDir);
  assert(dir.success);
  
  const result = await dir.value.mkdirp();
  assert(result.success);
  assertEquals(result.value, false); // Already exists
  
  // Cleanup
  await Deno.remove(tempDir);
});

Deno.test("Directory.mkdirp() - partial path exists", async () => {
  const tempDir = await Deno.makeTempDir();
  const parentPath = `${tempDir}/parent`;
  await Deno.mkdir(parentPath);
  
  const nestedPath = `${parentPath}/child/grandchild`;
  const dir = Directory.build(nestedPath);
  assert(dir.success);
  
  const result = await dir.value.mkdirp();
  assert(result.success);
  assertEquals(result.value, true); // Created new directories
  
  // Verify all directories exist
  const stat = await Deno.stat(nestedPath);
  assert(stat.isDirectory);
  
  // Cleanup
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("Directory.mkdirp() - file exists in path", async () => {
  const tempDir = await Deno.makeTempDir();
  const filePath = `${tempDir}/file.txt`;
  await Deno.writeTextFile(filePath, "content");
  
  // Try to create directory where file exists
  const dirPath = `${filePath}/subdir`;
  const dir = Directory.build(dirPath);
  assert(dir.success);
  
  const result = await dir.value.mkdirp();
  assert(!result.success);
  assertEquals(result.error.kind, "FILE_EXISTS");
  
  // Cleanup
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("Directory.mkdirp() - file exists at target path", async () => {
  const tempFile = await Deno.makeTempFile();
  const dir = Directory.build(tempFile);
  assert(dir.success);
  
  const result = await dir.value.mkdirp();
  assert(!result.success);
  assertEquals(result.error.kind, "FILE_EXISTS");
  
  // Cleanup
  await Deno.remove(tempFile);
});
