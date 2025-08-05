// routes/project.routes.js
const express = require('express')
const router = express.Router()
const { 
  getProjects, 
  getProject, 
  createProject, 
  updateProject, 
  deleteProject 
} = require('../controllers/project.controller')
const { protect } = require('../middleware/auth')

// All routes require authentication
router.use(protect)

router.route('/').get(getProjects).post(createProject)

router.route('/:id').get(getProject).put(updateProject).delete(deleteProject)

module.exports = router