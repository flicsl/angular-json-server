var sourcePreprocessors = ["coverage"];

function isDebug(argument) {
	return argument === "--debug";
}
if (process.argv.some(isDebug)) {
	sourcePreprocessors = [];
}

module.exports = function(config) {
	config.set({

		// base path used to resolve all patterns (e.g. files, exclude)
		basePath: "",

		// frameworks to use
		frameworks: [
			"mocha",
			"chai-things",
			"sinon-stub-promise",
			"sinon-chai",
			"chai"
		],

		// list of files / patterns to load in the browser
		files: [
			"node_modules/karma-read-json/karma-read-json.js",
			"node_modules/angular/angular.js",
			"node_modules/angular-mocks/angular-mocks.js",
			"index.js",
			"src/**/*.js",
			"test/**/*.js"
		],

		// list of files to exclude
		exclude: [],

		// preprocess matching files before serving them to the browser
		preprocessors: {
			"index.js": ["babel"],
			"src/**/*.js": ["babel"].concat(sourcePreprocessors),
			"test/**/*.js": ["babel"]
		},

		coverageReporter: {
			reporters: [{
				type: "html",
				dir: "./coverage"
			}, {
				type: "text",
				dir: "./coverage"
			}, {
				type: "text-summary",
				dir: "./coverage"
			}]
		},

		// test results reporter to use
		reporters: ["progress", "coverage"],

		// web server port
		port: 9876,

		// enable / disable colors in the output (reporters and logs)
		colors: true,

		// level of logging
		logLevel: config.LOG_DEBUG,

		// enable / disable watching file and executing tests on file changes
		autoWatch: true,

		// start these browsers
		browsers: ["PhantomJS"],

		// Continuous Integration mode
		// if true, Karma captures browsers, runs the tests and exits
		singleRun: false,

		module: {
			noParse: [
				/node_modules\/sinon\//
			]
		},

		resolve: {
			alias: {
				sinon: "sinon/pkg/sinon"
			}
		},

		babelPreprocessor: {
			options: {
				presets: ["es2015"],
				sourceMap: "inline"
			},
			filename: function(file) {
				return file.originalPath.replace(/\.js$/, ".es5.js");
			},
			sourceFileName: function(file) {
				return file.originalPath;
			}
		}
	});
};
