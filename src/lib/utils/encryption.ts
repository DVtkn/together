import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 12
const SALT_LENGTH = 16
const TAG_LENGTH = 16

function getMasterKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET
  if (!secret) throw new Error('ENCRYPTION_KEY or AUTH_SECRET not set')
  return Buffer.from(secret, 'base64').subarray(0, KEY_LENGTH)
}

export async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
}

export async function encrypt(plaintext: string, userKey?: string): Promise<string> {
  const masterKey = getMasterKey()
  const salt = randomBytes(SALT_LENGTH)
  const iv = randomBytes(IV_LENGTH)
  const key = userKey ? await deriveKey(userKey, salt) : masterKey

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return Buffer.concat([salt, iv, ciphertext, tag]).toString('base64')
}

export async function decrypt(ciphertextB64: string, userKey?: string): Promise<string> {
  const masterKey = getMasterKey()
  const data = Buffer.from(ciphertextB64, 'base64')

  const salt = data.subarray(0, SALT_LENGTH)
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const tag = data.subarray(data.length - TAG_LENGTH)
  const ciphertext = data.subarray(SALT_LENGTH + IV_LENGTH, data.length - TAG_LENGTH)

  const key = userKey ? await deriveKey(userKey, salt) : masterKey

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])

  return plaintext.toString('utf8')
}

export async function encryptField(value: unknown, userKey?: string): Promise<string> {
  return encrypt(JSON.stringify(value), userKey)
}

export async function decryptField<T>(encrypted: string, userKey?: string): Promise<T> {
  const decrypted = await decrypt(encrypted, userKey)
  return JSON.parse(decrypted) as T
}