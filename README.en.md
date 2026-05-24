# Heartfelt Journey

A privacy-aware interactive web gift for anniversaries, confessions, Valentine's Day, 520, Qixi, birthdays, long-distance days, and personal milestones. It is a static GitHub Pages friendly memory quest with password entry, story rooms, letters, quizzes, photo galleries, and celebration effects.

[中文 README](README.md)

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-GitHub%20Pages%20%7C%20Vercel%20%7C%20Netlify-lightgrey.svg)
![Stack](https://img.shields.io/badge/stack-Vite%20%2B%20React%20%2B%20TypeScript-22c7a9.svg)
![Privacy](https://img.shields.io/badge/privacy-password%20%2B%20encrypted%20content-ff6b81.svg)

## Quick Start

The default demo has no private material. Use this demo code:

```text
520520
```

Run locally:

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Features

- Password entry for a private gift opening.
- Optional AES-GCM encrypted content packs for public static hosting.
- Sequential story rooms: welcome, letter, memory, quiz, gallery, finale.
- Large configurable photo library with captions, dates, and locations.
- Visual effect modes: petals, stars, code rain, fireworks.
- Responsive layout for phone and desktop sharing.
- Fully static deployment with no database or backend server.
- Content configuration is separated from the open-source app engine.

## Content

Copy the example content:

```bash
cp public/content/story.example.json public/content/story.json
```

Generate a soft access-code hash:

```bash
npm run hash-code -- 520520
```

For public repositories, prefer an encrypted content pack:

```bash
export HEARTFELT_PASSWORD="your-long-private-password"
npm run encrypt
```

The app loads `public/content/story.enc.json` before `story.json`. Decryption happens locally in the browser after the visitor enters the password.

Static hosting cannot provide real server-side access control. A soft password gate only hides the interface. Use encrypted content packs when publishing private photos or letters from a public repository.

## GitHub Pages

The repo includes `.github/workflows/pages.yml`. Enable GitHub Pages and choose GitHub Actions as the source.

For a user site such as `zouchenzhen.github.io`, set:

```bash
VITE_BASE_PATH=/
```

For a normal project repository, the workflow defaults to `/<repo-name>/`.

## License

Apache License 2.0. You are responsible for the rights of photos, music, fonts, and third-party assets you publish.
