// 运行在 Electron 渲染进程 下的页面脚本

// 使用 markdown-it 渲染每个span标记的内容
function render() {
    const elements = document.querySelectorAll(
        ".message-content > span > span"
    );
    elements.forEach(async (element) => {
        // 特判 @
        if (element.className.includes("text-element--at")) return;

        const renderedHTML = await markdown_it.render(element.textContent);
        const tempElement = document.createElement("div");
        tempElement.innerHTML = renderedHTML;
        var elements = tempElement.querySelectorAll("a");
        elements.forEach((e) => {
            e.classList.add("markdown_it_link");
            e.onclick = async (event) => {
                event.preventDefault();
                const href = event
                    .composedPath()[0]
                    .href.replace("app://./renderer/", "");
                await markdown_it.open_link(href);
                return false;
            };
        });
        element.replaceWith(...tempElement.childNodes);
    });
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
    loadCSSFromURL(`${plugin_path}/src/style/katex.css`);

    const observer = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
            if (mutation.type === "childList") {
                render();
            }
        }
    });

    const targetNode = document.body;
    const config = { childList: true, subtree: true };
    observer.observe(targetNode, config);
}

// 打开设置界面时触发
function onConfigView(view) {}

// 这两个函数都是可选的
export { onLoad, onConfigView };
