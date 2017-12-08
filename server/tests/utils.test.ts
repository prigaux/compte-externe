'use strict';

import { assert } from './test_utils';
import * as utils from '../utils';

describe('nextDate', () => {
        it ("should work", () => {
            assert.equal(utils.nextDate("XXXX-07-01", new Date('2017-06-30T23:59:59.000Z')).toISOString(), '2017-07-01T00:00:00.000Z');
            assert.equal(utils.nextDate("XXXX-07-01", new Date('2017-07-01T00:00:00.000Z')).toISOString(), '2017-07-01T00:00:00.000Z');
            assert.equal(utils.nextDate("XXXX-07-01", new Date('2017-07-01T00:00:01.000Z')).toISOString(), '2018-07-01T00:00:00.000Z');
        });
        it ("should chain", () => {
            assert.equal(utils.nextDate("XXXX-10-31", utils.nextDate("XXXX-07-01", new Date('2017-06-30T23:59:59.000Z'))).toISOString(), '2017-10-31T00:00:00.000Z');
            assert.equal(utils.nextDate("XXXX-10-31", utils.nextDate("XXXX-07-01", new Date('2017-07-01T00:00:00.000Z'))).toISOString(), '2017-10-31T00:00:00.000Z');
            assert.equal(utils.nextDate("XXXX-10-31", utils.nextDate("XXXX-07-01", new Date('2017-07-01T00:00:01.000Z'))).toISOString(), '2018-10-31T00:00:00.000Z');
        });
});

