// routes/file.routes.js
const express = require('express')
const router = express.Router()
const { uploadFile, createNote, getFiles, getFile, updateFile, deleteFile } = require('../controllers/file.controller')
const { protect } = require('../middleware/auth')

// All routes require authentication
router.use(protect)

router.route('/').get(getFiles)

router.route('/upload').post(uploadFile)

router.route('/note').post(createNote)

router.route('/:id').get(getFile).put(updateFile).delete(deleteFile)

module.exports = router
