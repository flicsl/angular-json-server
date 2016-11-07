const gulp = require("gulp");
const concat = require("gulp-concat");
const uglify = require("gulp-uglify");
const babel = require("gulp-babel");
const ngAnnotate = require("gulp-ng-annotate");

gulp.task("release", () => {
	return gulp.src(["index.js", "./src/**/*.js"])
				.pipe(babel({
					presets: ["es2015"]
				}))
				.pipe(concat("angular-json-server.js"))
				.pipe(ngAnnotate())
				.pipe(gulp.dest("dist/"))
				.pipe(concat("angular-json-server.min.js"))
				.pipe(uglify())
				.pipe(gulp.dest("dist/"));
});
