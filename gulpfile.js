var gulp = require('gulp');

var concat = require('gulp-concat');
var less = require('gulp-less');
var util = require('gulp-util');
var cleanCSS = require('gulp-clean-css');
var jsUglify = require('gulp-uglify');
var isProduction = util.env.production;

gulp.task('libs-scripts', function() {
  var gulpPipe = gulp.src([
    './bower_components/angular/angular.js',
    './bower_components/angular-i18n/angular-locale_ru-ru.js'
  ])
    .pipe(concat('libs.js'));
  if (isProduction) {
    gulpPipe.pipe(jsUglify({compress: false}));
  }
  return gulpPipe.pipe(gulp.dest('./public/assets/js/'));
});

gulp.task('app-scripts', function() {
  return gulp.src(['./app/**/*.js'])
    .pipe(concat('app.js'))
    .pipe(gulp.dest('./public/assets/js/'));
});

gulp.task('app-css', function() {
  var gulpPipe = gulp.src(['./app/**/*.less'])
    .pipe(concat('app.css'))
    .pipe(less());

  if (isProduction) {
    gulpPipe.pipe(cleanCSS());
  }

  return gulpPipe.pipe(gulp.dest('./public/assets/css/'));
});

gulp.task('default', function() {
  gulp.run('libs-scripts', 'app-scripts', 'app-css');

  if (!isProduction) {
    gulp.watch('./app/**/*.js', function() {
      gulp.run('app-scripts');
    });

    gulp.watch('./app/**/*.less', function() {
      gulp.run('app-css');
    });
  }
});
