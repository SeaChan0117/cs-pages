const {src, dest, parallel, series, watch} = require('gulp')
const del = require('del')
const loadPlugins = require('gulp-load-plugins')    // 导入gulp-load-plugins，它是一个方法
const plugins = loadPlugins()   // 获取plugins对象，属性是各个gulp插件名除去gulp-开头后的部分，后续有短横线使用驼峰

const browserSync = require('browser-sync')
const bs = browserSync.create()
const cwd = process.cwd()   // 返回命令行的工作目录，此处即在项目中运行时的项目根目录
let config = {
    // default config
    build: {
        src: 'src',
        dist: 'dist',
        temp: 'temp',
        public: 'public',
        paths: {
            styles: 'assets/styles/*.scss',
            scripts: 'assets/scripts/*.js',
            pages: '*.html',
            images: 'assets/images/**',
            fonts: 'assets/fonts/**'
        }
    }
}

try {
    const loadConfig = require(`${cwd}/pages.config.js`)
    config = Object.assign({}, config, loadConfig)
} catch (e) {

}

// 样式编译任务
const style = () => {
    return src(config.build.paths.styles, {base: config.build.src, cwd: config.build.src}) // base之后的路径会按照原路径(assets/styles/*)保存在dist下，否则所有文件都在dist下
        .pipe(plugins.sass({outputStyle: 'expanded'}))       // sass转换，参数： {outputStyle: 'expanded'}  完全展开
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({stream: true}))
}

// 脚本编译任务
const script = () => {
    return src(config.build.paths.scripts, {base: config.build.src, cwd: config.build.src}) // base之后的路径会按照原路径(assets/styles/*)保存在dist下，否则所有文件都在dist下
        .pipe(plugins.babel({presets: [require('@babel/preset-env')]}))  // babel转换   记住presets参数要传
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({stream: true}))
}

// 页面编译任务
const page = () => {
    return src(config.build.paths.pages, {base: config.build.src, cwd: config.build.src})     // 'src/**/*.html'可创建到对应路径，此处都放在src下边
        .pipe(plugins.swig({data: config.data, defaults: {cache: false}}))     // cache:false防止模板缓存导致页面不能及时更新
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({stream: true}))
}

// 图片转换
const image = () => {
    return src(config.build.paths.images, {base: config.build.src, cwd: config.build.src}, {base: 'src'})
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.temp))
}

// 字体文件转换
const font = () => {
    return src(config.build.paths.fonts, {base: config.build.src, cwd: config.build.src})
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}

// public下
const extra = () => {
    return src('**', {base: config.build.public, cwd: config.build.public})
        .pipe(dest(config.build.dist))
}

// 清除dist
const clean = () => {
    return del([config.build.dist, config.build.temp])    // del参数是路径集合
}

// 热更新服务
const serve = () => {
    // 监听以下文件路径的通配符，文件修改后执行对应任务
    watch(config.build.paths.styles, {cwd: config.build.src}, style)
    watch(config.build.paths.scripts, {cwd: config.build.src}, script)
    watch(config.build.paths.pages, {cwd: config.build.src}, page)
    // watch('src/assets/images/**', image)     // 对于这些静态资源开发阶段的监听意义不大，反而增加了任务开销，在bs中添加baseDir初始化就行
    // watch('src/assets/fonts/**', font)
    // watch('public/**', extra)
    watch([                         // 对于静态资源改变也需要热更新，不需要编译转换，只需要服务刷新就行
        config.build.paths.images,
        config.build.paths.fonts,
    ], {cwd: config.build.src}, bs.reload)
    watch('**', {cwd: config.build.public}, bs.reload)    // public下的静态资源

    bs.init({
        notify: false,  // 服务启动时，浏览器右上角的提示关闭
        port: 2080,     // 默认值 3000
        // open: false, // 启动时是否自动打开浏览器，默认值true
        // files: 'dist/**',      // 服务器启动后监听的路径通配符，对应的文件修改后就可以热更新;在对应任务后使用bs.reload就可以不使用files监听
        server: {
            baseDir: [config.build.temp, config.build.src, config.build.public],     // 服务代码的根目录
            routes: {
                '/node_modules': 'node_modules'  // 路径映射，优于baseDir，相关配置找不到再找baseDir
            }
        }
    })
}

const useref = () => {
    return src(`${config.build.temp}/${config.build.paths.pages}`, {base: config.build.temp})   // 此处暂时未用cwd标识根路径，原因是使用后无法生成vendor.css等文件
        .pipe(plugins.useref({searchPath: [config.build.temp, '.']}))
        .pipe(plugins.if(/\.html$/, plugins.htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true
        })))     // html压缩
        .pipe(plugins.if(/\.css$/, plugins.cleanCss()))     // css压缩
        .pipe(plugins.if(/\.js$/, plugins.uglify()))        // js压缩
        .pipe(dest(config.build.dist))          // 目标文件夹由temp改为dist，防止读写冲突导致读写失败
}

// 组合任务
const compile = parallel(style, script, page)      // 编译
const build = series(            // 构建
    clean,
    parallel(
        series(compile, useref),
        image,
        font,
        extra
    )
)
const develop = series(compile, serve)      // 开发阶段构建+热更新服务

module.exports = {
    clean,
    build,
    develop,
}
