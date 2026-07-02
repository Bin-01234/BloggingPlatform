// routes/comments.js
const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');

// GET comments for a post
router.get('/:postId', async (req, res) => {
    const comments = await Comment.find({ postId: req.params.postId }).sort({ createdAt: 1 });
    res.json(comments);
});

// POST add comment
router.post('/', auth, async (req, res) => {
    const comment = await Comment.create({ ...req.body, author: req.user.username });
    res.status(201).json(comment);
});

// DELETE comment (author only)
router.delete('/:id', auth, async (req, res) => {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Not found' });
    if (comment.author !== req.user.username) return res.status(403).json({ error: 'Forbidden' });
    await Comment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

module.exports = router;