const firebaseConfig = {
    apiKey: "AIzaSyCgrvfNp7L8d_nyx8ycNb8Lc_UUSllG0Pg",
    authDomain: "photo-story-app.firebaseapp.com",
    projectId: "photo-story-app",
    storageBucket: "photo-story-app.firebasestorage.app",
    messagingSenderId: "571174185577",
    appId: "1:571174185577:web:35e312c16feb1efb6b10f8"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const functions = firebase.functions();

// 全局会话状态
let currentChatTarget = null; // { uid, userName, avatarUrl }
let messagesUnsubscribe = null; // 监听解除

// 简单缓存
const userMetaCache = new Map();

// 辅助函数：消息提示
function showMessage(message, isError = false) {
    const messageDiv = document.getElementById('auth-message');
    if (!messageDiv) {
        console.error('未找到 auth-message 元素');
        return;
    }
    messageDiv.textContent = message;
    messageDiv.className = isError ? 'message error' : 'message success';
    messageDiv.style.display = 'block';
    setTimeout(() => { messageDiv.style.display = 'none'; }, 5000);
}

// 禁用/启用按钮
function setButtonsDisabled(disabled) {
    const r = document.getElementById('register-btn');
    const l = document.getElementById('login-btn');
    if (r) r.disabled = disabled;
    if (l) l.disabled = disabled;
}

// 切换页面
function showSection(sectionId) {
    const sections = ['main-section', 'public-square', 'tag-square', 'archive', 'search-section', 'profile-section', 'messages-section'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === sectionId ? 'block' : 'none';
    });
}

// 监听登录状态
auth.onAuthStateChanged(user => {
    console.log('Auth state changed:', user ? `User logged in: ${user.uid}` : 'User logged out');
    if (user) {
        document.getElementById('auth-section').style.display = 'none';
        showSection('main-section');
        loadPublicSquare();
        loadArchive();
        loadTags();
        loadProfile();
        loadMessagesList({ silent: true });
    } else {
        document.getElementById('auth-section').style.display = 'block';
        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }
});

// 注册
async function register() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    if (!emailInput || !passwordInput) {
        console.error('未找到 email 或 password 输入框');
        showMessage('页面加载错误，请刷新重试', true);
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage('请输入邮箱和密码', true);
        return;
    }
    if (password.length < 6) {
        showMessage('密码至少需要6位字符', true);
        return;
    }

    setButtonsDisabled(true);
    showMessage('正在注册...');

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await db.collection('users').doc(user.uid).set({
            userName: email.split('@')[0],
            avatarUrl: 'https://via.placeholder.com/100x100?text=Avatar',
            followers: [],
            following: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showMessage('注册成功！');
    } catch (error) {
        console.error('注册失败:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        let errorMessage = '注册失败';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = '该邮箱已被注册';
                break;
            case 'auth/invalid-email':
                errorMessage = '邮箱格式不正确';
                break;
            case 'auth/weak-password':
                errorMessage = '密码强度不够';
                break;
            case 'auth/too-many-requests':
                errorMessage = '请求过于频繁，请稍后再试';
                break;
            default:
                errorMessage = `注册失败: ${error.message}`;
        }
        showMessage(errorMessage, true);
    } finally {
        setButtonsDisabled(false);
    }
}

// 登录
async function login() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    if (!emailInput || !passwordInput) {
        console.error('未找到 email 或 password 输入框');
        showMessage('页面加载错误，请刷新重试', true);
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage('请输入邮箱和密码', true);
        return;
    }

    setButtonsDisabled(true);
    showMessage('正在登录...');

    try {
        await auth.signInWithEmailAndPassword(email, password);
        showMessage('登录成功！');
    } catch (error) {
        console.error('登录失败:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        let errorMessage = '登录失败';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = '用户不存在';
                break;
            case 'auth/wrong-password':
                errorMessage = '密码错误';
                break;
            case 'auth/invalid-email':
                errorMessage = '邮箱格式不正确';
                break;
            case 'auth/too-many-requests':
                errorMessage = '尝试次数过多，请稍后再试';
                break;
            default:
                errorMessage = `登录失败: ${error.message}`;
        }
        showMessage(errorMessage, true);
    } finally {
        setButtonsDisabled(false);
    }
}

// 登出
function logout() {
    if (messagesUnsubscribe) {
        messagesUnsubscribe();
        messagesUnsubscribe = null;
    }
    auth.signOut().catch(err => console.error('登出失败:', err));
}

// 重置密码
function resetPassword() {
    const emailInput = document.getElementById('email');
    if (!emailInput) {
        console.error('未找到 email 输入框');
        showMessage('页面加载错误，请刷新重试', true);
        return;
    }

    const email = emailInput.value.trim();
    if (!email) {
        showMessage('请先输入邮箱', true);
        return;
    }

    auth.sendPasswordResetEmail(email)
        .then(() => showMessage('密码重置邮件已发送，请检查邮箱'))
        .catch(error => {
            console.error('重置密码失败:', error);
            showMessage(`发送重置邮件失败: ${error.message}`, true);
        });
}

// 加载用户资料
async function loadProfile() {
    try {
        const user = auth.currentUser;
        if (!user) return;
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            const data = doc.data();
            const usernameDisplay = document.getElementById('username-display');
            const avatarPreview = document.getElementById('avatar-preview');
            const usernameInput = document.getElementById('username-input');
            if (usernameDisplay) usernameDisplay.textContent = `昵称: ${data.userName}`;
            if (avatarPreview) avatarPreview.src = data.avatarUrl;
            if (usernameInput) usernameInput.value = data.userName;
        }
    } catch (error) {
        console.error('加载用户资料失败:', error);
    }
}

// 更新用户资料
async function updateProfile() {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('请先登录');
            return;
        }

        const usernameInput = document.getElementById('username-input');
        const avatarUpload = document.getElementById('avatar-upload');
        if (!usernameInput || !avatarUpload) {
            console.error('未找到 username-input 或 avatar-upload 元素');
            alert('页面加载错误，请刷新重试');
            return;
        }

        const username = usernameInput.value.trim();
        const avatarFile = avatarUpload.files[0];
        let avatarUrl = document.getElementById('avatar-preview')?.src;

        if (avatarFile) {
            const avatarRef = storage.ref(`avatars/${user.uid}/${Date.now()}_${avatarFile.name}`);
            await avatarRef.put(avatarFile);
            avatarUrl = await avatarRef.getDownloadURL();
        }

        await db.collection('users').doc(user.uid).update({
            userName: username || '匿名用户',
            avatarUrl
        });

        loadProfile();
        loadPublicSquare();
        loadArchive();
        alert('资料更新成功');
    } catch (error) {
        console.error('更新用户资料失败:', error);
        alert(`更新失败: ${error.message}`);
    }
}

// 上传照片并生成故事（通过云函数调用 X AI）
async function uploadAndGenerate() {
    const fileInput = document.getElementById('photo-upload');
    if (!fileInput) {
        console.error('未找到 photo-upload 元素');
        alert('页面加载错误，请刷新重试');
        return;
    }

    const file = fileInput.files[0];
    if (!file) {
        alert('请选择一张照片');
        return;
    }

    const storyOutput = document.getElementById('story-output');
    if (storyOutput) {
        storyOutput.innerHTML = '<p>正在通过云函数调用 X AI 生成故事...</p>';
    }

    try {
        const user = auth.currentUser;
        if (!user) {
            alert('请先登录');
            return;
        }

        // 上传图片
        const photoRef = storage.ref(`photos/${user.uid}/${Date.now()}_${file.name}`);
        console.log('开始上传图片...');
        await photoRef.put(file);
        const photoUrl = await photoRef.getDownloadURL();
        console.log('图片上传成功，URL:', photoUrl);

        if (!photoUrl) {
            throw new Error('图片上传失败，未获得有效URL');
        }

        // 调用云函数
        console.log('调用云函数，参数:', { photoUrl });
        const callable = functions.httpsCallable('generateStory');
        const resp = await callable({ photoUrl });
        console.log('云函数返回:', resp);

        const d = resp.data || {};
        let story = d.story || '抱歉，无法生成故事';

        // 提取标签
        const tags = extractTags(story);

        // 用户资料
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        // 保存到数据库
        await db.collection('stories').add({
            userId: user.uid,
            userName: userData.userName,
            userAvatar: userData.avatarUrl,
            photoUrl,
            story,
            tags,
            privacy: document.getElementById('privacy')?.value || 'public',
            likes: 0,
            comments: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        loadPublicSquare();
        loadArchive();
        loadTags();

        if (storyOutput) {
            storyOutput.innerHTML = `
                <div class="story-result">
                    <p>${escapeHtml(story)}</p>
                    <img src="${photoUrl}" alt="Uploaded photo" style="max-width: 100%; margin-top: 10px;">
                </div>
            `;
        }
    } catch (error) {
        console.error('上传或生成故事失败:', {
            message: error.message,
            stack: error.stack
        });
        if (storyOutput) {
            storyOutput.innerHTML = `<p>上传失败: ${error.message}</p>`;
        }
    }
}

// 提取标签
function extractTags(text) {
    const words = text.split(/[\s，。！？、,.!?:;（）()“”"'\-]+/);
    return words.filter(w => w.length > 2 && !['一个','的','了','在','是','有','这','那','我们','你们','他们','因为','所以'].includes(w)).slice(0, 5);
}

// HTML 转义
function escapeHtml(s) {
    return s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

// 获取并缓存用户信息
async function getUserMeta(uid) {
    if (userMetaCache.has(uid)) return userMetaCache.get(uid);
    const snap = await db.collection('users').doc(uid).get();
    const data = { uid, ...(snap.exists ? snap.data() : {}) };
    userMetaCache.set(uid, data);
    return data;
}

// 加载公开广场
async function loadPublicSquare() {
    try {
        const square = document.getElementById('public-square');
        if (!square) return;
        square.innerHTML = '<h2>公开广场</h2>';

        const querySnapshot = await db.collection('stories')
            .where('privacy', '==', 'public')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        const me = auth.currentUser;

        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            const author = await getUserMeta(data.userId);
            const followersCount = (author.followers || []).length;
            const iFollow = me ? (author.followers || []).includes(me.uid) : false;
            const weMutual = await isMutualFollow(me?.uid, author.uid);

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="user-info">
                    <img src="${author.avatarUrl}" alt="User avatar" class="avatar">
                    <span>${escapeHtml(author.userName || '匿名用户')}</span>
                </div>
                <img src="${data.photoUrl}" alt="Story image">
                <p>${escapeHtml(data.story)}</p>
                <p>标签: ${(data.tags || []).map(escapeHtml).join(', ')}</p>
                <p>点赞: ${data.likes || 0}</p>
                <p>粉丝数: ${followersCount}</p>
                <div class="button-group">
                    <button onclick="likeStory('${doc.id}')">点赞</button>
                    ${me && me.uid !== author.uid ? `
                        <button onclick="toggleFollow('${author.uid}')">${iFollow ? '取关' : '关注'}</button>
                        <button ${weMutual ? '' : 'disabled title="互相关注后可私信"'} onclick="openDM('${author.uid}')">私信</button>
                    ` : ''}
                </div>
                <div class="cmt-row">
                    <input id="comment-${doc.id}" placeholder="添加评论...">
                    <button onclick="addComment('${doc.id}')">评论</button>
                </div>
                <div class="comments">
                    ${(data.comments || []).map(c => `<div class="comment">${escapeHtml(c)}</div>`).join('')}
                </div>
            `;
            square.appendChild(card);
        }
    } catch (error) {
        console.error('加载公开广场失败:', error);
    }
}

// 点赞
async function likeStory(id) {
    try {
        const ref = db.collection('stories').doc(id);
        await ref.update({ likes: firebase.firestore.FieldValue.increment(1) });
        loadPublicSquare();
        loadArchive();
    } catch (error) {
        console.error('点赞失败:', error);
    }
}

// 评论
async function addComment(id) {
    try {
        const input = document.getElementById(`comment-${id}`);
        if (!input) return;
        const comment = input.value.trim();
        if (!comment) return;

        const user = auth.currentUser;
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        const ref = db.collection('stories').doc(id);

        await ref.update({
            comments: firebase.firestore.FieldValue.arrayUnion(`${userData.userName}: ${comment}`)
        });

        input.value = '';
        loadPublicSquare();
        loadArchive();
    } catch (error) {
        console.error('添加评论失败:', error);
    }
}

// 加载标签广场
async function loadTags() {
    try {
        const tagSquare = document.getElementById('tag-square');
        if (!tagSquare) return;
        tagSquare.innerHTML = '<h2>标签广场</h2>';

        const tagsMap = {};
        const querySnapshot = await db.collection('stories').where('privacy', '==', 'public').get();

        querySnapshot.forEach(doc => {
            const data = doc.data();
            (data.tags || []).forEach(tag => {
                if (!tagsMap[tag]) tagsMap[tag] = [];
                tagsMap[tag].push({
                    id: doc.id,
                    story: data.story,
                    photoUrl: data.photoUrl,
                    userName: data.userName,
                    userAvatar: data.userAvatar,
                    userId: data.userId
                });
            });
        });

        for (const tag in tagsMap) {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `<h3>标签: ${escapeHtml(tag)}</h3>`;
            tagsMap[tag].forEach(item => {
                card.innerHTML += `
                    <div class="user-info">
                        <img src="${item.userAvatar}" alt="User avatar" class="avatar">
                        <span>${escapeHtml(item.userName)}</span>
                    </div>
                    <p>${escapeHtml(item.story.slice(0, 50))}... <img src="${item.photoUrl}" alt="Story image" style="width: 50px; height: 50px; object-fit: cover;"></p>
                `;
            });
            tagSquare.appendChild(card);
        }
    } catch (error) {
        console.error('加载标签广场失败:', error);
    }
}

// 搜索故事
async function searchStories() {
    try {
        const keywordInput = document.getElementById('search-keyword');
        if (!keywordInput) return;
        const keyword = keywordInput.value.toLowerCase().trim();
        if (!keyword) return;

        const results = document.getElementById('search-results');
        if (!results) return;
        results.innerHTML = '';

        const allStories = [];
        const querySnapshot = await db.collection('stories').where('privacy', '==', 'public').get();

        querySnapshot.forEach(doc => {
            const data = doc.data();
            const matchCount = (data.story.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
            if (matchCount > 0) {
                allStories.push({ ...data, id: doc.id, matchCount });
            }
        });

        allStories.sort((a, b) => b.matchCount - a.matchCount).slice(0, 5).forEach(story => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="user-info">
                    <img src="${story.userAvatar}" alt="User avatar" class="avatar">
                    <span>${escapeHtml(story.userName)}</span>
                </div>
                <img src="${story.photoUrl}" alt="Story image">
                <p>预览: ${escapeHtml(story.story.slice(0, 100))}...</p>
                <p>匹配度: ${story.matchCount}</p>
            `;
            results.appendChild(card);
        });
    } catch (error) {
        console.error('搜索故事失败:', error);
    }
}

// 关注/取关
async function toggleFollow(targetUserId) {
    const me = auth.currentUser;
    if (!me) {
        alert('请先登录');
        return;
    }
    if (me.uid === targetUserId) return;

    const meRef = db.collection("users").doc(me.uid);
    const targetRef = db.collection("users").doc(targetUserId);

    const meDoc = await meRef.get();
    const following = meDoc.data().following || [];
    const isFollowing = following.includes(targetUserId);

    if (isFollowing) {
        await meRef.update({
            following: firebase.firestore.FieldValue.arrayRemove(targetUserId)
        });
        await targetRef.update({
            followers: firebase.firestore.FieldValue.arrayRemove(me.uid)
        });
    } else {
        await meRef.update({
            following: firebase.firestore.FieldValue.arrayUnion(targetUserId)
        });
        await targetRef.update({
            followers: firebase.firestore.FieldValue.arrayUnion(me.uid)
        });
    }

    userMetaCache.delete(targetUserId);
    await loadPublicSquare();
    await loadMessagesList({ silent: true });
}

async function isMutualFollow(uidA, uidB) {
    if (!uidA || !uidB) return false;
    const [a, b] = await Promise.all([
        db.collection('users').doc(uidA).get(),
        db.collection('users').doc(uidB).get()
    ]);
    const aF = (a.data()?.following || []).includes(uidB);
    const bF = (b.data()?.following || []).includes(uidA);
    return aF && bF;
}

// 打开私信
async function openDM(targetUid) {
    const me = auth.currentUser;
    if (!me) {
        alert('请先登录');
        return;
    }

    const mutual = await isMutualFollow(me.uid, targetUid);
    currentChatTarget = await getUserMeta(targetUid);

    const chatTargetName = document.getElementById('chat-target-name');
    const chatTargetAvatar = document.getElementById('chat-target-avatar');
    const dmTip = document.getElementById('dm-tip');
    if (chatTargetName) chatTargetName.textContent = currentChatTarget.userName || '匿名用户';
    if (chatTargetAvatar) chatTargetAvatar.src = currentChatTarget.avatarUrl || 'default-avatar.png';
    if (dmTip) dmTip.style.display = mutual ? 'none' : 'block';

    const historyEl = document.getElementById('chat-history');
    if (historyEl) historyEl.innerHTML = '';

    if (messagesUnsubscribe) {
        messagesUnsubscribe();
        messagesUnsubscribe = null;
    }

    const cid = convoIdOf(me.uid, targetUid);
    messagesUnsubscribe = db.collection('messages')
        .where('convoId', '==', cid)
        .orderBy('createdAt', 'asc')
        .onSnapshot(snap => {
            if (historyEl) {
                historyEl.innerHTML = '';
                snap.forEach(doc => {
                    const m = doc.data();
                    const mine = m.from === me.uid;
                    const bubble = document.createElement('div');
                    bubble.className = `bubble ${mine ? 'mine' : 'theirs'}`;
                    bubble.textContent = m.text;
                    historyEl.appendChild(bubble);
                    historyEl.scrollTop = historyEl.scrollHeight;
                });
            }
        });

    showSection('messages-section');
}

// 发送消息
async function sendMessage() {
    const me = auth.currentUser;
    if (!me) {
        alert('请先登录');
        return;
    }
    if (!currentChatTarget) {
        alert('请选择会话');
        return;
    }

    const textEl = document.getElementById('chat-input-text');
    if (!textEl) return;
    const text = textEl.value.trim();
    if (!text) return;

    const mutual = await isMutualFollow(me.uid, currentChatTarget.uid);
    if (!mutual) {
        alert('只有互相关注后才能私信');
        return;
    }

    const cid = convoIdOf(me.uid, currentChatTarget.uid);
    await db.collection('messages').add({
        convoId: cid,
        from: me.uid,
        to: currentChatTarget.uid,
        text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    textEl.value = '';
}

// 会话ID
function convoIdOf(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
}

// 加载联系人列表
async function loadMessagesList(options = {}) {
    try {
        const listEl = document.getElementById('conversations-list');
        if (!listEl) return;
        const me = auth.currentUser;
        if (!me) return;

        const meDoc = await db.collection('users').doc(me.uid).get();
        const following = meDoc.data().following || [];

        listEl.innerHTML = '<h3>我关注的人</h3>';
        if (following.length === 0) {
            listEl.innerHTML += '<p>你还没有关注任何人。</p>';
            return;
        }

        for (const uid of following) {
            const u = await getUserMeta(uid);
            const mutual = await isMutualFollow(me.uid, uid);
            const row = document.createElement('div');
            row.className = 'conversation-row';
            row.innerHTML = `
                <img class="avatar" src="${u.avatarUrl || 'default-avatar.png'}" alt="">
                <div class="conv-main">
                    <div class="conv-name">${escapeHtml(u.userName || '匿名用户')}</div>
                    <div class="conv-sub">${mutual ? '已互相关注，可私信' : '未互关'}</div>
                </div>
                <div class="conv-actions">
                    <button onclick="toggleFollow('${uid}')">${(u.followers || []).includes(me.uid) ? '取关' : '关注'}</button>
                    <button ${mutual ? '' : 'disabled title="互相关注后可私信"'} onclick="openDM('${uid}')">私信</button>
                </div>
            `;
            listEl.appendChild(row);
        }

        if (!options.silent) showSection('messages-section');
    } catch (e) {
        console.error('加载联系人列表失败:', e);
    }
}

// 导出全局函数
window.showSection = showSection;
window.register = register;
window.login = login;
window.logout = logout;
window.resetPassword = resetPassword;
window.updateProfile = updateProfile;
window.uploadAndGenerate = uploadAndGenerate;
window.searchStories = searchStories;
window.likeStory = likeStory;
window.addComment = addComment;
window.toggleFollow = toggleFollow;
window.openDM = openDM;
window.sendMessage = sendMessage;
