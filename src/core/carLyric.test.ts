import {
    composeCarLyricArtist,
    composeCarLyricTitle,
    pushCarLyricLine,
    pushCarLyricTrackInfo,
    resetCarLyric,
    type ICarLyricChannel,
} from "./carLyric";

function makeChannel() {
    const calls: Array<{
        title?: string;
        artist?: string;
        lyric?: string;
        songName?: string;
        singer?: string;
        songId?: string;
    }> = [];
    const channel: ICarLyricChannel = {
        updateNowPlayingTitles: titles => {
            calls.push(titles);
        },
    };
    return { channel, calls };
}

describe("车载蓝牙歌词 - composeCarLyricTitle（逐行模式的标题文本）", () => {
    it("未开启翻译时仅显示当前行", () => {
        expect(
            composeCarLyricTitle(
                { lrc: "夜空中最亮的星", translation: "The brightest star" },
                false,
            ),
        ).toBe("夜空中最亮的星");
    });

    it("开启翻译时在当前行下方附带翻译行", () => {
        expect(
            composeCarLyricTitle(
                { lrc: "夜空中最亮的星", translation: "The brightest star" },
                true,
            ),
        ).toBe("夜空中最亮的星\nThe brightest star");
    });

    it("开启翻译但该行无翻译时仅显示原文", () => {
        expect(
            composeCarLyricTitle({ lrc: "请指引我靠近", translation: "" }, true),
        ).toBe("请指引我靠近");
        expect(
            composeCarLyricTitle(
                { lrc: "请指引我靠近", translation: undefined },
                true,
            ),
        ).toBe("请指引我靠近");
    });

    it("无当前行（前奏/间奏/空行）返回 null，表示恢复原始标题", () => {
        expect(composeCarLyricTitle(null, true)).toBeNull();
        expect(composeCarLyricTitle(undefined, true)).toBeNull();
        expect(composeCarLyricTitle({ lrc: "", translation: "" }, true)).toBeNull();
        expect(composeCarLyricTitle({ lrc: "   ", translation: "" }, true)).toBeNull();
    });

    it("两侧空白被去除", () => {
        expect(
            composeCarLyricTitle(
                { lrc: "  给我再去相信的勇气  ", translation: " courage " },
                true,
            ),
        ).toBe("给我再去相信的勇气\ncourage");
    });
});

describe("车载蓝牙歌词 - composeCarLyricArtist（QQ音乐式「歌名-歌手」）", () => {
    it("有歌手时合成为「歌名-歌手」", () => {
        expect(
            composeCarLyricArtist({ title: "夜空中最亮的星", artist: "逃跑计划" }),
        ).toBe("夜空中最亮的星-逃跑计划");
    });

    it("无歌手时仅显示歌名", () => {
        expect(composeCarLyricArtist({ title: "夜空中最亮的星" })).toBe(
            "夜空中最亮的星",
        );
        expect(composeCarLyricArtist({ title: "夜空中最亮的星", artist: "" })).toBe(
            "夜空中最亮的星",
        );
    });

    it("无歌名时返回 null，表示恢复原始歌手字段", () => {
        expect(composeCarLyricArtist(null)).toBeNull();
        expect(composeCarLyricArtist(undefined)).toBeNull();
        expect(composeCarLyricArtist({})).toBeNull();
        expect(composeCarLyricArtist({ title: "  " })).toBeNull();
    });
});

describe("车载蓝牙歌词 - 逐行歌词模式（pushCarLyricLine，QQ音乐式主通道）", () => {
    it("off 模式不调用任何通道", () => {
        const { channel, calls } = makeChannel();
        pushCarLyricLine(
            channel,
            "off",
            { lrc: "夜空中最亮的星" },
            false,
            { title: "夜空中最亮的星", artist: "逃跑计划" },
        );
        expect(calls).toHaveLength(0);
    });

    it("lineByLine 模式把当前行写入 title、把「歌名-歌手」写入 artist（QQ音乐式）", () => {
        const { channel, calls } = makeChannel();
        pushCarLyricLine(
            channel,
            "lineByLine",
            { lrc: "夜空中最亮的星", translation: "The brightest star" },
            false,
            { title: "夜空中最亮的星", artist: "逃跑计划" },
        );
        expect(calls).toEqual([
            {
                title: "夜空中最亮的星",
                artist: "夜空中最亮的星-逃跑计划",
            },
        ]);
    });

    it("lineByLine 模式无当前行时清空 title 与 artist 覆盖（恢复原始元数据）", () => {
        const { channel, calls } = makeChannel();
        pushCarLyricLine(channel, "lineByLine", null, true, {
            title: "夜空中最亮的星",
            artist: "逃跑计划",
        });
        expect(calls).toEqual([{ title: "", artist: "" }]);
    });

    it("lineByLine 模式缺曲目信息时仅推送 title，artist 覆盖被清空", () => {
        const { channel, calls } = makeChannel();
        pushCarLyricLine(channel, "lineByLine", { lrc: "夜空中最亮的星" }, false, null);
        expect(calls).toEqual([{ title: "夜空中最亮的星", artist: "" }]);
    });

    it("fullLyric 模式不逐行推送", () => {
        const { channel, calls } = makeChannel();
        pushCarLyricLine(
            channel,
            "fullLyric",
            { lrc: "夜空中最亮的星" },
            false,
            { title: "夜空中最亮的星", artist: "逃跑计划" },
        );
        expect(calls).toHaveLength(0);
    });

    it("原生通道缺失（补丁未生效）时静默降级", () => {
        expect(() =>
            pushCarLyricLine(
                null,
                "lineByLine",
                { lrc: "夜空中最亮的星" },
                false,
                { title: "夜空中最亮的星", artist: "逃跑计划" },
            ),
        ).not.toThrow();
    });
});

describe("车载蓝牙歌词 - 歌词就绪推送（pushCarLyricTrackInfo，整篇歌词 + ucar 通道）", () => {
    it("两种模式都推送整篇歌词与真实歌曲信息", () => {
        const { channel, calls } = makeChannel();
        const rawLrc = "[00:01.00]夜空中最亮的星\n[00:05.00]请指引我靠近";
        const musicItem = { id: 1001, title: "夜空中最亮的星", artist: "逃跑计划" };
        pushCarLyricTrackInfo(channel, "fullLyric", rawLrc, musicItem);
        pushCarLyricTrackInfo(channel, "lineByLine", rawLrc, musicItem);
        expect(calls).toEqual([
            {
                lyric: rawLrc,
                songName: "夜空中最亮的星",
                singer: "逃跑计划",
                songId: "1001",
            },
            {
                lyric: rawLrc,
                songName: "夜空中最亮的星",
                singer: "逃跑计划",
                songId: "1001",
            },
        ]);
    });

    it("无歌词时清空 lyric 覆盖但保留真实歌曲信息", () => {
        const { channel, calls } = makeChannel();
        pushCarLyricTrackInfo(channel, "fullLyric", null, {
            id: "s-1001",
            title: "夜空中最亮的星",
            artist: "逃跑计划",
        });
        expect(calls).toEqual([
            {
                lyric: "",
                songName: "夜空中最亮的星",
                singer: "逃跑计划",
                songId: "s-1001",
            },
        ]);
    });

    it("off 模式不推送", () => {
        const { channel, calls } = makeChannel();
        pushCarLyricTrackInfo(channel, "off", "[00:01.00]abc", {
            title: "abc",
        });
        expect(calls).toHaveLength(0);
    });

    it("原生通道缺失时静默降级", () => {
        expect(() =>
            pushCarLyricTrackInfo(null, "fullLyric", "[00:01.00]abc", null),
        ).not.toThrow();
    });
});

describe("车载蓝牙歌词 - 恢复原始元数据（resetCarLyric）", () => {
    it("清空全部字段的覆盖（含 ucar 通道）", () => {
        const { channel, calls } = makeChannel();
        resetCarLyric(channel);
        expect(calls).toEqual([
            {
                title: "",
                artist: "",
                lyric: "",
                songName: "",
                singer: "",
                songId: "",
            },
        ]);
    });

    it("原生通道缺失时静默降级", () => {
        expect(() => resetCarLyric(null)).not.toThrow();
    });
});
