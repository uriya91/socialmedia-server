const express = require('express');
const {
  createPost,
  getFeedPosts,
  updatePost,
  deletePost,
  toggleLikePost,
  getGroupPosts
} = require('../controllers/postController');

const { linkMongoUser } = require('../middleware/authMiddleware');
const { 
  validatePostCreation, 
  validatePostUpdate 
} = require('../middleware/validateMiddleware');

const router = express.Router();

router.post('/', linkMongoUser, validatePostCreation, createPost);

router.get('/feed', linkMongoUser, getFeedPosts);

router.put('/:id', linkMongoUser, validatePostUpdate, updatePost);

router.delete('/:id', linkMongoUser, deletePost);

router.post('/:id/like', linkMongoUser, toggleLikePost);

router.get('/group/:groupId', linkMongoUser, getGroupPosts);

module.exports = router;