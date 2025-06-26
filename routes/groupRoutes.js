const express = require('express');
const {
  createGroup,
  getMyGroups,
  listAllGroups,
  requestToJoin,
  cancelJoinRequest,
  respondJoinRequest,
  updateMemberRole,
  leaveOrRemove,
  updateGroup,
  deleteGroup,
  getGroupById
} = require('../controllers/groupController');

const { linkMongoUser } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(linkMongoUser);

router.post('/', createGroup);
router.get('/my', getMyGroups);
router.get('/all', listAllGroups);
router.get('/:id', getGroupById);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);

router.post('/:id/join', requestToJoin);
router.delete('/:id/join', cancelJoinRequest);
router.patch('/join/respond', respondJoinRequest);

router.patch('/:groupId/members/:memberId', updateMemberRole);
router.delete('/:groupId/members/:memberId', leaveOrRemove);

module.exports = router;
