# RSSHub (Custom Fork)

本项目是 [RSSHub](https://github.com/DIYgod/RSSHub) 的自定义修改版本，包含了一些未被合并的自定义路由。

原项目地址：[DIYgod/RSSHub](https://github.com/DIYgod/RSSHub)

---

## 🚀 部署指南

本指南将帮助你在云服务器上部署此自定义版本的 RSSHub。

### 1. 获取代码

登录到你的云服务器，拉取本仓库的代码：

```bash
# 如果是首次部署
git clone https://github.com/cantaible/rsshub.git rsshub
cd rsshub

# 如果代码已存在，请更新
# cd rsshub
# git pull
```

### 2. 构建并启动

由于项目已预配置为本地构建，直接执行以下命令即可：

```bash
# 这一步会自动读取本地代码进行构建
docker-compose up -d --build
```

- `-d`: 后台运行
- `--build`: 强制重新构建镜像（每次更新代码后都需要加这个参数）

### 3. 验证运行

检查服务状态：

```bash
docker-compose ps
```

如果一切正常，你的 RSSHub 应该已经运行在 `1200` 端口了。
你可以访问 `http://你的服务器IP:1200/healthz` 查看健康状态。

### 4. 后续更新

如果你提交了新的代码修改：

1.  在服务器上拉取最新代码：`git pull`
2.  重新构建并重启：`docker-compose up -d --build`

---

## 📚 自定义路由列表

以下是本项目新增的自定义路由：

### 📱 社交与媒体 (Social & Media)

- **AboutFB (Meta Newsroom)**
    - 路由: `/aboutfb/news`
    - 描述: Meta Newsroom 最新文章。
- **Facebook Developers**
    - 路由: `/facebookdevelopers/blog`
    - 描述: Facebook 开发者博客文章。
- **Telegram**
    - 路由: `/telegramorg/blog`
    - 描述: Telegram 官方博客文章。
- **Kwai (快手)**
    - 路由: `/kwai/newsroom`
    - 描述: Kwai Newsroom 最新动态。
- **YouTube Blog**
    - 路由: `/youtubeblog/news-and-events`
    - 描述: YouTube 官方博客新闻与活动。

### 🤖 科技与 AI (Tech & AI)

- **MIT News**
    - 路由: `/mit/news/topic/artificial-intelligence2`
    - 描述: MIT 新闻中的人工智能相关话题。
- **AIbase**
    - 路由: `/aibase/news-site`
    - 描述: AIbase 资讯列表。
- **AIHot (AI今日热榜)**
    - 路由: `/aihot/today`
    - 描述: AI今日热榜聚合的热点资讯。
- **TLDR**
    - 路由: `/tldr/tech`
    - 描述: TLDR Tech 技术简报。
- **Semrush**
    - 路由: `/semrush/news/releases/product-news`
    - 描述: Semrush 产品发布新闻。
- **Seach Engine Roundtable**
    - 路由: `/seroundtable`
    - 描述: 搜索引擎这一领域的最新讨论。
- **TestingCatalog**
    - 路由: `/testingcatalog`
    - 描述: 测试类产品目录更新。

### 🎮 娱乐与游戏 (Entertainment & Games)

- **Jay Is Games**
    - 路由: `/jayisgames`
    - 描述: Jay Is Games 最新游戏文章。
- **PocketGamer.biz**
    - 路由: `/pocketgamer`
    - 描述: PocketGamer.biz 行业新闻。
- **Musically**
    - 路由: `/musically`
    - 描述: Musically 最新消息。
- **Music Business Worldwide**
    - 路由: `/musicbusinessworldwide`
    - 描述: 全球音乐产业新闻。
