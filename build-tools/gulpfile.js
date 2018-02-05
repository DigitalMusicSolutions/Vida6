var static_location = "static";
var gulp = require('gulp');
var server = require('gulp-express'); // Server tool, starts app.js
var eslint = require('gulp-eslint'); // Linting
var Builder = require('systemjs-builder'); // Build tool
var sass = require('gulp-sass'); // SASS compiler
var autoprefixer = require('gulp-autoprefixer'); // Pretty straightforward

// Builds vida.js to vida.min.js, which is in turn aliased to vida5.min.js in root dir
var buildJS = function()
{
    var builder = new Builder(static_location, static_location + '/config.js');
    return builder.buildStatic(
        './' + static_location + '/js/vida.js', 
        './' + static_location + '/js/vida.min.js', 
        {minify: true}
    ).then(function() {
      console.log('Build complete at', new Date(), '.');
    }).catch(function(err) {
      console.log('Build error:');
      console.log(err);
    });
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

gulp.task('develop', function()
{
    gulp.watch(static_location + '/css/vida.scss', ['style:vida']);
    gulp.watch(static_location + '/css/app.scss', ['style:app']);
    gulp.watch(static_location + '/js/**/*.js', ['lint']);

    gulp.watch([
        static_location + '/js/**/*.js',
        static_location + '/index.html',
        static_location + '/css/*.css'
    ], server.notify);

    server.run(["app.js"]);
});

gulp.task('default', function()
{
    gulp.start('develop');
});
