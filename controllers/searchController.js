const User  = require('../models/User');
const Group = require('../models/Group');

exports.globalSearch = async (req, res, next) => {
  try {
    const term   = req.query.term?.trim() || '';
    const regex  = new RegExp(term, 'i');
    const page   = Number(req.query.page)   || 1;
    const limit  = Number(req.query.limit)  || 10;
    const skip   = (page - 1) * limit;
    const fbUid  = req.header('x-user-id');

    const currentUser = await User.findOne({ userId: fbUid });
    if (!currentUser) {
      return res.status(401).json({ message: 'User not found' });
    }

    const [users, usersCount] = await Promise.all([
      User.find({ 
        username: regex, 
        _id: { $ne: currentUser._id } 
      })
          .select('username profileImage')
          .skip(skip).limit(limit),
      User.countDocuments({ 
        username: regex, 
        _id: { $ne: currentUser._id } 
      })
    ]);

    const [groups, groupsCount] = await Promise.all([
      Group.find({ name: regex })
           .select('name image members pendingJoinRequests')
           .skip(skip).limit(limit),
      Group.countDocuments({ name: regex })
    ]);

    const enrichedUsers = users.map(u => {
      const userId = u._id.toString();
      const currentUserId = currentUser._id.toString();
      
      return {
        ...u.toObject(),
        isFriend: currentUser.friends.some(fId => fId.toString() === userId),
        isPendingSent: currentUser.pendingSentRequests.some(fId => fId.toString() === userId),
        isPendingReceived: currentUser.pendingReceivedRequests.some(fId => fId.toString() === userId),
      };
    });

    const enrichedGroups = groups.map(g => {
      const currentUserId = currentUser._id;
      
      return {
        ...g.toObject(),
        isMember: g.members.some(mId => mId.toString() === currentUserId.toString()),
        isPending: g.pendingJoinRequests.some(pId => pId.toString() === currentUserId.toString()),
        members: undefined,
        pendingJoinRequests: undefined
      };
    });

    res.json({
      users: enrichedUsers,
      groups: enrichedGroups,
      page,
      limit,
      hasMoreUsers:  usersCount  > page * limit,
      hasMoreGroups: groupsCount > page * limit,
    });
  } catch (err) {
    console.error('Error in globalSearch:', err);
    next(err);
  }
};