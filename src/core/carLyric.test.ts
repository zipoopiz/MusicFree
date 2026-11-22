import {
    composeCarLyricTitle,
    pushCarLyricFullLyric,
    pushCarLyricLine,
    resetCarLyric,
    type ICarLyricChannel,
} from "./carLyric";

function makeChannel() {
    const calls: Array<{ title?: string; lyric?: string }> = [];
    const channel: ICarLyricChannel = {
        updateNowPlayingTitles: titles => {
            calls.push(titles);
        },
    };
    return { channel, calls };
}

describe("车载蓝牙歌词 - composeCarLyricTitle（逐行标题模式的标题文本）", () => {
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

    it("无当前行（前奏/间奏/空行）返回 null，表示恢复原始元数据", () => {
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

describe("车载蓝牙歌词 - 逐行歌词模式（pushCarLyricLine）", () => {
    it("off 模式不调用任何通道", () => {
        const { channel, calls } = makeChannel();
        pushCarLyricLine(channel, "off", { lrc: "夜空中最亮的星" }, false);
        expect(calls).toHaveLength(0);
    });

    it("lineByLine 模式把当前行写入 artist 字段（QQ音乐式）", () => {
        const { channel, calls } = makeChannel();
        pushCarLyricLine(
            channel,
            "lineByLine",
            { lrc: "夜空中最亮的星", translation: "The brightest star" },
            false,
        );
        expect(calls).toEqual([{ artist: "夜空中最亮的星" }]);
    });

    it("lineByLine 模式无当前行时清空 artist 覆盖（恢复原始元数据）", () => {
        const { channel, calls } = makeChannel();
        pushCarLyricLine(channel, "lineByLine", null, true);
        expect(calls).toEqual([{ artist: "" }]);
    });

    it("fullLyric 模式不逐行推送", () => {
        const { channel, calls } = makeChannel();
        pushCarLyricLine(channel, "fullLyric", { lrc: "夜空中最亮的星" }, false);
        expect(calls).toHaveLength(0);
    });

    it("原生通道缺失（补丁未生效）时静默降级", () => {
        expect(() =>
            pushCarLyricLine(null, "lineByLine", { lrc: "夜空中最亮的星" }, false),
        ).not.toThrow();
    });
});

describe("车载蓝牙歌词 - 完整歌词模式（pushCarLyricFullLyric）", () => {
    it("fullLyric 模式把整篇歌词写入 lyric 字段", () => {
        const { channel, calls } = makeChannel();
        const rawLrc = "[00:01.00]夜空中最亮的星\n[00:05.00]请指引我靠近";
        pushCarLyricFullLyric(channel, "fullLyric", rawLrc);
        expect(calls).toEqual([{ lyric: rawLrc }]);
    });

    it("fullLyric 模式无歌词时清空 lyric 覆盖", () => {
        const { channel, calls } = makeChannel();
        pushCarLyricFullLyric(channel, "fullLyric", null);
        expect(calls).toEqual([{ lyric: "" }]);
    });

    it("off / lineByLine 模式不推送完整歌词", () => {
        const { channel, calls } = makeChannel();
        pushCarLyricFullLyric(channel, "off", "[00:01.00]abc");
        pushCarLyricFullLyric(channel, "lineByLine", "[00:01.00]abc");
        expect(calls).toHaveLength(0);
    });

    it("原生通道缺失时静默降级", () => {
        expect(() =>
            pushCarLyricFullLyric(null, "fullLyric", "[00:01.00]abc"),
        ).not.toThrow();
    });
});

describe("车载蓝牙歌词 - 恢复原始元数据（resetCarLyric）", () => {
    it("清空 title、artist 与 lyric 三个字段的覆盖", () => {
        const { channel, calls } = makeChannel();
        resetCarLyric(channel);
        expect(calls).toEqual([{ title: "", artist: "", lyric: "" }]);
    });

    it("原生通道缺失时静默降级", () => {
        expect(() => resetCarLyric(null)).not.toThrow();
    });
});
