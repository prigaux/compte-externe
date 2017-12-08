'use strict';

import * as raw_assert from 'assert';

export const require_fresh = (name: string) => {
    let file = require.resolve(name);
    delete require.cache[file];
    return require(name);
};

// wrap 'assert' only to ensure proper types...
export const assert = {
  equal: <T>(actual: T, expected: T, message?: string): void => raw_assert.equal(actual, expected, message),
  deepEqual: <T>(actual: T, expected: T, message?: string): void => raw_assert.deepEqual(actual, expected, message),
  fail: (raw_assert.fail as (...any) => void),
  throws: (raw_assert.throws as (...any) => void),
};
