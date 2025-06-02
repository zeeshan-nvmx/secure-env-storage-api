// models/SecretFile.js
const mongoose = require('mongoose')

const secretFileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  filename: {
    type: String,
    required: [true, 'Please provide a filename'],
  },
  encryptedContent: {
    type: String,
    required: true,
  },
  iv: {
    type: String,
    required: true,
  },
  authTag: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    enum: ['env', 'txt', 'json', 'other'],
    default: 'other',
  },
  size: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Update the updatedAt timestamp on save
secretFileSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model('SecretFile', secretFileSchema)
