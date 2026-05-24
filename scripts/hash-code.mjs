import { createHash } from 'node:crypto'

const code = process.argv[2] || ''

if (!code) {
  console.error('Usage: node scripts/hash-code.mjs <access-code>')
  process.exit(1)
}

console.log(createHash('sha256').update(code.trim(), 'utf8').digest('hex'))
