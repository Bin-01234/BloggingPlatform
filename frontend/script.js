// script.js
// ─── STATE ────────────────────────────────────────────────
let currentUser = null;
let currentPostId = null;
let editingPostId = null;

// ─── INIT ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('inkwell_session');
    if (session) {
        currentUser = session;
        showApp();
    }
});

// ─── AUTH ──────────────────────────────────────────────────
function switchTab(tab) {
    document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
    document.getElementById('form-register').classList.toggle('hidden', tab !== 'register');
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('login-error').textContent = '';
    document.getElementById('reg-error').textContent = '';
}

function getUsers() {
    return JSON.parse(localStorage.getItem('inkwell_users') || '{}');
}

function register() {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    const errorEl = document.getElementById('reg-error');

    if (!username || !password) return errorEl.textContent = 'All fields are required.';
    if (password !== confirm) return errorEl.textContent = 'Passwords do not match.';
    if (password.length < 4) return errorEl.textContent = 'Password must be at least 4 characters.';

    const users = getUsers();
    if (users[username]) return errorEl.textContent = 'Username already taken.';

    users[username] = password;
    localStorage.setItem('inkwell_users', JSON.stringify(users));
    currentUser = username;
    localStorage.setItem('inkwell_session', username);
    showApp();
}

function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    const users = getUsers();
    if (!users[username] || users[username] !== password) {
        return errorEl.textContent = 'Invalid username or password.';
    }

    currentUser = username;
    localStorage.setItem('inkwell_session', username);
    showApp();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('inkwell_session');
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    switchTab('login');
}

function showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    document.getElementById('nav-username').textContent = `✍️ ${currentUser}`;
    showPage('feed');
}

// ─── NAVIGATION ────────────────────────────────────────────
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${page}`).classList.remove('hidden');

    if (page === 'feed') renderFeed();
    if (page === 'my-posts') renderMyPosts();
    if (page === 'new-post') setupEditor();
    if (page === 'post') renderPostDetail();
}

// ─── STORAGE HELPERS ───────────────────────────────────────
function getPosts() {
    return JSON.parse(localStorage.getItem('inkwell_posts') || '[]');
}

function savePosts(posts) {
    localStorage.setItem('inkwell_posts', JSON.stringify(posts));
}

function getComments(postId) {
    return JSON.parse(localStorage.getItem(`inkwell_comments_${postId}`) || '[]');
}

function saveComments(postId, comments) {
    localStorage.setItem(`inkwell_comments_${postId}`, JSON.stringify(comments));
}

// ─── FEED ──────────────────────────────────────────────────
function renderFeed() {
    const query = (document.getElementById('search-input')?.value || '').toLowerCase();
    const posts = getPosts();
    const list = document.getElementById('feed-list');
    const empty = document.getElementById('feed-empty');

    const filtered = posts.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.body.toLowerCase().includes(query) ||
        (p.tags || []).some(t => t.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    list.innerHTML = filtered.map((post, i) => {
        const commentCount = getComments(post.id).length;
        const tags = (post.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('');
        return `
      <div class="post-card" style="animation-delay:${i * 60}ms" onclick="openPost('${post.id}')">
        <div class="post-card-meta">
          <span class="post-author">@${escHtml(post.author)}</span>
          <span class="post-date">${post.date}</span>
        </div>
        <div class="post-card-title">${escHtml(post.title)}</div>
        <div class="post-card-excerpt">${escHtml(post.body)}</div>
        <div class="post-card-footer">
          <div class="post-tags">${tags}</div>
          <span class="post-comments-count">💬 ${commentCount} comment${commentCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    `;
    }).join('');
}

// ─── MY POSTS ──────────────────────────────────────────────
function renderMyPosts() {
    const posts = getPosts().filter(p => p.author === currentUser);
    const list = document.getElementById('my-posts-list');
    const empty = document.getElementById('my-posts-empty');

    if (posts.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    list.innerHTML = posts.map((post, i) => {
        const commentCount = getComments(post.id).length;
        const tags = (post.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('');
        return `
      <div class="post-card my-post-card" style="animation-delay:${i * 60}ms">
        <div class="post-card-meta">
          <span class="post-date">${post.date}</span>
          <span class="post-comments-count">💬 ${commentCount}</span>
        </div>
        <div class="post-card-title" onclick="openPost('${post.id}')" style="cursor:pointer">${escHtml(post.title)}</div>
        <div class="post-card-excerpt">${escHtml(post.body)}</div>
        <div class="post-tags" style="margin-bottom:0">${tags}</div>
        <div class="my-post-actions">
          <button class="btn-ghost small" onclick="editPost('${post.id}')">✏️ Edit</button>
          <button class="btn-danger" onclick="deletePost('${post.id}')">Delete</button>
        </div>
      </div>
    `;
    }).join('');
}

// ─── EDITOR ────────────────────────────────────────────────
function setupEditor(postId = null) {
    editingPostId = postId;
    const isEdit = !!postId;

    document.getElementById('editor-eyebrow').textContent = isEdit ? 'Edit Post' : 'New Post';
    document.getElementById('editor-title').textContent = isEdit ? 'Edit Your Post' : 'Write Something';
    document.getElementById('publish-btn').textContent = isEdit ? 'Save Changes' : 'Publish';

    if (isEdit) {
        const post = getPosts().find(p => p.id === postId);
        if (post) {
            document.getElementById('post-title').value = post.title;
            document.getElementById('post-tags').value = (post.tags || []).join(', ');
            document.getElementById('post-body').value = post.body;
        }
    } else {
        document.getElementById('post-title').value = '';
        document.getElementById('post-tags').value = '';
        document.getElementById('post-body').value = '';
    }
}

function editPost(id) {
    showPage('new-post');
    setupEditor(id);
}

function publishPost() {
    const title = document.getElementById('post-title').value.trim();
    const body = document.getElementById('post-body').value.trim();
    const tags = document.getElementById('post-tags').value
        .split(',').map(t => t.trim()).filter(Boolean);

    if (!title || !body) return showToast('Please add a title and content.');

    const posts = getPosts();

    if (editingPostId) {
        const idx = posts.findIndex(p => p.id === editingPostId);
        if (idx !== -1) {
            posts[idx] = { ...posts[idx], title, body, tags, edited: true };
            savePosts(posts);
            editingPostId = null;
            showToast('✅ Post updated!');
            showPage('my-posts');
        }
    } else {
        const post = {
            id: Date.now().toString(),
            title,
            body,
            tags,
            author: currentUser,
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        };
        posts.unshift(post);
        savePosts(posts);
        showToast('🎉 Post published!');
        showPage('feed');
    }
}

function deletePost(id) {
    const posts = getPosts().filter(p => p.id !== id);
    savePosts(posts);
    localStorage.removeItem(`inkwell_comments_${id}`);
    showToast('Post deleted.');
    renderMyPosts();
}

// ─── POST DETAIL ───────────────────────────────────────────
function openPost(id) {
    currentPostId = id;
    showPage('post');
}

function renderPostDetail() {
    const post = getPosts().find(p => p.id === currentPostId);
    if (!post) return showPage('feed');

    const tags = (post.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('');

    document.getElementById('post-detail').innerHTML = `
    <div class="post-detail-title">${escHtml(post.title)}</div>
    <div class="post-detail-meta">
      <span class="post-author">@${escHtml(post.author)}</span>
      <span class="post-date">${post.date}</span>
      ${post.edited ? '<span style="font-size:0.75rem;color:var(--muted)">(edited)</span>' : ''}
      <div class="post-tags">${tags}</div>
    </div>
    <div class="post-detail-body">${escHtml(post.body)}</div>
  `;

    renderComments();
}

// ─── COMMENTS ──────────────────────────────────────────────
function renderComments() {
    const comments = getComments(currentPostId);
    const list = document.getElementById('comments-list');
    document.getElementById('comment-count').textContent = `(${comments.length})`;

    if (comments.length === 0) {
        list.innerHTML = `<p style="color:var(--muted);font-size:0.875rem">No comments yet. Be the first!</p>`;
        return;
    }

    list.innerHTML = comments.map(c => `
    <div class="comment-card">
      <div class="comment-meta">
        <span class="comment-author">@${escHtml(c.author)}</span>
        <span class="comment-date">${c.date}</span>
        ${c.author === currentUser ? `<button class="comment-delete" onclick="deleteComment('${c.id}')">✕ delete</button>` : ''}
      </div>
      <div class="comment-body">${escHtml(c.body)}</div>
    </div>
  `).join('');
}

function addComment() {
    const input = document.getElementById('comment-input');
    const body = input.value.trim();
    if (!body) return;

    const comments = getComments(currentPostId);
    comments.push({
        id: Date.now().toString(),
        postId: currentPostId,
        author: currentUser,
        body,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    });

    saveComments(currentPostId, comments);
    input.value = '';
    renderComments();
    showToast('💬 Comment posted!');
}

function deleteComment(id) {
    const comments = getComments(currentPostId).filter(c => c.id !== id);
    saveComments(currentPostId, comments);
    renderComments();
}

// ─── UTILS ─────────────────────────────────────────────────
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let toastTimer;
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
}