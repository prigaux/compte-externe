'use strict';

exports.require_fresh = function (name) {
    var file = require.resolve(name);
    delete require.cache[file];
    return require(name);
};
