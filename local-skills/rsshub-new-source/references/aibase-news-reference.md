# aibase/news 参考要点

来源样本：
- `aibase-news-sample.xml`

这个参考文件只提炼“结果长什么样”，不关心内部抓取技术。

## 观察到的目标形态

- channel 标题简洁直接，例如“AI新闻资讯”
- channel `link` 指向人类可读网页，不是 API
- item 标题是可阅读的正常文章标题，不是 URL
- item `description` 主要是正文 HTML，篇幅明显大于摘要
- item 常见字段包括：
  - `title`
  - `description`
  - `link`
  - `guid`
  - `pubDate`
  - `author`
- item 里没有把 `category` 当成必填字段
- 正文里如果原文带图片，可以保留图片

## 用这个参考时要模仿什么

- 模仿“阅读体验”
- 模仿“正文优先”
- 模仿“标题不要是 URL”
- 模仿“字段足够克制，不乱加”

## 不要机械照抄什么

- 不要照抄 aibase 的接口路径
- 不要照抄 aibase 的站点标题
- 不要照抄 aibase 当前的实现细节
- 不要为了追求完全一致而牺牲目标站点自身特点
