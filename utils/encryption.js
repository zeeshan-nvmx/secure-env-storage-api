// utils/encryption.js
const crypto = require('crypto')

const algorithm = process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm'

// Encrypt data with master key
exports.encrypt = (text, masterKey) => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, masterKey, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return {
    encryptedContent: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  }
}

// Decrypt data with master key
exports.decrypt = (encryptedData, masterKey) => {
  try {
    const decipher = crypto.createDecipheriv(algorithm, masterKey, Buffer.from(encryptedData.iv, 'hex'))
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'))

    let decrypted = decipher.update(encryptedData.encryptedContent, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    throw new Error('Decryption failed. Invalid key or corrupted data.')
  }
}
