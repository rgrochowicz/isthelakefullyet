var gulp = require('gulp');
var template = require('gulp-template');
var sass = require('gulp-sass');
var inlinesource = require('gulp-inline-source');
var minifyHTML = require('gulp-minify-html');
var uglifyInline = require('gulp-uglify-inline');
var autoprefixer = require('gulp-autoprefixer');
var Promise = require('bluebird');
var cheerio = require('cheerio');
var request = Promise.promisify(require('request'));
var del = Promise.promisify(require('del'));
var runSequence = Promise.promisify(require('run-sequence'));

var lakeLevel = 0;
var fullLevel = 681;

gulp.task('lakelevel', function () {
  return request('http://hydromet.lcra.org/riverreport/report.aspx').spread(function (resp, body) {
      var $ = cheerio.load(body);
      return $('#GridView1 tr:nth-of-type(3) td:nth-of-type(3)').text();
    })
    .then(parseFloat)
    .then(function (level) {
      lakeLevel = level;
    });
});

gulp.task('clean', function () {
  return del('temp');
});

gulp.task('styles', function () {
  return gulp.src('src/styles/main.scss')
    .pipe(template({
      waveHeight: 100 * lakeLevel / fullLevel
    }))
    .pipe(sass({
      includePaths: ['temp/styles']
    }).on('error', sass.logError))
    .pipe(autoprefixer({
        browsers: ['last 2 versions'],
        cascade: false
    }))
    .pipe(gulp.dest('temp/css'));
});

gulp.task('html', ['styles'], function () {
  return gulp.src('src/index.html')
    .pipe(template({
      lakeFull: lakeLevel >= fullLevel,
      feetRemaining: Math.round(fullLevel - lakeLevel)
    }))
    .pipe(inlinesource({
      rootpath: 'temp'
    }))
    .pipe(uglifyInline())
    .pipe(minifyHTML({
      quotes: true
    }))
    .pipe(gulp.dest('.'));
});


gulp.task('build', function () {
  return runSequence('clean',
    'lakelevel',
    'styles',
    'html');
});

exports.start = function () {
  return runSequence('build');
};
