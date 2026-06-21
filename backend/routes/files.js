const express = require('express');
const router = express.Router();
const File = require('../models/File');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

// Recursive helper to delete folder contents
async function recursivelyDelete(parentId, projectId) {
  const children = await File.find({ projectId, parentId });
  for (const child of children) {
    if (child.type === 'folder') {
      await recursivelyDelete(child._id, projectId);
    }
    await File.findByIdAndDelete(child._id);
  }
}

// Recursive helper to duplicate file system node
async function duplicateNode(oldNode, newParentId, projectId) {
  const newNode = await File.create({
    projectId,
    name: oldNode.type === 'folder' ? oldNode.name : `${oldNode.name.split('.')[0]}_copy.${oldNode.name.split('.').slice(1).join('.') || 'txt'}`,
    type: oldNode.type,
    parentId: newParentId,
    content: oldNode.content
  });

  if (oldNode.type === 'folder') {
    const children = await File.find({ projectId, parentId: oldNode._id });
    for (const child of children) {
      await duplicateNode(child, newNode._id, projectId);
    }
  }
  return newNode;
}

// Helper middleware to check project owner or shared state
async function checkProjectAccess(req, res, next) {
  try {
    const { projectId } = req.body;
    const projId = projectId || req.query.projectId;

    if (!projId) {
      return res.status(400).json({ success: false, message: 'projectId is required' });
    }

    const project = await Project.findById(projId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Allow owner or check read-only access (for GET/view queries)
    const isOwner = project.createdBy && project.createdBy.toString() === req.user._id.toString();
    const isReadOnly = req.method === 'GET' && project.isShared;

    if (!isOwner && !isReadOnly) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    req.project = project;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Auth check error', error: error.message });
  }
}

// POST /api/files - Create file/folder
router.post('/', auth, checkProjectAccess, async (req, res) => {
  try {
    const { projectId, name, type, parentId } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'Name and type are required' });
    }

    // Verify if name already exists in target parent folder
    const exists = await File.findOne({ projectId, parentId: parentId || null, name });
    if (exists) {
      return res.status(400).json({ success: false, message: `A file or folder named "${name}" already exists here` });
    }

    const file = await File.create({
      projectId,
      name,
      type,
      parentId: parentId || null,
      content: ''
    });

    return res.status(201).json({ success: true, message: `${type === 'folder' ? 'Folder' : 'File'} created successfully`, file });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error creating file', error: error.message });
  }
});

// PUT /api/files/:id - Update content or rename
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, content } = req.body;
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File or folder not found' });
    }

    // Verify ownership of parent project
    const project = await Project.findOne({ _id: file.projectId, createdBy: req.user._id });
    if (!project) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (name !== undefined) {
      // Check if another sibling shares the new name
      const exists = await File.findOne({
        projectId: file.projectId,
        parentId: file.parentId,
        name: name,
        _id: { $ne: file._id }
      });
      if (exists) {
        return res.status(400).json({ success: false, message: `A file or folder named "${name}" already exists here` });
      }
      file.name = name;
    }

    if (content !== undefined) {
      file.content = content;
    }

    await file.save();
    return res.json({ success: true, message: 'Updated successfully', file });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating file', error: error.message });
  }
});

// DELETE /api/files/:id - Delete file/folder recursively
router.delete('/:id', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Check project ownership
    const project = await Project.findOne({ _id: file.projectId, createdBy: req.user._id });
    if (!project) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (file.type === 'folder') {
      await recursivelyDelete(file._id, file.projectId);
    }

    await File.findByIdAndDelete(file._id);
    return res.json({ success: true, message: `${file.type === 'folder' ? 'Folder' : 'File'} deleted successfully` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error deleting item', error: error.message });
  }
});

// POST /api/files/:id/duplicate - Duplicate single node
router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const project = await Project.findOne({ _id: file.projectId, createdBy: req.user._id });
    if (!project) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const duplicatedNode = await duplicateNode(file, file.parentId, file.projectId);

    return res.status(201).json({ success: true, message: 'Item duplicated successfully', file: duplicatedNode });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error duplicating item', error: error.message });
  }
});

// POST /api/files/move - Move file/folder to new parent folder (drag & drop support)
router.post('/move', auth, async (req, res) => {
  try {
    const { fileId, newParentId } = req.body;
    if (!fileId) {
      return res.status(400).json({ success: false, message: 'fileId is required' });
    }

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File/folder not found' });
    }

    // Verify project ownership
    const project = await Project.findOne({ _id: file.projectId, createdBy: req.user._id });
    if (!project) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Make sure we are not moving a folder inside itself
    if (newParentId) {
      if (newParentId.toString() === fileId.toString()) {
        return res.status(400).json({ success: false, message: 'Cannot move an item inside itself' });
      }
      // Check if newParentId is indeed a descendant of fileId (if file is a folder)
      if (file.type === 'folder') {
        let parent = await File.findById(newParentId);
        while (parent && parent.parentId) {
          if (parent.parentId.toString() === fileId.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot move a folder inside one of its subfolders' });
          }
          parent = await File.findById(parent.parentId);
        }
      }
    }

    // Check duplicate name in new folder
    const targetParent = newParentId || null;
    const exists = await File.findOne({
      projectId: file.projectId,
      parentId: targetParent,
      name: file.name,
      _id: { $ne: file._id }
    });
    if (exists) {
      return res.status(400).json({ success: false, message: `A file or folder named "${file.name}" already exists in the target destination` });
    }

    file.parentId = targetParent;
    await file.save();

    return res.json({ success: true, message: 'Item moved successfully', file });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error moving item', error: error.message });
  }
});

module.exports = router;
