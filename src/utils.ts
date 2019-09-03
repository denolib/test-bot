const { exec } = require("child_process");

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
}

export async function system(cmd: string, cwd?: string): Promise<SystemOutput> {
  const codePromise = deferred<number>();
  const outputPromise = deferred<[string, string]>();

  exec(cmd, {
    cwd: cwd || null,
  }, (err: Error, so: string, se: string) => {
    if (err) {
      throw err;
    }
    outputPromise.resolve([so, se]);
  }).on("exit", (c: number) => codePromise.resolve(c));

  const code = await codePromise;
  const [stdout, stderr] = await outputPromise;

  return {
    code,
    stdout,
    stderr,
  };
}