const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Project = require('../models/Project');
const File = require('../models/File');
const auth = require('../middleware/auth');

// Helper to pre-populate projects with default boilerplates
async function prePopulateProject(projectId, language) {
  const lang = language.toLowerCase();
  
  if (lang === 'python') {
    await File.create({
      projectId,
      name: 'main.py',
      type: 'file',
      parentId: null,
      content: 'print("Hello, World!")\n'
    });
  } else if (lang === 'c') {
    await File.create({
      projectId,
      name: 'main.c',
      type: 'file',
      parentId: null,
      content: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n'
    });
  } else if (lang === 'cpp' || lang === 'c++') {
    await File.create({
      projectId,
      name: 'main.cpp',
      type: 'file',
      parentId: null,
      content: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n'
    });
  } else if (lang === 'java') {
    await File.create({
      projectId,
      name: 'Main.java',
      type: 'file',
      parentId: null,
      content: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n'
    });
  } else if (lang === 'rust') {
    // Rust templates: src folder, src/main.rs, Cargo.toml
    const srcFolder = await File.create({
      projectId,
      name: 'src',
      type: 'folder',
      parentId: null
    });
    await File.create({
      projectId,
      name: 'main.rs',
      type: 'file',
      parentId: srcFolder._id,
      content: 'fn main() {\n    println!("Hello, World!");\n}\n'
    });
    await File.create({
      projectId,
      name: 'Cargo.toml',
      type: 'file',
      parentId: null,
      content: '[package]\nname = "project"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\n'
    });
  } else if (lang === 'go') {
    await File.create({
      projectId,
      name: 'main.go',
      type: 'file',
      parentId: null,
      content: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n'
    });
  } else if (lang === 'r') {
    await File.create({
      projectId,
      name: 'main.r',
      type: 'file',
      parentId: null,
      content: 'cat("Hello, World!\\n")\n'
    });
  } else if (lang === 'ruby') {
    await File.create({
      projectId,
      name: 'main.rb',
      type: 'file',
      parentId: null,
      content: 'puts "Hello, World!"\n'
    });
  } else if (lang === 'php') {
    await File.create({
      projectId,
      name: 'index.php',
      type: 'file',
      parentId: null,
      content: '<?php\necho "Hello, World!\\n";\n'
    });
  } else {
    // JavaScript/TypeScript defaults
    const filename = lang === 'typescript' || lang === 'ts' ? 'index.ts' : 'index.js';
    await File.create({
      projectId,
      name: filename,
      type: 'file',
      parentId: null,
      content: 'console.log("Hello, World!");\n'
    });
  }
}

// Helper to duplicate folder contents recursively
async function duplicateFolderContents(oldParentId, newParentId, oldProjId, newProjId) {
  const items = await File.find({ projectId: oldProjId, parentId: oldParentId });
  for (const item of items) {
    const newItem = await File.create({
      projectId: newProjId,
      name: item.name,
      type: item.type,
      parentId: newParentId,
      content: item.content
    });
    if (item.type === 'folder') {
      await duplicateFolderContents(item._id, newItem._id, oldProjId, newProjId);
    }
  }
}

// GET /api/projects - List user projects
router.get('/', auth, async (req, res) => {
  try {
    const { search, sort } = req.query;
    let query = { createdBy: req.user._id };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    let sortOptions = { lastOpened: -1 };
    if (sort === 'oldest') sortOptions = { createdAt: 1 };
    if (sort === 'newest') sortOptions = { createdAt: -1 };
    if (sort === 'alphabetical') sortOptions = { title: 1 };

    const projects = await Project.find(query).sort(sortOptions);
    return res.json({ success: true, projects });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching projects', error: error.message });
  }
});

// GET /api/projects/:id - Get project details + file tree
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    project.lastOpened = Date.now();
    await project.save();

    const files = await File.find({ projectId: project._id });
    return res.json({ success: true, project, files });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching project details', error: error.message });
  }
});

// POST /api/projects - Create project
router.post('/', auth, async (req, res) => {
  try {
    const { title, language } = req.body;
    if (!title || !language) {
      return res.status(400).json({ success: false, message: 'Title and language are required' });
    }

    const project = await Project.create({
      title,
      createdBy: req.user._id
    });

    await prePopulateProject(project._id, language);

    return res.status(201).json({ success: true, message: 'Project created successfully', project });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error creating project', error: error.message });
  }
});

// PUT /api/projects/:id - Update project settings (title)
router.put('/:id', auth, async (req, res) => {
  try {
    const { title } = req.body;
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { $set: { title } },
      { new: true }
    );
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    return res.json({ success: true, message: 'Project updated successfully', project });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating project', error: error.message });
  }
});

// DELETE /api/projects/:id - Delete project and files
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Delete all files in project
    await File.deleteMany({ projectId: project._id });

    return res.json({ success: true, message: 'Project and all files deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error deleting project', error: error.message });
  }
});

// POST /api/projects/:id/duplicate - Duplicate project
router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await Project.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!original) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const duplicated = await Project.create({
      title: `${original.title} (Copy)`,
      createdBy: req.user._id
    });

    // Recursively duplicate folders/files starting from root (parentId = null)
    await duplicateFolderContents(null, null, original._id, duplicated._id);

    return res.status(201).json({ success: true, message: 'Project duplicated successfully', project: duplicated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error duplicating project', error: error.message });
  }
});

// POST /api/projects/:id/favorite - Toggle favorite
router.post('/:id/favorite', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    project.favorite = !project.favorite;
    await project.save();

    return res.json({ success: true, message: project.favorite ? 'Added to favorites' : 'Removed from favorites', project });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error toggling favorite', error: error.message });
  }
});

// POST /api/projects/:id/share - Toggle/Regenerate share links
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { enable } = req.body;
    const project = await Project.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (enable) {
      project.isShared = true;
      project.shareToken = crypto.randomBytes(24).toString('hex');
    } else {
      project.isShared = false;
      project.shareToken = undefined;
    }
    await project.save();

    return res.json({ success: true, message: project.isShared ? 'Sharing enabled' : 'Sharing disabled', project });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error managing project sharing', error: error.message });
  }
});

// GET /api/projects/shared/:token - Get read-only shared project
router.get('/shared/:token', async (req, res) => {
  try {
    const project = await Project.findOne({ shareToken: req.params.token, isShared: true }).populate('createdBy', 'name userId');
    if (!project) {
      return res.status(404).json({ success: false, message: 'Shared project not found or sharing has been disabled' });
    }

    const files = await File.find({ projectId: project._id });
    return res.json({ success: true, project, files });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching shared project', error: error.message });
  }
});

module.exports = router;
