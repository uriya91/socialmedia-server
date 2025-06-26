const User = require('../models/User');

exports.linkMongoUser = async (req, res, next) => {
  try {
    const firebaseUid =
      req.header('x-user-id')   ||
      req.query.uid             ||
      req.body.userId           ||
      null;

    if (!firebaseUid) {
      return res.status(401).json({ message: 'Missing user identifier' });
    }

    const user = await User.findOne({ userId: firebaseUid });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Error linking Mongo user:', err);
    next(err);
  }
};