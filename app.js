const firebaseConfig = {
    apiKey: "AIzaSyCgrvfNp7L8d_nyx8ycNb8Lc_UUSllG0Pg",
    authDomain: "photo-story-app.firebaseapp.com",
    projectId: "photo-story-app",
    storageBucket: "photo-story-app.firebasestorage.app",
    messagingSenderId: "571174185577",
    appId: "1:571174185577:web:35e312c16feb1efb6b10f8"
};
const XAI_API_KEY = "xai-484OiCTv2ttWcYIG1qQ1aMnDoJ6pofHeZufQItCnXlvjcSVVfNJOdK47nNGal6V6apuOoFzJPEEjaVTc";

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// 用户状态监听
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('main-section').style.display = 'block';
        loadPublicSquare();
        loadArchive();
        loadTags();
        loadProfile();
    } else {
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('main-section').style.display = 'none';
        document.getElementById('public-square').style.display = 'none';
        document.getElementById('tag-square').style.display = 'none';
        document.getElementById('archive').style.display = 'none';
        document.getElementById('search-section').style.display = 'none';
        document.getElementById('profile-section').style.display = 'none';
    }
});

// 切换页面
function showSection(sectionId) {
    const sections = ['main-section', 'public-square', 'tag-square', 'archive', 'search-section', 'profile-section'];
    sections.forEach(id => {
        document.getElementById(id).style.display = id === sectionId ? 'block' : 'none';
    });
}

// 注册
function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) {
        alert('请输入邮箱和密码');
        return;
    }
    auth.createUserWithEmailAndPassword(email, password)
        .then(async userCredential => {
            const user = userCredential.user;
            await db.collection('users').doc(user.uid).set({
                userName: email.split('@')[0],
                avatarUrl: 'default-avatar.png',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('注册成功！已自动登录');
        })
        .catch(error => {
            console.error('注册失败:', error);
            alert(`注册失败: ${error.message}`);
        });
}

// 登录
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) {
        alert('请输入邮箱和密码');
        return;
    }
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            alert('登录成功！');
        })
        .catch(error => {
            console.error('登录失败:', error);
            alert(`登录失败: ${error.message}`);
        });
}

// 登出
function logout() {
    auth.signOut()
        .then(() => {
            alert('已登出');
        })
        .catch(error => {
            console.error('登出失败:', error);
            alert(`登出失败: ${error.message}`);
        });
}

// 重置密码
function resetPassword() {
    const email = document.getElementById('email').value;
    if (!email) {
        alert('请先输入邮箱');
        return;
    }
    auth.sendPasswordResetEmail(email)
        .then(() => alert('密码重置邮件已发送，请检查邮箱'))
        .catch(error => {
            console.error('密码重置失败:', error);
            alert(`密码重置失败: ${error.message}`);
        });
}

// 加载用户资料
async function loadProfile() {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('username-display').textContent = `昵称: ${data.userName}`;
            document.getElementById('avatar-preview').src = data.avatarUrl;
            document.getElementById('username-input').value = data.userName;
        }
    } catch (error) {
        console.error('加载用户资料失败:', error);
        alert('加载用户资料失败，请稍后重试');
    }
}

// 更新用户资料
async function updateProfile() {
    const user = auth.currentUser;
    const username = document.getElementById('username-input').value;
    const avatarFile = document.getElementById('avatar-upload').files[0];
    let avatarUrl = document.getElementById('avatar-preview').src;

    try {
        if (avatarFile) {
            const avatarRef = storage.ref(`avatars/${user.uid}/${avatarFile.name}`);
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
        console.error('更新资料失败:', error);
        alert(`更新资料失败: ${error.message}`);
    }
}

// 上传照片并生成故事
async function uploadAndGenerate() {
    const file = document.getElementById('photo-upload').files[0];
    if (!file) {
        alert('请选择一张照片');
        return;
    }

    document.getElementById('story-output').innerHTML = '<p>正在调用X AI生成故事...</p>';

    try {
        const user = auth.currentUser;
        const photoRef = storage.ref(`photos/${user.uid}/${file.name}`);
        await photoRef.put(file);
        const photoUrl = await photoRef.getDownloadURL();

        let story = "";
        try {
            const response = await fetch("https://api.x.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${XAI_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "grok-beta",
                    messages: [
                        {
                            role: "system",
                            content: "你是一个写作助手，帮用户根据照片生成有趣的故事。"
                        },
                        {
                            role: "user",
                            content: `请根据这张照片生成一个简短的故事: ${photoUrl}`
                        }
                    ]
                })
            });
            const data = await response.json();
            if (data.choices && data.choices[0] && data.choices[0].message) {
                story = data.choices[0].message.content;
            } else {
                story = "生成故事失败，请稍后重试。";
            }
        } catch (err) {
            console.error('生成故事失败:', err);
            story = "生成故事时出错，请稍后再试。";
        }

        const tags = extractTags(story);
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        await db.collection('stories').add({
            userId: user.uid,
            userName: userData.userName,
            userAvatar: userData.avatarUrl,
            photoUrl,
            story,
            tags,
            privacy: document.getElementById('privacy').value,
            likes: 0,
            comments: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        loadPublicSquare();
        loadArchive();
        loadTags();

        document.getElementById('story-output').innerHTML = `<p>${story}</p><img src="${photoUrl}" alt="Uploaded photo">`;
    } catch (error) {
        console.error('上传照片失败:', error);
        alert(`上传照片失败: ${error.message}`);
    }
}

// 提取标签
function extractTags(text) {
    const words = text.split(' ');
    return words.filter(w => w.length > 3 && !['一个', '的', '了'].includes(w)).slice(0, 5);
}

// 加载公开广场
async function loadPublicSquare() {
    const square = document.getElementById('public-square');
    square.innerHTML = '';
    try {
        const querySnapshot = await db.collection('stories').where('privacy', '==', 'public').orderBy('createdAt', 'desc').get();
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="user-info">
                    <img src="${data.userAvatar}" alt="User avatar" class="avatar">
                    <span>${data.userName}</span>
                </div>
                <img src="${data.photoUrl}" alt="Story image">
                <p>${data.story}</p>
                <p>标签: ${data.tags.join(', ')}</p>
                <p>点赞: ${data.likes}</p>
                <button onclick="likeStory('${doc.id}')">点赞</button>
                <input id="comment-${doc.id}" placeholder="添加评论...">
                <button onclick="addComment('${doc.id}')">评论</button>
                <div class="comments">
                    ${data.comments ? data.comments.map(c => `<div class="comment"><img src="${data.userAvatar}" alt="User avatar"><span>${data.userName}: ${c}</span></div>`).join('') : ''}
                </div>
            `;
            square.appendChild(card);
        });
    } catch (error) {
        console.error('加载公开广场失败:', error);
        square.innerHTML = '<p>加载公开广场失败，请稍后重试</p>';
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
        alert(`点赞失败: ${error.message}`);
    }
}

// 添加评论
async function addComment(id) {
    const comment = document.getElementById(`comment-${id}`).value;
    if (!comment) {
        alert('请输入评论内容');
        return;
    }
    try {
        const user = auth.currentUser;
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        const ref = db.collection('stories').doc(id);
        await ref.update({ comments: firebase.firestore.FieldValue.arrayUnion(`${userData.userName}: ${comment}`) });
        loadPublicSquare();
        loadArchive();
    } catch (error) {
        console.error('添加评论失败:', error);
        alert(`添加评论失败: ${error.message}`);
    }
}

// 加载个人存档
async function loadArchive() {
    const archive = document.getElementById('archive');
    archive.innerHTML = '';
    try {
        const user = auth.currentUser;
        const querySnapshot = await db.collection('stories').where('userId', '==', user.uid).orderBy('createdAt', 'desc').get();
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="user-info">
                    <img src="${data.userAvatar}" alt="User avatar" class="avatar">
                    <span>${data.userName}</span>
                </div>
                <img src="${data.photoUrl}" alt="Story image">
                <p>${data.story}</p>
                <p>隐私: ${data.privacy}</p>
                <p>标签: ${data.tags.join(', ')}</p>
                <p>点赞: ${data.likes}</p>
                <div class="comments">
                    ${data.comments ? data.comments.map(c => `<div class="comment"><img src="${data.userAvatar}" alt="User avatar"><span>${c}</span></div>`).join('') : ''}
                </div>
            `;
            archive.appendChild(card);
        });
    } catch (error) {
        console.error('加载存档失败:', error);
        archive.innerHTML = '<p>加载存档失败，请稍后重试</p>';
    }
}

// 加载标签广场
async function loadTags() {
    const tagSquare = document.getElementById('tag-square');
    tagSquare.innerHTML = '';
    try {
        const tagsMap = {};
        const querySnapshot = await db.collection('stories').where('privacy', '==', 'public').get();
        querySnapshot.forEach(doc => {
            const data = doc.data();
            data.tags.forEach(tag => {
                if (!tagsMap[tag]) tagsMap[tag] = [];
                tagsMap[tag].push({ id: doc.id, story: data.story, photoUrl: data.photoUrl, userName: data.userName, userAvatar: data.userAvatar });
            });
        });
        for (const tag in tagsMap) {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `<h3>标签: ${tag}</h3>`;
            tagsMap[tag].forEach(item => {
                card.innerHTML += `
                    <div class="user-info">
                        <img src="${item.userAvatar}" alt="User avatar" class="avatar">
                        <span>${item.userName}</span>
                    </div>
                    <p>${item.story.slice(0, 50)}... <img src="${item.photoUrl}" alt="Story image"></p>
                `;
            });
            tagSquare.appendChild(card);
        }
    } catch (error) {
        console.error('加载标签广场失败:', error);
        tagSquare.innerHTML = '<p>加载标签广场失败，请稍后重试</p>';
    }
}

// 搜索故事
async function searchStories() {
    const keyword = document.getElementById('search-keyword').value.toLowerCase();
    const results = document.getElementById('search-results');
    results.innerHTML = '';
    if (!keyword) {
        alert('请输入搜索关键词');
        return;
    }
    try {
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
                    <span>${story.userName}</span>
                </div>
                <img src="${story.photoUrl}" alt="Story image">
                <p>预览: ${story.story.slice(0, 100)}...</p>
                <p>匹配度: ${story.matchCount}</p>
            `;
            results.appendChild(card);
        });
    } catch (error) {
        console.error('搜索失败:', error);
        results.innerHTML = '<p>搜索失败，请稍后重试</p>';
    }
}
