import { exec } from "child_process";

export interface Deferred<T> extends Promise<T> {
  resolve: (value?: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

export function deferred<T>(): Deferred<T> {
  let methods;
  const promise = new Promise<T>(
    (resolve, reject): void => {
      methods = { resolve, reject };
    }
  );
  return Object.assign(promise, methods)! as Deferred<T>;
}

interface SystemOutput {
  code: number;
  stdout: string,
  stderr: string,
  error: string,
}

export async function system(cmd: string, options: {[key: string]: any} = {}): Promise<SystemOutput> {
  const codePromise = deferred<number>();
  const outputPromise = deferred<[string, string, string]>();

  exec(cmd, options, (err, so: string, se: string) => {
    outputPromise.resolve([String(err), so, se]);
  }).on("exit", (c: number) => codePromise.resolve(c));

  const code = await codePromise;
  const [error, stdout, stderr] = await outputPromise;

  return {
    code,
    stdout,
    stderr,
    error,
  };
}