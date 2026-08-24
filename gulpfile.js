'use strict';

const build = require('@microsoft/sp-build-web');
const gulp = require('gulp');

build.addSuppression(`Warning - [sass] The local CSS class 'ms-Grid' is not camelCase and will not be type-safe.`);

const copyFontAssets = build.subTask('copy-font-assets', function (gulp, buildOptions, done) {
  return gulp
    .src('src/webparts/thanhLyTaiSan/components/fonts/**/*.woff2')
    .pipe(gulp.dest('lib/webparts/thanhLyTaiSan/components/fonts'))
    .on('end', done);
});

build.rig.addPreBuildTask(copyFontAssets);

var getTasks = build.rig.getTasks;
build.rig.getTasks = function () {
  var result = getTasks.call(build.rig);

  result.set('serve', result.get('serve-deprecated'));

  return result;
};

build.initialize(require('gulp'));
