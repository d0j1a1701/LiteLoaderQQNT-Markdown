// 运行在 Electron 主进程 下的插件入口
const { shell, ipcMain } = require("electron");

// 加载插件时触发
function onLoad(plugin, liteloader) {
    const plugin_path = liteloader.plugins.markdown_it.path.plugin;
    const hljs = require(`${plugin_path}/src/lib/highlight.js`);
    const mark = require(`${plugin_path}/src/lib/markdown-it.js`)({
            html: false, // 在源码中启用 HTML 标签
            xhtmlOut: true, // 使用 '/' 来闭合单标签 （比如 <br />）。
            // 这个选项只对完全的 CommonMark 模式兼容。
            breaks: false, // 转换段落里的 '\n' 到 <br>。
            langPrefix: "language-", // 给围栏代码块的 CSS 语言前缀。对于额外的高亮代码非常有用。
            linkify: true, // 将类似 URL 的文本自动转换为链接。

            // 启用一些语言中立的替换 + 引号美化
            typographer: false,

            // 双 + 单引号替换对，当 typographer 启用时。
            // 或者智能引号等，可以是 String 或 Array。
            //
            // 比方说，你可以支持 '«»„“' 给俄罗斯人使用， '„“‚‘'  给德国人使用。
            // 还有 ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] 给法国人使用（包括 nbsp）。
            quotes: "“”‘’",

            // 高亮函数，会返回转义的HTML。
            // 或 '' 如果源字符串未更改，则应在外部进行转义。
            // 如果结果以 <pre ... 开头，内部包装器则会跳过。
            highlight: function (str, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return (
                            '<pre class="hljs"><code>' +
                            hljs.highlight(lang, str, true).value +
                            "</code></pre>"
                        );
                    } catch (__) {}
                }

                return (
                    '<pre class="hljs"><code>' +
                    mark.utils.escapeHtml(str) +
                    "</code></pre>"
                );
            }
        }),
        katex = require(`${plugin_path}/src/lib/markdown-it-katex.js`);

    mark.use(katex);

    ipcMain.handle("LiteLoader.markdown_it.render", (event, content) => {
        return mark.render(content);
    });

    ipcMain.handle("LiteLoader.markdown_it.open_link", (event, content) => {
        if (content.indexOf("http") != 0) {
            content = "http://" + content;
        }
        return shell.openExternal(content);
    });
}

// 创建窗口时触发
function onBrowserWindowCreated(window, plugin) {}

// 这两个函数都是可选的
module.exports = {
    onLoad,
    onBrowserWindowCreated
};
