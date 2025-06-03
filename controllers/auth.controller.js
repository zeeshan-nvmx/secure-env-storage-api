// controllers/auth.controller.js
const User = require('../models/User')

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, pin } = req.body

    // Validate PIN
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        error: 'PIN must be exactly 4 digits',
      })
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      pin,
    })

    sendTokenResponse(user, 201, res)
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    })
  }
}

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an email and password',
      })
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      })
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password)

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      })
    }

    sendTokenResponse(user, 200, res)
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    })
  }
}

// @desc    Verify PIN
// @route   POST /api/auth/verify-pin
// @access  Private
exports.verifyPin = async (req, res, next) => {
  try {
    const { pin } = req.body

    if (!pin) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a PIN',
      })
    }

    const user = await User.findById(req.user.id).select('+pin')

    const isMatch = await user.matchPin(pin)

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid PIN',
      })
    }

    res.status(200).json({
      success: true,
      message: 'PIN verified successfully',
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    })
  }
}

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide old and new passwords',
      })
    }

    // Get user with password and PIN fields
    const user = await User.findById(req.user.id).select('+password +pin')

    // Check if old password matches
    const isMatch = await user.matchPassword(oldPassword)

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid old password',
      })
    }

    // Update password - this will trigger the pre-save hook
    user.password = newPassword
    await user.save()

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

// @desc    Change PIN
// @route   PUT /api/auth/change-pin
// @access  Private
exports.changePin = async (req, res, next) => {
  try {
    const { oldPin, newPin } = req.body

    // Validate new PIN
    if (!newPin || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({
        success: false,
        error: 'New PIN must be exactly 4 digits',
      })
    }

    const user = await User.findById(req.user.id).select('+pin +masterKey +masterKeyIv +masterKeyAuthTag +pinSalt')

    // Re-encrypt master key with new PIN
    await user.reEncryptMasterKey(oldPin, newPin)

    res.status(200).json({
      success: true,
      message: 'PIN changed successfully',
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  const user = await User.findById(req.user.id)

  res.status(200).json({
    success: true,
    data: user,
  })
}

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken()

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  })
}
