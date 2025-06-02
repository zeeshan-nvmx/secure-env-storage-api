// models/User.js
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    minlength: 3,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  pin: {
    type: String,
    required: [true, 'Please provide a 4-digit PIN'],
    match: [/^\d{4}$/, 'PIN must be exactly 4 digits'],
    select: false,
  },
  masterKey: {
    type: String,
    select: false,
  },
  masterKeyIv: {
    type: String,
    select: false,
  },
  masterKeyAuthTag: {
    type: String,
    select: false,
  },
  pinSalt: {
    type: String,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Encrypt password and create master key
userSchema.pre('save', async function (next) {
  // Handle password hashing
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
  }

  // Handle PIN hashing
  if (this.isModified('pin')) {
    const salt = await bcrypt.genSalt(10)
    this.pin = await bcrypt.hash(this.pin, salt)
  }

  // Generate master key for new users
  if (!this.masterKey) {
    // Generate random master key
    const masterKey = crypto.randomBytes(32)

    // Generate salt for PIN-based encryption
    this.pinSalt = crypto.randomBytes(32).toString('hex')

    // Derive key from PIN to encrypt master key
    const derivedKey = crypto.pbkdf2Sync(
      this.pin, // Using the hashed PIN
      this.pinSalt,
      100000,
      32,
      'sha256'
    )

    // Encrypt master key with derived key
    const algorithm = process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm'
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, derivedKey, iv)

    let encrypted = cipher.update(masterKey, null, 'hex')
    encrypted += cipher.final('hex')

    this.masterKey = encrypted
    this.masterKeyIv = iv.toString('hex')
    this.masterKeyAuthTag = cipher.getAuthTag().toString('hex')
  }

  next()
})

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: '365d', // Token valid for 1 year
  })
}

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Match user entered PIN to hashed PIN in database
userSchema.methods.matchPin = async function (enteredPin) {
  return await bcrypt.compare(enteredPin, this.pin)
}

// Get decrypted master key using PIN
userSchema.methods.getDecryptedMasterKey = function (pin) {
  try {
    // Derive key from hashed PIN
    const derivedKey = crypto.pbkdf2Sync(
      this.pin, // Using the hashed PIN
      this.pinSalt,
      100000,
      32,
      'sha256'
    )

    // Decrypt master key
    const algorithm = process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm'
    const decipher = crypto.createDecipheriv(algorithm, derivedKey, Buffer.from(this.masterKeyIv, 'hex'))
    decipher.setAuthTag(Buffer.from(this.masterKeyAuthTag, 'hex'))

    let decrypted = decipher.update(this.masterKey, 'hex')
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted
  } catch (error) {
    throw new Error('Failed to decrypt master key')
  }
}

// Re-encrypt master key with new PIN
userSchema.methods.reEncryptMasterKey = async function (oldPin, newPin) {
  try {
    // Verify old PIN
    const isMatch = await this.matchPin(oldPin)
    if (!isMatch) {
      throw new Error('Invalid PIN')
    }

    // Get the decrypted master key using old PIN
    const masterKey = this.getDecryptedMasterKey(oldPin)

    // Hash the new PIN
    const salt = await bcrypt.genSalt(10)
    this.pin = await bcrypt.hash(newPin, salt)

    // Generate new salt for PIN-based encryption
    this.pinSalt = crypto.randomBytes(32).toString('hex')

    // Derive key from new hashed PIN
    const derivedKey = crypto.pbkdf2Sync(this.pin, this.pinSalt, 100000, 32, 'sha256')

    // Re-encrypt master key with new derived key
    const algorithm = process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm'
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, derivedKey, iv)

    let encrypted = cipher.update(masterKey, null, 'hex')
    encrypted += cipher.final('hex')

    this.masterKey = encrypted
    this.masterKeyIv = iv.toString('hex')
    this.masterKeyAuthTag = cipher.getAuthTag().toString('hex')

    await this.save()
    return true
  } catch (error) {
    throw new Error('Failed to re-encrypt master key: ' + error.message)
  }
}

module.exports = mongoose.model('User', userSchema)
