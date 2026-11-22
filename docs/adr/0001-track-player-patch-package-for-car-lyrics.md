# 0001 - 用 patch-package 给 react-native-track-player 打原生补丁，而非 fork

车载歌词的两种模式（逐行标题、完整歌词）都需要在不改动播放队列的前提下直接更新 Android MediaSession 元数据：完整歌词模式要写入自定义字段 `android.media.metadata.LYRICS`，逐行标题模式要覆盖会话元数据的 title 而保持系统通知仍显示歌名。官方 react-native-track-player v4.1.1 既没有对应 API，也不向外暴露其内部 MediaSessionCompat，纯 TS 侧无法实现（`updateMetadataForTrack` 会连队列条目和系统通知一起改动）。**决定**：引入 patch-package 维护一个小型补丁（为 track-player 增加原生方法 `updateNowPlayingTitles`，通过接管 MediaSessionConnector 的元数据提供器向当前媒体会话写入 title 覆盖与 LYRICS 字段），并在 `package.json` 保留 postinstall 脚本。

## Considered Options

- **长期 fork（洛雪路线）**：洛雪 lx-music-mobile fork 了整个 track-player 来加此功能。维护成本高：升级播放器需要整仓 rebase，不适合本项目小范围诉求。
- **纯 TS 逐行标题（无补丁）**：用 `updateMetadataForTrack` 改队列条目能让老车机显示当前行，但系统通知标题会跟着逐行变化、队列条目被污染，且无法实现完整歌词模式。否决，改由补丁原生通道统一处理两种模式。
- **应用层独立 MediaSession**：与 track-player 的会话竞争媒体焦点，会破坏通知与 AVRCP 行为。否决。

## Consequences

- 升级 react-native-track-player 时必须重放/适配补丁；CI 与贡献者环境依赖 postinstall 执行 patch-package。
- 补丁内的 `updateNowPlayingTitles` 在未打补丁的环境（如 CI 缓存了未补丁的 node_modules）下不存在，TS 调用侧必须做空值保护并静默降级。
