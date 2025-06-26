const User = require('../models/User');
const Group = require('../models/Group');
const mongoose = require('mongoose');

exports.validateUserCreation = async (req, res, next) => {
  try {
    const { username, email, phone } = req.body;
    const errors = [];

    if (!username?.trim()) errors.push({ field: 'username', msg: 'Username is required' });

    const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/;
    if (!emailRegex.test(email)) errors.push({ field: 'email', msg: 'Invalid email' });
    if (await User.findOne({ email })) errors.push({ field: 'email', msg: 'Email already exists' });

    if (!/^\d{10}$/.test(phone)) errors.push({ field: 'phone', msg: 'Phone must be 10 digits' });

    if (errors.length) return res.status(400).json({ errors });

    next();
  } catch (err) {
    next(err);
  }
};

exports.validateGroupCreation = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Group name is required' });
    }

    if (name.length > 100) {
      return res.status(400).json({ message: 'Group name must be less than 100 characters' });
    }

    const existingGroup = await Group.findOne({ name: name.trim() });
    if (existingGroup) {
      return res.status(400).json({ message: 'Group name already exists' });
    }

    if (description && description.length > 500) {
      return res.status(400).json({ message: 'Group description must be less than 500 characters' });
    }

    next();
  } catch (err) {
    next(err);
  }
};

exports.validatePostCreation = (req, res, next) => {
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ message: 'Content is required' });
  }

  if (content.length > 300) {
    return res.status(400).json({ message: 'Post content must be less than 300 characters' });
  }

  next();
};

exports.validateCommentCreation = (req, res, next) => {
  const { content, postId } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ message: 'Content is required' });
  }

  if (content.length > 300) {
    return res.status(400).json({ message: 'Comment must be less than 300 characters' });
  }

  if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ message: 'Valid postId is required' });
  }

  next();
};

exports.validateUserUpdate = (req, res, next) => {
  const { username, phone } = req.body;

  if (username && username.trim() === '') {
    return res.status(400).json({ message: 'Username cannot be empty' });
  }

  if (phone && !/^\d{10}$/.test(phone)) {
    return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
  }

  next();
};

exports.validatePostUpdate = (req, res, next) => {
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ message: 'Content is required' });
  }

  if (content.length > 300) {
    return res.status(400).json({ message: 'Post content must be less than 300 characters' });
  }

  next();
};

exports.validateCommentUpdate = (req, res, next) => {
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ message: 'Content is required' });
  }

  if (content.length > 300) {
    return res.status(400).json({ message: 'Comment must be less than 300 characters' });
  }

  next();
};