// routes/posts.js
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');

// GET all posts
router.get('/', async (req, res) => {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
});

// GET single post
router.get('/:id', async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
});

// POST create
router.post('/', auth, async (req, res) => {
    const post = await Post.create({ ...req.body, author: req.user.username });
    res.status(201).json(post);
});

// PUT update (author only)
router.put('/:id', auth, async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    if (post.author !== req.user.username) return res.status(403).json({ error: 'Forbidden' });
    const updated = await Post.findByIdAndUpdate(req.params.id, { ...req.body, edited: true }, { new: true });
    res.json(updated);
});

// DELETE (author only)
router.delete('/:id', auth, async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    if (post.author !== req.user.username) return res.status(403).json({ error: 'Forbidden' });
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

module.exports = router;