import type { EffectName, LanguageCode, StoryContent } from './types'

export const DEFAULT_LANGUAGE: LanguageCode = 'zh-CN'

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  'zh-CN': '中文',
  en: 'EN',
}

export const UI_TEXT = {
  'zh-CN': {
    loading: '正在加载记忆仓库',
    noStory: '没有找到故事内容',
    loadFailed: '故事内容加载失败',
    passwordRejected: '密码不正确，请检查私密口令后重试。',
    codeRejected: '访问码不正确，可以看看提示或重新生成内容包。',
    encryptedPack: '加密内容包',
    privateEntrance: '私密入口',
    openQuest: '打开记忆探索',
    accessCode: '访问密码',
    unlock: '解锁',
    together: '已陪伴',
    days: '天',
    photos: '照片',
    rooms: '房间',
    effectMode: '视觉效果',
    effectTitle: '效果',
    toggleMusic: '切换音乐',
    memoryRooms: '记忆房间',
    locked: '未解锁',
    celebrate: '开始庆祝',
    continue: '继续前进',
    spark: '点亮特效',
    vault: '私密仓库',
    dailyGallery: '日常图集',
    galleryHint: '把示例照片替换成你们自己的时间线。',
    memory: '记忆',
    close: '关闭',
    language: '语言',
    effectNames: {
      petals: '花瓣',
      stars: '星光',
      matrix: '代码雨',
      fireworks: '烟花',
    } satisfies Record<EffectName, string>,
  },
  en: {
    loading: 'Loading memory vault',
    noStory: 'No story content found',
    loadFailed: 'Story content failed to load',
    passwordRejected: 'Password rejected. Check the private code and try again.',
    codeRejected: 'Code rejected. Try the hint or regenerate your content pack.',
    encryptedPack: 'Encrypted content pack',
    privateEntrance: 'Private entrance',
    openQuest: 'Open the memory quest',
    accessCode: 'Access code',
    unlock: 'Unlock',
    together: 'Together',
    days: 'days',
    photos: 'Photos',
    rooms: 'Rooms',
    effectMode: 'Effect mode',
    effectTitle: 'Effect',
    toggleMusic: 'Toggle music',
    memoryRooms: 'Memory rooms',
    locked: 'Locked',
    celebrate: 'Celebrate',
    continue: 'Continue',
    spark: 'Spark',
    vault: 'Vault',
    dailyGallery: 'Daily gallery',
    galleryHint: 'Replace the samples with your own timeline.',
    memory: 'Memory',
    close: 'Close',
    language: 'Language',
    effectNames: {
      petals: 'Petals',
      stars: 'Stars',
      matrix: 'Code rain',
      fireworks: 'Fireworks',
    } satisfies Record<EffectName, string>,
  },
} as const

export function localizeStory(story: StoryContent, language: LanguageCode): StoryContent {
  const locale = story.locales?.[language]
  if (!locale) return story

  const photos = story.photos.map((photo) => ({
    ...photo,
    ...locale.photos?.find((item) => item.id === photo.id),
  }))

  const scenes = story.scenes.map((scene) => ({
    ...scene,
    ...locale.scenes?.find((item) => item.id === scene.id),
  }))

  const playlist = story.playlist?.map((track) => ({
    ...track,
    ...locale.playlist?.find((item) => item.title === track.title),
  }))

  return {
    ...story,
    meta: {
      ...story.meta,
      ...locale.meta,
    },
    access: story.access
      ? {
          ...story.access,
          ...locale.access,
        }
      : undefined,
    photos,
    scenes,
    playlist,
  }
}
