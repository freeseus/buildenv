const {src, dest, watch, series, parallel, lastRun} = require('gulp'); //bunch of things needed by gulp

const autoprefixer = require('gulp-autoprefixer');		// Needed for browser-prefixing in CSS, even for chrome!
const browserSync = require('browser-sync'); 			// Reload and launches the browser
const cssnano = require('gulp-cssnano'); 				// Minify css
const del = require('del'); 							// Delete folders/files
const filter = require('gulp-filter'); 					// Pattern selector
const imagemin = require('gulp-imagemin'); 				// Minify images
const plumber = require('gulp-plumber'); 				// Something about piping
const rename = require('gulp-rename'); 					// Don't think this is actually used...
const replace = require('gulp-replace');				// Used for the versioning...
const rev = require('gulp-rev');						// Revision the css and js files
const revReplace = require('gulp-rev-replace'); 		// Replace the revisioned css and js references in the code
const server = browserSync.create(); 					// Function of browserSync
const sourcemaps = require('gulp-sourcemaps');			// Sourcemaps
const htmlmin = require('gulp-htmlmin'); 				// Minify HTML documents
const useref = require('gulp-useref'); 					// Concatenates files into single files
const uglifyes = require('gulp-uglify-es').default;		// Minify javascript-es6+

const sass = require('gulp-sass')(require('sass'));		// Sass for styling
	sass.compiler = require('node-sass'); 				// Compile the Sass

function serve(){
	server.init({
		notify: false,
		port: 9000,
		server: {
			baseDir: ['.tmp', 'app'],
			routes: {
				'/node_modules': 'node_modules'
			}
		}
	});

	watch('app/index.html').on('change', server.reload);
	watch('app/styles/**/*.scss', styles);
	watch('app/scripts/**/*.js', scripts);
}

function audio(){ // not in use - manually copying
	return src('app/audio/**/*')
		.pipe(dest('.dist/audio'));
}

function cleanTemp(){
	return del(['.tmp']);
}

function cleanDist(){
	return del(['.dist']);
}

function fonts(){
	return src('app/fonts/**/*')
		.pipe(dest('.dist/fonts'));
}

function images(){
	return src('app/images/**/*')
		.pipe(dest('.dist/images'));
}

function version(){
	return src('app/index.html')
		.pipe(replace(/<appversion[^>]*>([^<]*)<\/appversion>/, (match) => {
			let versionArray = match.replace(/(<([^>]+)>)/ig, '').split('.');
			let patchVersionIndex = versionArray.length - 1;
			let patchVersion = versionArray[patchVersionIndex];
			
			versionArray[patchVersionIndex] = Number(patchVersion) + 1;
			return newVersionString = '<appversion>' + versionArray.join('.') + '</appversion>';
		}))
		.pipe(dest('app/'));
}

function minifyIndexHTML(){
	return src('.dist/*.html')
	    .pipe(htmlmin({
			collapseWhitespace: true,
			removeAttributeQuotes: true,
			removeComments: true,
		}))
	    .pipe(dest('.dist'));
}

function replacerefs(){
	var cssFilter = filter('**/*.css', {restore: true});
	var htmlFilter = filter(['**/*', '!**/index.html'], {restore: true});
	var jsFilter = filter('**/*.js', {restore: true});

	return src('app/index.html')
		.pipe(useref())				// Concatenate with gulp-useref
		.pipe(jsFilter)
		.pipe(uglifyes())			// Minify any javascript sources
		.pipe(jsFilter.restore)
		.pipe(cssFilter)
		.pipe(cssnano())			// Minify any CSS sources
		.pipe(cssFilter.restore)
		.pipe(htmlFilter)
		.pipe(rev())				// Rename the concatenated files (but not index.html)
		.pipe(htmlFilter.restore)
		.pipe(revReplace())			// Substitute in new filenames
		.pipe(dest('.dist'));
};

function scripts(){
	return src('app/scripts/**/*.js')
		.pipe(plumber())
		.pipe(sourcemaps.init())
		.pipe(revReplace())
		.pipe(dest('.tmp/scripts'))
		.pipe(server.stream());
};

function styles(){
	return src('app/styles/*.scss')
		.pipe(plumber())
		.pipe(sourcemaps.init())
		.pipe(sass({
			outputStyle: 'expanded',
			precision: 10,
			includePaths: ['.']
		}).on('error', sass.logError))
		.pipe(autoprefixer({
			cascade: false
		}))
		.pipe(sourcemaps.write())
		.pipe(dest('.tmp/styles'))
		.pipe(server.stream());
}

exports.build = exports.default = series(
	cleanTemp,
	cleanDist,
	version,
	parallel(
		// audio,
		fonts,
		images,
		scripts,
		styles
	),
	replacerefs,
	minifyIndexHTML,
	cleanTemp,
);

exports.serve = series(
	cleanTemp,
	cleanDist,
	parallel(scripts, styles),
	serve,
);
