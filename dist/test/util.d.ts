import { InterpreterContext } from "../src/context";
export interface Result {
    actual: any;
    actualError: Error;
    expected: any;
    expectedError: Error;
    src: string;
    success: boolean;
}
export declare function assertResult(result: Result): void;
export declare function assertError(src: string, error: string): void;
export declare function compare(src: string, context?: InterpreterContext): Result;
