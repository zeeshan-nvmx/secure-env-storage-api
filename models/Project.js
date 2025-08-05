// models/Project.js
const mongoose = require('mongoose')

const projectSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide a project name'],
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true,
  },
  color: {
    type: String,
    match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color'],
    default: '#007bff',
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

// Create compound index for user and project name uniqueness
projectSchema.index({ user: 1, name: 1 }, { unique: true })

// Update the updatedAt timestamp on save
projectSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

// Virtual for file count
projectSchema.virtual('fileCount', {
  ref: 'SecretFile',
  localField: '_id',
  foreignField: 'project',
  count: true,
})

module.exports = mongoose.model('Project', projectSchema)