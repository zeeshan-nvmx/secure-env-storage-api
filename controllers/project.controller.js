// controllers/project.controller.js
const Project = require('../models/Project')
const SecretFile = require('../models/secretFile')

// @desc    Get all projects for user
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res, next) => {
  try {
    const { search } = req.query
    
    let query = { user: req.user.id }
    
    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }

    const projects = await Project.find(query)
      .populate('fileCount')
      .sort('-updatedAt')

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate('fileCount')

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      })
    }

    // Get files in this project
    const files = await SecretFile.find({
      user: req.user.id,
      project: project._id,
    }).select('-encryptedContent -iv -authTag').sort('-createdAt')

    res.status(200).json({
      success: true,
      data: {
        project,
        files,
      },
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

// @desc    Create project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res, next) => {
  try {
    const { name, description, color } = req.body

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a project name',
      })
    }

    const project = await Project.create({
      user: req.user.id,
      name,
      description,
      color,
    })

    res.status(201).json({
      success: true,
      data: project,
    })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Project name already exists',
      })
    }
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res, next) => {
  try {
    const { name, description, color } = req.body

    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.id,
    })

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      })
    }

    if (name) project.name = name
    if (description !== undefined) project.description = description
    if (color) project.color = color

    await project.save()

    res.status(200).json({
      success: true,
      data: project,
    })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Project name already exists',
      })
    }
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.id,
    })

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      })
    }

    // Check if project has files
    const fileCount = await SecretFile.countDocuments({
      user: req.user.id,
      project: project._id,
    })

    if (fileCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete project with ${fileCount} files. Move or delete the files first.`,
      })
    }

    await project.deleteOne()

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