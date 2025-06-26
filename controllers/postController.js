const Post    = require('../models/Post');
const User    = require('../models/User');
const Group   = require('../models/Group');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');

exports.createPost = async (req, res, next) => {
  try {
    const { content, groupId } = req.body;
    const author = req.user;

    if (!content?.trim())
      return res.status(400).json({ message: 'Content is required' });

    if (groupId && !mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: 'Invalid groupId format' });
    }

    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      if (!group.members.includes(author._id)) {
        return res.status(403).json({ message: 'You must be a member to post in this group' });
      }
    }

    const newPost = await Post.create({
      content: content.trim(),
      author: author._id,
      groupId: groupId || null
    });

    const populatedPost = await Post.findById(newPost._id)
      .populate('author', 'username profileImage')
      .populate('groupId', 'name image');

    res.status(201).json(populatedPost);
  } catch (err) {
    console.error('Error creating post:', err);
    next(err);
  }
};

exports.getFeedPosts = async (req, res, next) => {
  try {
    const page  = Math.max(1, +req.query.page  || 1);
    const limit = Math.min(50, +req.query.limit || 20);
    const skip  = (page - 1) * limit;

    const user = req.user;
    
    const friendIds = user.friends || [];
    
    const groupIds = await Group.find({ members: user._id }).distinct('_id');

    const filter = {
      $or: [
        { author: user._id },
        { author: { $in: friendIds } },
        { groupId: { $in: groupIds } }
      ]
    };

    const [posts, total] = await Promise.all([
      Post.find(filter)
          .populate('author',  'username profileImage')
          .populate('groupId', 'name image')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
      Post.countDocuments(filter)
    ]);

    res.json({ 
      data: posts, 
      page, 
      limit, 
      hasMore: total > page * limit,
      total 
    });
  } catch (err) {
    console.error('Error in getFeedPosts:', err);
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  try {
    const { content } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID format' });
    }
    
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (!post.author.equals(req.user._id))
      return res.status(403).json({ message: 'Not your post' });

    if (content?.trim()) post.content = content.trim();
    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'username profileImage')
      .populate('groupId', 'name image');

    res.json(updatedPost);
  } catch (err) {
    console.error('Error updating post:', err);
    next(err);
  }
};


exports.deletePost = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID format' });
    }
    
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (!post.author.equals(req.user._id))
      return res.status(403).json({ message: 'Not your post' });

    await Comment.deleteMany({ postId: post._id });
    await post.deleteOne();

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting post:', err);
    next(err);
  }
};

exports.toggleLikePost = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID format' });
    }
    
    const user = req.user;
    const post = await Post.findById(req.params.id).populate('author', 'username');
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const hasLiked = post.likes.includes(user._id);
    if (hasLiked) post.likes.pull(user._id);
    else          post.likes.push(user._id);

    await post.save();
    res.json({ 
      likes: post.likes.length, 
      hasLiked: !hasLiked,
      postId: post._id 
    });
  } catch (err) {
    console.error('Error toggling like:', err);
    next(err);
  }
};

exports.getGroupPosts = async (req, res, next) => {
  try {
    const groupId = req.params.groupId;
    
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: 'Invalid group ID format' });
    }
    
    const page = Math.max(1, +req.query.page || 1);
    const limit = Math.min(50, +req.query.limit || 20);
    const skip = (page - 1) * limit;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const user = req.user;
    if (!group.members.includes(user._id)) {
      return res.status(403).json({ message: 'You must be a member to view group posts' });
    }

    const [posts, total] = await Promise.all([
      Post.find({ groupId: groupId })
          .populate('author', 'username profileImage')
          .populate('groupId', 'name image')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
      Post.countDocuments({ groupId: groupId })
    ]);

    res.json({ 
      data: posts, 
      page, 
      limit, 
      hasMore: total > page * limit,
      total,
      groupName: group.name
    });
  } catch (err) {
    console.error('Error in getGroupPosts:', err);
    next(err);
  }
};