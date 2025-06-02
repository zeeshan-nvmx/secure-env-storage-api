// controllers/file.controller.js
const SecretFile = require('../models/secretFile')
const User = require('../models/User')
const { encrypt, decrypt } = require('../utils/encryption')

// @desc    Upload a secret file
// @route   POST /api/files/upload
// @access  Private
exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a file',
      })
    }

    const file = req.files.file
    const { filename, pin } = req.body

    if (!pin) {
      return res.status(400).json({
        success: false,
        error: 'PIN required for file encryption',
      })
    }

    // Get user with PIN
    const user = await User.findById(req.user.id).select('+pin +masterKey +masterKeyIv +masterKeyAuthTag +pinSalt')

    // Verify PIN
    const isMatch = await user.matchPin(pin)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid PIN',
      })
    }

    // Get decrypted master key
    const masterKey = user.getDecryptedMasterKey(pin)

    // Determine file type
    let fileType = 'other'
    if (file.name.endsWith('.env')) fileType = 'env'
    else if (file.name.endsWith('.txt')) fileType = 'txt'
    else if (file.name.endsWith('.json')) fileType = 'json'

    // Encrypt the file content
    const fileContent = file.data.toString('utf8')
    const encryptedData = encrypt(fileContent, masterKey)

    // Create secret file
    const secretFile = await SecretFile.create({
      user: req.user.id,
      filename: filename || file.name,
      encryptedContent: encryptedData.encryptedContent,
      iv: encryptedData.iv,
      authTag: encryptedData.authTag,
      fileType,
      size: file.size,
    })

    res.status(201).json({
      success: true,
      data: {
        id: secretFile._id,
        filename: secretFile.filename,
        fileType: secretFile.fileType,
        size: secretFile.size,
        createdAt: secretFile.createdAt,
      },
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

// @desc    Create a secret note
// @route   POST /api/files/note
// @access  Private
exports.createNote = async (req, res, next) => {
  try {
    const { filename, content, fileType = 'txt', pin } = req.body

    if (!filename || !content) {
      return res.status(400).json({
        success: false,
        error: 'Please provide filename and content',
      })
    }

    if (!pin) {
      return res.status(400).json({
        success: false,
        error: 'PIN required for file encryption',
      })
    }

    // Get user with PIN
    const user = await User.findById(req.user.id).select('+pin +masterKey +masterKeyIv +masterKeyAuthTag +pinSalt')

    // Verify PIN
    const isMatch = await user.matchPin(pin)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid PIN',
      })
    }

    // Get decrypted master key
    const masterKey = user.getDecryptedMasterKey(pin)

    // Encrypt the content
    const encryptedData = encrypt(content, masterKey)

    // Create secret file
    const secretFile = await SecretFile.create({
      user: req.user.id,
      filename,
      encryptedContent: encryptedData.encryptedContent,
      iv: encryptedData.iv,
      authTag: encryptedData.authTag,
      fileType,
      size: Buffer.byteLength(content, 'utf8'),
    })

    res.status(201).json({
      success: true,
      data: {
        id: secretFile._id,
        filename: secretFile.filename,
        fileType: secretFile.fileType,
        size: secretFile.size,
        createdAt: secretFile.createdAt,
      },
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

// @desc    Get all secret files for user
// @route   GET /api/files
// @access  Private
exports.getFiles = async (req, res, next) => {
  try {
    const files = await SecretFile.find({ user: req.user.id }).select('-encryptedContent -iv -authTag').sort('-createdAt')

    res.status(200).json({
      success: true,
      count: files.length,
      data: files,
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

// @desc    Get single secret file
// @route   GET /api/files/:id
// @access  Private
exports.getFile = async (req, res, next) => {
  try {
    const { pin } = req.query

    if (!pin) {
      return res.status(400).json({
        success: false,
        error: 'PIN required to view file content',
      })
    }

    const file = await SecretFile.findOne({
      _id: req.params.id,
      user: req.user.id,
    })

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      })
    }

    // Get user with PIN
    const user = await User.findById(req.user.id).select('+pin +masterKey +masterKeyIv +masterKeyAuthTag +pinSalt')

    // Verify PIN
    const isMatch = await user.matchPin(pin)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid PIN',
      })
    }

    // Get decrypted master key
    const masterKey = user.getDecryptedMasterKey(pin)

    // Decrypt the file content
    try {
      const decryptedContent = decrypt(
        {
          encryptedContent: file.encryptedContent,
          iv: file.iv,
          authTag: file.authTag,
        },
        masterKey
      )

      res.status(200).json({
        success: true,
        data: {
          id: file._id,
          filename: file.filename,
          content: decryptedContent,
          fileType: file.fileType,
          size: file.size,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        },
      })
    } catch (decryptError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to decrypt file',
      })
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

// @desc    Update secret file
// @route   PUT /api/files/:id
// @access  Private
exports.updateFile = async (req, res, next) => {
  try {
    const { content, filename, pin } = req.body

    if (content && !pin) {
      return res.status(400).json({
        success: false,
        error: 'PIN required to update file content',
      })
    }

    const file = await SecretFile.findOne({
      _id: req.params.id,
      user: req.user.id,
    })

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      })
    }

    // If content is provided, re-encrypt it
    if (content) {
      // Get user with PIN
      const user = await User.findById(req.user.id).select('+pin +masterKey +masterKeyIv +masterKeyAuthTag +pinSalt')

      // Verify PIN
      const isMatch = await user.matchPin(pin)
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid PIN',
        })
      }

      // Get decrypted master key
      const masterKey = user.getDecryptedMasterKey(pin)

      const encryptedData = encrypt(content, masterKey)
      file.encryptedContent = encryptedData.encryptedContent
      file.iv = encryptedData.iv
      file.authTag = encryptedData.authTag
      file.size = Buffer.byteLength(content, 'utf8')
    }

    if (filename) {
      file.filename = filename
    }

    await file.save()

    res.status(200).json({
      success: true,
      data: {
        id: file._id,
        filename: file.filename,
        fileType: file.fileType,
        size: file.size,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      },
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

// @desc    Delete secret file
// @route   DELETE /api/files/:id
// @access  Private
exports.deleteFile = async (req, res, next) => {
  try {
    const file = await SecretFile.findOne({
      _id: req.params.id,
      user: req.user.id,
    })

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      })
    }

    await file.deleteOne()

    res.status(200).json({
      success: true,
      data: {},
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}
