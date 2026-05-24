# Contributing

Thanks for improving Heartfelt Journey. The project is intentionally small: a static React app, a JSON content format, and a few helper scripts.

## Local Checks

Run these before opening a pull request:

```bash
npm run lint
npm run build
```

## Contribution Guidelines

- Keep private photos, names, music, and personal letters out of commits.
- Prefer configuration-driven features over hard-coded couple-specific changes.
- Keep the app deployable as a static site.
- Do not add a backend dependency unless the feature cannot work safely without it.
- Update `README.md` and `README.en.md` when user-facing behavior changes.

## Security and Privacy

Do not submit real secrets, passwords, private photos, or unencrypted personal content. Use `public/content/story.example.json` for examples and `scripts/encrypt-content.mjs` for private content packs.
