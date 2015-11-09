'use strict';

export const require_fresh = name => {
    let file = require.resolve(name);
    delete require.cache[file];
    return require(name);
};
