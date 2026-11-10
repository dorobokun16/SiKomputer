/**
 * Web Crypto API Utility for SiKomputer (Local-First & 100% Client-Side)
 * - PBKDF2-SHA256 Password Hashing & Verification (100,000 iterations)
 * - RFC 6238 TOTP (Time-based One-Time Password) generation & verification
 * - Base32 encoding / decoding for authenticator app compatibility
 * - Recovery code generation
 * - AES-GCM Vault Encryption / Decryption
 */

/* ================= 1. PBKDF2 Password Hashing ================= */

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder()
  const saltBytes = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey'])

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )

  const hashHex = bufToHex(new Uint8Array(derivedBits))
  const saltHex = bufToHex(saltBytes)
  return { hash: hashHex, salt: saltHex }
}

export async function verifyPassword(password: string, saltHex: string, expectedHashHex: string): Promise<boolean> {
  const enc = new TextEncoder()
  const saltBytes = hexToBuf(saltHex)
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey'])

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )

  const computedHashHex = bufToHex(new Uint8Array(derivedBits))
  return computedHashHex === expectedHashHex
}

/* ================= 2. Base32 Encoding / Decoding ================= */

const RFC4648_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buffer: Uint8Array): string {
  let bits = 0
  let value = 0
  let output = ''

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]
    bits += 8

    while (bits >= 5) {
      output += RFC4648_BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += RFC4648_BASE32[(value << (5 - bits)) & 31]
  }

  return output
}

export function base32Decode(input: string): Uint8Array {
  const cleaned = input.toUpperCase().replace(/[\s=-]/g, '')
  let bits = 0
  let value = 0
  const output: number[] = []

  for (let i = 0; i < cleaned.length; i++) {
    const idx = RFC4648_BASE32.indexOf(cleaned[i])
    if (idx === -1) continue

    value = (value << 5) | idx
    bits += 5

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }

  return new Uint8Array(output)
}

/* ================= 3. TOTP RFC 6238 Engine ================= */

export function generateTotpSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return base32Encode(bytes)
}

export function getTotpUri(username: string, secret: string, issuer = 'SiKomputer'): string {
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedUser = encodeURIComponent(username)
  return `otpauth://totp/${encodedIssuer}:${encodedUser}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`
}

export function getTotpRemainingSeconds(): number {
  return 30 - (Math.floor(Date.now() / 1000) % 30)
}

export async function generateTotpCode(secretBase32: string, stepOffset = 0): Promise<string> {
  const keyBytes = base32Decode(secretBase32)
  const epoch = Math.floor(Date.now() / 1000)
  const counter = Math.floor(epoch / 30) + stepOffset

  // 8-byte big-endian counter
  const counterBuffer = new ArrayBuffer(8)
  const counterView = new DataView(counterBuffer)
  counterView.setBigUint64(0, BigInt(counter), false)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBuffer)
  const hmac = new Uint8Array(signature)

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  const otp = binary % 1000000
  return otp.toString().padStart(6, '0')
}

export async function verifyTotpCode(token: string, secretBase32: string, windowSteps = 1): Promise<boolean> {
  const cleanToken = token.trim().replace(/\s+/g, '')
  if (cleanToken.length !== 6) return false

  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const validOtp = await generateTotpCode(secretBase32, offset)
    if (cleanToken === validOtp) {
      return true
    }
  }

  return false
}

export function generateRecoveryCodes(count = 8): string[] {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const codes: string[] = []

  for (let i = 0; i < count; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(8))
    let code = ''
    for (let j = 0; j < 8; j++) {
      code += chars[bytes[j] % chars.length]
      if (j === 3) code += '-'
    }
    codes.push(code)
  }

  return codes
}

/* ================= 4. AES-GCM Vault Encryption ================= */

export async function encryptVault(data: string, masterPass: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(masterPass), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(data))

  const payload = {
    salt: bufToHex(salt),
    iv: bufToHex(iv),
    data: bufToHex(new Uint8Array(ciphertext)),
    version: 1,
  }

  return JSON.stringify(payload)
}

export async function decryptVault(payloadStr: string, masterPass: string): Promise<string> {
  const enc = new TextEncoder()
  const dec = new TextDecoder()
  const payload = JSON.parse(payloadStr)

  const salt = hexToBuf(payload.salt)
  const iv = hexToBuf(payload.iv)
  const ciphertext = hexToBuf(payload.data)

  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(masterPass), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource,
  )
  return dec.decode(decrypted)
}

/* ================= Helper Utilities ================= */

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuf(hex: string): Uint8Array {
  const match = hex.match(/.{1,2}/g) || []
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)))
}
