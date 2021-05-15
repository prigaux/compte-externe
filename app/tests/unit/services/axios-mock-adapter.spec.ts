import { assert } from 'chai';

import axios from 'axios';
import { mocha_axios_mock, should_throw } from '../test_utils';

describe('axios-mock-adapter', () => {
    let mock = mocha_axios_mock()

    const GET = async (url, params) => (
        (await axios.get(url, { params })).data
    )
    it('should work', async () => {
        const expected = { foo: "bar" }

        mock.adapter.onGet("/foo").reply(200, expected)
        mock.adapter.onGet(/return-params/).reply(config => [200, config.params])
        mock.adapter.onGet("/error").reply(401)

        assert.deepEqual(await GET("/foo", {}), expected)
        await should_throw(GET("/error", {}), (e) => {
            assert.equal(e.toString(), "Error: Request failed with status code 401")
        })
        assert.deepEqual(await GET("/foo/return-params", { a: "b" }), { a: "b" })
    })

    it('should cleanup', async () => {
        await should_throw(GET("/foo", {}), (e) => {
            assert.equal(e.toString(), "Error: Request failed with status code 404")
        })
    })
})

