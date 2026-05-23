import React from 'react';

import {useSettingsStore} from '@/states/settings';
import {mditLogger} from '@/utils/logger';


export function SettingPage() {
    const settings = useSettingsStore(states => states);
    const updateSetting = useSettingsStore(states => states.updateSetting);

    // use encapsulated <DescriptionTile> and <SwitchSettingTile> whenever possible.
    return (<>
        <setting-section data-title='关于'>
            <setting-panel>
                <setting-list data-direction='column'>
                    <ButtonTile title='Github 仓库' caption='本项目的 Github 源代码仓库地址。' actionName='查看源代码'
                                href='https://github.com/d0j1a1701/LiteLoaderQQNT-Markdown'/>
                    <ButtonTile title='提交反馈' caption='提交您对于本插件的建议，或者反馈使用中遇到的问题。'
                                actionName='提交反馈'
                                href='https://github.com/d0j1a1701/LiteLoaderQQNT-Markdown/issues/new'/>
                </setting-list>
            </setting-panel>

            <setting-panel>
                <setting-list data-direction='column'>
                    <DescriptionTile title='设置更新' caption='在此页面更新设置后，需要重启QQ后方可生效'/>
                </setting-list>
            </setting-panel>
        </setting-section>

        <setting-section data-title="基础设置">
            <setting-panel>
                <setting-list data-direction='column'>
                    <DescriptionTile
                        title='启用/停用 Markdown_it'
                        caption='请通过 "LiteLoaderQQNT -> 扩展" 管理页面启用或停用本插件'
                    />

                    {/* Linkify */}
                    <SwitchSettingTile
                        settingName='linkify'
                        title='Linkify'
                        caption='将可能是链接的内容自动格式化为链接格式'/>

                    {/* typo */}
                    <SwitchSettingTile
                        settingName='typographer'
                        title='Typographer'
                        caption='语言书写相关以及引号的优化，如："你好" -> “你好”'/>

                    <SwitchSettingTile
                        settingName='codeHighligtThemeFollowSystem'
                        title='代码高亮主题自适应'
                        caption='启用此选项后，浅色模式和深色模式下将自动套用对应的代码高亮背景，重启QQ后生效'/>


                </setting-list>
            </setting-panel>
        </setting-section>


        <setting-section data-title="HTML渲染">
            <setting-panel>
                <setting-list data-direction='column'>

                    <SwitchSettingTile
                        settingName='unescapeAllHtmlEntites'
                        title='HTML渲染'
                        caption='反转义并渲染消息中的HTML标签。为保证安全性，本选项请务必与HTML净化同时开启。'
                    />

                    <SwitchSettingTile
                        settingName='enableHtmlPurify'
                        title='HTML净化'
                        caption='过滤不安全的HTML标签。'/>

                </setting-list>
            </setting-panel>
        </setting-section>

        <setting-section data-title="渲染功能">
            <setting-panel>
                <setting-list data-direction='column'>
                    <SwitchSettingTile
                        settingName='renderMermaid'
                        title='Mermaid 图表渲染'
                        caption='启用后，```mermaid 代码块将被渲染为图表。'/>
                    <SwitchSettingTile
                        settingName='renderLatexBlock'
                        title='LaTeX 代码块渲染'
                        caption='启用后，```latex 和 ```tex 代码块将被渲染为公式（与 $$ 语法效果相同）。'/>
                </setting-list>
            </setting-panel>
        </setting-section>

        <setting-section data-title="开发者调试（请慎重修改此部分设置）">
            <setting-panel>
                <setting-list data-direction='column'>
                    <DescriptionTile title='SettingsState' caption={JSON.stringify(settings, undefined, ' ')}/>
                </setting-list>
            </setting-panel>

            <setting-panel>
                <setting-list data-direction='column'>
                    <SwitchSettingTile
                        settingName='showOriginalButton'
                        title='显示原信息按钮'
                        caption='开启后，点击消息后的 Show Original 按钮即可查看渲染前的消息内容'/>
                </setting-list>
            </setting-panel>

            <setting-panel>
                <setting-list data-direction='column'>

                    <SwitchSettingTile
                        settingName='consoleOutput'
                        title='控制台输出'
                        caption='关闭后，将屏蔽 MarkdownIt 插件向控制台输出的信息，目前仅能屏蔽部分信息。'/>

                    <SwitchSettingTile
                        settingName='fileOutput'
                        title='日志文件输出'
                        caption='关闭后，MarkdownIt 将不会将调试信息保存在日志文件中。'/>

                    <SwitchSettingTile
                        settingName='enableElementCapture'
                        title='启用元素调试'
                        caption='开启后，日志文件中将会保存指定调试消息的HTML。'
                    />

                    <ButtonTile
                        title='MarkdownIt 日志目录'
                        caption='日志存放于插件 [插件数据根目录]/log 文件夹中。'
                        actionName='日志目录'
                        callback={async function () {
                            let path = await markdown_it.get_log_path();
                            LiteLoader.api.openExternal(path);
                        }}/>

                </setting-list>
            </setting-panel>

            <setting-panel>
                <setting-list data-direction='column'>

                    <SwitchSettingTile
                        settingName='unescapeGtInText'
                        title='反转义消息字符中的">"符号'
                        caption='开启后，可正常显示 Blockquote 格式。'/>

                    <SwitchSettingTile
                        settingName='unescapeBeforeHighlight'
                        title='反转义代码块内容'
                        caption='开启后，在Highlight.js高亮处理之前，先对代码块内容进行反转义，可保证代码块内 HTML Entites 的正常显示。
                        开启HTML渲染功能后，所有消息内的 HTML Entities 都会被反转义，故此选项自动关闭。'/>

                </setting-list>
            </setting-panel>
        </setting-section>
    </>);
}

function SwitchSettingTile({settingName, title, caption}) {
    const settings = useSettingsStore(states => states);
    const updateSetting = useSettingsStore(states => states.updateSetting);

    const getForceValue = (() => {
        var forceSettingName = 'force' + settingName.substr(0, 1).toUpperCase() + settingName.substr(1);
        return () => {
            try {
                return settings[forceSettingName]();
            } catch (e) {
                return undefined;
            }
        };
    })();

    const settingsValue = getForceValue() ?? settings[settingName];

    title ??= settingName;
    return (
        <setting-item>
            <TextAndCaptionBlock title={title} caption={caption}/>
            <setting-switch data-direction='row'
                            onClick={() => {
                                updateSetting(settingName, !settings[settingName])
                            }}
                            is-active={settingsValue == true ? true : undefined}
                            is-disabled={getForceValue()}
                            style={{
                                'flex': 'none',
                            }}
            ></setting-switch>
        </setting-item>
    );
}

function DescriptionTile({title, caption}) {
    return (
        <setting-item data-direction='row'>
            <TextAndCaptionBlock title={title} caption={caption}/>
        </setting-item>
    );
}

function TextAndCaptionBlock({title, caption}) {
    return (
        <div style={{
            'display': 'flex',
            'flexWrap': 'wrap',
            'flexDirection': 'column',
            'flex': '1 1 auto',
        }}>
            <setting-text>{title}</setting-text>
            <setting-text
                data-type='secondary'
                style={{
                    // "text-wrap": "wrap",
                    'marginTop': '3px',
                    "wordBreak": "break-word"
                }}
            ><p style={{
                'overflowY': 'scroll',
            }}>{caption}</p></setting-text>
        </div>
    );
}

function ButtonTile({title, caption, href, path, callback, actionName}) {
    callback ??= function () {
        if (href !== undefined && href !== null) {
            LiteLoader.api.openExternal(href);
            return;
        }
        if (path !== undefined && path !== null) {
            LiteLoader.api.openPath(path);
            return;
        }
        mditLogger('debug', 'Button with no action clicked');

    }

    return (
        <setting-item data-direction='row'>
            <TextAndCaptionBlock title={title} caption={caption}/>
            <setting-button
                data-type='secondary'
                onClick={callback}
                style={{
                    'flex': 'none',
                }}>
                {actionName}
            </setting-button>
        </setting-item>
    );
}