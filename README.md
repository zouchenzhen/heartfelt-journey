# Heartfelt Journey

一个面向表白、周年纪念日、情人节、520、七夕和长期异地陪伴场景的互动式网页礼物。它不是单页爱心动画，而是一个可部署到 GitHub Pages 的“私人记忆探索馆”：访问者输入密码后，按剧情房间逐步打开文字、照片、问答、相册墙和庆祝特效。

[English README](README.en.md)

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-GitHub%20Pages%20%7C%20Vercel%20%7C%20Netlify-lightgrey.svg)
![Stack](https://img.shields.io/badge/stack-Vite%20%2B%20React%20%2B%20TypeScript-22c7a9.svg)
![Privacy](https://img.shields.io/badge/privacy-password%20%2B%20encrypted%20content-ff6b81.svg)
![Gift](https://img.shields.io/badge/use-anniversary%20%7C%20520%20%7C%20Qixi%20%7C%20Valentine-ffd166.svg)

---

## 一分钟看效果

本仓库默认内置一份无隐私的示例内容。启动后输入演示密码：

```text
520520
```

本地运行：

```bash
npm install
npm run dev
```

构建检查：

```bash
npm run build
```

网页默认使用中文交互文案。右上角提供 `中文 / EN` 切换按钮，英文只作为附属扩展版本；自定义内容时也建议以中文作为 `story.json` 的基础内容，再在 `locales.en` 中补充英文覆盖。

## 功能

- 访问密码入口，可做礼物的第一道私密开场。
- 支持 AES-GCM 加密内容包，适合公开 GitHub Pages 仓库但不想直接暴露照片和文字的场景。
- 剧情式探索流程：欢迎页、情书、记忆节点、问答关卡、相册墙、最终庆祝房间。
- 大量日常照片配置：每张照片可写日期、地点、说明，并能被多个剧情房间复用。
- 多种视觉效果：花瓣、星光、代码雨、烟花式庆祝。
- 移动端和桌面端自适应，适合直接发链接或二维码。
- 默认中文体验，右上角可切换英文附属版本。
- 纯静态部署，不需要数据库、服务器或后端账号。
- 内容配置和程序代码分离，方便把引擎开源，把真实情侣内容放在私有或加密内容包里。

## 为什么做这个项目

公开能找到的表白网页大多是一次性模板：爱心、打字机、按钮逃跑、音乐、少量相册。它们适合快速表达，但通常有几个痛点：

- 照片和文案直接写进公开源码，隐私风险高。
- 定制入口散落在 HTML/JS 文件里，非前端用户替换大量照片比较痛苦。
- 交互多是单一特效，不像一个能一步步探索的礼物。
- 很多模板没有清晰许可证、贡献说明和部署流程。
- GitHub Pages 静态托管容易部署，但缺少“静态内容加密”这类隐私方案。

Heartfelt Journey 的定位是一个可开源的礼物引擎，而不是把某一对情侣的素材开源出去。

## 与常见项目的区别

| 维度 | 常见表白页模板 | Heartfelt Journey |
|---|---|---|
| 核心体验 | 单页动画或简单问答 | 分房间推进的互动探索 |
| 照片能力 | 少量图片替换 | 大量照片配置和复用 |
| 隐私处理 | 多数直接公开素材 | 支持密码门和加密内容包 |
| 部署方式 | 静态页或本地服务混杂 | 优先纯静态 GitHub Pages |
| 可维护性 | HTML/JS 里手动改 | `story.json` 内容配置 |
| 开源定位 | 个人模板居多 | 通用引擎 + 示例内容 |

## 内容配置

复制示例配置：

```bash
cp public/content/story.example.json public/content/story.json
```

然后编辑 `public/content/story.json`：

- `meta`: 标题、开始日期、地点、签名。
- `theme`: 主色、辅助色、文字色、纸张背景色。
- `access`: 普通访问密码的 SHA-256 哈希和提示语。
- `photos`: 所有照片条目。
- `scenes`: 互动房间顺序。
- `effects`: 可切换的视觉效果。
- `playlist`: 可选音乐地址。
- `locales.en`: 可选英文覆盖内容。基础内容保持中文，英文只填写需要替换的字段。

生成普通访问密码哈希：

```bash
npm run hash-code -- 520520
```

把输出填进：

```json
{
  "access": {
    "enabled": true,
    "codeHash": "这里填 SHA-256 哈希",
    "hint": "只给对方看的提示"
  }
}
```

## 加密内容包

如果仓库要公开，强烈建议不要把真实照片和文字直接提交到 `story.json`。更稳妥的流程是：

1. 本地准备 `public/content/story.json` 和照片素材。
2. 设置加密密码并生成加密包。
3. 只发布 `public/content/story.enc.json`，删除或忽略明文 `story.json`。

```bash
$env:HEARTFELT_PASSWORD="your-long-private-password"
npm run encrypt
```

浏览器打开时会优先加载 `public/content/story.enc.json`，用户输入正确密码后才会在本地解密内容。

> 注意：静态站点无法提供服务端级别的访问控制。普通密码门只是体验层隐藏；真正要降低公开仓库泄露风险，应使用加密内容包，并保管好密码。

## GitHub Pages 部署

仓库已提供 `.github/workflows/pages.yml`。推送到 `main` 后，在 GitHub 仓库设置中启用 Pages，并选择 GitHub Actions 作为构建来源。

如果你把项目放到用户主页仓库，例如 `zouchenzhen.github.io`，建议设置：

```bash
VITE_BASE_PATH=/
```

如果作为普通项目仓库发布，workflow 会默认使用 `/<repo-name>/` 作为基础路径。

## 仓库结构

```text
public/
├── content/
│   └── story.example.json
└── sample/
    ├── city.svg
    ├── coffee.svg
    ├── code.svg
    ├── rain.svg
    ├── stars.svg
    └── ticket.svg
scripts/
├── encrypt-content.mjs
└── hash-code.mjs
src/
├── data/demoStory.ts
├── lib/crypto.ts
├── lib/storyLoader.ts
├── App.tsx
├── App.css
└── types.ts
```

## 后续路线

- 可视化内容编辑器：拖拽照片、编辑房间、导出 `story.json`。
- 多主题模板：赛博、手帐、胶片、星图、像素游戏。
- 离线素材压缩：批量压缩照片并生成缩略图。
- 二维码邀请卡：为加密站点生成可打印礼物卡。
- i18n：中英文内容切换。

## 许可证

本项目使用 Apache License 2.0。使用者需要自行确认上传的照片、音乐、字体和第三方素材具备合法使用权限。
