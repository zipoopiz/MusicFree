import { NativeModules } from "react-native";
import type { ICarLyricChannel } from "@/core/carLyric";

/**
 * 车载蓝牙歌词原生通道：由 patch 后的 react-native-track-player 提供
 * （见 docs/adr/0001-track-player-patch-package-for-car-lyrics.md）。
 * 补丁未生效（如 node_modules 未重新安装）时返回 null，调用侧静默降级。
 */
export function getCarLyricChannel(): ICarLyricChannel | null {
    const updateNowPlayingTitles = (
        NativeModules.TrackPlayerModule as Record<string, any> | undefined
    )?.updateNowPlayingTitles;

    if (typeof updateNowPlayingTitles !== "function") {
        return null;
    }

    return {
        updateNowPlayingTitles: titles => {
            // 原生调用失败（如服务未就绪）时静默降级，不影响播放
            Promise.resolve(updateNowPlayingTitles(titles))
                .then(supported => {
                    if (supported === false) {
                        // 反射接管 MediaSession 失败：仅车载歌词不可用，播放不受影响
                        console.warn(
                            "[carLyric] native metadata channel not active (provider install/apply failed)",
                        );
                    }
                })
                .catch(() => { });
        },
    };
}
