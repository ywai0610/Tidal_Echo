# 小手机 · 有人味的 AI 角色

这是一个纯静态、可安装到手机主屏的 PWA 前端。默认使用演示回复；在设置页填写 OpenAI 兼容接口后，可直接从浏览器调用你的模型。配置和聊天记忆保存在当前设备的 `localStorage`。

## 本地预览

Service Worker 需要 HTTP(S)，不能直接双击 `index.html`。在此目录运行：

```bash
python -m http.server 4173
```

然后打开 <http://localhost:4173/>。

## 手机使用

部署到 HTTPS 地址后，用手机浏览器打开页面，选择“添加到主屏幕”。第一次在线打开后，页面会缓存基础资源，之后断网也能打开已经加载过的界面。

## 发布

这是无构建步骤的静态站点，可以发布到 GitHub Pages、Cloudflare Pages、Netlify 或 Vercel。部署目录就是当前目录，入口文件是 `index.html`。

如果修改了 `index.html`、`styles.css` 或 `app.js`，请把 `sw.js` 中的 `CACHE_NAME` 从 `little-phone-v1` 改成下一个版本号，避免手机继续使用旧缓存。

## API 接入要求

设置页支持 OpenAI 兼容的 `POST /chat/completions` 接口。接口必须允许手机浏览器跨域（CORS），请求体包含 `model`、`messages` 和 `temperature`，响应里返回 `choices[0].message.content`。API Key 只写入手机本机的 `localStorage`，不要提交到仓库。
