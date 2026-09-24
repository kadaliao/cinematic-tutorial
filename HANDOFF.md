# 电影语言教程网站交接文档

## 用户需求（当前版本）

1. 把 Melies「Cinematic techniques」整理成适合零基础的中文教程，卡片内直接嵌入**原站真实媒体**（可播放的视频 / 原站静帧）。
2. **每条示例里直接显示完整的原站提示词**：Prompt it 全文（保留 Still / Video / Forbid 分段）+ 该片子的示例提示词，而不是只在卡片顶部列一份。
3. **补上原站条目的定义与其他提示词变体**（How it works 里的 `Prompt:` 行、FAQ 里给的提示词示例）。
4. **收录原站全部 424 条手法**（原先只映射了 91 条）。

## 目录结构（2026-09-24 改版后）

```
index.html          生成物：page.html + app.css + app.js 内联（约 85KB）
data-tutorial.js    生成物：12 章 / 48 课 + 424 条轻量索引 + 课程用到的 91 条完整词条（343KB）
data-library.js     生成物：424 条完整词条（1.06MB），打开图鉴 / 搜索 / 打开非课程词条时才加载
body/<slug>.json    生成物：每条的原站正文 {zh:{…}, en:{…}}（共约 2.3MB，单条约 5KB），打开详情时才 fetch
build/
  page.html / app.css / app.js   页面外壳、样式、交互逻辑（手写，唯一需要改 UI 的地方）
  body_zh.json      424 条原站正文译文（叙事作用 / 怎么拍 / 什么时候用 / 相近手法对比 / 电影里的例子 / 常见错误 / FAQ），与 origin_raw.json 逐段对齐
  body_tr/          正文翻译批次：in/batch1-8.json（待译原文）、out/batch1-8.json（译文）、check.py（逐段对齐校验）、merge_body.py（合并 → body_zh.json）
  zh_titles.json    424 条的中文手法名（slug → 中文名，无重名；图鉴、搜索、测验都用它）
  generate.py       tutorial.json + library.json + zh_titles.json + catnames.json + 上面三个文件 → 根目录三个生成物
  scrape.py / origin_raw.json / zh.json / merge.py / library.json / tutorial.json / catnames.json / translate_prompt.txt  数据管线（未改）
```

重新生成：`python3 build/merge.py && python3 build/generate.py`（只改 UI 时只需 `python3 build/generate.py`）。
`generate.py` 给两个数据脚本加内容哈希 `?v=`，数据变了 URL 才变，避免浏览器 / CDN 继续用旧数据（改版时本地就踩到过：新 index.html 配旧 data-tutorial.js 直接白屏）。

## 数据模型

`library.json` 每条字段同前：`t c g u d pi cp hp fq m st r`；生成时额外写入 `z`（中文名）。
`window.CT = {chapters:[{n,sub,desc,lessons:[{t,x,p,s:[slug…]}]}], index:[[slug,英文名,中文名,分类,是否视频,缩略图,mp4|0,tag|0]…], lib:{91 条}, cats, catorder}`。
缩略图：视频用原站 poster；静帧优先用原站「相关条目」里的小图（303/424 覆盖），没有再退回 hero 大图。

## 页面结构（hash 路由，单页）

- `#/` 首页：主视觉（自动播放片例）+ 继续学习按钮 + 总进度、三步用法、12 章卡片（封面 / 课程标签 / 章节进度）、13 个原站分类入口。
- `#/learn/{章}` / `#/learn/{章}/{课}`：左侧目录（章节进度 + 当前章的课，滚动高亮当前课），每课 = 讲解 → 手机练习 → 片例缩略图（悬停预览视频）→「标记已练习」；底部上一章 / 下一章。窄屏目录变为横向章节条。
- `#/library` 手法图鉴：424 条缩略图网格，搜索（中文名 / 英文名 / 别名，全文数据载入后也搜定义与提示词）、13 分类、视频/静帧、只看收藏。
- 任意页面 `?e={slug}` 打开词条详情弹层：大片例（视频自动静音循环）、分镜帧、中英定义、所在课程链接、提示词四个版本分标签（通用模板 / 片例原句 / 正文写法 / FAQ 写法，有才显示），「把 [Subject] 换成」输入框全局生效并高亮，复制英文 / 复制中文，相关手法缩略图；下方「原站讲解」按 7 个小节分卡片展示中文译文，可切换「对照英文原文」（英文展示前会收紧原站链接留下的多余空格）；← → 在当前列表里切换，F 收藏，Esc 关闭。详情链接可直接分享。
- `#/quiz` 看片测验：按全部或单章出 10 题，4 选 1（干扰项优先同分类），数字键 1–4 作答，错题列表可点开复习。
- `#/board` 收藏夹：勾选收藏的手法自动拼成一条提示词（简洁写法 = hp，没有则 cp / 片例原句 / 通用模板三选一），复制组合或复制清单（Markdown 链接）。
- 全局：`/` 或 ⌘K 搜索面板（课程 + 手法，↑↓ Enter），深浅色切换，进度 / 收藏 / 主体 / 标签页选择存 localStorage（try/catch 兜底）。

## 实现约定

- 仍然 0 处 innerHTML，全部 `h()` / textContent 构建。
- 提示词展示时按 `Still: / Video: / For motion: / Quote: / Add: / Example:`（中文 `静帧：/视频：/用于动态时：/照抄这句：/再补：/示例：`）分行、`[Subject]`/`[主体]` 高亮；**复制的是原文**，只在用户填了主体时替换 `[Subject]`。
- 缩略图用原生 `loading=lazy`，不再用 IntersectionObserver 注入媒体；视频只在详情 / 首页主视觉 / 测验 / 悬停预览里出现。
- 窄屏（≤900px）导航换行为横向可滑动条，详情与搜索改全屏；≤560px 图鉴两列、课程片例横排。

## 验证记录

### 第四轮（2026-09-24 全面改版，本地 http.server + Playwright）

- 生成物语法：`node --check` 两个数据脚本 + 内联脚本通过；innerHTML 0 处；控制台 0 报错 / 0 警告。
- 424 条逐条打开详情：标题全部渲染，提示词标签共 1236 个（= 424×2 + hp 272 + fq 116），复制按钮 848 个。
- 图鉴：424 张卡；搜「荷兰角」5 条、「halation」3 条；灯光 41 → 静帧 34；详情 ← → 在 34 条中切换；F 收藏后导航徽标 = 1；相关手法可跳转；Esc 关闭回到 `#/library`。
- 搜索面板「逆光」：课程「侧光 / 逆光」排第一，随后逆光 / 侧逆光 / 轮廓光…
- 测验：出题、数字键作答、反馈与下一题正常；收藏夹 3 条组合、主体替换生效。
- 布局：1440 与 390 视口下首页 / 课程 / 图鉴 / 测验 / 收藏夹 `scrollWidth <= innerWidth`；390 下详情弹层无横向溢出；深色 / 浅色截图检查通过。
- 页面高度：课程页从旧版单页 65,645px 降到每章约 3,400px。

### 第五轮（2026-09-24 原站正文翻译）

- 8 批 × 53 条由 Sonnet 子 agent 翻译，`check.py 1..8` 全部 OK（逐段对齐、无空段、均含中文）；抽查 how 里带 `[Subject]` 的 `Prompt:` 行 0 处丢失英文原句。
- `merge_body.py` 合并时统一全角标点（2004 处）与紧跟汉字的半角括号；重复合并哈希一致（可复现）。
- 浏览器逐条打开 424 条详情，讲解区全部渲染 7 个小节（共 2968 张卡片），「对照英文原文」与「读完整讲解」跳转正常；390 视口无横向溢出；控制台 0 报错。

以下为旧版（改版前）的验证记录，布局相关条目已不适用。


抓取与数据层：

1. `scrape.py` 抓 424 页，0 失败；`no lede / no hero / no clip_prompt / no prompt_it` 均为 0；视频 250 条、静帧 174 条。
2. 媒体层：对 424 条的 hero + 派生 poster + 分镜帧图 + 相关条目缩略图共 **927 个 URL 逐个 HEAD 校验，全部 200**；`hero_thumb` 覆盖率 250/250。
3. 提示词保真：91 条示例提示词与原站 `pre.cinematic-prompt__body` **91/91 逐字一致**；91 条 Prompt it 与原站 `Prompt it` 段落合并后 **91/91 逐字一致**；91 条嵌入媒体 = 各原站页自己的 hero 资源（0 处错配）。
4. 译文完整性：`merge.py` 校验 424 条 × (定义 / Prompt it / 示例提示词 / 正文行 / FAQ) 共 1479 个字段，缺失即报错；当前 0 缺失。管线可复现：`merge.py` 重新生成的 `library.json` 与线上数据 **424/424 完全一致**。

浏览器层（headless Chrome + IO stub，1400×1000）：

5. 教学区：`cards=48, samples=91`，每条示例都有定义 / Prompt it / 示例提示词（缺失 0），共 272 个提示词块 + 272 个复制按钮；56 个 video、35 个静帧；媒体 host 只有 `asset.melies.co`；控制台 0 报错。
6. 全库区：`CT_LIB` 424 条全部渲染（`已显示 424 / 424 条`），每条都有定义 / Prompt it / 示例提示词，250 个 video、250 张分镜帧图。
7. 交互：分类筛选（Camera Movement → 86 条，首屏 24 条）、搜索 `trucking` → 1 条、`荷兰角` → 5 条；教学区筛选（镜头运动 → 4 卡）、搜索 `逆光` → 1 卡；复制按钮取到的就是对应英文原文。
8. 布局：`clippedBlocks=0, overlappingCards=0, libClippedBlocks=0, libOverlap=0, zeroHeight=0`，示例卡高 961px、全库卡高 1104px，`scrollWidth == innerWidth`（无横向溢出）。
9. 截图确认：教学卡片（原站定义 + Prompt it 全文 + 示例提示词 + 变体，双列视频）与全库区（分类筛选 + 词条卡）渲染正常。

### 第二轮（宽度/文案/字号修订，dpl_HGwjD72dsvxo5CnAYi5efxGH7izB 之后的部署）

14. 全库分类按钮改中文：`全部 424 / 镜头运动 86 / 景别与景框 25 / 机位与角度 19 / 灯光 41 / 构图 32 / 镜头与光学 17 / 色彩与胶片感 19 / 时间与运动 21 / 机内与光学特效 57 / 剪辑与转场 23 / 氛围与天气 13 / 类型片风格 27 / 短视频风格 44`。
15. 列数上限 2：线上 1728 视口实测 `#lib-grid` 与 `#content .samples` 均为 `828.359px 828.359px` / `793.359px 793.359px`，即恰好两列（原先 1728 是三列、2560 是五列）。
16. 字号：线上实测全库块 13.5px、定义 14px、教学示例块 12.5px、figcaption 12.5px。
17. 加载兜底：线上实测未加载时 `#lib-load` 可见，进入全库区后 621ms 内自动完成（`已显示 24 / 424 条`）并隐藏按钮。
18. 本地回归：`cards=48, samples=91, libCards=424`，提示词块缺失 0，布局无裁切/重叠，控制台 0 报错，`scrollWidth == innerWidth`。

### 第三轮（窄屏 UI / 空白媒体框，2026-09-18）

19. 窄屏筛选条：线上 CDP 实测 320/360/414/768 下 `#filters` 与 `#lib-filters` 均 `flex-wrap:nowrap` 且 `scrollWidth > clientWidth`（单行可滑），1024/1440 下恢复换行；`documentElement.scrollWidth === innerWidth`，排除滚动容器内的按钮后无越界元素。
20. 空白媒体框：占位提示文案实测为「原站素材」/「载入中…」，坏地址点击后进入 `data-failed` 并显示「图片载入失败，点此重试」且可重试。
21. 兜底加载：把 `IntersectionObserver` 换成空实现后，仅靠 scroll/click 兜底仍能注入媒体（1440 下滚动后 2 个、390 下全库 1 个），全库 424 条也能靠按钮+滚动载入（`已显示 24 / 424 条`）。
22. 回归：`cards=48, samples=91, libCards=424`，提示词块缺失 0，无裁切/重叠，控制台 0 报错。

### 线上（2026-09-18 首发，dpl_HGwjD72dsvxo5CnAYi5efxGH7izB / READY）

10. 三个文件与本地**逐字节一致**：`index.html`(20517B)、`data-tutorial.js`(284363B)、`data-library.js`(1071496B)。
11. 真实浏览器打开 `https://cinematic-tutorial.vercel.app`：教学区首个视频 `002-slow-dolly-in-mini.mp4` 有 poster、`play()` 后 `currentTime=1.2s / paused=false / error=null`；媒体 host 只有 `asset.melies.co`（`content-type: video/mp4`）。
12. 全库懒加载在真实浏览器里跑通：滚到全库区自动注入 `data-library.js` → `已显示 24 / 424 条`；点按钮 → 48；滚到卡片底部哨兵自动续载 → 72 → 96；继续下滚时媒体逐个 hydrate（10 屏内 27 个媒体 / 7 个视频 / 7 张分镜帧图）。
13. 线上截图确认：筛选条（全部 424 + 13 分类带条数）、搜索框、词条卡（定义 / Prompt it 全文 / 示例提示词 / 正文提示词行 / 复制按钮 / 静帧徽标 / 原站条目链接）渲染正常。

## 重新部署

```bash
cd cinematic-tutorial   # 仓库根目录
npx vercel --prod --yes
curl -fsSL https://cinematic-tutorial.vercel.app/ | grep -c 'data-library.js'   # 期望 1
```

## 后续可选改进（未做）

- 页面内不做原站正文（Narrative / How it works / When to use / Mistakes / FAQ 全文）的中文翻译；这些正文已抓在 `origin_raw.json` 里，需要时可在全库卡里展开。
- 已做：相关条目缩略图、详情弹层大图播放。
- 已做：原站正文全部翻译并在详情页展示（2026-09-24，8 个 Sonnet 子 agent 分批翻译，check.py 逐段校验）。
- 未做：「错题本」持久化；正文未纳入全文搜索。
