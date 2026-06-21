const mongoose = require('mongoose');

const UserPreferencesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  theme: {
    type: String,
    enum: ['dark', 'light', 'midnight', 'ocean', 'forest'],
    default: 'dark'
  },
  fontSize: {
    type: Number,
    default: 14
  },
  fontFamily: {
    type: String,
    default: 'Fira Code, Courier New, monospace'
  },
  tabSize: {
    type: Number,
    default: 4
  },
  lineNumbers: {
    type: String,
    enum: ['on', 'off'],
    default: 'on'
  },
  minimap: {
    type: Boolean,
    default: true
  },
  cursorStyle: {
    type: String,
    enum: ['line', 'block', 'underline'],
    default: 'line'
  },
  wordWrap: {
    type: String,
    enum: ['on', 'off'],
    default: 'off'
  },
  autoSave: {
    type: Boolean,
    default: true
  },
  terminalFontSize: {
    type: Number,
    default: 12
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('UserPreferences', UserPreferencesSchema);
