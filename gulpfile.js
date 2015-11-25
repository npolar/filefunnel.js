var gulp = require('gulp');

var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var csso = require('gulp-csso');

gulp.task('minify-js', function() {
	return gulp.src('src/filefunnel.js')
	.pipe(uglify())
	.pipe(rename(function(path) { path.basename += ".min" }))
	.pipe(gulp.dest('./dist/js'));
});

gulp.task('minify-i18n', function() {
	return gulp.src('src/i18n/*.js')
	.pipe(uglify())
	.pipe(rename(function(path) { path.basename += ".min" }))
	.pipe(gulp.dest('./dist/js/filefunnel-i18n'));
});

gulp.task('compile-i18n', ['minify-i18n'], function() {
	return gulp.src(['./dist/js/filefunnel-i18n/*.js'])
	.pipe(concat('filefunnel-i18n.min.js'))
	.pipe(gulp.dest('./dist/js'));
});

gulp.task('minify-css', function() {
	return gulp.src('src/css/*.css')
	.pipe(csso())
	.pipe(rename(function(path) { path.basename += ".min" }))
	.pipe(gulp.dest('./dist/css'));
});

gulp.task('minify', [
	'minify-js',
	'minify-css',
	'compile-i18n'
]);

gulp.task('validate', function() {
	return gulp.src(['src/*.js", "src/**/*.js'])
	.pipe(jshint({ expr: true }))
	.pipe(jshint.reporter('default'));
});

gulp.task('default', [
	'validate',
	'minify'
]);

gulp.task('watch', function() {
	gulp.watch(['src/*', 'src/**/*'], ['default']);
});
