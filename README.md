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
