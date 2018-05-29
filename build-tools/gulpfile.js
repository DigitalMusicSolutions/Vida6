// Node 'stdlib' includes
const path = require('path');

// Development tools
const gulp = require('gulp'); // Primary logic for this file
const $ = require('gulp-load-plugins')(); // Used for livereload below
const livereload = require('gulp-livereload'); // Used to trigger reloads of development page when included code changes
const eslint = require('gulp-eslint'); // Used to prevent formatting/syntax errors in JS
const sass = require('gulp-sass'); // Used to compile CSS
const autoprefixer = require('gulp-autoprefixer'); // Used to compile CSS for older browsers
const webpack = require('webpack'); // Used to compile JS

// For creating a development server
const express = require('express');
const http = require('http');
const livereloadMiddleware = require('connect-livereload');

// Things we only need to state once
const livereload_port = 35728;
const static_port = 8066;
const static_location = "static";
const static_app = express();
var static_server;
let compiler;

// Default gulp task
gulp.task('default', ['develop']);
gulp.task('develop', function()
{
    // Auto-compile CSS
    gulp.watch(static_location + '/css/vida.scss', ['style:vida']); // CSS for vida itself
    gulp.watch(static_location + '/css/app.scss', ['style:app']); // CSS for this demo app

    // Watch the JS and re-compile/run the linter when it changes
    gulp.watch(static_location + '/js/**/*.js', ['js:develop', 'lint']);

    // Set up livereload to listen and change when a compiled file (or the index HTML file) changes
    $.livereload.listen({port: livereload_port});
    gulp.watch([
        static_location + '/js/vida.min.js',
        static_location + '/index.html',
        static_location + '/css/*.css'
    ], $.livereload.changed);

    // Create a simple express static server
    static_app.use(livereloadMiddleware({port: livereload_port}));
    static_app.use(express.static(static_location));
    static_server = http.createServer(static_app).listen(static_port).on('listening', function()
    {
        console.log('Started static content server on http://localhost:' + static_port + '.');
    });
});

// CSS compilation tasks
gulp.task('style:vida', function()
{
    buildCSS('vida');
});
gulp.task('style:app', function()
{
    buildCSS('app');
});

// JS compilation task
gulp.task('js:develop', function (callback)
{
    if (!compiler)
    {
        console.log('Creating webpack compiler.');
        compiler = webpack(makeWebpackConfig());
    }

    compiler.run(function (err, stats)
    {
        webpackDiag(err, stats);
        callback();
    });
});

// JS linting task
gulp.task('lint', function()
{
    return gulp.src([static_location + '/js/**/*.js', '!' + static_location + '/js/**/*.min.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

// Generalized function for performing the same compilation process on any CSS file
var buildCSS = function(which)
{
    return gulp.src(static_location + "/css/" + which + ".scss")
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: [
                'ie >= 11',
                'ie_mob >= 11',
                'ff >= 30',
                'chrome >= 21',
                'safari >= 8',
                'opera >= 23',
                'ios >= 8',
                'android >= 4.4',
                'bb >= 10'
            ]
        }))
        .pipe(gulp.dest(static_location + "/css/"), {overwrite: true});
};

// Generalized function for performing the same compilation process on any JS file
function makeWebpackConfig(production)
{
    var config = {
        mode: 'development',
        entry: '../vida.js',
        output: {
            path: path.resolve(__dirname, 'static/js/'),
            filename: 'vida.min.js',
            library: 'vida',
            libraryTarget: 'var'
        },
        resolve: {
            extensions: ['.js']
        }
    };

    // As of right now, unused
    if (production)
    {
        config.mode = 'production'; // Turn on a bunch of code optimizations/minification stuff
        config.watch = false; // Prevent live changes on production

        config.performance = { // This just avoids Webpack warning us about what we already know (that a ~600KB JS file is large)
            maxAssetSize: 700000,
            maxEntrypointSize: 700000
        };

        config.module = { // Babel transpilation for certain browser targets
            rules: [
                {
                    exclude: /(node_modules)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [['env', {
                                targets: {
                                    browsers: browserSupport
                                },
                                useBuiltIns: true
                            }]]
                        }
                    }
                }
            ]
        };
    }
    else
    {
        config.mode = 'development'; // https://www.youtube.com/watch?v=oxEcGmD8WvA
    }

    return config;
};

// Formats errors from Webpack
function webpackDiag(err, stats)
{
    if (err)
        return console.error('Build error:', err);

    if (stats.compilation.errors && (stats.compilation.errors.length > 0))
        return console.error('Compilation error:', stats.compilation.errors);

    if (stats.compilation.warnings && (stats.compilation.warnings.length > 0))
        return console.error('Compilation warnings:', stats.compilation.warnings);
};
