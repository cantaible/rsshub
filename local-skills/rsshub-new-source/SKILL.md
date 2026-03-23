---
name: rsshub-new-source
description: 当用户给出一个网站网址，希望为 RSSHub 新增一个 route 时使用。先检索网上是否已经存在现成 RSS 源；如果存在，先询问用户是直接使用现成源还是继续自建。若继续自建，则按 RSSHub 规范新增 route，结果风格优先参考 aibase/news，默认抓正文并尽量保留首图，在需要时完成 Docker 部署和外网验证。
---

## 给人看的使用说明

这个 skill 用来为 RSSHub 新增新闻源 route，并可在确认最终 RSS 可用后，同步到 `local-news-harvester`。

建议这样调用：
- 当前工作目录名必须是 `rsshub`
- “用 rsshub new source 这个 skill，给 https://example.com 添加 rss 源”
- 调用完成后，会给出一个url，手动验证一下这个url是否有效，有效的话，继续
- “用 rsshub new source 这个 skill，把这个源以 XX 类别同步到 local-news-harvester”


# RSSHub 新增 Route 工作流

## 目录限制

开始执行这个 skill 前，必须先检查当前工作目录名是否为 `rsshub`。

执行规则：
- 先运行 `pwd` 或等效命令确认当前目录
- 只有当前目录名是 `rsshub` 时，才继续执行后续命令
- 如果当前目录名不是 `rsshub`，立即停止当前 skill 的工作流，并明确提示用户先切换到 `rsshub` 目录
- 不要在非 `rsshub` 目录下执行任何与本 skill 相关的修改、验证或部署命令

优先参考这些本地文件：
- `references/aibase-news-sample.xml`
- `references/aibase-news-reference.md`

如需把新增 RSS 源同步到本地数据库，可使用这个脚本：
- `scripts/check_existing_rss_source.py`
- `scripts/add_music_rss_sources.py`

当需要判断最终 RSS 应该长什么样时，先看上面两个参考文件，而不是只看线上地址。

## 适用范围

这个 skill 只处理“新增 route”。

不要做这些事：
- 不处理“修复已有 route”
- 不把已有 route 的重构、修补、顺手优化混入当前任务
- 不因为发现站点已有子路由，就自动改动它们

当用户只给一个网址时，默认目标是“把这个网址对应的内容做成一个新的 RSSHub route”。

## 输入

优先获取这些信息：
- 目标网址
- 是否需要部署到实际环境
- 是否需要同步到 `local-news-harvester`
- 若需要同步，目标分类是什么

如果用户没有补充完整信息，按这些默认规则：
- 根网址默认视为总源或首页可见内容源
- 栏目页默认视为栏目源
- 未明确要求部署时，只完成代码和本地验证
- 未明确要求同步到 `local-news-harvester` 时，不执行数据库同步脚本
- 若明确要求部署，则使用 Docker Compose 部署
- 只有在真正需要落 `maintainers` 字段时，才补充确认 maintainer 信息

## 第一步：先查网上是否已经有现成 RSS

这是必须先做的步骤。

收到网址后，先联网检索该网址是否已经存在现成 RSS 源，包括但不限于：
- 目标站点自身是否提供 RSS / Atom
- 常见 `/feed`、`/rss`、`/atom.xml`、`/index.xml` 等路径
- 第三方是否已经提供稳定可用的 RSS

如果找到了现成 RSS：
- 不要直接继续写代码
- 先明确告诉用户“这个网址已经有现成 RSS”
- 然后询问用户：是直接使用现成 RSS，还是仍然继续在 RSSHub 里新增 route

只有在以下情况之一时，才继续新增 route：
- 用户明确说继续做
- 现成 RSS 不稳定
- 现成 RSS 内容明显不完整
- 现成 RSS 与用户想要的内容范围不一致

## 第二步：确定新增 route 的目标范围

确认这次只做“新增”，并明确新增的对象是什么：
- 首页总源
- 某个栏目页
- 某个列表页
- 某个专题页

然后检查仓库中：
- 对应 namespace 是否已经存在
- 如果 namespace 已存在，优先在原目录下新增 route 文件
- 如果 namespace 不存在，再新建目录和 `namespace.ts`

注意：
- 即使仓库中已经有同站点的其他 route，也不要把本次任务转成“修复已有 route”
- 当前任务只围绕用户给定网址新增一个新的 route

## 第三步：按统一目标设计 RSS 结果

不做内容分类分支。

默认统一按 `aibase/news` 的结果风格作为目标来设计：
- item 标题清晰可读
- `description` 以正文为主
- 尽量抓到正文全文
- 尽量保留首图，但不是硬性要求
- `pubDate`、`author` 尽量完整

也就是说，只要用户给了一个网址，默认把它尽量做成“可读的文章流 RSS”。

不要先讨论它属于什么类型再决定做法。
先以结果为目标：让最终 feed 尽可能接近 `references/aibase-news-sample.xml` 展示出来的阅读体验。

## 第四步：分析抓取方案

这一步是结果导向，不强制指定技术栈。

要求是：
- 以能稳定产出目标 RSS 为准
- 以最终内容质量为准
- 以维护成本可接受为准

技术选择顺序建议：
1. 稳定 API
2. HTML 抓取
3. 必要时再用 Puppeteer

但不要为了遵守形式而牺牲结果。
如果 HTML 更容易拿到完整正文，就可以直接抓 HTML。

## 第五步：参考 aibase 的输出风格设计 RSS

默认以 `aibase/news` 的可读性为参照目标，而不是照抄其代码实现。

设计时先看：
- `references/aibase-news-sample.xml`：真实输出样本
- `references/aibase-news-reference.md`：提炼后的字段观察

目标效果：
- 标题是正常文章标题，不是 URL
- `description` 主要是正文内容
- 能抓首图更好，但不是硬性要求
- `pubDate` 尽量准确
- `author` 有就补

如果站点正文页有首图，优先把首图放进正文前部或保留在正文中。
如果首图很难稳定拿到，不要为了补首图破坏整体稳定性。

## 第六步：按 RSSHub 规范实现 route

必须遵守这些规则：
- `example` 必须以 `/` 开头，并且是实际 RSSHub 路径
- `name` 不重复 namespace 名称
- `radar.source` 不带 `https://`
- `radar.target` 与实际 route 匹配
- `namespace.ts` 的 `url` 不带协议
- `categories` 只保留一个分类
- `maintainers` 只有在需要填写时才补充，且必须是有效 GitHub 用户名
- 不创建额外的 `README.md` 或 `radar.ts`
- 不修改 `lib/router.js`

实现细则：
- 列表只抓第一页
- 详情页循环抓取时必须使用 `cache.tryGet()`
- `description` 只放正文主体，不混入标题、时间、标签
- `pubDate` 使用 `parseDate`
- 不要用 `new Date()` 伪造时间
- `link` 必须唯一且可读
- 变量名使用 `camelCase`
- 类型导入使用 `import type`

关于标签：
- `category` 是 RSS item 的分类/标签字段
- 不是必须字段
- 如果源站天然提供了明确标签，可以补
- 如果没有稳定标签，就不要为了凑字段强行加
- 参考例子里也不要把它当成默认必须项

## 第七步：验证结果

至少验证这些点：
- RSS XML 能正常返回
- 标题不是 URL
- 正文是否抓到
- 首图是否正常保留或可接受地缺省
- `pubDate` 是否合理
- `author` 是否合理
- `example` 与 route 一致

至少抽查 1 到 2 篇详情页。

## 第八步：如用户要求，部署到实际环境

如果用户明确要求部署：
- 确认项目使用 Docker Compose
- 执行重建并启动容器
- 检查服务健康状态
- 本机请求新 route 验证
- 若旧缓存导致结果仍为旧版，清理 Redis 缓存
- 再次验证
- 获取当前外网 IP
- 用外网地址再次验证
- 返回最终外网 RSS URL

默认部署命令：

```bash
docker compose up -d --build
```

## 第九步：如用户要求，同步到 local-news-harvester

只有当用户明确要求把新增 RSS 源写入本地数据库时，才执行这一步。

执行前必须确认这些信息：
- 最终 RSS 地址
- 源名称
- 目标分类
- `local-news-harvester` 后端是否已启动

分类只能是以下 5 个值之一：
- `AI`
- `MUSIC`
- `GAMES`
- `COMPETITORS`
- `UNCATEGORIZED`

如果用户给出的分类不在上面 5 个值中，不要猜测，也不要自动改写；先明确指出无效并让用户重新指定。

使用脚本：
- `scripts/check_existing_rss_source.py`
- `scripts/add_music_rss_sources.py`

执行顺序：
1. 先调用 `scripts/check_existing_rss_source.py` 检查这个 RSS 源是否已经存在
2. 只有在确认不存在时，才调用 `scripts/add_music_rss_sources.py` 真正新增

查重脚本调用方式：

```bash
python3 scripts/check_existing_rss_source.py \
  --name "Source Name" \
  --url "https://example.com/feed.xml"
```

查重脚本结果规则：
- 退出码 `0`：未发现重复，可以继续新增
- 退出码 `10`：发现相同 URL 的 RSS 源，视为已存在，不再新增
- 退出码 `11`：发现相同名称但不同 URL 的 RSS 源，视为疑似重复，先提示用户确认
- 非上述退出码：视为检查失败，不继续新增

查重补充规则：
- 只检查 `sourceType=RSS` 的现有源
- 比较 URL 时允许忽略末尾单个 `/`
- 若查重结果显示已存在或疑似重复，要在结果中明确列出命中的现有记录

调用方式：

```bash
python3 scripts/add_music_rss_sources.py \
  --name "Source Name" \
  --url "https://example.com/feed.xml" \
  --category "AI"
```

补充规则：
- 这个脚本固定使用 `sourceType=RSS`
- `--category` 会在脚本入口校验，必须属于 5 个允许值之一
- 如有需要，可通过 `--base-url` 指定后端地址；否则脚本会自动探测 `http://localhost:9090` 和 `http://localhost:8080`
- 只有在最终 RSS 地址已经可访问时，才执行同步
- 若脚本返回重复源或后端不可达，要在结果中明确说明

## 输出格式

完成后固定汇报：
- 本次是否发现现成 RSS
- 用户是否选择继续自建
- 新增的是哪个 route
- 修改了哪些文件
- 最终 RSS 路径
- 是否已部署
- 是否清理过缓存
- 本机验证结果
- 外网验证结果
- 最终可访问 URL
- 是否同步到 local-news-harvester
- local-news-harvester 使用的分类
- local-news-harvester 写入结果
- 剩余风险或待确认项
