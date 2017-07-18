'use strict';
var assets = require('./app/conf').assets;
var files = assets.lib.js.concat(assets.js.concat(assets.tests).map(function (f) { return "app/" + f }));
files = files.filter(f => !f.match(/axios/));

module.exports = function(config){
    config.set({
        files: files,
        frameworks: ['jasmine'],
        browsers : ['PhantomJS'],
    });
};
