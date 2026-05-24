import type { EncryptedStoryBundle, StoryContent } from '../types'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function verifyAccessCode(input: string, expectedHash?: string): Promise<boolean> {
  if (!expectedHash) return input.trim().length > 0
  return (await sha256Hex(input.trim())) === expectedHash
}

export async function decryptStory(bundle: EncryptedStoryBundle, password: string): Promise<StoryContent> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: fromBase64(bundle.salt),
      iterations: bundle.iterations,
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(bundle.iv) },
    key,
    fromBase64(bundle.data),
  )
  return JSON.parse(decoder.decode(plain)) as StoryContent
}

function fromBase64(value: string): ArrayBuffer {
  const binary = atob(value)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return buffer
}
