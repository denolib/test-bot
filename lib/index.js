"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var promise_1 = __importDefault(require("simple-git/promise"));
var rimraf_1 = __importDefault(require("rimraf"));
var utils_1 = require("./utils");
var child_process_1 = require("child_process");
var fs_1 = require("fs");
var INSTALL_PATH = ".deno";
var INSTALLED_DENO_PATH = ".deno/bin/deno";
var CLONE_PATH = ".cloned";
var counter = 0;
var TestStatus;
(function (TestStatus) {
    TestStatus[TestStatus["PENDING"] = 0] = "PENDING";
    TestStatus[TestStatus["SUCCESS"] = 1] = "SUCCESS";
    TestStatus[TestStatus["FAILED"] = 2] = "FAILED";
    TestStatus[TestStatus["ERROR"] = 3] = "ERROR";
})(TestStatus || (TestStatus = {}));
;
function statusToString(s) {
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
;
function cloneAndTest(repoPath, localPath, branchName) {
    return __awaiter(this, void 0, void 0, function () {
        var output, GIT, _a, code, stdout, stderr, e_1, p;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    GIT = promise_1.default();
                    return [4 /*yield*/, GIT.clone(repoPath, localPath, ["-b", branchName])];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, utils_1.system(INSTALLED_DENO_PATH + " test -A")];
                case 2:
                    _a = _b.sent(), code = _a.code, stdout = _a.stdout, stderr = _a.stderr;
                    output = {
                        status: code === 0 ? TestStatus.SUCCESS : TestStatus.FAILED,
                        stdout: stdout,
                        stderr: stderr,
                        errorLog: null,
                    };
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    output = {
                        status: TestStatus.ERROR,
                        stdout: null,
                        stderr: null,
                        errorLog: e_1.message,
                    };
                    return [3 /*break*/, 4];
                case 4:
                    p = utils_1.deferred();
                    rimraf_1.default(localPath, function (_) { return p.resolve(); });
                    return [4 /*yield*/, p];
                case 5:
                    _b.sent();
                    return [2 /*return*/, output];
            }
        });
    });
}
function getCommentBody(info) {
    var s = "\`deno test\` status: " + statusToString(info.status) + ".\n\n";
    if (!info.errorLog) {
        s += "stdout:\n\n" + "```" + "\n" + info.stdout + "\n" + "```" + "\n\nstderr:\n\n" + "```" + "\n" + info.stderr + "\n" + "```" + "\n";
    }
    else {
        s += "error log:\n\n" + "```" + "\n" + info.errorLog + "\n" + "```" + "\n";
    }
    return s;
}
function createPRStatus(sha, state, description) {
    return {
        sha: sha,
        state: statusToString(state),
        description: description,
        context: 'Deno Test Bot'
    };
}
function createDirectories() {
    try {
        fs_1.mkdirSync(INSTALL_PATH); // called only once on startup
    }
    catch (_a) { }
    try {
        fs_1.mkdirSync(CLONE_PATH); // called only once on startup
    }
    catch (_b) { }
}
// Sync install.
function installDeno() {
    child_process_1.execSync("curl -fsSL https://deno.land/x/install/install.sh | DENO_INSTALL=" + INSTALL_PATH + " sh");
}
function runOnceOnStartup() {
    createDirectories();
    installDeno();
}
runOnceOnStartup();
function handlePullRequest(context) {
    return __awaiter(this, void 0, void 0, function () {
        var head, sha, cloneUrl, branchName, uniqueLocalPath, info, prStatus;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    head = context.payload.pull_request.head;
                    sha = head.sha;
                    cloneUrl = head.repo.clone_url;
                    branchName = head.ref;
                    uniqueLocalPath = CLONE_PATH + "/" + counter++;
                    return [4 /*yield*/, cloneAndTest(cloneUrl, uniqueLocalPath, branchName)];
                case 1:
                    info = _a.sent();
                    // Add a comment.
                    return [4 /*yield*/, context.github.issues.createComment(context.issue({
                            body: getCommentBody(info),
                        }))];
                case 2:
                    // Add a comment.
                    _a.sent();
                    prStatus = createPRStatus(sha, info.status, "Test Failed");
                    // TODO: check failures
                    return [4 /*yield*/, context.github.repos.createStatus(context.repo(prStatus))];
                case 3:
                    // TODO: check failures
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
module.exports = function (app) {
    // TODO
    app.on([
        "pull_request.opened",
        "pull_request.edited",
        "pull_request.synchronize"
    ], function (context) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, handlePullRequest(context)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // For more information on building apps:
    // https://probot.github.io/docs/
    // To get your app running against GitHub, see:
    // https://probot.github.io/docs/development/
};
//# sourceMappingURL=index.js.map