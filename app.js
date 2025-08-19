// Firebase配置（替换为你的Firebase项目配置）
const firebaseConfig = {
    apiKey: "AIzaSyCgrvfNp7L8d_nyx8ycNb8Lc_UUSllG0Pg",
    authDomain: "photo-story-app.firebaseapp.com",
    projectId: "photo-story-app",
    storageBucket: "photo-story-app.firebasestorage.app",
    messagingSenderId: "571174185577",
    appId: "1:571174185577:web:35e312c16feb1efb6b10f8"
};

const XAI_API_KEY = "xai-484OiCTv2ttWcYIG1qQ1aMnDoJ6pofHeZufQItCnXlvjcSVVfNJOdK47nNGal6V6apuOoFzJPEEjaVTc";

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// 显示消息的辅助函数
function showMessage(message, isError = false) {
    const messageDiv = document.getElementById('auth-message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = isError ? 'message error' : 'message success';
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    } else {
        // Fallback to alert if message div not found
        alert(message);
    }
}

// 禁用/启用按钮的辅助函数
function setButtonsDisabled(disabled) {
    const registerBtn = document.getElementById('register-btn');
    const loginBtn = document.getElementById('login-btn');
    if (registerBtn) registerBtn.disabled = disabled;
    if (loginBtn) loginBtn.disabled = disabled;
}

// 用户状态监听
auth.onAuthStateChanged(user => {
    console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
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
        const element = document.getElementById(id);
        if (element) {
            element.style.display = id === sectionId ? 'block' : 'none';
        }
    });
}

// 注册
async function register() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
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
        
        // 创建用户文档
        await db.collection('users').doc(user.uid).set({
            userName: email.split('@')[0], // 默认昵称
            avatarUrl: 'https://via.placeholder.com/100x100?text=Avatar',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showMessage('注册成功！');
        console.log('User registered:', user.uid);
        
    } catch (error) {
        console.error('Registration error:', error);
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
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showMessage('请输入邮箱和密码', true);
        return;
    }
    
    setButtonsDisabled(true);
    showMessage('正在登录...');
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        showMessage('登录成功！');
        console.log('User logged in:', userCredential.user.uid);
        
    } catch (error) {
        console.error('Login error:', error);
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
    auth.signOut().then(() => {
        console.log('User logged out');
    }).catch(error => {
        console.error('Logout error:', error);
    });
}

// 重置密码
function resetPassword() {
    const email = document.getElementById('email').value.trim();
    if (!email) {
        showMessage('请先输入邮箱', true);
        return;
    }
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            showMessage('密码重置邮件已发送，请检查邮箱');
        })
        .catch(error => {
            console.error('Password reset error:', error);
            showMessage('发送重置邮件失败: ' + error.message, true);
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
        console.error('Error loading profile:', error);
    }
}

// 更新用户资料
async function updateProfile() {
    try {
        const user = auth.currentUser;
        if (!user) return;
        
        const usernameInput = document.getElementById('username-input');
        const avatarUpload = document.getElementById('avatar-upload');
        const avatarPreview = document.getElementById('avatar-preview');
        
        const username = usernameInput ? usernameInput.value.trim() : '';
        const avatarFile = avatarUpload ? avatarUpload.files[0] : null;
        let avatarUrl = avatarPreview ? avatarPreview.src : 'https://via.placeholder.com/100x100?text=Avatar';

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
        console.error('Error updating profile:', error);
        alert('更新失败: ' + error.message);
    }
}

// 转换图片为Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// 上传照片并生成故事
async function uploadAndGenerate() {
    const fileInput = document.getElementById('photo-upload');
    const file = fileInput ? fileInput.files[0] : null;
    const storyOutput = document.getElementById('story-output');
    
    if (!file) {
        alert('请选择一张照片');
        return;
    }

    if (storyOutput) {
        storyOutput.innerHTML = '<p>正在上传照片并生成故事...</p>';
    }

    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('用户未登录');
        }

        // 上传图片到 Firebase Storage
        const photoRef = storage.ref(`photos/${user.uid}/${Date.now()}_${file.name}`);
        console.log('Uploading file to Firebase Storage...');
        await photoRef.put(file);
        const photoUrl = await photoRef.getDownloadURL();
        console.log('File uploaded successfully, URL:', photoUrl);

        // 转换图片为Base64用于AI分析
        const base64Image = await fileToBase64(file);
        
        // 调用 X AI 生成故事
        let story = "";
        try {
            console.log('Calling X AI API...');
            const response = await fetch("https://api.x.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${XAI_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "grok-vision-beta",
                    messages: [
                        {
                            role: "system",
                            content: "你是一个创意写作助手，帮用户根据照片生成有趣的故事。请用中文回答，故事应该生动有趣，大约100-200字。"
                        },
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "请根据这张照片生成一个简短而有趣的故事："
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: base64Image
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.7
                })
            });
            
            console.log('API Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error response:', errorText);
                throw new Error(`API请求失败: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('API Response data:', data);
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
                story = data.choices[0].message.content;
            } else {
                throw new Error('API返回数据格式不正确');
            }
            
        } catch (err) {
            console.error('AI API error:', err);
            story = `生成故事时出错：${err.message}。不过这是一张美好的照片，值得记录。让我们想象一下这张照片背后可能隐藏着什么有趣的故事...`;
        }

        // 提取标签
        const tags = extractTags(story);

        // 获取用户资料
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.exists ? userDoc.data() : { userName: '匿名用户', avatarUrl: 'https://via.placeholder.com/100x100?text=Avatar' };

        // 获取隐私设置
        const privacySelect = document.getElementById('privacy');
        const privacy = privacySelect ? privacySelect.value : 'public';

        // 保存到数据库
        console.log('Saving to database...');
        await db.collection('stories').add({
            userId: user.uid,
            userName: userData.userName,
            userAvatar: userData.avatarUrl,
            photoUrl,
            story,
            tags,
            privacy,
            likes: 0,
            comments: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 刷新页面数据
        loadPublicSquare();
        loadArchive();
        loadTags();

        // 显示结果
        if (storyOutput) {
            storyOutput.innerHTML = `
                <div class="story-result">
                    <h3>生成的故事：</h3>
                    <p>${story}</p>
                    <img src="${photoUrl}" alt="上传的照片" style="max-width: 100%; margin-top: 10px; border-radius: 8px;">
                    <p><strong>标签：</strong> ${tags.join(', ')}</p>
                    <p><strong>隐私设置：</strong> ${privacy === 'public' ? '公开' : '私密'}</p>
                </div>
            `;
        }
        
        console.log('Story generation completed successfully');
        
    } catch (error) {
        console.error('Upload error:', error);
        if (storyOutput) {
            storyOutput.innerHTML = `<p style="color: red;">上传失败: ${error.message}</p>`;
        }
        alert(`上传失败: ${error.message}`);
    }
}

// 提取标签
function extractTags(text) {
    const words = text.split(/[\s，。！？、]+/);
    return words.filter(w => w.length > 2 && !['一个', '的', '了', '在', '是', '有', '这', '那', '就', '都', '会', '说', '我', '你', '他'].includes(w)).slice(0, 5);
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
            
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="user-info">
                    <img src="${data.userAvatar}" alt="User avatar" class="avatar">
                    <span>${data.userName}</span>
                </div>
                <img src="${data.photoUrl}" alt="Story image" style="max-width: 100%; border-radius: 8px;">
                <p>${data.story}</p>
                <p><strong>标签:</strong> ${data.tags.join(', ')}</p>
                <p><strong>点赞:</strong> ${data.likes}</p>
                <button onclick="likeStory('${doc.id}')">👍 点赞</button>
                <input id="comment-${doc.id}" placeholder="添加评论..." style="margin: 5px 0;">
                <button onclick="addComment('${doc.id}')">💬 评论</button>
                <div class="comments">
                    ${data.comments ? data.comments.map(c => `<div class="comment">${c}</div>`).join('') : ''}
                </div>
            `;
            square.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading public square:', error);
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
        console.error('Error liking story:', error);
    }
}

// 添加评论
async function addComment(id) {
    try {
        const commentInput = document.getElementById(`comment-${id}`);
        const comment = commentInput ? commentInput.value.trim() : '';
        if (!comment) return;
        
        const user = auth.currentUser;
        if (!user) return;
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.exists ? userDoc.data() : { userName: '匿名用户' };
        const ref = db.collection('stories').doc(id);
        
        await ref.update({ 
            comments: firebase.firestore.FieldValue.arrayUnion(`${userData.userName}: ${comment}`) 
        });
        
        if (commentInput) commentInput.value = '';
        loadPublicSquare();
        loadArchive();
    } catch (error) {
        console.error('Error adding comment:', error);
    }
}

// 加载个人存档
async function loadArchive() {
    try {
        const archive = document.getElementById('archive');
        if (!archive) return;
        
        archive.innerHTML = '<h2>我的存档</h2>';
        
        const user = auth.currentUser;
        if (!user) return;
        
        const querySnapshot = await db.collection('stories')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();
            
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="user-info">
                    <img src="${data.userAvatar}" alt="User avatar" class="avatar">
                    <span>${data.userName}</span>
                </div>
                <img src="${data.photoUrl}" alt="Story image" style="max-width: 100%; border-radius: 8px;">
                <p>${data.story}</p>
                <p><strong>隐私:</strong> ${data.privacy === 'public' ? '公开' : '私密'}</p>
                <p><strong>标签:</strong> ${data.tags.join(', ')}</p>
                <p><strong>点赞:</strong> ${data.likes}</p>
                <div class="comments">
                    ${data.comments ? data.comments.map(c => `<div class="comment">${c}</div>`).join('') : ''}
                </div>
            `;
            archive.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading archive:', error);
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
            data.tags.forEach(tag => {
                if (!tagsMap[tag]) tagsMap[tag] = [];
                tagsMap[tag].push({ 
                    id: doc.id, 
                    story: data.story, 
                    photoUrl: data.photoUrl, 
                    userName: data.userName, 
                    userAvatar: data.userAvatar 
                });
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
                    <p>${item.story.slice(0, 50)}... <img src="${item.photoUrl}" alt="Story image" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></p>
                `;
            });
            tagSquare.appendChild(card);
        }
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

// 搜索故事
async function searchStories() {
    try {
        const keywordInput = document.getElementById('search-keyword');
        const keyword = keywordInput ? keywordInput.value.toLowerCase().trim() : '';
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
                    <span>${story.userName}</span>
                </div>
                <img src="${story.photoUrl}" alt="Story image" style="max-width: 100%; border-radius: 8px;">
                <p><strong>预览:</strong> ${story.story.slice(0, 100)}...</p>
                <p><strong>匹配度:</strong> ${story.matchCount}</p>
            `;
            results.appendChild(card);
        });
    } catch (error) {
        console.error('Error searching stories:', error);
    }
}
