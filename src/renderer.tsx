// 运行在 Electron 渲染进程 下的页面脚本
const { createRoot } = require("react-dom/client");
import React from 'react';


(React as any).createRoot = createRoot;
import { SettingPage } from "./components/setting_page";

const hljs = require('highlight.js');
import markdownIt from 'markdown-it';


// Components
import {
  HighLightedCodeBlock,
  addOnClickHandleForCopyButton,
  renderInlineCodeBlockString,
  addOnClickHandleForLatexBlock,
  changeDirectionToColumnWhenLargerHeight
} from './components/code_block';
import { ShowOriginalContentButton, addShowOriginButtonToMarkdownBody } from '@/components/show_origin';

// States
import { useSettingsStore } from '@/states/settings';

// Utils
import { debounce } from 'throttle-debounce';
import { mditLogger, elementDebugLogger } from './utils/logger';
import { MsgProcessInfo, processorList } from '@/render/msgpiece_processor';

// Types
import { LiteLoaderInterFace } from '@/utils/liteloader_type';

declare const LiteLoader: LiteLoaderInterFace<Object>;
const markdownRenderedClassName = 'markdown-rendered';
const markdownIgnoredPieceClassName = 'mdit-ignored';
let markdownItIns: markdownIt | undefined = undefined;
let mermaidReady: Promise<void> | undefined = undefined;

onLoad();




const debouncedRender = debounce(50, render, { atBegin: false },);

/**
 * Root markdown render function.
 *
 * This function will get called once change of msgList is detected and a possible rerender is required.
 */
function render() {
  // return;
  mditLogger('debug', 'renderer() triggered');

  const settings = useSettingsStore.getState();

  const elements = document.querySelectorAll(".message-content");

  let newlyFoundMsgList = Array.from(elements)
    // 跳过已渲染的消息
    .filter((messageBox) => (!messageBox.classList.contains(markdownRenderedClassName)))
    // 跳过空消息
    .filter((messageBox) => messageBox.childNodes.length > 0);

  mditLogger('debug', 'Newly found message count:', newlyFoundMsgList.length);

  for (let msgBox of newlyFoundMsgList) {
    try {
      renderSingleMsgBox(msgBox as HTMLElement);
    } catch (e) {
      mditLogger('debug', 'Render msgbox failed', e);
    }
  }

  // code that runs after renderer work finished.
  changeDirectionToColumnWhenLargerHeight();
  elementDebugLogger();
}

/**
 * Markdown body process function used in render() to add openExternal()
 * behavior to all links inside rendered markdownBody.
 */
function handleExternalLink(markdownBody: HTMLElement) {
  markdownBody.querySelectorAll("a").forEach((e) => {
    e.classList.add("markdown_it_link");
    e.classList.add("text-link");
    e.onclick = async (event) => {
      event.preventDefault();
      const href = (event.composedPath()[0] as any).href.replace("app://./renderer/", "");
      await LiteLoader.api.openExternal(href);
      return false;
    };
  });
}

async function renderSingleMsgBox(messageBox: HTMLElement) {
  const settings = useSettingsStore.getState();

  // For more info about Rendered class mark,
  // checkout: docs/dev/msg_rendering_process.md
  // skip rendered message
  if (messageBox.classList.contains(markdownRenderedClassName)) {
    return;
  }

  // mark the current message as rendered
  messageBox.classList.add(markdownRenderedClassName);

  // original innerHTML for message box.
  // This is captured and used by "Show Original" feature.
  let msgBoxOriginalInnerHTML = messageBox.innerHTML;

  // Get all children of message box. Return if length is zero.
  const originalSpanList = Array.from(messageBox.children);
  mditLogger('debug', 'renderSingleMsgBox', 'originalSpanList:', originalSpanList);
  if (originalSpanList.length == 0) return;

  // used as pivot when we're inserting rendered elements later.
  // const posBase = document.createElement('span')
  // originalSpanList[0].before(posBase);

  // Here using entityProcess which may finally call DOMParser().parseFromString(input, "text/html");
  // This may introduce XSS attack vulnerability, however, we will use DOMPurify to prevent all
  // dangerous HTML elements when rendering markdown.


  // use fragment processors to deal with the span in messages one by one
  // finally, we will get a list of rendered span
  const renderedSpanInfo = originalSpanList.map((msgSpan, index) => {
    mditLogger('debug', 'PieceProcessor', 'Original Piece:', msgSpan);

    // Try to apply piece processor in order. Stop once a processor could process current msgPiece
    for (let processor of processorList) {
      // try get the return value of the processor
      let renderedSpan = processor(messageBox, (msgSpan as HTMLElement), index);
      // if processor returned a non-undefined value, use the new element
      if (renderedSpan !== undefined) {
        return renderedSpan;
      }
    }

    // here means no any frag processor could handle this msgSpan, just return itself, 
    // in other word, keep it's original looks.
    return { original: msgSpan, rendered: msgSpan };

    // if undefined, this element should be ignored and not be removed in later process.
    // if (retInfo === undefined) {
    //   msgPiece.classList.add(markdownIgnoredPieceClassName);
    // }
    // mditLogger('debug', 'PieceProcessor', 'Piece processor return:', retInfo);
    // return retInfo;
  });

  mditLogger('debug', 'RenderedList generated, start replacing messagebox children...');

  // replace the children based on rendered info
  for (let renderedInfo of renderedSpanInfo) {
    mditLogger('debug', 'Try to replace:', renderedInfo);
    let originalIsChildren = originalSpanList.some((e) => e === renderedInfo.original);
    // mditLogger('debug', 'Original element in messageBox:', originalIsChildren);
    messageBox.replaceChild(renderedInfo.rendered, renderedInfo.original);
  }


  // 渲染 markdown
  // const marks = markPieces.filter(p => p !== undefined).map((p) => p.mark).reduce((acc, p) => acc + p, "");
  // mditLogger('debug', 'MarkdownRender Input:', marks);
  // let renderedHtml = renderedHtmlProcessor(await generateMarkdownIns().render(marks));
  // mditLogger('debug', 'MarkdownRender Output:', renderedHtml);

  // 移除旧元素
  // originalSpanList
  //   .filter((e) => messageBox.hasChildNodes())
  //   .forEach((e) => {
  //     // do not remove formerly ignored elements
  //     if (e.classList.contains(markdownIgnoredPieceClassName)) {
  //       mditLogger('debug', 'Remove Ignore Triggered:', e);
  //       return;
  //     }
  //     messageBox.removeChild(e);
  //   });

  // // 将原有元素替换回内容
  // const markdownBody = document.createElement('div');
  // // some themes rely on this class to render
  // markdownBody.innerHTML = `<div class="text-normal">${renderedHtml}</div>`;
  // markPieces.filter((p) => (p?.replace !== undefined))
  //   .forEach((p) => {
  //     p.replace(markdownBody, p.id);
  //   });

  let markdownBody = messageBox;

  // Handle click of Copy Code Button
  addOnClickHandleForCopyButton(markdownBody);

  // Handle click of Copy Latex Button
  addOnClickHandleForLatexBlock(markdownBody);

  // Render mermaid diagrams
  await renderMermaidBlocks(markdownBody);

  // Handle open external link
  handleExternalLink(markdownBody);

  // Add ShowOriginalContent button for this message.
  addShowOriginButtonToMarkdownBody(markdownBody, messageBox, msgBoxOriginalInnerHTML);
}

function _onLoad() {
  const plugin_path = LiteLoader.plugins.markdown_it.path.plugin;

  const mermaidScript = document.createElement('script');
  mermaidScript.src = `local:///${plugin_path}/src/lib/mermaid.min.js`;
  mermaidReady = new Promise((resolve, reject) => {
    mermaidScript.onload = () => {
      try {
        (window as any).mermaid?.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          flowchart: {
            htmlLabels: true,
            useMaxWidth: true,
          },
          sequence: {
            useMaxWidth: true,
          },
          gantt: {
            useMaxWidth: true,
          },
        });
        resolve();
      } catch (e) {
        mditLogger('error', 'Mermaid initialize failed', e);
        reject(e);
      }
    };
    mermaidScript.onerror = () => {
      mditLogger('error', 'Mermaid script load failed');
      reject(new Error('Mermaid script load failed'));
    };
  });
  document.head.appendChild(mermaidScript);

  loadCSSFromURL(`local:///${plugin_path}/src/style/markdown.css`);
  loadCSSFromURL(`local:///${plugin_path}/src/style/katex.css`);
  loadCSSFromURL(`local:///${plugin_path}/src/style/hljs-github-dark.css`, 'github-hl-dark');
  loadCSSFromURL(`local:///${plugin_path}/src/style/hljs-github.css`, 'github-hl-adaptive');

  // Change fenced code block theme based on settings.
  let _ = useSettingsStore.subscribe(state => (state.codeHighligtThemeFollowSystem), (isFollowSystem) => {
    if (isFollowSystem) {
      loadCSSFromURL(`local:///${plugin_path}/src/style/hljs-github.css`, 'github-hl-adaptive');
    } else {
      loadCSSFromURL(`local:///${plugin_path}/src/style/hljs-github-dark.css`, 'github-hl-dark');
    }
  });


  // Observe the change of message list. Once changed, trigger render() function.
  const observer = new MutationObserver((mutationsList) => {
    for (let mutation of mutationsList) {
      if (mutation.type === "childList") {
        // avoid error in render break users QQNT.
        try {
          debouncedRender();
        } catch (e) {
          ;
        }

      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

let mermaidCounter = 0;
let mermaidPreviewOverlay: HTMLDivElement | undefined = undefined;
let mermaidPreviewCloseHandler: ((event: KeyboardEvent) => void) | undefined = undefined;
let mermaidPreviewCleanupHandlers: Array<() => void> = [];

function closeMermaidPreview() {
  while (mermaidPreviewCleanupHandlers.length > 0) {
    const cleanup = mermaidPreviewCleanupHandlers.pop();
    try {
      cleanup?.();
    } catch (e) {
      mditLogger('error', 'Mermaid preview cleanup failed', e);
    }
  }

  if (mermaidPreviewOverlay !== undefined) {
    mermaidPreviewOverlay.remove();
    mermaidPreviewOverlay = undefined;
  }

  if (mermaidPreviewCloseHandler !== undefined) {
    document.removeEventListener('keydown', mermaidPreviewCloseHandler);
    mermaidPreviewCloseHandler = undefined;
  }
}

function openMermaidPreview(sourceBlock: HTMLElement) {
  closeMermaidPreview();

  const overlay = document.createElement('div');
  overlay.className = 'mdit-mermaid-preview-overlay';

  const panel = document.createElement('div');
  panel.className = 'mdit-mermaid-preview-panel';
  panel.addEventListener('click', (event) => event.stopPropagation());

  const toolbar = document.createElement('div');
  toolbar.className = 'mdit-mermaid-preview-toolbar';

  const title = document.createElement('div');
  title.className = 'mdit-mermaid-preview-title';
  title.textContent = 'Mermaid 预览';

  const toolbarActions = document.createElement('div');
  toolbarActions.className = 'mdit-mermaid-preview-toolbar-actions';

  const closeButton = document.createElement('button');
  closeButton.className = 'mdit-mermaid-preview-close';
  closeButton.type = 'button';
  closeButton.textContent = '退出预览';
  closeButton.onclick = () => closeMermaidPreview();

  toolbarActions.appendChild(closeButton);
  toolbar.appendChild(title);
  toolbar.appendChild(toolbarActions);

  const viewport = document.createElement('div');
  viewport.className = 'mdit-mermaid-preview-viewport';

  const canvas = document.createElement('div');
  canvas.className = 'mdit-mermaid-preview-canvas';

  const content = document.createElement('div');
  content.className = 'mdit-mermaid-preview-content';
  const previewBlock = sourceBlock.cloneNode(true) as HTMLElement;
  previewBlock.querySelector('.mdit-mermaid-expand-button')?.remove();
  content.appendChild(previewBlock);

  canvas.appendChild(content);
  viewport.appendChild(canvas);
  panel.appendChild(toolbar);
  panel.appendChild(viewport);
  overlay.appendChild(panel);

  overlay.onclick = () => closeMermaidPreview();
  document.body.appendChild(overlay);
  mermaidPreviewOverlay = overlay;

  let translateX = 0;
  let translateY = 0;
  let scale = 1;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragOriginX = 0;
  let dragOriginY = 0;
  let previewSvg = content.querySelector('svg') as SVGSVGElement | null;
  let baseSvgWidth = 0;
  let baseSvgHeight = 0;

  function measureBaseSvgSize() {
    if (previewSvg === null) {
      return;
    }

    const widthAttr = parseFloat(previewSvg.getAttribute('width') || '0');
    const heightAttr = parseFloat(previewSvg.getAttribute('height') || '0');
    if (widthAttr > 0 && heightAttr > 0) {
      baseSvgWidth = widthAttr;
      baseSvgHeight = heightAttr;
      return;
    }

    const rect = previewSvg.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      baseSvgWidth = rect.width;
      baseSvgHeight = rect.height;
    }
  }

  function applyScale() {
    if (previewSvg !== null && baseSvgWidth > 0 && baseSvgHeight > 0) {
      previewSvg.style.width = `${baseSvgWidth * scale}px`;
      previewSvg.style.height = `${baseSvgHeight * scale}px`;
      previewSvg.style.maxWidth = 'none';
    }
  }

  function applyTransform() {
    canvas.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
  }

  function setScale(nextScale: number, anchorX?: number, anchorY?: number) {
    const clampedScale = Math.max(0.2, Math.min(6, nextScale));
    if (anchorX === undefined || anchorY === undefined) {
      scale = clampedScale;
      applyScale();
      return;
    }

    const beforeX = (anchorX - translateX) / scale;
    const beforeY = (anchorY - translateY) / scale;
    scale = clampedScale;
    translateX = anchorX - beforeX * scale;
    translateY = anchorY - beforeY * scale;
    applyScale();
    applyTransform();
  }

  measureBaseSvgSize();
  applyScale();
  applyTransform();

  requestAnimationFrame(() => {
    if (baseSvgWidth === 0 || baseSvgHeight === 0) {
      measureBaseSvgSize();
      applyScale();
      applyTransform();
    }
  });

  const onMouseDown = (event: MouseEvent) => {
    if (event.button !== 1) {
      return;
    }

    event.preventDefault();
    isDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragOriginX = translateX;
    dragOriginY = translateY;
    viewport.classList.add('is-dragging');
  };

  const onMouseMove = (event: MouseEvent) => {
    if (!isDragging) {
      return;
    }

    translateX = dragOriginX + (event.clientX - dragStartX);
    translateY = dragOriginY + (event.clientY - dragStartY);
    applyTransform();
  };

  const endDrag = () => {
    if (!isDragging) {
      return;
    }

    isDragging = false;
    viewport.classList.remove('is-dragging');
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    setScale(scale * zoomFactor, event.offsetX, event.offsetY);
  };

  viewport.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', endDrag);
  viewport.addEventListener('wheel', onWheel, { passive: false });

  mermaidPreviewCleanupHandlers.push(() => viewport.removeEventListener('mousedown', onMouseDown));
  mermaidPreviewCleanupHandlers.push(() => document.removeEventListener('mousemove', onMouseMove));
  mermaidPreviewCleanupHandlers.push(() => document.removeEventListener('mouseup', endDrag));
  mermaidPreviewCleanupHandlers.push(() => viewport.removeEventListener('wheel', onWheel));

  mermaidPreviewCloseHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeMermaidPreview();
    }
  };
  document.addEventListener('keydown', mermaidPreviewCloseHandler);
}

function createMermaidExpandButton() {
  const button = document.createElement('button');
  button.className = 'mdit-mermaid-expand-button';
  button.type = 'button';
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 9V5h4" />
      <path d="M19 15v4h-4" />
      <path d="M19 9V5h-4" />
      <path d="M5 15v4h4" />
    </svg>
  `;
  return button;
}

function bindMermaidPreview(block: HTMLElement) {
  block.classList.add('mdit-mermaid-clickable');
  block.title = '点击预览按钮查看大图';
  block.style.position = 'relative';

  let expandButton = block.querySelector<HTMLButtonElement>('.mdit-mermaid-expand-button');
  if (expandButton === null) {
    expandButton = createMermaidExpandButton();
    block.appendChild(expandButton);
  }

  expandButton.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openMermaidPreview(block);
  };
}

async function renderMermaidBlocks(element: HTMLElement) {
  const blocks = element.querySelectorAll<HTMLElement>('div.mdit-mermaid-block[data-mermaid]');
  if (blocks.length === 0) {
    return;
  }

  try {
    await mermaidReady;
  } catch (e) {
    mditLogger('error', 'Mermaid is not ready', e);
    blocks.forEach((block) => {
      renderMermaidFallback(block);
    });
    return;
  }

  for (const block of Array.from(blocks)) {
    const rawContent = decodeURIComponent(block.dataset.mermaid || '');
    const contentCandidates = buildMermaidContentCandidates(rawContent);
    const id = 'mermaid-' + (mermaidCounter++);

    let rendered = false;
    for (const content of contentCandidates) {
      try {
        const result = await (window as any).mermaid?.render(id, content);
        if (result?.svg) {
          block.innerHTML = result.svg;
          delete block.dataset.mermaid;
          bindMermaidPreview(block);
          rendered = true;
          break;
        }
      } catch (e) {
        mditLogger('error', 'Mermaid render failed', e);
      }
    }

    if (!rendered) {
      renderMermaidFallback(block);
    }
  }
}

function buildMermaidContentCandidates(content: string) {
  const normalized = normalizeMermaidContent(content);
  if (normalized === content) {
    return [content];
  }
  return [content, normalized];
}

function normalizeMermaidContent(content: string) {
  let subgraphIndex = 0;

  return content.split('\n').map((line) => {
    const match = line.match(/^(\s*)subgraph\s+(.+?)\s*$/);
    if (!match) {
      return normalizeMermaidLineBreakLabel(line);
    }

    const indent = match[1];
    const subgraphName = match[2];
    if (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(subgraphName) || /[\[\]"]/.test(subgraphName)) {
      return line;
    }

    const safeId = `mdit_subgraph_${subgraphIndex++}`;
    return `${indent}subgraph ${safeId}["${escapeMermaidText(subgraphName)}"]`;
  }).join('\n');
}

function normalizeMermaidLineBreakLabel(line: string) {
  const rules = [
    { pattern: /^(\s*[A-Za-z_][A-Za-z0-9_-]*)(\[\[)(.*?)(\]\])(.*)$/, open: '[[', close: ']]' },
    { pattern: /^(\s*[A-Za-z_][A-Za-z0-9_-]*)(\[\()(.*?)(\)\])(.*)$/, open: '[(', close: ')]' },
    { pattern: /^(\s*[A-Za-z_][A-Za-z0-9_-]*)(\{)(.*?)(\})(.*)$/, open: '{', close: '}' },
    { pattern: /^(\s*[A-Za-z_][A-Za-z0-9_-]*)(\[)(.*?)(\])(.*)$/, open: '[', close: ']' },
  ];

  for (const rule of rules) {
    const match = line.match(rule.pattern);
    if (!match || !/<br\s*\/?\s*>/i.test(match[3])) {
      continue;
    }

    const label = match[3]
      .replace(/<br\s*\/?\s*>/ig, '\n')
      .trim();

    return `${match[1]}${rule.open}"\`${escapeMermaidMarkdownLabel(label)}\`"${rule.close}${match[5]}`;
  }

  return line;
}

function escapeMermaidMarkdownLabel(text: string) {
  return text
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('`', '\\`');
}

function escapeMermaidText(text: string) {
  return text.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function renderMermaidFallback(block: HTMLElement) {
  const content = decodeURIComponent(block.dataset.mermaid || '');
  const pre = document.createElement('pre');
  pre.className = 'hljs hl-code-block mdit-fenced-code-block';
  const code = document.createElement('code');
  code.className = 'language-mermaid';
  code.textContent = content;
  pre.appendChild(code);
  block.replaceWith(pre);
}

/**
 * Util function used in onLoad() to load local CSS.
 */
function loadCSSFromURL(url: string, id?: string) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  link.id = id;
  document.head.appendChild(link);
}

function onLoad() {
  try {
    mditLogger('debug', '[MarkdownIt] OnLoad() triggered');
    return _onLoad();
  } catch (e) {
    mditLogger('error', e);
  }
}

// 打开设置界面时触发
function onSettingWindowCreated(view: HTMLElement) {
  let root = (React as any).createRoot(view);
  root.render(<SettingPage></SettingPage>);
}

export {
  onSettingWindowCreated, onLoad,
}

