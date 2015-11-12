'use strict';
var assets = require('./app/conf').assets;
var files = assets.lib.js.concat(assets.js, assets.tests).map(function (f) { return "app/" + f });

module.exports = function(config){
    config.set({
        files: files,
        frameworks: ['jasmine'],
        browsers : ['PhantomJS'],
    });
};
