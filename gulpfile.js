const gulp = require('gulp');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const del = require('del');
const bump = require('gulp-bump');
const mkdirp = require('mkdirp');
const path = require('path');
const header = require('gulp-header');
const fs = require("fs");
const merge = require("merge2");

const webpackStream = require('webpack-stream');
const webpack2 = require('webpack');
const { CheckerPlugin } = require('awesome-typescript-loader');

const typescript = require('typescript');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json', {
  typescript: typescript,
  declaration: true
});

const filename = "convergence-dom-utils";
const buildDir = "./build";
const distDir = "./dist";

gulp.task('default', ['build'], function () {

});

gulp.task('build', ['typescript-cjs', 'minify-umd'], function () {
});

gulp.task('dist', ['build', 'copy-files'], function () {
  const packageJson = require("./dist/package.json");
  if (packageJson.version.endsWith('SNAPSHOT')) {
    return gulp.src(`${distDir}/package.json`)
      .pipe(bump({version: packageJson.version + '.' + new Date().getTime()}))
      .pipe(gulp.dest(distDir));
  }
});

gulp.task('copy-files', ['build'], function () {
  const mainCopy = gulp.src(["build/**/*", '!build/browser/*.js', "README.md", "LICENSE.txt", 'package.json'])
    .pipe(gulp.dest(distDir));

  const packageJson = JSON.parse(fs.readFileSync("./package.json"));
  const headerTxt = fs.readFileSync("./copyright-header.txt");

  const jsCopy = gulp.src(['build/browser/*.js'])
    .pipe(header(headerTxt, {package: packageJson}))
    .pipe(gulp.dest(distDir + "/browser"));

  return merge([mainCopy, jsCopy]);
});

gulp.task('typescript-cjs', function () {
  const tsResult =  gulp.src('src/ts/**/*.ts')
    .pipe(sourcemaps.init())
    .pipe(tsProject());

  return merge([
    tsResult.dts
      .pipe(gulp.dest('build/types')),
    tsResult.js
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest('build/lib'))
  ]);
});

gulp.task('webpack-umd', function () {
  const outputPath = `${buildDir}/browser`;

  return gulp.src('src/ts/index.ts')
    .pipe(webpackStream({
      devtool: 'source-map',
      output: {
        filename: `${filename}.js`,
        libraryTarget: "umd",
        library: "ConvergenceDomUtils"
      },
      resolve: {
        extensions: ['.ts', '.js']
      },
      module: {
        rules: [
          {
            test: /\.ts$/,
            loader: 'awesome-typescript-loader'
          }
        ]
      },
      plugins: [new CheckerPlugin()],
      externals: {
        "@convergence/convergence": "Convergence"
      }
    }, webpack2))
    .pipe(gulp.dest(outputPath));
});

gulp.task('minify-umd', ["webpack-umd"], function () {
  return gulp.src(`${buildDir}/browser/${filename}.js`)
    .pipe(sourcemaps.init())
    .pipe(uglify({
      preserveComments: "license"
    }))
    .pipe(rename({extname: '.min.js'}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(`${buildDir}/browser/`));
});

gulp.task('clean', function () {
  return del([buildDir, 'dist']);
});
