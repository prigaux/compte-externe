'use strict';

export const require_fresh = (name: string) => {
    let file = require.resolve(name);
    delete require.cache[file];
    return require(name);
};
