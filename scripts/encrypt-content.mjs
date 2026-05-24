import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { webcrypto } from 'node:crypto'

const subtle = webcrypto.subtle
const encoder = new TextEncoder()

const [, , source = 'public/content/story.json', target = 'public/content/story.enc.json'] = process.argv

const password = process.env.HEARTFELT_PASSWORD || (await askPassword())
if (!password || password.length < 8) {
  throw new Error('Use a password with at least 8 characters for encrypted content packs.')
}

const story = await readFile(source, 'utf8')
JSON.parse(story)

const salt = webcrypto.getRandomValues(new Uint8Array(16))
const iv = webcrypto.getRandomValues(new Uint8Array(12))
const keyMaterial = await subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, [
  'deriveKey',
])
const iterations = 250_000
const key = await subtle.deriveKey(
  { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
  keyMaterial,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt'],
)
const encrypted = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(story))

const bundle = {
  schema: 'heartfelt-journey.encrypted.v1',
  kdf: 'PBKDF2-SHA-256',
  cipher: 'AES-GCM',
  iterations,
  salt: toBase64(salt),
  iv: toBase64(iv),
  data: toBase64(new Uint8Array(encrypted)),
}

await mkdir(dirname(target), { recursive: true })
await writeFile(target, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8')
console.log(`Encrypted content written to ${target}`)

async function askPassword() {
  const rl = createInterface({ input, output })
  try {
    return await rl.question('Content password: ', { hideEchoBack: true })
  } finally {
    rl.close()
  }
}

function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64')
}
