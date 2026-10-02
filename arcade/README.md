# 片场街机

电影语言的纯游戏站（独立于主站，主站文件一概不改）。两台街机：

- **对片**：12 关（对应 12 章），一关 3 回合 × 6 对，把「手法名」和「片例」配对；连消加分，答得越多演出越盛大（胶片边 → 颗粒 → 镜头光 → 首映灯光）。
- **导演椅**：12 个镜头任务（荷兰角、推镜、后拉、摇、甩、上摇、下摇、焦点转移、手持、跟拍、特写、急推），在取景器里亲手拍出来。

静态站点：`index.html` + `style.css` + `app.js` + `audio.js`（Web Audio 合成，无音频文件）+ `data.js`（生成物）。
数据来自主站的 `data-tutorial.js` 与 `build/library.json`，重新生成：`python3 arcade/build_data.py`。
本地运行：`python3 -m http.server -d arcade 8000`。存档在 localStorage（`arc-save`）。
片例与定义取自 Melies，版权归原站所有。
