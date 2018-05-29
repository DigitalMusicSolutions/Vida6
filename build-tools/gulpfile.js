var path = require('path');

var static_location = "static";
var gulp = require('gulp');
var server = require('gulp-express'); // Server tool, starts app.js
var eslint = require('gulp-eslint'); // Linting
var sass = require('gulp-sass'); // SASS compiler
var autoprefixer = require('gulp-autoprefixer'); // Pretty straightforward

var webpack = require('webpack');

let compiler;
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

function webpackDiag(err, stats)
{
    if (err)
        return console.error('Build error:', err);

    if (stats.compilation.errors && (stats.compilation.errors.length > 0))
        return console.error('Compilation error:', stats.compilation.errors);

    if (stats.compilation.warnings && (stats.compilation.warnings.length > 0))
        return console.error('Compilation warnings:', stats.compilation.warnings);
};

// Builds and autoprefixes the SASS to CSS
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

gulp.task('style:vida', function()
{
    buildCSS('vida');
});

gulp.task('style:app', function()
{
    buildCSS('app');
});

gulp.task('lint', function()
{
    return gulp.src([static_location + '/js/**/*.js', '!' + static_location + '/js/**/*.min.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('build', function()
{
    buildJS();
});

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

gulp.task('develop', function()
{
    gulp.watch(static_location + '/css/vida.scss', ['style:vida']);
    gulp.watch(static_location + '/css/app.scss', ['style:app']);
    gulp.watch(static_location + '/js/**/*.js', ['lint']);

    gulp.watch([
        '/js/**/*.js'
    ], ['js:develop']);

    // gulp.watch([
    //     static_location + '/js/**/*.js',
    //     static_location + '/index.html',
    //     static_location + '/css/*.css'
    // ], server.notify);

    server.run(["app.js"]);
});

gulp.task('default', function()
{
    gulp.start('develop');
});
