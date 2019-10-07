var del = require("del");
var gulp = require("gulp");

var outDir = "./dist";

function clean() {
    return del(outDir);
}

gulp.task("clean", clean);
