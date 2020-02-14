'use strict';

import * as raw_assert from 'assert';

export const require_fresh = (name: string) => {
    let file = require.resolve(name);
    delete require.cache[file];
    return require(name);
};

const resolvePromisesDeep = async (v) => {
    if (v instanceof Array) {
        return Promise.all(v.map(resolvePromisesDeep))
    } else if (typeof v === "object") {
        for (const k in v) {
            v[k] = await resolvePromisesDeep(v[k])
        }
        return v
    } else {
        return await v
    }
}

const deepEqualP = async (actual, expected, message?: string): Promise<void> => (
    raw_assert.deepEqual(await resolvePromisesDeep(actual), expected, message)
)

// wrap 'assert' only to ensure proper types...
export const assert = {
  equal: <T>(actual: T, expected: T, message?: string): void => raw_assert.equal(actual, expected, message),
  deepEqual: <T>(actual: T, expected: T, message?: string): void => raw_assert.deepEqual(actual, expected, message),
  deepEqualP,
  fail: (raw_assert.fail as (...any) => void),
  throws: (raw_assert.throws as (...any) => void),
};
