/**
 * 车载蓝牙歌词：把歌词文本写入系统媒体会话元数据、经蓝牙 AVRCP 同步给车机显示。
 * 详见 CONTEXT.md「车载歌词」术语与 docs/adr/0001-track-player-patch-package-for-car-lyrics.md。
 */

/** 车载歌词模式：off 关闭；lineByLine 逐行标题模式；fullLyric 完整歌词模式 */
export type CarLyricMode = "off" | "lineByLine" | "fullLyric";

/**
 * 原生通道：由 patch 后的 react-native-track-player 提供（见 ADR-0001）。
 * 空字符串表示清除对应字段的覆盖，恢复原始元数据。
 */
export interface ICarLyricChannel {
    updateNowPlayingTitles(titles: {
        title?: string;
        artist?: string;
        lyric?: string;
    }): void;
}

/**
 * 逐行标题模式的标题文本：当前行（可选附带翻译行）。
 * 无当前行（前奏/间奏/空行）时返回 null，表示恢复原始元数据。
 */
export function composeCarLyricTitle(
    lineItem: { lrc?: string; translation?: string } | null | undefined,
    showTranslation: boolean,
): string | null {
    const lrc = lineItem?.lrc?.trim();
    if (!lrc) {
        return null;
    }
    const translation = showTranslation ? lineItem?.translation?.trim() : undefined;
    return translation ? `${lrc}\n${translation}` : lrc;
}

/**
 * 歌词行变化时调用。仅逐行歌词模式生效：把当前行写入媒体元数据的 artist 字段
 * （QQ音乐式——歌名保持不变，车机与系统卡片渲染「歌名 + 歌手」时即显示歌词）；
 * 无当前行时恢复原始 artist。
 */
export function pushCarLyricLine(
    channel: ICarLyricChannel | null | undefined,
    mode: CarLyricMode,
    lineItem: { lrc?: string; translation?: string } | null | undefined,
    showTranslation: boolean,
): void {
    if (mode !== "lineByLine" || !channel) {
        return;
    }
    channel.updateNowPlayingTitles({
        artist: composeCarLyricTitle(lineItem, showTranslation) ?? "",
    });
}

/**
 * 歌词就绪时调用。仅完整歌词模式生效：把整篇歌词一次性写入媒体元数据的歌词字段，
 * 交由支持解析该字段的车机滚动显示；无歌词时恢复原始元数据。
 */
export function pushCarLyricFullLyric(
    channel: ICarLyricChannel | null | undefined,
    mode: CarLyricMode,
    rawLrc: string | null | undefined,
): void {
    if (mode !== "fullLyric" || !channel) {
        return;
    }
    channel.updateNowPlayingTitles({ lyric: rawLrc?.trim() || "" });
}

/**
 * 恢复原始元数据：清空 title、artist 与 lyric 三个字段的覆盖。
 * 在切歌、暂停、无歌词等时机调用；原生通道缺失时静默降级。
 */
export function resetCarLyric(
    channel: ICarLyricChannel | null | undefined,
): void {
    channel?.updateNowPlayingTitles({ title: "", artist: "", lyric: "" });
}
