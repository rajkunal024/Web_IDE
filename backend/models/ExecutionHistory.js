const mongoose = require('mongoose');

const ExecutionHistorySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Null for guest user code runs
  },
  language: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'compile_error', 'runtime_error', 'timeout', 'unknown'],
    default: 'unknown'
  },
  executionTime: {
    type: Number, // in ms
    default: 0
  },
  memoryUsage: {
    type: String, // formatted as string e.g. "12 MB"
    default: "0 KB"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ExecutionHistory', ExecutionHistorySchema);
