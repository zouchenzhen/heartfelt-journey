import { demoStory } from '../data/demoStory'
import type { EncryptedStoryBundle, LoadResult, StoryContent } from '../types'

const BASE = import.meta.env.BASE_URL

export async function loadStory(): Promise<LoadResult> {
  const encrypted = await fetchJson<EncryptedStoryBundle>(`${BASE}content/story.enc.json`)
  if (encrypted && encrypted.schema === 'heartfelt-journey.encrypted.v1') {
    return { kind: 'encrypted', bundle: encrypted }
  }

  const plain = await fetchJson<StoryContent>(`${BASE}content/story.json`)
  if (plain?.meta && Array.isArray(plain.scenes)) {
    return { kind: 'plain', story: plain }
  }

  return { kind: 'plain', story: demoStory }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}
