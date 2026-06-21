const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['file', 'folder'],
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    default: null // Null if folder/file sits at the project root
  },
  content: {
    type: String,
    default: "" // Code/text content for file type; ignored or blank for folder type
  }
}, {
  timestamps: true
});

// Compound index to ensure unique file/folder name inside the same folder under the same project
FileSchema.index({ projectId: 1, parentId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('File', FileSchema);
