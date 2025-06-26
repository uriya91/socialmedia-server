const mongoose = require('mongoose');
const Group = require('../models/Group');

exports.createGroup = async (req, res, next) => {
  try {
    const { name, description, image } = req.body;
    const creatorId = req.user._id;

    if (await Group.findOne({ name })) {
      return res.status(409).json({ message: 'Group name already exists' });
    }

    const group = await Group.create({
      name,
      description,
      ...(image?.trim() && { image }),
      creator: creatorId,
      managers: [creatorId],
      members: [creatorId],
    });

    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
};

exports.getMyGroups = async (req, res, next) => {
  try {
    const page  = +req.query.page  || 1;
    const limit = +req.query.limit || 20;
    const skip  = (page - 1) * limit;
    const myId  = req.user._id;

    const [groups, total] = await Promise.all([
      Group.find({ members: myId })
           .sort({ createdAt: -1 })
           .skip(skip).limit(limit)
           .populate('creator', 'username'),
      Group.countDocuments({ members: myId })
    ]);

    res.json({ data: groups, page, limit, hasMore: total > page * limit });
  } catch (err) {
    next(err);
  }
};

exports.listAllGroups = async (req, res, next) => {
  try {
    const page  = +req.query.page  || 1;
    const limit = +req.query.limit || 20;
    const skip  = (page - 1) * limit;
    const myId  = req.user._id;

    const [groups, total] = await Promise.all([
      Group.find()
           .sort({ name: 1 })
           .skip(skip).limit(limit)
           .select('name image members pendingJoinRequests'),
      Group.countDocuments(),
    ]);

    const data = groups.map(g => {
      const o = g.toObject();
      o.isMember  = g.members.some(id => id.equals(myId));
      o.isPending = g.pendingJoinRequests.some(id => id.equals(myId));
      delete o.members;
      delete o.pendingJoinRequests;
      return o;
    });

    res.json({ data, page, limit, hasMore: total > page * limit });
  } catch (err) {
    next(err);
  }
};

exports.requestToJoin = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const group  = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.members.includes(userId))
      return res.status(400).json({ message: 'Already a member' });
    if (group.pendingJoinRequests.includes(userId))
      return res.status(400).json({ message: 'Request already sent' });

    group.pendingJoinRequests.push(userId);
    await group.save();

    res.json(group);
  } catch (err) {
    next(err);
  }
};

exports.cancelJoinRequest = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const group  = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.pendingJoinRequests.includes(userId))
      return res.status(400).json({ message: 'No pending request' });

    group.pendingJoinRequests.pull(userId);
    await group.save();
    res.json(group);
  } catch (err) {
    next(err);
  }
};

exports.respondJoinRequest = async (req, res, next) => {
  try {
    const { groupId, userId, accept } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.managers.includes(req.user._id))
      return res.status(403).json({ message: 'Not a manager' });
    if (!group.pendingJoinRequests.includes(userId))
      return res.status(400).json({ message: 'No such request' });

    group.pendingJoinRequests.pull(userId);
    if (accept) group.members.push(userId);
    await group.save();

    res.json(group);
  } catch (err) {
    next(err);
  }
};

exports.updateMemberRole = async (req, res, next) => {
  try {
    const { groupId, memberId } = req.params;
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const group = await Group.findById(groupId);
    if (!group)  return res.status(404).json({ message: 'Group not found' });
    if (!group.managers.includes(req.user._id))
      return res.status(403).json({ message: 'Not a manager' });

    const update = { $addToSet: { members: memberId } };
    if (role === 'admin') update.$addToSet.managers = memberId;
    else                  update.$pull = { managers: memberId };

    const updated = await Group.findByIdAndUpdate(
      groupId,
      update,
      { new: true }
    )
      .populate('creator', 'username profileImage')
      .populate('managers', 'username profileImage')
      .populate('members', 'username profileImage');

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.leaveOrRemove = async (req, res, next) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isSelf    = userId.equals(memberId);
    const isManager = group.managers.some(m => m.equals(userId));

    if (!isSelf && !isManager)
      return res.status(403).json({ message: 'Forbidden' });

    if (isSelf) {
      if (group.members.length === 1) {
        await group.deleteOne();
        return res.json({ message: 'Group deleted' });
      }
      const isOnlyManager =
        group.managers.length === 1 && group.managers[0].equals(userId);
      if (isOnlyManager) {
        const newManagerId = group.members.find(id => !id.equals(userId));
        group.managers = [new mongoose.Types.ObjectId(newManagerId)];
      }
      group.members.pull(userId);
      group.managers.pull(userId);
      await group.save();
      return res.json(group);
    }

    if (group.managers.some(m => m.equals(memberId)))
      group.managers.pull(memberId);
    group.members.pull(memberId);
    await group.save();

    return res.json(group);
  } catch (err) {
    next(err);
  }
};

exports.updateGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, image } = req.body;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.managers.includes(req.user._id))
      return res.status(403).json({ message: 'Only managers can update group' });

    group.name        = name        || group.name;
    group.description = description || group.description;
    if (image?.trim()) group.image = image;

    await group.save();
    res.json(group);
  } catch (err) {
    next(err);
  }
};

exports.getGroupById = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'username profileImage')
      .populate('managers', 'username')
      .populate('members', 'username profileImage')
      .populate('pendingJoinRequests', 'username profileImage');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (err) {
    next(err);
  }
};

exports.deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.managers.includes(req.user._id))
      return res.status(403).json({ message: 'Only managers can delete' });

    await group.deleteOne();
    res.json({ message: 'Group deleted' });
  } catch (err) {
    next(err);
  }
};
