'use strict';

import { assert } from '../test_utils';
import * as actions from '../../steps/actions';

describe('homePhone_to_pager_if_mobile', () => {
    async function testIt(v, wanted_v) {
        const sv = await actions.homePhone_to_pager_if_mobile(null, { v });
        assert.deepEqual(sv.v, wanted_v);        
    }

    it('should keep non mobile unchanged', () => testIt(
        { homePhone: "0101020304", displayName: "foo" }, 
        { homePhone: "0101020304", displayName: "foo" },
    ));
    it('should keep invalid unchanged', () => testIt(
        { homePhone: "foo" },
        { homePhone: "foo" },
    ));
    it('should work on simple mobile', () => testIt(
        { homePhone: "0601020304" },
        { pager: "0601020304" },
    ));
    it('should work on simple mobile international', () => testIt(
        { homePhone: "+33 601020304" },
        { pager: "+33 601020304" },
    ));
});
