# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- `npm start` - Start the production server
- `npm run dev` - Start development server with nodemon auto-reload
- No test scripts are currently configured in package.json
- No lint/type checking scripts are currently configured in package.json

## Architecture Overview

This is a secure storage API for .env files and secret notes built with Node.js, Express, and MongoDB. The application implements client-side encryption using AES-256-GCM with a dual-key security model.

### Security Architecture

The application uses a sophisticated encryption system with two levels of authentication:
1. **JWT Authentication** - Standard password-based login for API access
2. **PIN-based Encryption** - 4-digit PIN protects the master encryption key

**Master Key Flow:**
- Each user has a randomly generated 32-byte master key for encrypting their files
- The master key is encrypted using a key derived from the user's PIN via PBKDF2 (100,000 iterations)
- Files are encrypted with AES-256-GCM using the master key
- PIN changes require re-encrypting the master key without affecting file encryption

### Core Components

**Models:**
- `models/User.js` - User authentication, PIN management, and master key encryption/decryption
- `models/secretFile.js` - Encrypted file storage with metadata and project association
- `models/Project.js` - Project management for organizing files

**Controllers:**
- `controllers/auth.controller.js` - User registration, login, PIN verification, password/PIN changes
- `controllers/file.controller.js` - File upload, note creation, CRUD operations for encrypted content, search functionality
- `controllers/project.controller.js` - Project CRUD operations and file organization

**Security:**
- `utils/encryption.js` - Core AES-256-GCM encryption/decryption utilities
- `middleware/auth.js` - JWT token verification middleware

**API Routes:**
- `/api/auth/*` - Authentication endpoints (register, login, verify-pin, change-password, change-pin)
- `/api/files/*` - File management endpoints (upload, create notes, CRUD operations, search, move files)
- `/api/projects/*` - Project management endpoints (CRUD operations, file organization)

### Key Security Features

- Rate limiting (100 requests per 15 minutes)
- Helmet security headers
- File size limits (5MB max)
- Bcrypt password hashing
- PIN-based master key encryption
- AES-256-GCM file encryption with authentication tags
- Separate IV and auth tags for each encrypted file

### Environment Variables Required

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `ENCRYPTION_ALGORITHM` - Defaults to 'aes-256-gcm'
- `PORT` - Server port (defaults to 3000)

### New Features Added

- **Project Organization**: Files can now be grouped into projects for better organization
- **Search Functionality**: Search across files and projects by name/description
- **File Filtering**: Filter files by project, file type, or search terms
- **Bulk Operations**: Move multiple files between projects
- **Project Management**: Create, update, delete projects with color coding and descriptions

### API Endpoints

**Project Management:**
- `GET /api/projects` - List all projects (supports search query)
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details with files
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project (only if no files)

**Enhanced File Management:**
- `GET /api/files?search=query&project=id&fileType=env` - List files with filtering
- `GET /api/files/search?q=query` - Search files and projects
- `PUT /api/files/move` - Move multiple files to project
- File upload/creation now supports `projectId` parameter

### Development Notes

- The codebase follows a traditional MVC pattern with Express.js
- MongoDB with Mongoose ODM for data persistence
- No test framework currently configured
- Uses commonjs modules (require/module.exports)
- Security-first approach with multiple encryption layers
- Database indexes created for optimal search performance