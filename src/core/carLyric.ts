/**
 * 车载蓝牙歌词：把歌词文本写入系统媒体会话元数据、经蓝牙 AVRCP 同步给车机显示。
 * 通道设计完全对齐 QQ 音乐（classes23.dex `mediasession.s.E()/i()/z()` 反编译结果）：
 *  1. 主通道（AVRCP 通用）：TITLE = 当前歌词行、ARTIST = 「歌名-歌手」；
 *  2. 整篇歌词通道：`android.media.metadata.LYRIC`（Android 16+）与
 *     `android.media.metadata.LYRICS`（兼容旧实现），交由支持解析的车机滚动显示；
 *  3. ucar 合作车机通道：`ucar.media.metadata.UCAR_TITLE/UCAR_ARTIST/LYRICS_WHOLE`
 *     携带真实歌名与整篇歌词，QQ 音乐合作车机只读这一组字段。
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
        songName?: string;
        singer?: string;
        songId?: string;
    }): void;
}

/** 逐行歌词推送所需的当前曲目信息（用于合成 QQ 音乐式「歌名-歌手」） */
export interface ICarLyricMusicItem {
    id?: string | number;
    title?: string;
    artist?: string;
}

/**
 * 逐行模式的标题文本：当前行（可选附带翻译行）。
 * 无当前行（前奏/间奏/空行）时返回 null，表示恢复原始标题。
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
 * QQ 音乐式歌手字段文本：「歌名-歌手」。
 * QQ 音乐在歌词覆盖期间把真实歌名挪到 ARTIST（`ARTIST = 歌名 + '-' + 歌手`），
 * 歌词行占据 TITLE 主显示位；这里保持一致。
 */
export function composeCarLyricArtist(
    musicItem: ICarLyricMusicItem | null | undefined,
): string | null {
    const name = musicItem?.title?.trim();
    if (!name) {
        return null;
    }
    const singer = musicItem?.artist?.trim();
    return singer ? `${name}-${singer}` : name;
}

/**
 * 歌词行变化时调用。仅逐行歌词模式生效，对齐 QQ 音乐主通道：
 * TITLE = 当前歌词行（可附带翻译），ARTIST = 「歌名-歌手」；
 * 无当前行时同时清空两个字段的覆盖，恢复原始元数据。
 */
export function pushCarLyricLine(
    channel: ICarLyricChannel | null | undefined,
    mode: CarLyricMode,
    lineItem: { lrc?: string; translation?: string } | null | undefined,
    showTranslation: boolean,
    musicItem: ICarLyricMusicItem | null | undefined,
): void {
    if (mode !== "lineByLine" || !channel) {
        return;
    }
    const titleText = composeCarLyricTitle(lineItem, showTranslation);
    channel.updateNowPlayingTitles({
        title: titleText ?? "",
        // QQ 音乐同款：仅在有歌词行时把「歌名-歌手」写入 artist；
        // 无当前行（前奏/间奏）时两个字段一并恢复原始元数据。
        artist: titleText != null ? composeCarLyricArtist(musicItem) ?? "" : "",
    });
}

/**
 * 歌词就绪时调用（切歌/恢复播放后）：推送整篇歌词与真实歌曲信息。
 * - 整篇歌词写入 lyric 字段，原生侧落到 `android.media.metadata.LYRIC(S)` 与
 *   `ucar.media.metadata.LYRICS_WHOLE`，合作车机自行解析滚动显示；
 * - songName/singer/songId 落到 ucar 通道字段与 MEDIA_ID，供合作车机展示真实歌曲信息。
 * 无论逐行还是完整歌词模式都会推送；无歌词时清空这些字段的覆盖。
 */
export function pushCarLyricTrackInfo(
    channel: ICarLyricChannel | null | undefined,
    mode: CarLyricMode,
    rawLrc: string | null | undefined,
    musicItem: ICarLyricMusicItem | null | undefined,
): void {
    if (mode === "off" || !channel) {
        return;
    }
    channel.updateNowPlayingTitles({
        lyric: rawLrc?.trim() || "",
        songName: musicItem?.title?.trim() || "",
        singer: musicItem?.artist?.trim() || "",
        songId: musicItem?.id != null ? String(musicItem.id) : "",
    });
}

/**
 * 恢复原始元数据：清空全部字段的覆盖。
 * 在切歌、暂停、无歌词等时机调用；原生通道缺失时静默降级。
 */
export function resetCarLyric(
    channel: ICarLyricChannel | null | undefined,
): void {
    channel?.updateNowPlayingTitles({
        title: "",
        artist: "",
        lyric: "",
        songName: "",
        singer: "",
        songId: "",
    });
}
