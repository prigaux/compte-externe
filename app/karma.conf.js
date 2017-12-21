'use strict';
const webpackConfig = require('./build/webpack.base.conf');

module.exports = function(config){
    config.set({
        files: ["**/*_test.ts"],
        preprocessors: {
            '**/*_test.ts': ['webpack']
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
