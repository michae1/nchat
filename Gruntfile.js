'use strict';

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        nodemon: {
            dev: {
                options: {
                    file: 'app.js',
                    nodeArgs: ['--debug'],
                }
            }
        },
        jshint: {
            files: ['Gruntfile.js', '*.js', 'test/**/*.js'],
            options: {
            // options here to override JSHint defaults
                globalstrict: true,
                node: true
            },
            globals: {
                console: true,
                module: true,
                
                document: true

            }
            
        },
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                    // captureFile: 'results.txt', // Optionally capture the reporter output to a file
                    quiet: false, // Optionally suppress output to standard out (defaults to false)
                    clearRequireCache: false // Optionally clear the require cache before running tests (defaults to false)
                },
                    src: ['tests/**/*.js']
                }
            }
    });


    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('default', ['nodemon']);
    grunt.registerTask('test', ['jshint', 'mochaTest']);
};