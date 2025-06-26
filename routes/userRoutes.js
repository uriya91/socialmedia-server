const express = require('express');
const {
  createUser,
  getUserById,
  searchUsers,
  updateUser,
  sendFriendRequest,
  acceptFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getUserProfileWithPosts,
  getMyFriends,
  getPendingRequests,
} = require('../controllers/userController');

const { linkMongoUser } = require('../middleware/authMiddleware');
const { validateUserCreation } = require('../middleware/validateMiddleware');

const router = express.Router();

router.post('/', validateUserCreation, createUser);

router.get('/', searchUsers);

router.get('/me', linkMongoUser, (req, res) => {
  res.json(req.user);
});

router.get('/:id', getUserById);

router.put('/:id', linkMongoUser, updateUser);

router.post('/:id/friend-request', linkMongoUser, sendFriendRequest);

router.post('/:id/friend-accept', linkMongoUser, acceptFriendRequest);

router.post('/:id/friend-cancel', linkMongoUser, cancelFriendRequest);

router.delete('/:id/friend-remove', linkMongoUser, removeFriend);

router.get('/:id/profile', linkMongoUser, getUserProfileWithPosts);

router.get('/me/friends', linkMongoUser, getMyFriends);

router.get('/me/requests', linkMongoUser, getPendingRequests);

module.exports = router;

