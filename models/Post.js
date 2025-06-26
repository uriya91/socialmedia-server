const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({

  content: {
    type: String,
    required: true,
  },

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null,
  },

  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
