import { Application, Context } from "probot"; // eslint-disable-line no-unused-vars
import git from "simple-git/promise";
import rimraf from "rimraf";
import { system, deferred } from "./utils";
import { execSync } from "child_process";
import { mkdirSync, exists } from "fs";
import { promisify } from "util";

function botLog(...msg: string[]): void {
  console.log(">> DENO TEST BOT:", ...msg);
}

const INSTALL_PATH = ".deno";
const INSTALLED_DENO_PATH = ".deno/bin/deno";
const CLONE_PATH = ".cloned";

let counter = 0;

enum TestStatus {
  PENDING,
  SUCCESS,
  FAILED,
  ERROR,
};

type TestStatusString = "pending" | "success" | "failure" | "error";
function statusToString(s: TestStatus): TestStatusString {
  switch (s) {
    case TestStatus.PENDING:
      return "pending";
    case TestStatus.SUCCESS:
      return "success";
    case TestStatus.FAILED:
      return "failure";
    default:
      return "error";
  }
}

interface TestInfo {
  status: TestStatus,
  stdout: string | null,
  stderr: string | null,
  errorLog: string | null,
};

async function cloneAndTest(
  repoPath: string,
  localPath: string,
  branchName: string,
): Promise<TestInfo> {
  // Remove existing cloned
  const p0 = deferred();
  rimraf(localPath, (_) => p0.resolve());
  await p0;

  botLog("Check if deno is installed...");
  if (!(await promisify(exists)(INSTALLED_DENO_PATH))) {
    botLog("deno not installed. Installing...");
    installDeno();
  }

  let output: TestInfo | undefined;
  try {
    const GIT = git();
    botLog("Cloning", repoPath, "branch", branchName, "to", localPath);
    await GIT.clone(repoPath, localPath, ["-b", branchName]);
    botLog(`Starting tests using ${process.cwd()}/${INSTALLED_DENO_PATH}...`);
    const { code, stdout, stderr, error } = await system(`${process.cwd()}/${INSTALLED_DENO_PATH} test -A`, {
      cwd: localPath,
      env: {"NO_COLOR": 1}
    });
    output = {
      status: code === 0 ? TestStatus.SUCCESS : TestStatus.FAILED,
      stdout,
      stderr,
      errorLog: code === 0 ? null : error,
    };
    botLog("Test output is", JSON.stringify(output));
  } catch (e) {
    output = {
      status: TestStatus.ERROR,
      stdout: null,
      stderr: null,
      errorLog: e.message,
    }
  }
  botLog("Clean up", localPath);
  // Cleanup cloned
  const p = deferred();
  rimraf(localPath, (_) => p.resolve());
  await p;
  
  return output!;
}

function getCommentBody(info: TestInfo): string {
  let s = "\`deno test\` status: " + statusToString(info.status) + ".\n\n";
  if (info.status !== TestStatus.ERROR) {
    s += `stdout:

${"```"}
${info.stdout}
${"```"}

stderr:

${"```"}
${info.stderr}
${"```"}
`
  } else {
    s += `error log:

${"```"}
${info.errorLog}
${"```"}
`
  }

  return s;
}

function createPRStatus(
  sha: string,
  state: TestStatus,
  description?: string
): {
  sha: string,
  state: TestStatusString,
  [key: string]: string | undefined,
} {
  return {
    sha,
    state: statusToString(state),
    description,
    context: 'Deno Test Bot'
  }
}

function createDirectories(): void {
  try {
    mkdirSync(INSTALL_PATH); // called only once on startup
  } catch {}
  try {
    mkdirSync(CLONE_PATH); // called only once on startup
  } catch {}
}
// Sync install.
function installDeno(): void {
  execSync(`curl -fsSL https://deno.land/x/install/install.sh | DENO_INSTALL=${INSTALL_PATH} sh`);
}
function runOnceOnStartup(): void {
  createDirectories();
  installDeno();
}
runOnceOnStartup();

async function handlePullRequest(context: Context): Promise<void> {
  // https://developer.github.com/v3/activity/events/types/#pullrequestevent
  const { head } = context.payload.pull_request;
  const sha = head.sha;
  const cloneUrl: string = head.repo.clone_url;
  const branchName: string = head.ref;

  botLog("Update commit status to PENDING...");
  // Update PR status.
  const prPreStatus = createPRStatus(sha, TestStatus.PENDING, "Test Pending");
  // TODO: check failures
  await context.github.repos.createStatus(context.repo(prPreStatus));

  botLog("Start testing...");
  // TODO: use config files to control behavior (e.g. running in directory)
  // context.github.pullRequests.
  const uniqueLocalPath = `${CLONE_PATH}/${counter++}`;
  const info = await cloneAndTest(cloneUrl, uniqueLocalPath, branchName);
  
  botLog("Testing complete. Creating comments...");
  // Add a comment.
  await context.github.issues.createComment(context.issue({
    body: getCommentBody(info),
  }));

  botLog("Update commit status to " + statusToString(info.status));
  // Update PR status.
  const prStatus = createPRStatus(sha, info.status, "Test Failed");
  // TODO: check failures
  await context.github.repos.createStatus(context.repo(prStatus));

  botLog("DONE");
}

export = (app: Application) => {
  // TODO
  app.on([
    "pull_request.opened",
    "pull_request.edited",
    "pull_request.synchronize"
  ], async (context) => {
    await handlePullRequest(context);
  })
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
