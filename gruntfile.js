'use strict';

var fs = require('fs');

module.exports = function(grunt) {
    var watchFiles = {
        serverJS: ['gruntfile.js', 'start-server.js', 'server/**/*.js'],
        clientJS: ['app/**/*.js', '!app/bower_components/**/*'],
	html_css: ['app/**/*.html', 'app/**/*.css'],
    };

    // Project Configuration
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        watch: {
            js: {
                files: watchFiles.clientJS.concat(watchFiles.serverJS),
                tasks: ['jshint'],
                options: { livereload: true }
            },
            html_css: {
                files: watchFiles.html_css,
                options: { livereload: true }
            },
        },
        jshint: {
            all: {
                src: watchFiles.clientJS.concat(watchFiles.serverJS),
                options: { jshintrc: true }
            }
        },
        nodemon: {
            dev: {
                script: 'start-server.js',
                options: {
                    nodeArgs: ['--debug'],
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


	'node-inspector': {
	    custom: {
		options: {
		    'web-port': 8081,
		    'web-host': 'php-devel',
		    'debug-port': 5858,
		    'save-live-edit': true,
		    'no-preload': true,
		    'stack-trace-limit': 50,
		    'hidden': []
		}
	    }
	},
	
    });

    require('load-grunt-tasks')(grunt);

    // Making grunt default to force in order not to break the project.
    grunt.option('force', true);

    grunt.registerTask('default', ['lint', 'concurrent:default']);
    grunt.registerTask('debug', ['lint', 'concurrent:debug']);
    grunt.registerTask('lint', ['jshint']);
    grunt.registerTask('build', ['lint']);
};
