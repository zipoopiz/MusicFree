# MusicFree

MusicFree 是一个插件化的 React Native 音乐播放器。本术语表当前聚焦车载蓝牙歌词功能引入的领域语言。

## Language

### 车载歌词

**车载蓝牙歌词（Car Lyrics）**：
把歌词文本写入系统媒体会话（MediaSession）元数据、经蓝牙 AVRCP 同步给车机显示的功能统称。AVRCP 协议本身没有歌词字段，因此只能借用元数据字段承载。
_Avoid_: 车机歌词、蓝牙歌词、BT lyric

**逐行歌词模式（Line-by-line Mode）**：
车载歌词的一种：歌词行变化时，把当前行写入媒体会话元数据的「标题」字段、把「歌名-歌手」写入「歌手」字段（QQ音乐同款——反编译 QQ 音乐 APK 确认其为 TITLE=歌词行、ARTIST=「歌名-歌手」，歌词占据 AVRCP 主显示位）。
_Avoid_: 逐行标题模式（旧称）、标题替换（旧称）、QQ 模式

**完整歌词模式（Full Lyric Mode）**：
车载歌词的一种：切歌时把整篇歌词一次性写入媒体元数据的歌词字段（Android 16+ 用 `android.media.metadata.LYRIC`，兼容保留 `android.media.metadata.LYRICS`），车机自行解析并滚动显示。通知保持歌名不变，仅部分新式车机支持。无论哪种车载歌词模式，整篇歌词都会随 ucar 通道推送（见下）。
_Avoid_: 洛雪模式、LRC 注入、蓝牙完整歌词

**ucar 通道（ucar metadata channel）**：
QQ 音乐合作车机专用元数据字段（`ucar.media.metadata.UCAR_TITLE/UCAR_ARTIST/LYRICS_WHOLE`），携带真实歌名、歌手与整篇歌词——部分合作车机只消费这组字段而不读 AVRCP 标题。本项目的车载歌词对齐 QQ 音乐同时输出该通道。
_Avoid_: QQ 车机协议、私有蓝牙协议

**原始元数据（Original Metadata）**：
未注入歌词时媒体会话应显示的歌名、歌手、专辑等信息。歌词注入退出（无歌词、暂停、切歌）时恢复到它，不残留上一句歌词。
_Avoid_: 默认标题、真实标题

### 相邻功能（勿混淆）

**桌面歌词（Desktop Lyrics）**：
既有功能：以悬浮窗形式覆盖在屏幕上显示歌词（需要悬浮窗权限）。与车载歌词完全独立，互不依赖。
_Avoid_: 状态栏歌词（历史叫法）、悬浮歌词
