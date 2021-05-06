"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("source-map-support/register");

var _nodeRestClient = _interopRequireDefault(require("@lambdatest/node-rest-client"));

var _logger = _interopRequireDefault(require("@wdio/logger"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const log = (0, _logger.default)('@wdio/lambdatest-service');

class LambdaRestService {
  constructor() {
    this.testCnt = 0;
    this.failures = 0;
  }

  beforeSession(config, capabilities) {
    this.config = config;
    this.capabilities = capabilities;
    const lambdaCredentials = {
      username: this.config.user,
      accessKey: this.config.key
    };

    if (this.config.logFile) {
      lambdaCredentials.logFile = this.config.logFile;
    }

    this.isServiceEnabled = lambdaCredentials.username && lambdaCredentials.accessKey;

    try {
      this.api = _nodeRestClient.default.AutomationClient(lambdaCredentials);
    } catch (_) {
      this.isServiceEnabled = false;
    }
  }

  beforeSuite(suite) {
    this.suiteTitle = suite.title;
  }

  beforeTest(test) {
    if (!this.isServiceEnabled) {
      return;
    }

    if (this.suiteTitle === 'Jasmine__TopLevel__Suite') {
      this.suiteTitle = test.fullName.slice(0, test.fullName.indexOf(test.title) - 1);
    }
  }

  afterSuite(suite) {
    if (Object.prototype.hasOwnProperty.call(suite, 'error')) {
      ++this.failures;
    }
  }

  afterTest(test, context, {
    error,
    result,
    duration,
    passed,
    retries
  }) {
    if (!passed) {
      ++this.failures;
    }
  }

  afterScenario(uri, feature, pickle, result) {
    if (result.status === 'failed') {
      ++this.failures;
    }
  }

  after(result) {
    if (!this.isServiceEnabled) {
      return;
    }

    let failures = this.failures;

    if (global.browser.config.mochaOpts && global.browser.config.mochaOpts.bail && Boolean(result)) {
      failures = 1;
    }
    console.log("=========result=========", result, result === 0)
    if (result === 0) {
      failures = 0;
    }
    const status = 'status: ' + (failures > 0 ? 'failed' : 'passed');

    if (!global.browser.isMultiremote) {
      log.info(`Update job with sessionId ${global.browser.sessionId}, ${status}`);
      return this.updateJob(global.browser.sessionId, failures);
    }

    return Promise.all(Object.keys(this.capabilities).map(browserName => {
      log.info(`Update multiremote job for browser '${browserName}' and sessionId ${global.browser[browserName].sessionId}, ${status}`);
      return this.updateJob(global.browser[browserName].sessionId, failures, false, browserName);
    }));
  }

  onReload(oldSessionId, newSessionId) {
    if (!this.isServiceEnabled) {
      return;
    }

    const status = 'status: ' + (this.failures > 0 ? 'failed' : 'passed');

    if (!global.browser.isMultiremote) {
      log.info(`Update (reloaded) job with sessionId ${oldSessionId}, ${status}`);
      return this.updateJob(oldSessionId, this.failures, true);
    }

    const browserName = global.browser.instances.filter(browserName => global.browser[browserName].sessionId === newSessionId)[0];
    log.info(`Update (reloaded) multiremote job for browser '${browserName}' and sessionId ${oldSessionId}, ${status}`);
    return this.updateJob(oldSessionId, this.failures, true, browserName);
  }

  async updateJob(sessionId, failures, calledOnReload = false, browserName) {
    const body = this.getBody(failures, calledOnReload, browserName);
    try{
    await new Promise((resolve, reject) => {
      this.api.updateSessionById(sessionId, body, (err, result) => {
        if (err) {
          return reject(err);
        }

        return resolve(result);
      });
    });
  }
  catch(_){
  }
    this.failures = 0;
  }

  getBody(failures, calledOnReload = false, browserName) {
    let body = {};
    if (!(!global.browser.isMultiremote && this.capabilities.name || global.browser.isMultiremote && this.capabilities[browserName].capabilities.name)) {
      body.name = this.suiteTitle;
      
      if (browserName) {
        body.name = `${browserName}: ${body.name}`;
      }

      if (calledOnReload || this.testCnt) {
        let testCnt = ++this.testCnt;

        if (global.browser.isMultiremote) {
          testCnt = Math.ceil(testCnt / global.browser.instances.length);
        }

        body.name += ` (${testCnt})`;
      }
    }

    body.status_ind = failures > 0 ? 'failed' : 'passed';
    return body;
  }

}

exports.default = LambdaRestService;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zZXJ2aWNlLmpzIl0sIm5hbWVzIjpbImxvZyIsIkxhbWJkYVJlc3RTZXJ2aWNlIiwiY29uc3RydWN0b3IiLCJ0ZXN0Q250IiwiZmFpbHVyZXMiLCJiZWZvcmVTZXNzaW9uIiwiY29uZmlnIiwiY2FwYWJpbGl0aWVzIiwibGFtYmRhQ3JlZGVudGlhbHMiLCJ1c2VybmFtZSIsInVzZXIiLCJhY2Nlc3NLZXkiLCJrZXkiLCJsb2dGaWxlIiwiaXNTZXJ2aWNlRW5hYmxlZCIsImFwaSIsIkxhbWJkYVJlc3RDbGllbnQiLCJBdXRvbWF0aW9uQ2xpZW50IiwiXyIsImJlZm9yZVN1aXRlIiwic3VpdGUiLCJzdWl0ZVRpdGxlIiwidGl0bGUiLCJiZWZvcmVUZXN0IiwidGVzdCIsImZ1bGxOYW1lIiwic2xpY2UiLCJpbmRleE9mIiwiYWZ0ZXJTdWl0ZSIsIk9iamVjdCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2FsbCIsImFmdGVyVGVzdCIsImNvbnRleHQiLCJlcnJvciIsInJlc3VsdCIsImR1cmF0aW9uIiwicGFzc2VkIiwicmV0cmllcyIsImFmdGVyU2NlbmFyaW8iLCJ1cmkiLCJmZWF0dXJlIiwicGlja2xlIiwic3RhdHVzIiwiYWZ0ZXIiLCJnbG9iYWwiLCJicm93c2VyIiwibW9jaGFPcHRzIiwiYmFpbCIsIkJvb2xlYW4iLCJpc011bHRpcmVtb3RlIiwiaW5mbyIsInNlc3Npb25JZCIsInVwZGF0ZUpvYiIsIlByb21pc2UiLCJhbGwiLCJrZXlzIiwibWFwIiwiYnJvd3Nlck5hbWUiLCJvblJlbG9hZCIsIm9sZFNlc3Npb25JZCIsIm5ld1Nlc3Npb25JZCIsImluc3RhbmNlcyIsImZpbHRlciIsImNhbGxlZE9uUmVsb2FkIiwiYm9keSIsImdldEJvZHkiLCJyZXNvbHZlIiwicmVqZWN0IiwidXBkYXRlU2Vzc2lvbkJ5SWQiLCJlcnIiLCJuYW1lIiwiTWF0aCIsImNlaWwiLCJsZW5ndGgiLCJzdGF0dXNfaW5kIl0sIm1hcHBpbmdzIjoi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bnQiOlsiaW1wb3J0IExhbWJkYVJlc3RDbGllbnQgZnJvbSAnQGxhbWJkYXRlc3Qvbm9kZS1yZXN0LWNsaWVudCdcbmltcG9ydCBsb2dnZXIgZnJvbSAnQHdkaW8vbG9nZ2VyJ1xuXG5jb25zdCBsb2cgPSBsb2dnZXIoJ0B3ZGlvL2xhbWJkYXRlc3Qtc2VydmljZScpXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExhbWJkYVJlc3RTZXJ2aWNlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy50ZXN0Q250ID0gMFxuICAgICAgICB0aGlzLmZhaWx1cmVzID0gMCAvLyBjb3VudHMgZmFpbHVyZXMgYmV0d2VlbiByZWxvYWRzXG4gICAgfVxuXG4gICAgLy8gZ2F0aGVyIGluZm9ybWF0aW9uIGFib3V0IHJ1bm5lclxuICAgIGJlZm9yZVNlc3Npb24oY29uZmlnLCBjYXBhYmlsaXRpZXMpIHtcbiAgICAgICAgdGhpcy5jb25maWcgPSBjb25maWdcbiAgICAgICAgdGhpcy5jYXBhYmlsaXRpZXMgPSBjYXBhYmlsaXRpZXNcbiAgICAgICAgY29uc3QgbGFtYmRhQ3JlZGVudGlhbHMgPSB7XG4gICAgICAgICAgICB1c2VybmFtZTogdGhpcy5jb25maWcudXNlcixcbiAgICAgICAgICAgIGFjY2Vzc0tleTogdGhpcy5jb25maWcua2V5XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmxvZ0ZpbGUpIHtcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICAgICAgICBsYW1iZGFDcmVkZW50aWFscy5sb2dGaWxlID0gdGhpcy5jb25maWcubG9nRmlsZVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuaXNTZXJ2aWNlRW5hYmxlZCA9IGxhbWJkYUNyZWRlbnRpYWxzLnVzZXJuYW1lICYmIGxhbWJkYUNyZWRlbnRpYWxzLmFjY2Vzc0tleVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5hcGkgPSBMYW1iZGFSZXN0Q2xpZW50LkF1dG9tYXRpb25DbGllbnQobGFtYmRhQ3JlZGVudGlhbHMpXG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICAgIHRoaXMuaXNTZXJ2aWNlRW5hYmxlZCA9IGZhbHNlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBiZWZvcmVTdWl0ZShzdWl0ZSkge1xuICAgICAgICB0aGlzLnN1aXRlVGl0bGUgPSBzdWl0ZS50aXRsZVxuICAgIH1cblxuICAgIGJlZm9yZVRlc3QodGVzdCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNTZXJ2aWNlRW5hYmxlZCkge1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc3VpdGVUaXRsZSA9PT0gJ0phc21pbmVfX1RvcExldmVsX19TdWl0ZScpIHtcbiAgICAgICAgICAgIHRoaXMuc3VpdGVUaXRsZSA9IHRlc3QuZnVsbE5hbWUuc2xpY2UoXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICB0ZXN0LmZ1bGxOYW1lLmluZGV4T2YodGVzdC50aXRsZSkgLSAxXG4gICAgICAgICAgICApXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhZnRlclN1aXRlKHN1aXRlKSB7XG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc3VpdGUsICdlcnJvcicpKSB7XG4gICAgICAgICAgICArK3RoaXMuZmFpbHVyZXNcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qZXNsaW50IG5vLXVudXNlZC12YXJzOiBbXCJlcnJvclwiLCB7IFwiYXJnc1wiOiBcIm5vbmVcIiB9XSovXG4gICAgYWZ0ZXJUZXN0KHRlc3QsIGNvbnRleHQsIHsgZXJyb3IsIHJlc3VsdCwgZHVyYXRpb24sIHBhc3NlZCwgcmV0cmllcyB9KSB7XG4gICAgICAgIGlmICghcGFzc2VkKSB7XG4gICAgICAgICAgICArK3RoaXMuZmFpbHVyZXNcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFmdGVyU2NlbmFyaW8odXJpLCBmZWF0dXJlLCBwaWNrbGUsIHJlc3VsdCkge1xuICAgICAgICBpZiAocmVzdWx0LnN0YXR1cyA9PT0gJ2ZhaWxlZCcpIHtcbiAgICAgICAgICAgICsrdGhpcy5mYWlsdXJlc1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYWZ0ZXIocmVzdWx0KSB7XG4gICAgICAgIGlmICghdGhpcy5pc1NlcnZpY2VFbmFibGVkKSB7XG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICBsZXQgZmFpbHVyZXMgPSB0aGlzLmZhaWx1cmVzXG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIGdsb2JhbC5icm93c2VyLmNvbmZpZy5tb2NoYU9wdHMgJiZcbiAgICAgICAgICAgIGdsb2JhbC5icm93c2VyLmNvbmZpZy5tb2NoYU9wdHMuYmFpbCAmJlxuICAgICAgICAgICAgQm9vbGVhbihyZXN1bHQpXG4gICAgICAgICkge1xuICAgICAgICAgICAgZmFpbHVyZXMgPSAxXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzdGF0dXMgPSAnc3RhdHVzOiAnICsgKGZhaWx1cmVzID4gMCA/ICdmYWlsZWQnIDogJ3Bhc3NlZCcpXG5cbiAgICAgICAgaWYgKCFnbG9iYWwuYnJvd3Nlci5pc011bHRpcmVtb3RlKSB7XG4gICAgICAgICAgICBsb2cuaW5mbyhcbiAgICAgICAgICAgICAgICBgVXBkYXRlIGpvYiB3aXRoIHNlc3Npb25JZCAke2dsb2JhbC5icm93c2VyLnNlc3Npb25JZH0sICR7c3RhdHVzfWBcbiAgICAgICAgICAgIClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZUpvYihnbG9iYWwuYnJvd3Nlci5zZXNzaW9uSWQsIGZhaWx1cmVzKVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFxuICAgICAgICAgICAgT2JqZWN0LmtleXModGhpcy5jYXBhYmlsaXRpZXMpLm1hcChicm93c2VyTmFtZSA9PiB7XG4gICAgICAgICAgICAgICAgbG9nLmluZm8oXG4gICAgICAgICAgICAgICAgICAgIGBVcGRhdGUgbXVsdGlyZW1vdGUgam9iIGZvciBicm93c2VyICcke2Jyb3dzZXJOYW1lfScgYW5kIHNlc3Npb25JZCAke2dsb2JhbC5icm93c2VyW2Jyb3dzZXJOYW1lXS5zZXNzaW9uSWR9LCAke3N0YXR1c31gXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZUpvYihcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsLmJyb3dzZXJbYnJvd3Nlck5hbWVdLnNlc3Npb25JZCxcbiAgICAgICAgICAgICAgICAgICAgZmFpbHVyZXMsXG4gICAgICAgICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBicm93c2VyTmFtZVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIClcbiAgICB9XG5cbiAgICBvblJlbG9hZChvbGRTZXNzaW9uSWQsIG5ld1Nlc3Npb25JZCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNTZXJ2aWNlRW5hYmxlZCkge1xuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3RhdHVzID0gJ3N0YXR1czogJyArICh0aGlzLmZhaWx1cmVzID4gMCA/ICdmYWlsZWQnIDogJ3Bhc3NlZCcpXG5cbiAgICAgICAgaWYgKCFnbG9iYWwuYnJvd3Nlci5pc011bHRpcmVtb3RlKSB7XG4gICAgICAgICAgICBsb2cuaW5mbyhcbiAgICAgICAgICAgICAgICBgVXBkYXRlIChyZWxvYWRlZCkgam9iIHdpdGggc2Vzc2lvbklkICR7b2xkU2Vzc2lvbklkfSwgJHtzdGF0dXN9YFxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlSm9iKG9sZFNlc3Npb25JZCwgdGhpcy5mYWlsdXJlcywgdHJ1ZSlcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGJyb3dzZXJOYW1lID0gZ2xvYmFsLmJyb3dzZXIuaW5zdGFuY2VzLmZpbHRlcihcbiAgICAgICAgICAgIGJyb3dzZXJOYW1lID0+XG4gICAgICAgICAgICAgICAgZ2xvYmFsLmJyb3dzZXJbYnJvd3Nlck5hbWVdLnNlc3Npb25JZCA9PT0gbmV3U2Vzc2lvbklkXG4gICAgICAgIClbMF1cbiAgICAgICAgbG9nLmluZm8oXG4gICAgICAgICAgICBgVXBkYXRlIChyZWxvYWRlZCkgbXVsdGlyZW1vdGUgam9iIGZvciBicm93c2VyICcke2Jyb3dzZXJOYW1lfScgYW5kIHNlc3Npb25JZCAke29sZFNlc3Npb25JZH0sICR7c3RhdHVzfWBcbiAgICAgICAgKVxuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVKb2Iob2xkU2Vzc2lvbklkLCB0aGlzLmZhaWx1cmVzLCB0cnVlLCBicm93c2VyTmFtZSlcbiAgICB9XG5cbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgIGFzeW5jIHVwZGF0ZUpvYihzZXNzaW9uSWQsIGZhaWx1cmVzLCBjYWxsZWRPblJlbG9hZCA9IGZhbHNlLCBicm93c2VyTmFtZSkge1xuICAgICAgICBjb25zdCBib2R5ID0gdGhpcy5nZXRCb2R5KGZhaWx1cmVzLCBjYWxsZWRPblJlbG9hZCwgYnJvd3Nlck5hbWUpXG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMuYXBpLnVwZGF0ZVNlc3Npb25CeUlkKHNlc3Npb25JZCwgYm9keSwgKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUocmVzdWx0KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgdGhpcy5mYWlsdXJlcyA9IDBcbiAgICB9XG5cbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgIGdldEJvZHkoZmFpbHVyZXMsIGNhbGxlZE9uUmVsb2FkID0gZmFsc2UsIGJyb3dzZXJOYW1lKSB7XG4gICAgICAgIGxldCBib2R5ID0ge31cbiAgICAgICAgaWYgKCEoIWdsb2JhbC5icm93c2VyLmlzTXVsdGlyZW1vdGUgJiYgdGhpcy5jYXBhYmlsaXRpZXMubmFtZSB8fCBnbG9iYWwuYnJvd3Nlci5pc011bHRpcmVtb3RlICYmIHRoaXMuY2FwYWJpbGl0aWVzW2Jyb3dzZXJOYW1lXS5jYXBhYmlsaXRpZXMubmFtZSkpIHtcbiAgICAgICAgICAgIGJvZHkubmFtZSA9IHRoaXMuc3VpdGVUaXRsZVxuICAgICAgICAgICAgaWYgKGJyb3dzZXJOYW1lKSB7XG4gICAgICAgICAgICAgICAgYm9keS5uYW1lID0gYCR7YnJvd3Nlck5hbWV9OiAke2JvZHkubmFtZX1gXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2FsbGVkT25SZWxvYWQgfHwgdGhpcy50ZXN0Q250KSB7XG4gICAgICAgICAgICAgICAgbGV0IHRlc3RDbnQgPSArK3RoaXMudGVzdENudFxuICAgICAgICAgICAgICAgIGlmIChnbG9iYWwuYnJvd3Nlci5pc011bHRpcmVtb3RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRlc3RDbnQgPSBNYXRoLmNlaWwodGVzdENudCAvIGdsb2JhbC5icm93c2VyLmluc3RhbmNlcy5sZW5ndGgpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYm9keS5uYW1lICs9IGAgKCR7dGVzdENudH0pYFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJvZHkuc3RhdHVzX2luZCA9IGZhaWx1cmVzID4gMCA/ICdmYWlsZWQnIDogJ3Bhc3NlZCdcbiAgICAgICAgcmV0dXJuIGJvZHlcbiAgICB9XG59Il19