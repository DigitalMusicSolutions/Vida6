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
const gulpIf = require('gulp-if');

// For creating a development server
const express = require('express');
const http = require('http');
const livereloadMiddleware = require('connect-livereload');

// Things we only need to state once
const livereload_port = 35728;
const static_port = 8066;
const static_location = "example";
const source_location = "src";
const static_app = express();
let static_server;
let compiler;

const browserSupport = [
    'ie >= 11',
    'ie_mob >= 11',
    'ff >= 30',
    'chrome >= 21',
    'safari >= 8',
    'opera >= 23',
    'ios >= 8',
    'android >= 4.4',
    'bb >= 10'
];

// Default gulp task
gulp.task('default', ['develop']);
gulp.task('develop', function()
{
    // CSS compilation
    gulp.start(['style:vida', 'style:app']);
    gulp.watch(source_location + '/css/vida.scss', ['style:vida']); // CSS for vida itself
    gulp.watch(static_location + '/css/app.scss', ['style:app']); // CSS for this demo app

    // Set up livereload to listen and change when a compiled file (or the index HTML file) changes
    $.livereload.listen({port: livereload_port});
    gulp.watch([
        static_location + '/**/*'
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
    buildCSS(source_location + '/css/vida.scss', './');
});
gulp.task('style:app', function()
{
    buildCSS(static_location + '/css/app.scss', 'example/css/');
});

// JS linting tasks; pass in `--fix` to trigger auto-fix
gulp.task('js:lint', function()
{
    lint('./src/');
});

// Generalized function for performing the same compilation process on any CSS file
var buildCSS = function(source, dest)
{
    return gulp.src(source)
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: browserSupport
        }))
        .pipe(gulp.dest(dest), {overwrite: true});
};

// Gulp "middleware" - if the file was fixed, returns true to allow gulpIf to overwrite the file
function fixCondition(file)
{
    if (fix && file.eslint && file.eslint.fixed)
    {
        console.log('\tAutomatically fixed errors in ' + file.eslint.filePath);
        return true;
    }
    return false;
};

const fix = process.argv[3] === '--fix';
function lint(source, fixOverride)
{
    // If source is a directory, append a wildcard match, otherwise it's a single file and leave it as is
    var origin = source.slice(source.length - 1) === '/' ? source + '**/*.js' : source;

    var localFix = typeof fixOverride === 'undefined' ? fix : fixOverride;

    if (localFix) console.log(`ESLint running for '${source}' with automatic fixing.`);
    return gulp.src([origin])
        .pipe(eslint({fix: localFix}))
        .pipe(eslint.format())
        .pipe(gulpIf(fixCondition, gulp.dest(source)));
};
