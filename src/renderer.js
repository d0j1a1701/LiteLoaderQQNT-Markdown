// 运行在 Electron 渲染进程 下的页面脚本
const plugin_path = LiteLoader.plugins.markdown_it.path.plugin;
const hljs = require(`${plugin_path}/src/lib/highlight.js`);
const mark = require(`${plugin_path}/src/lib/markdown-it.js`)({
    html: false,        // 在源码中启用 HTML 标签
    xhtmlOut: true,        // 使用 '/' 来闭合单标签 （比如 <br />）。
    // 这个选项只对完全的 CommonMark 模式兼容。
    breaks: false,        // 转换段落里的 '\n' 到 <br>。
    langPrefix: 'language-',  // 给围栏代码块的 CSS 语言前缀。对于额外的高亮代码非常有用。
    linkify: true,        // 将类似 URL 的文本自动转换为链接。

    // 启用一些语言中立的替换 + 引号美化
    typographer: false,

    // 双 + 单引号替换对，当 typographer 启用时。
    // 或者智能引号等，可以是 String 或 Array。
    //
    // 比方说，你可以支持 '«»„“' 给俄罗斯人使用， '„“‚‘'  给德国人使用。
    // 还有 ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] 给法国人使用（包括 nbsp）。
    quotes: '“”‘’',

    // 高亮函数，会返回转义的HTML。
    // 或 '' 如果源字符串未更改，则应在外部进行转义。
    // 如果结果以 <pre ... 开头，内部包装器则会跳过。
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return '<pre class="hljs"><code>' +
                    hljs.highlight(lang, str, true).value +
                    '</code></pre>';
            } catch (__) { }
        }

        return '<pre class="hljs"><code>' + mark.utils.escapeHtml(str) + '</code></pre>';
    }
}),
    katex = require(`${plugin_path}/src/lib/markdown-it-katex.js`);

mark.use(katex);


// 使用 markdown-it 渲染每个span标记的内容
function render() {
    const elements = document.querySelectorAll('.message-content > span > span');
    elements.forEach(element => {
        const renderedHTML = mark.render(element.textContent);
        const tempElement = document.createElement('div');
        tempElement.innerHTML = renderedHTML;
        element.replaceWith(...tempElement.childNodes);
    });
}

function loadCSSFromURL(url) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
}


function onLoad() {
    loadCSSFromURL(`${plugin_path}/src/style/markdown.css`);
    loadCSSFromURL(`${plugin_path}/src/style/hljs-github-dark.css`);

    //包含大量字体，本地引入是不现实的
    //TODO: 添加缓存
    loadCSSFromURL(`https://lib.baomitu.com/KaTeX/0.16.8/katex.css`);

    setInterval(render, 10);
}


// 打开设置界面时触发
function onConfigView(view) {

}


// 这两个函数都是可选的
export {
    onLoad,
    onConfigView
}