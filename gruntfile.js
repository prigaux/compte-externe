'use strict';

module.exports = function(grunt) {
    var watchFiles = {
        serverTS: ['server/**/*.ts'],
        serverJS: ['gruntfile.js', 'start-server.js', 'server/**/*.js', '!server/tests/'],
        clientTS: ['app/**/*.ts', '!app/bower_components/**/*'],
        html_css: ['app/**/*.html', 'app/**/*.css'],
        mochaTests: ['server/tests/**/*.js'],
    };

    // Project Configuration
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        watch: {
            serverTS: {
                files: watchFiles.serverTS,
                tasks: ['ts:server'],
            },
            clientTS: {
                files: watchFiles.clientTS,
                tasks: ['ts:client'],
                options: { livereload: true }
            },
            html_css: {
                files: watchFiles.html_css,
                options: { livereload: true }
            },
            mochaTests: {
                files: watchFiles.mochaTests,
                tasks: ['env:test', 'mochaTest'],
            },
        },
        ts: {
            client: {
                src: watchFiles.clientTS,
            },
            server: {
                src: watchFiles.serverTS,
                options: {
                  module: 'commonjs'
                },
            }
        },      
        nodemon: {
            dev: {
                script: 'start-server.js',
                options: {
                    nodeArgs: ['--debug'],
                    env: { NODE_ENV: 'debug' },
                    watch: watchFiles.serverJS 
                }
            }
        },
        concurrent: {
            default: ['nodemon', 'watch'],
            debug: ['nodemon', 'watch', 'node-inspector'],
            options: {
                logConcurrentOutput: true,
                limit: 10
            }
        },
        env: {
            test: {
                NODE_ENV: 'test'
            }
        },
        mochaTest: {
            src: watchFiles.mochaTests,
        },
        karma: {
            unit: {
                configFile: 'karma.conf.js',
            },
        },
        'node-inspector': {
            custom: {
                options: {
                    'web-port': 8081,
                    'preload': false,
                }
            }
        },
        
    });

    require('load-grunt-tasks')(grunt);

    // Making grunt default to force in order not to break the project.
    grunt.option('force', true);

    grunt.registerTask('default', ['ts', 'concurrent:default']);
    grunt.registerTask('debug', ['concurrent:debug']);

    // Test task.
    grunt.registerTask('test', ['test:server', 'test:client']);
    grunt.registerTask('test:server', ['ts:server', 'env:test', 'mochaTest']);
    grunt.registerTask('test:client', ['ts:client', 'env:test', 'karma:unit']);
    
};
