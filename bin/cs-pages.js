#!/usr/bin/env node

// 指定cwd工作目录和gulpfile路径
process.argv.push('--cwd')
process.argv.push(process.cwd())
process.argv.push('--gulpfile')
process.argv.push(require.resolve('..'))    // require.resolve当前模块的路径，gulpfile就是../lib/index.js, 改为..就会自动到package.json中找main字段的值

require('gulp/bin/gulp')        // 我们的cli中导入gulp-cli的执行，即导入gulp-cli并执行
