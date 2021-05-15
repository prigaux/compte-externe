import axios from 'axios';
import MockAdapter from "axios-mock-adapter"
import { assert } from 'chai';
import { setTimeoutPromise } from '../../../shared/helpers';

export const should_throw = (p, validateException) => (
    p.then(_ => assert.fail("should have failed"), (e) => validateException(e))
)

export const flushPromises = async () => {
    await setTimeoutPromise(0)
}

export const mocha_axios_mock = () => {
    let o = { adapter: undefined as MockAdapter }
    before(() => o.adapter = new MockAdapter(axios))
    afterEach(() => o.adapter.reset())
    after(() => o.adapter.restore())
    return o
}
