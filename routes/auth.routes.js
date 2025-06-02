// routes/auth.routes.js
const express = require('express')
const router = express.Router()
const { register, login, verifyPin, changePassword, changePin, getMe } = require('../controllers/auth.controller')
const { protect } = require('../middleware/auth')

router.post('/register', register)
router.post('/login', login)
router.post('/verify-pin', protect, verifyPin)
router.put('/change-password', protect, changePassword)
router.put('/change-pin', protect, changePin)
router.get('/me', protect, getMe)

module.exports = router
