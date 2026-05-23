// markdown
import React from 'react';
import markdownIt from 'markdown-it';
import { renderToString } from 'react-dom/server';
const hljs = require('highlight.js');
import katexPlugin from '@/lib/markdown-it-katex';
import katex from 'katex';

// Components
import { HighLightedCodeBlock, renderInlineCodeBlockString } from '@/components/code_block';

// Settings
import { useSettingsStore } from '@/states/settings';

// Utils
import { escapeHtml, purifyHtml, unescapeHtml } from '@/utils/htmlProc';
import { mditLogger } from '@/utils/logger';



type ReplaceFunc = (parentElement: HTMLElement, id: string) => any;

const TEXT_ELEMENT_MATCHER = 'text-element';
const IMG_ELEMENT_MATCHER = 'pic-element';

const HANDLED_BY_FRAG_PROC_PREFIX = 'markdown-it-handled-as-'

/**
 * Data type used by renderer to determine how to render and replace an element.
 */
export interface MsgProcessInfo {
    mark: string;
    replace?: ReplaceFunc;
    id?: string;
}

// declare const LiteLoader: LiteLoaderInterFace<Object>;
// const markdownRenderedClassName = 'markdown-rendered';
// const markdownIgnoredPieceClassName = 'mdit-ignored';
let markdownItIns: markdownIt | undefined = undefined;

/**
 * Function that generates a MarkdownIt instance based on user settings.
 */
function getMarkdownIns() {
    const settings = useSettingsStore.getState();
    if (markdownItIns !== undefined) {
        return markdownItIns;
    }
    mditLogger('info', 'Generating new markdown-it renderer...');
    let localMarkdownItIns = markdownIt({
        html: true, // 在源码中启用 HTML 标签
        xhtmlOut: true, // 使用 '/' 来闭合单标签 （比如 <br />）。
        // 这个选项只对完全的 CommonMark 模式兼容。
        breaks: true, // 转换段落里的 '\n' 到 <br>。
        langPrefix: "language-", // 给围栏代码块的 CSS 语言前缀。对于额外的高亮代码非常有用。
        linkify: settings.linkify, // 将类似 URL 的文本自动转换为链接。

        // 启用一些语言中立的替换 + 引号美化
        typographer: settings.typographer,

        // 双 + 单引号替换对，当 typographer 启用时。
        // 或者智能引号等，可以是 String 或 Array。
        //
        // 比方说，你可以支持 '«»„“' 给俄罗斯人使用， '„“‚‘'  给德国人使用。
        // 还有 ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] 给法国人使用（包括 nbsp）。
        quotes: "“”‘’",

        // custom highlight UI renderer for markdown it.
        highlight: function (str, lang) {
            if (lang === 'mermaid') {
                if (useSettingsStore.getState().renderMermaid) {
                    return `<div class="mdit-mermaid-block" data-mermaid="${encodeURIComponent(str)}"></div>`;
                }
            }
            if (lang === 'latex' || lang === 'tex') {
                if (useSettingsStore.getState().renderLatexBlock) {
                    try {
                        return katex.renderToString(str, { displayMode: true, throwOnError: false });
                    } catch (e) {
                        return renderToString(<HighLightedCodeBlock content={str} lang='plaintext' markdownItIns={localMarkdownItIns} />);
                    }
                }
            }
            return (renderToString(<HighLightedCodeBlock content={str} lang={lang}
                markdownItIns={localMarkdownItIns} />));
        },
    }).use(katexPlugin);
    localMarkdownItIns.renderer.rules.code_inline = renderInlineCodeBlockString;
    markdownItIns = localMarkdownItIns;
    return localMarkdownItIns;
}



/**
 * Function type that used to process children elements inside QQNT message box.
 */
type FragmentProcessFunc = (
    parent: HTMLElement,
    element: HTMLElement,
    index: number,
) => FragmentProcessFuncRetType | undefined;


interface FragmentProcessFuncRetType {
    original: HTMLElement;
    rendered: HTMLElement;
}

/**
 * Message fragment processor that deal with all text span in messages.
 * @param element 
 * @returns 
 */
const textElementProcessor: FragmentProcessFunc = (parent, element, index) => {
    // text processor
    let settings = useSettingsStore.getState();

    // generate rendered HTML processor based on user config.
    function renderedHtmlPostProcessor(x: string): string {
        // text processor
        if ((settings.forceEnableHtmlPurify() ?? settings.enableHtmlPurify) === true) {
            mditLogger('debug', `Purify`, 'Input:', `${x}`);
            return purifyHtml(x) as string;
        }

        return x;
    }

    // filter to only process pure text messages fragments
    if (!(element.tagName == 'SPAN')
        || !element.classList.contains(TEXT_ELEMENT_MATCHER)
        || element.querySelector('.text-element--at')) {
        return undefined;
    }

    mditLogger('debug', 'ElementMatch', 'Source', element);
    mditLogger('debug', 'Element', 'Match', 'spanTextProcessor');


    // entity processor
    // determine the HTML enetity escape behaviour based on user settings
    function entityProcesor(x: string) {
        if (settings.unescapeAllHtmlEntites == true) {
            return unescapeHtml(x);
        }
        if (settings.unescapeGtInText == true) {
            return x.replaceAll('&gt;', '>');
        }
        return x;
    }

    // get all text in this text span
    let originalText = Array.from(element.getElementsByTagName("span"))
        .map((element) => element.innerHTML)
        .reduce((acc, x) => acc + entityProcesor(x), '');

    // render
    let renderedTextElement = element;
    let renderedMarkdownInnerHtml = (
        // first use markdownit to render the html text
        // then passed to post processor (post processor also accept text)
        renderedHtmlPostProcessor(getMarkdownIns().render(originalText)).trim()
    );
    mditLogger('debug', 'Rendered/post-processed HTML innterText:', renderedMarkdownInnerHtml);

    // remove unnecessary wrapping <p> if there is only one element
    let renderedHtmlElement = (new DOMParser).parseFromString(renderedMarkdownInnerHtml, 'text/html');
    mditLogger('debug', 'renderedHtmlElement.body.children.length==1', renderedHtmlElement.body.children.length == 1);
    mditLogger('debug', 'renderedMarkdownInnerHtml.startsWith(p)', renderedMarkdownInnerHtml.startsWith('<p>'));
    mditLogger('debug', 'renderedMarkdownInnerHtml.endsWith(p)', renderedMarkdownInnerHtml.endsWith('</p>'));
    if ((renderedHtmlElement.body.children.length == 1)
        && renderedMarkdownInnerHtml.startsWith('<p>')
        && renderedMarkdownInnerHtml.endsWith('</p>')) {
        renderedMarkdownInnerHtml =
            renderedMarkdownInnerHtml
                .substring(3, renderedMarkdownInnerHtml.length - 4)
                .trim();
        mditLogger('debug', 'Striped innerHTML:', renderedMarkdownInnerHtml);
    }

    renderedTextElement.innerHTML = renderedMarkdownInnerHtml;


    return {
        original: element,
        rendered: renderedTextElement,
    };
}

/**
 * This fucked up everything.
 */
// const picElementProcessor = fragProcessFuncGenerator({ filter: (e) => e.classList.contains(IMG_ELEMENT_MATCHER), placeholder: (id) => (` <span id="${id}"></span> `) });

// const spanReplaceProcessor = fragProcessFuncGenerator({
//     filter: (e) => (
//         e.tagName == 'SPAN' || // deal with span
//         (e.tagName == 'DIV' && (e.classList?.contains('reply-element') ?? false)) // deal with reply element
//     )
// });


interface FragProcessFuncGeneratorProps {
    /**
     * The generated processort with only deal with elements which this filter returns `true`.
     */
    filter: (element: HTMLElement) => boolean,
    /**
     * Custom function to generate placeholder text based on id.
     */
    placeholder?: (id: string) => string,
    /**
     * Custom replace function. Use default one if `undefined`.
     * 
     * This function is in charge of replace the old element in the DOM to the new element 
     * generated by a markdown renderer.
     */
    replace?: (parent: HTMLElement, id: string, newElemet: HTMLElement) => any,
}

/**
 * A function generator to quickly generate simple replacer for some certain message span.
 * 
 * Checkout `FragProcessFuncGeneratorProps` for more info.
 */
// function fragProcessFuncGenerator(
//     props: FragProcessFuncGeneratorProps,
// ): FragmentProcessFunc {

//     let {
//         filter,
//         placeholder,
//     } = props;
//     placeholder ??= (id) => (`<span id="${id}"></span>`);

//     // This is the generated Span Replacer function
//     return function (element: HTMLElement, index: number) {
//         // element not required the filter condition, do not process
//         if (!filter(element)) {
//             return undefined;
//         }

//         // generate the placeholder for this element
//         let id = `placeholder-${index}`;

//         // using a default replace function is not provided
//         let replace = props.replace;
//         replace ??= (parent: HTMLElement, id: string, newElemet: HTMLElement) => {
//             const oldNode = parent.querySelector(`#${id}`);
//             mditLogger('debug', 'Old node found', oldNode);
//             oldNode.replaceWith(newElemet);
//         };

//         // wrap replace function with logs
//         function replaceWithLog(parent: HTMLElement, id: string) {
//             try {
//                 // here oldNode may be `undefined` or  `null`.
//                 // Plugin will broke without this try catch block.
//                 mditLogger('debug', 'Try replace oldNode with element:', element);
//                 mditLogger('debug', 'Search placeholder with id', id);

//                 // call the specified replace function
//                 replace(parent, id, element);

//                 mditLogger('debug', 'Replace success:', element);
//             } catch (e) {
//                 mditLogger('error', 'Replace failed on element:', element, e);
//             }
//         }

//         return {
//             mark: placeholder(id),
//             id: id,
//             replace: replaceWithLog,
//         }
//     }
// }

/**
 * Triggered from begin to end, preemptive.
 */
export const processorList: FragmentProcessFunc[] = [
    // picElementProcessor,
    textElementProcessor,
    // spanReplaceProcessor,
];