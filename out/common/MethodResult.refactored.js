"use strict";
/**
 * Result wrapper for method operations
 *
 * Provides a consistent way to handle success/failure results with proper typing
 *
 * @module MethodResult
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacyMethodResult = exports.MethodResult = void 0;
/**
 * Generic result wrapper for operations that can succeed or fail
 *
 * @template T - Type of the result data
 *
 * @example
 * ```typescript
 * async function fetchData(): Promise<MethodResult<string>> {
 *     try {
 *         const data = await someAsyncOperation();
 *         return MethodResult.success(data);
 *     } catch (error) {
 *         return MethodResult.failure(error as Error);
 *     }
 * }
 *
 * const result = await fetchData();
 * if (result.isSuccessful) {
 *     console.log(result.data); // Type-safe access
 * } else {
 *     console.error(result.error);
 * }
 * ```
 */
class MethodResult {
    /**
     * Private constructor - use static factory methods instead
     *
     * @param isSuccessful - Whether the operation succeeded
     * @param data - Result data (for success)
     * @param error - Error (for failure)
     */
    constructor(isSuccessful, data, error) {
        this.isSuccessful = isSuccessful;
        this.data = data;
        this.error = error;
    }
    /**
     * Create a successful result
     *
     * @param data - The result data
     * @returns A successful MethodResult
     */
    static success(data) {
        return new MethodResult(true, data, undefined);
    }
    /**
     * Create a failed result
     *
     * @param error - The error that occurred
     * @returns A failed MethodResult
     */
    static failure(error) {
        return new MethodResult(false, undefined, error);
    }
    /**
     * Map the result data to a new type
     *
     * @param fn - Mapping function
     * @returns A new MethodResult with mapped data
     */
    map(fn) {
        if (this.isSuccessful && this.data !== undefined) {
            try {
                return MethodResult.success(fn(this.data));
            }
            catch (error) {
                return MethodResult.failure(error);
            }
        }
        return MethodResult.failure(this.error || new Error('No data available'));
    }
    /**
     * Chain another operation that returns a MethodResult
     *
     * @param fn - Function that takes the data and returns a new MethodResult
     * @returns The result of the chained operation
     */
    flatMap(fn) {
        if (this.isSuccessful && this.data !== undefined) {
            try {
                return fn(this.data);
            }
            catch (error) {
                return MethodResult.failure(error);
            }
        }
        return MethodResult.failure(this.error || new Error('No data available'));
    }
    /**
     * Get the data or throw the error
     *
     * @throws The error if the result is a failure
     * @returns The data if the result is successful
     */
    unwrap() {
        if (this.isSuccessful && this.data !== undefined) {
            return this.data;
        }
        throw this.error || new Error('Result is not successful');
    }
    /**
     * Get the data or return a default value
     *
     * @param defaultValue - Value to return if the result is a failure
     * @returns The data or the default value
     */
    unwrapOr(defaultValue) {
        return this.isSuccessful && this.data !== undefined ? this.data : defaultValue;
    }
    /**
     * Execute a function if the result is successful
     *
     * @param fn - Function to execute with the data
     * @returns This result for chaining
     */
    onSuccess(fn) {
        if (this.isSuccessful && this.data !== undefined) {
            fn(this.data);
        }
        return this;
    }
    /**
     * Execute a function if the result is a failure
     *
     * @param fn - Function to execute with the error
     * @returns This result for chaining
     */
    onFailure(fn) {
        if (!this.isSuccessful && this.error) {
            fn(this.error);
        }
        return this;
    }
    /**
     * Convert to a JSON-serializable object
     */
    toJSON() {
        return {
            isSuccessful: this.isSuccessful,
            data: this.data,
            error: this.error?.message,
        };
    }
}
exports.MethodResult = MethodResult;
/**
 * Legacy compatibility - matches old API
 * @deprecated Use MethodResult.success() and MethodResult.failure() instead
 */
class LegacyMethodResult {
}
exports.LegacyMethodResult = LegacyMethodResult;
//# sourceMappingURL=MethodResult.refactored.js.map