'use strict';
const webpackConfig = require('./webpack.config.js');

module.exports = function(config){
    config.set({
        files: ["app/**/*_test.ts"],
        preprocessors: {
            'app/**/*_test.ts': ['webpack']
        },     
        frameworks: ['jasmine'],
        browsers : ['PhantomJS'],
        plugins: [
            'karma-webpack',
            'karma-jasmine',
            'karma-phantomjs-launcher',
        ],
        webpack: webpackConfig,
    });
};
