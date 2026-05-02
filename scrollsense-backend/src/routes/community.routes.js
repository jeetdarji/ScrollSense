const express = require('express');
const router = express.Router();
const community = require('../controllers/community.controller');

// ── Group membership & performance ──────────────────────────────────────
router.get('/my-group',          community.getMyGroup);
router.get('/groups',            community.getAllGroups);
router.get('/recommendations',   community.getRecommendations);
router.post('/join/:groupId',    community.joinGroup);
router.post('/submit-week',      community.submitWeek);
router.post('/leave',            community.leaveGroup);
router.post('/request-new-group', community.requestNewGroup);

// ── Group chat ──────────────────────────────────────────────────────────
router.get('/messages/:groupId',    community.getMessages);
router.post('/messages/:groupId',   community.sendMessage);
router.delete('/messages/:messageId', community.deleteMessage);

// ── Reactions ───────────────────────────────────────────────────────────
router.post('/react/:messageId',    community.addReaction);

module.exports = router;
