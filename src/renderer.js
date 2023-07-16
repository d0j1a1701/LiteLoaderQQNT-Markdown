// 运行在 Electron 渲染进程 下的页面脚本

// 使用 markdown-it 渲染每个span标记的内容
function render() {
    const elements = document.querySelectorAll(
        ".message-content > span > span"
    );
    elements.forEach(async (element) => {
        const renderedHTML = await markdown_it.render(element.textContent);
        const tempElement = document.createElement("div");
        tempElement.innerHTML = renderedHTML;
        element.replaceWith(...tempElement.childNodes);
    });

    setTimeout(() => {
        var elements = document.querySelectorAll("a");
        elements.forEach((e) => {
            e.onclick = async (e) => {
                e.preventDefault();
                await markdown_it.open_link(
                    e.path[0].href.replace("app://./renderer/", "")
                );
                return false;
            };
        });
    }, 100);
}

function loadCSSFromURL(url) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
}

function onLoad() {
    const plugin_path = LiteLoader.plugins.markdown_it.path.plugin;

    loadCSSFromURL(`${plugin_path}/src/style/markdown.css`);
    loadCSSFromURL(`${plugin_path}/src/style/hljs-github-dark.css`);

    //包含大量字体，本地引入是不现实的
    //TODO: 添加缓存
    loadCSSFromURL(`https://lib.baomitu.com/KaTeX/0.16.8/katex.css`);

    setInterval(render, 10);
}

// 打开设置界面时触发
function onConfigView(view) {}

// 这两个函数都是可选的
export { onLoad, onConfigView };
