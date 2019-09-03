export interface Deferred<T> extends Promise<T> {
    resolve: (value?: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
}
export declare function deferred<T>(): Deferred<T>;
interface SystemOutput {
    code: number;
    stdout: string;
    stderr: string;
    error: string;
}
export declare function system(cmd: string, options?: {
    [key: string]: any;
}): Promise<SystemOutput>;
export {};
