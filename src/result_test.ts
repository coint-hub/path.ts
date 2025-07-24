import { assertEquals } from "@std/assert";
import { err, ok, type Result } from "./result.ts";

Deno.test("ok creates successful result", () => {
  assertEquals(ok(42), { success: true, value: 42 });
  assertEquals(ok("hello"), { success: true, value: "hello" });
  assertEquals(ok(null), { success: true, value: null });
});

Deno.test("err creates failed result", () => {
  assertEquals(err("error message"), {
    success: false,
    error: "error message",
  });
  assertEquals(err(404), { success: false, error: 404 });
  assertEquals(err({ code: "E001" }), {
    success: false,
    error: { code: "E001" },
  });
});

Deno.test("Result type discriminates properly", () => {
  function divide(a: number, b: number): Result<number, string> {
    if (b === 0) {
      return err("Division by zero");
    }
    return ok(a / b);
  }

  assertEquals(divide(10, 2), { success: true, value: 5 });
  assertEquals(divide(10, 0), { success: false, error: "Division by zero" });
});

Deno.test("Result works with complex types", () => {
  interface User {
    id: number;
    name: string;
  }

  const user: User = { id: 1, name: "Alice" };
  assertEquals(ok(user), { success: true, value: { id: 1, name: "Alice" } });

  const error = new Error("User not found");
  assertEquals(err(error), { success: false, error });
});
