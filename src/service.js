import LambdaRestClient from '@lambdatest/node-rest-client'
import logger from '@wdio/logger'

import { getParentSuiteName } from './util.js'

const log = logger('@wdio/lambdatest-service')

export default class LambdaRestService {
  _browser;
  _specsRan = false;
  api;
  capabilities
  config;
  failures = 0;
  isServiceEnabled = true;
  options;
  suiteTitle;
  testCnt = 0;

  constructor(options, capabilities, config) {
    this.capabilities = capabilities;
    this.config = config;
    this.options = options;
    this.testCnt = 0;
    this.failures = 0;
  }

  before(caps, specs, browser) {
    this._browser = browser;
  }

  beforeSession(config, capabilities) {
    this.config = config;
    this.capabilities = capabilities;
    const lambdaCredentials = {
      username: this.config.user,
      accessKey: this.config.key,
      isApp : false
    };

    if (this.config.product === 'appAutomation') lambdaCredentials.isApp =true

    if (this.config.logFile) {
      lambdaCredentials.logFile = this.config.logFile;
    }

    this.isServiceEnabled = lambdaCredentials.username && lambdaCredentials.accessKey;

    try {
      this.api = LambdaRestClient.AutomationClient(lambdaCredentials);
    } catch (_) {
      this.isServiceEnabled = false;
    }
  }

  beforeScenario(world, context) {
    if (!this.suiteTitle){
      this.suiteTitle = world?.gherkinDocument?.feature?.name|| context?.document?.feature?.name || world?.pickle?.name || 'unknown scenario';
    }
  }

  async beforeSuite(suite) {
    this.suiteTitle = suite.title;

    if (suite.title && suite.title !== 'Jasmine__TopLevel__Suite') {
      await this._setSessionName(suite.title);
    }
  }

  async beforeTest(test) {
    if (!this.isServiceEnabled) {
      return;
    }

    if (test.title && !this.testTitle) {
      this.testTitle = test.title;
    }

    let suiteTitle = this.suiteTitle;

    if (test.fullName) {
      // For Jasmine, `suite.title` is `Jasmine__TopLevel__Suite`.
      // This tweak allows us to set the real suite name.
      const testSuiteName = test.fullName.slice(0, test.fullName.indexOf(test.description || '') - 1)
      if (this.suiteTitle === 'Jasmine__TopLevel__Suite') {
        suiteTitle = testSuiteName;
      } else if (this.suiteTitle) {
        suiteTitle = getParentSuiteName(this.suiteTitle, testSuiteName);
      }
    }

    await this._setSessionName(suiteTitle);
  }

  beforeStep(step) {
    if (!this.suiteTitle || this.suiteTitle == 'unknown scenario') {
      this.suiteTitle = step?.document?.feature?.name || step?.step?.scenario?.name || 'unknown scenario';
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
    this._specsRan = true;
    console.log(error, result, duration, retries);

    // remove failure if test was retried and passed
    // (Mocha only)
    if (test._retriedTest && passed) {
      --this.failures;
      return;
    }

    // don't bump failure number if test was retried and still failed
    // (Mocha only)
    if (
      test._retriedTest &&
      !passed &&
      (
        typeof test._currentRetry === 'number' &&
        typeof test._retries === 'number' &&
        test._currentRetry < test._retries
      )
    ) {
      return;
    }

    const isJasminePendingError = typeof error === 'string' && error.includes('marked Pending');
    if (!passed && !isJasminePendingError) {
      ++this.failures;
    }
  }

  afterScenario(world, { passed, error, duration }) {
    this._specsRan = true;
    console.log(error, duration);
    if (!passed) {
      ++this.failures;
    }
  }

  after(result) {
    if (!this.isServiceEnabled) {
      return;
    }

    let failures = this.failures;

    // set failures if user has bail option set in which case afterTest and
    // afterSuite aren't executed before after hook
    if (this.config.mochaOpts && this.config.mochaOpts.bail && Boolean(result)) {
      failures = 1;
    }

    if (result === 0) {
      failures = 0;
    }
    const status = 'status: ' + (failures > 0 ? 'failed' : 'passed');

    if (!this._browser.isMultiremote) {
      log.info(`Update job with sessionId ${this._browser.sessionId}, ${status}`);
      return this._update(this._browser.sessionId, failures);
    }

    return Promise.all(Object.keys(this.capabilities).map(browserName => {
      log.info(`Update multiremote job for browser '${browserName}' and sessionId ${this._browser[browserName].sessionId}, ${status}`);
      return this._update(this._browser[browserName].sessionId, failures, false, browserName);
    }));
  }

  onReload(oldSessionId, newSessionId) {
    if (!this.isServiceEnabled) {
      return;
    }

    const status = 'status: ' + (this.failures > 0 ? 'failed' : 'passed');

    if (!this._browser.isMultiremote) {
      log.info(`Update (reloaded) job with sessionId ${oldSessionId}, ${status}`);
      return this._update(oldSessionId, this.failures, true);
    }

    const browserName = this._browser.instances.filter(browserName => this._browser[browserName].sessionId === newSessionId)[0];
    log.info(`Update (reloaded) multiremote job for browser '${browserName}' and sessionId ${oldSessionId}, ${status}`);
    return this._update(oldSessionId, this.failures, true, browserName);
  }

  async _update ( sessionId, failures, calledOnReload = false, browserName ) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    
    await sleep(5000);
    return await this.updateJob(sessionId, failures, calledOnReload, browserName);
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
  catch(ex){
    console.log(ex);
  }
    this.failures = 0;
  }

  getBody(failures, calledOnReload = false, browserName) {
    let body = {};
    if (!(!this._browser.isMultiremote && this.capabilities.name || this._browser.isMultiremote && this.capabilities[browserName].capabilities.name)) {
      let testName = this.suiteTitle
      
      body.name = testName
      
      if (this.capabilities['LT:Options'] && this.capabilities['LT:Options'].name){
        body.name = this.capabilities['LT:Options'].name
      }
      
      if (browserName) {
        body.name = `${browserName}: ${body.name}`;
      }

      if (calledOnReload || this.testCnt) {
        let testCnt = ++this.testCnt;

        if (this._browser.isMultiremote) {
          testCnt = Math.ceil(testCnt / this._browser.instances.length);
        }

        body.name += ` (${testCnt})`;
      }
    }

    body.status_ind = failures > 0 ? 'failed' : 'passed';
    return body;
  }

  async _setSessionName(sessionName) {
    await this._executeCommand(`lambda-name=${sessionName}`);
  }

  async _executeCommand(cmd) {
    if (!this._browser) {
      return;
    }
    if (this._browser.isMultiremote) {
      return Promise.all(Object.keys(this.capabilities).map(async (browserName) => {
        const browser = this._browser[browserName];
        return await browser.execute(cmd);
      }));
    }
    return await this._browser.execute(cmd);
  }
}
