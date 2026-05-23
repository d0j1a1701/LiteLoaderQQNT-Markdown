import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware';
import { LiteLoaderStorage } from '@/utils/liteloader_config';

export interface SettingStateProperties {
    // Boolean properties
    linkify: boolean;
    typographer: boolean;
    codeHighligtThemeFollowSystem: boolean;

    // HTML related settings
    unescapeAllHtmlEntites: boolean;
    enableHtmlPurify: boolean;

    // HTML escape settings
    unescapeGtInText: boolean;
    unescapeBeforeHighlight: boolean;

    // Debug settings
    consoleOutput: boolean; // If false, mditLogger will not output to console.
    fileOutput: boolean; // If false, mditLogger will not add log into log file.
    enableElementCapture: boolean;
    showOriginalButton: boolean;

    // Render settings
    renderMermaid: boolean;
    renderLatexBlock: boolean;
}

export interface SettingStateAction {
    // Function properties
    forceUnescapeBeforeHighlight(): boolean | undefined;

    forceEnableHtmlPurify(): boolean | undefined;

    // Function to update a setting
    updateSetting(key: keyof SettingStateProperties, value: boolean): void;
}


/**
 * forcefieldName() method is used to return the value indicating the setting
 * `fieldName` is forced to that value despite the value stored in state.
 * Return `undefined` means repect values stored in states.
 * For example, when `unescapeAllHtmlEntites = true`, `forceEnableHtmlPurify()`
 * should return `true` to make sure all HTML content be sanitized before rendering.
 */
export const useSettingsStore = create<SettingStateProperties & SettingStateAction>()(
    persist(
        immer(subscribeWithSelector((set, get) => ({
            linkify: true,
            typographer: false,
            codeHighligtThemeFollowSystem: true,

            // HTML related
            unescapeAllHtmlEntites: false,
            enableHtmlPurify: false,

            // HTML escape settings
            unescapeGtInText: true,
            unescapeBeforeHighlight: true,

            // Debug settings
            consoleOutput: true,
            fileOutput: true,
            enableElementCapture: false,
            showOriginalButton: false,

            // Render settings
            renderMermaid: true,
            renderLatexBlock: true,


            forceUnescapeBeforeHighlight: () => {
                if (get().unescapeAllHtmlEntites === true) {
                    return false;
                }
                return undefined;
            },

            forceEnableHtmlPurify: () => {
                if (get().unescapeAllHtmlEntites === true) {
                    return true;
                }
                return undefined;
            },

            updateSetting: (key, value) => {
                set((state) => {
                    state[key] = value;
                })
            }
        }))),
        {
            name: 'settings',
            storage: LiteLoaderStorage,
        }
    ),
)