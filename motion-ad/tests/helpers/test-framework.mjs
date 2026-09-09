/**
 * Zero-dependency test framework for TutorSpace Motion-Ad E2E test suite.
 */

class Expectation {
  constructor(actual, isNot = false) {
    this.actual = actual;
    this.isNot = isNot;
  }

  get not() {
    return new Expectation(this.actual, !this.isNot);
  }

  _evaluate(pass, message) {
    const finalPass = this.isNot ? !pass : pass;
    if (!finalPass) {
      throw new Error(message);
    }
  }

  toBe(expected) {
    const pass = Object.is(this.actual, expected);
    this._evaluate(
      pass,
      `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to be' : 'to be'} ${JSON.stringify(expected)}`
    );
  }

  toEqual(expected) {
    const pass = JSON.stringify(this.actual) === JSON.stringify(expected);
    this._evaluate(
      pass,
      `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to equal' : 'to equal'} ${JSON.stringify(expected)}`
    );
  }

  toBeTruthy() {
    const pass = Boolean(this.actual);
    this._evaluate(
      pass,
      `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to be truthy' : 'to be truthy'}`
    );
  }

  toBeFalsy() {
    const pass = !Boolean(this.actual);
    this._evaluate(
      pass,
      `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to be falsy' : 'to be falsy'}`
    );
  }

  toBeDefined() {
    const pass = typeof this.actual !== 'undefined';
    this._evaluate(
      pass,
      `Expected value ${this.isNot ? 'to be undefined' : 'to be defined'}, but got ${typeof this.actual}`
    );
  }

  toBeGreaterThan(expected) {
    const pass = typeof this.actual === 'number' && this.actual > expected;
    this._evaluate(
      pass,
      `Expected ${this.actual} ${this.isNot ? 'not to be greater than' : 'to be greater than'} ${expected}`
    );
  }

  toBeLessThan(expected) {
    const pass = typeof this.actual === 'number' && this.actual < expected;
    this._evaluate(
      pass,
      `Expected ${this.actual} ${this.isNot ? 'not to be less than' : 'to be less than'} ${expected}`
    );
  }

  toBeGreaterThanOrEqual(expected) {
    const pass = typeof this.actual === 'number' && this.actual >= expected;
    this._evaluate(
      pass,
      `Expected ${this.actual} ${this.isNot ? 'not to be >= ' : 'to be >= '} ${expected}`
    );
  }

  toBeLessThanOrEqual(expected) {
    const pass = typeof this.actual === 'number' && this.actual <= expected;
    this._evaluate(
      pass,
      `Expected ${this.actual} ${this.isNot ? 'not to be <= ' : 'to be <= '} ${expected}`
    );
  }

  toBeBetween(min, max) {
    const pass = typeof this.actual === 'number' && this.actual >= min && this.actual <= max;
    this._evaluate(
      pass,
      `Expected ${this.actual} ${this.isNot ? 'not to be between' : 'to be between'} ${min} and ${max}`
    );
  }

  toContain(expected) {
    let pass = false;
    if (typeof this.actual === 'string') {
      pass = this.actual.includes(expected);
    } else if (Array.isArray(this.actual)) {
      pass = this.actual.includes(expected);
    } else if (this.actual && typeof this.actual === 'object') {
      pass = expected in this.actual;
    }
    this._evaluate(
      pass,
      `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to contain' : 'to contain'} ${JSON.stringify(expected)}`
    );
  }

  toMatch(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const pass = typeof this.actual === 'string' && regex.test(this.actual);
    this._evaluate(
      pass,
      `Expected "${this.actual}" ${this.isNot ? 'not to match' : 'to match'} pattern ${regex}`
    );
  }
}

export function expect(actual) {
  return new Expectation(actual);
}

class TestRunner {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.skippedTests = 0;
    this.failures = [];
  }

  describe(suiteName, fn) {
    const suite = {
      name: suiteName,
      tests: [],
      beforeEach: [],
      afterEach: [],
    };
    this.suites.push(suite);
    const prevSuite = this.currentSuite;
    this.currentSuite = suite;
    try {
      fn();
    } finally {
      this.currentSuite = prevSuite;
    }
  }

  test(testName, fn) {
    if (!this.currentSuite) {
      this.describe('Default Suite', () => {
        this.test(testName, fn);
      });
      return;
    }
    this.currentSuite.tests.push({
      name: testName,
      fn,
      suiteName: this.currentSuite.name,
    });
  }

  async run(options = {}) {
    const { filter = null, tier = null, silent = false } = options;
    const results = [];

    for (const suite of this.suites) {
      if (tier && !suite.name.includes(`Tier ${tier}`)) {
        continue;
      }
      for (const t of suite.tests) {
        if (filter && !t.name.toLowerCase().includes(filter.toLowerCase()) && !suite.name.toLowerCase().includes(filter.toLowerCase())) {
          continue;
        }

        this.totalTests++;
        const startTime = Date.now();
        let pass = false;
        let error = null;

        try {
          await t.fn();
          pass = true;
          this.passedTests++;
        } catch (err) {
          this.failedTests++;
          error = err;
          this.failures.push({
            suiteName: t.suiteName,
            testName: t.name,
            error: err.message,
            stack: err.stack,
          });
        }

        const duration = Date.now() - startTime;
        const result = {
          suiteName: t.suiteName,
          testName: t.name,
          pass,
          error: error ? error.message : null,
          duration,
        };
        results.push(result);

        if (!silent) {
          const status = pass ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
          console.log(`  ${status} ${t.suiteName} > ${t.name} (${duration}ms)`);
          if (!pass) {
            console.log(`         \x1b[31mError: ${error.message}\x1b[0m`);
          }
        }
      }
    }

    return {
      total: this.totalTests,
      passed: this.passedTests,
      failed: this.failedTests,
      skipped: this.skippedTests,
      failures: this.failures,
      results,
    };
  }
}

export const runner = new TestRunner();
export const describe = (name, fn) => runner.describe(name, fn);
export const test = (name, fn) => runner.test(name, fn);
export const it = test;
