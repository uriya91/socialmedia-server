const User  = require('../models/User');
const Post  = require('../models/Post');

exports.createUser = async (req, res, next) => {
  try {
    const { userId, username, email, phone, birthDate, profileImage } = req.body;

    const user = new User({
      userId,
      username,
      email,
      phone,
      birthDate,
      profileImage,
    });

    await user.save();
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};


exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    next(error);
  }
};


exports.searchUsers = async (req, res, next) => {
  try {
    let { search } = req.query;
    if (!search) return res.status(400).json({ message: 'Missing search parameter' });

    const regex  = new RegExp(search.trim(), 'i');
    const users  = await User.find({
      $or: [{ username: regex }, { email: regex }],
    }).select('-__v');

    res.json(users);
  } catch (error) {
    next(error);
  }
};


exports.updateUser = async (req, res, next) => {
  try {
    const { username, phone, profileImage } = req.body;
    const userId = req.params.id;

    if (username && username.trim() === '') {
      return res.status(400).json({ message: 'Username cannot be empty' });
    }

    if (phone && phone.trim()) {
      if (!/^\d{10}$/.test(phone.trim())) {
        return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
      }

      const existingUser = await User.findOne({ 
        phone: phone.trim(),
        _id: { $ne: userId }
      });

      if (existingUser) {
        return res.status(400).json({ message: 'This phone number is already in use by another user' });
      }
    }

    const updateData = {};
    if (username && username.trim()) updateData.username = username.trim();
    if (phone !== undefined) updateData.phone = phone.trim() || null;
    if (profileImage !== undefined) updateData.profileImage = profileImage;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `This ${field} is already in use by another user` 
      });
    }
    
    next(error);
  }
};

exports.sendFriendRequest = async (req, res, next) => {
  try {
    const senderId    = req.user._id;
    const recipientId = req.params.id;

    const [sender, recipient] = await Promise.all([
      User.findById(senderId),
      User.findById(recipientId),
    ]);
    if (!sender || !recipient)
      return res.status(404).json({ message: 'User not found' });

    const cross = recipient.pendingSentRequests.includes(senderId);
    if (cross) {
      sender.friends.push(recipientId);
      recipient.friends.push(senderId);
      recipient.pendingSentRequests.pull(senderId);
      sender.pendingReceivedRequests.pull(recipientId);
      await Promise.all([sender.save(), recipient.save()]);
      return res.json({ message: 'Friend request auto-accepted' });
    }

    if (sender.pendingSentRequests.includes(recipientId))
      return res.status(400).json({ message: 'Friend request already sent' });

    sender.pendingSentRequests.push(recipientId);
    recipient.pendingReceivedRequests.push(senderId);
    await Promise.all([sender.save(), recipient.save()]);

    res.json({ message: 'Friend request sent' });
  } catch (err) {
    console.error('Error sending friend request:', err);
    next(err);
  }
};


exports.acceptFriendRequest = async (req, res, next) => {
  try {
    const receiverId = req.user._id;
    const senderId   = req.params.id;

    const [receiver, sender] = await Promise.all([
      User.findById(receiverId),
      User.findById(senderId),
    ]);
    if (!receiver || !sender)
      return res.status(404).json({ message: 'User not found' });

    if (!receiver.pendingReceivedRequests.includes(sender._id))
      return res.status(400).json({ message: 'No pending friend request from this user' });

    receiver.friends.push(sender._id);
    sender.friends.push(receiver._id);
    receiver.pendingReceivedRequests.pull(sender._id);
    sender.pendingSentRequests.pull(receiver._id);
    await Promise.all([receiver.save(), sender.save()]);

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    next(error);
  }
};


exports.cancelFriendRequest = async (req, res, next) => {
  try {
    const senderId   = req.user._id;
    const receiverId = req.params.id;

    const [sender, receiver] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId),
    ]);
    if (!receiver) return res.status(404).json({ message: 'Receiver not found' });

    sender.pendingSentRequests.pull(receiverId);
    receiver.pendingReceivedRequests.pull(senderId);
    await Promise.all([sender.save(), receiver.save()]);

    res.json({ message: 'Friend request canceled' });
  } catch (error) {
    next(error);
  }
};


exports.removeFriend = async (req, res, next) => {
  try {
    const userId   = req.user._id;
    const friendId = req.params.id;

    const [user, friend] = await Promise.all([
      User.findById(userId),
      User.findById(friendId),
    ]);
    if (!friend) return res.status(404).json({ message: 'Friend not found' });

    user.friends.pull(friendId);
    friend.friends.pull(userId);
    await Promise.all([user.save(), friend.save()]);

    res.json({ message: 'Friend removed' });
  } catch (error) {
    next(error);
  }
};

exports.getUserProfileWithPosts = async (req, res, next) => {
  try {
    const viewerId      = req.user._id;
    const profileUserId = req.params.id;

    const profileUser = await User.findById(profileUserId)
      .select('-__v -pendingSentRequests -pendingReceivedRequests');
    if (!profileUser) return res.status(404).json({ message: 'User not found' });

    const isFriend = profileUser.friends.includes(viewerId);
    const isSelf   = profileUser._id.equals(viewerId);
    if (!isFriend && !isSelf)
      return res.status(403).json({ message: 'Access denied: Not a friend' });

    const posts = await Post.find({ author: profileUser._id })
      .populate('groupId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ user: profileUser, posts });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    next(error);
  }
};


exports.getMyFriends = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', '_id username profileImage');
    res.status(200).json(user.friends);
  } catch (err) {
    next(err);
  }
};

exports.getPendingRequests = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('pendingReceivedRequests', '_id username profileImage');
    res.status(200).json(user.pendingReceivedRequests);
  } catch (err) {
    next(err);
  }
};
