export type EffectName = 'petals' | 'stars' | 'matrix' | 'fireworks'

export type SceneKind = 'welcome' | 'letter' | 'memory' | 'quiz' | 'gallery' | 'finale'

export interface ThemeTokens {
  accent: string
  accent2: string
  ink: string
  paper: string
}

export interface PhotoItem {
  id: string
  src: string
  alt: string
  caption: string
  date?: string
  location?: string
}

export interface QuizOption {
  label: string
  correct?: boolean
  response: string
}

export interface Scene {
  id: string
  kind: SceneKind
  title: string
  eyebrow: string
  body: string
  photoIds?: string[]
  prompt?: string
  options?: QuizOption[]
  unlockText?: string
}

export interface PlaylistTrack {
  title: string
  src: string
}

export interface AccessConfig {
  enabled: boolean
  codeHash?: string
  hint?: string
}

export interface StoryContent {
  meta: {
    title: string
    subtitle: string
    coupleName: string
    startDate: string
    location: string
    signature: string
  }
  theme: ThemeTokens
  effects: EffectName[]
  access?: AccessConfig
  photos: PhotoItem[]
  scenes: Scene[]
  playlist?: PlaylistTrack[]
}

export interface EncryptedStoryBundle {
  schema: 'heartfelt-journey.encrypted.v1'
  kdf: 'PBKDF2-SHA-256'
  cipher: 'AES-GCM'
  iterations: number
  salt: string
  iv: string
  data: string
}

export type LoadResult =
  | { kind: 'encrypted'; bundle: EncryptedStoryBundle }
  | { kind: 'plain'; story: StoryContent }
