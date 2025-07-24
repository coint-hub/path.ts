/**
 * A Result type for explicit error handling without exceptions.
 * 
 * @template T - The type of the successful value
 * @template E - The type of the error value
 * 
 * @example
 * ```ts
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return err("Division by zero");
 *   }
 *   return ok(a / b);
 * }
 * 
 * const result = divide(10, 2);
 * if (!result.success) {
 *   console.error(result.error);
 * } else {
 *   console.log(result.value); // 5
 * }
 * ```
 */
export type Result<T, E> =
  | Readonly<{ success: true; value: T }>
  | Readonly<{ success: false; error: E }>;

/**
 * Creates a successful Result containing a value.
 * 
 * @template T - The type of the value
 * @param value - The successful value to wrap
 * @returns A successful Result
 * 
 * @example
 * ```ts
 * const result = ok(42);
 * console.log(result.success); // true
 * if (result.success) {
 *   console.log(result.value); // 42
 * }
 * ```
 */
export function ok<T>(value: T): Result<T, never> {
  return { success: true, value };
}

/**
 * Creates a failed Result containing an error.
 * 
 * @template E - The type of the error
 * @param error - The error value to wrap
 * @returns A failed Result
 * 
 * @example
 * ```ts
 * const result = err("Something went wrong");
 * console.log(result.success); // false
 * if (!result.success) {
 *   console.log(result.error); // "Something went wrong"
 * }
 * ```
 */
export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}
