document.addEventListener('DOMContentLoaded', () => {
    // ****** Firebase 配置 ******
    const firebaseConfig = {
        apiKey: "AIzaSyAdRlF2QHuVPBI86khxM-4YT06VSY0-s_0",
        authDomain: "speedometerdatauploader.firebaseapp.com",
        projectId: "speedometerdatauploader",
        storageBucket: "speedometerdatauploader.firebasestorage.app", 
        messagingSenderId: "61305463721",
        appId: "1:61305463721:web:6398ea7898ca75ba135ab8"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    // ****** ****************** ******

    const sidebarMenuItems = document.querySelectorAll('.sidebar .menu-item');
    const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const uploadForm = document.getElementById('uploadForm');
    const messageDiv = document.getElementById('message');
    const resultsList = document.getElementById('results-list');
    const loadingMessage = document.getElementById('loading-message');
    const browserVersionInput = document.getElementById('browserVersion');

    // ****** 统一的浏览器版本自动填充函数 (更新Safari逻辑) ******
    function autofillBrowserInfo() {
        if (!browserVersionInput) return;

        let userAgent = navigator.userAgent;
        let browserName = '未知浏览器';
        let browserVersion = '未知版本';

        if (userAgent.includes('Edg')) { // Edge (Chromium based)
            browserName = 'Edge';
            const edgeVersion = userAgent.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/);
            if (edgeVersion && edgeVersion[1]) {
                browserVersion = edgeVersion[1];
            }
        } else if (userAgent.includes('Firefox')) { // Firefox
            browserName = 'Firefox';
            const firefoxVersion = userAgent.match(/Firefox\/(\d+\.\d+)/);
            if (firefoxVersion && firefoxVersion[1]) {
                browserVersion = firefoxVersion[1];
            }
        } else if (userAgent.includes('OPR') || userAgent.includes('Opera')) { // Opera
            browserName = 'Opera';
            const operaVersion = userAgent.match(/(OPR|Opera)\/(\d+\.\d+\.\d+\.\d+)/);
            if (operaVersion && operaVersion[2]) {
                browserVersion = operaVersion[2];
            }
        } else if (userAgent.includes('Chrome') && !userAgent.includes('Safari')) { // Chrome (and not Safari, as Safari UA also contains 'Chrome')
            browserName = 'Chrome';
            const chromeVersion = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
            if (chromeVersion && chromeVersion[1]) {
                browserVersion = chromeVersion[1];
            }
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome') && !userAgent.includes('Edg')) { // Safari (and not Chrome or Edge)
            browserName = 'Safari';
            // 优先尝试从 'Version/X.Y' 提取 (常见于桌面版 Safari 和较早的 iOS Safari)
            let safariVersionMatch = userAgent.match(/Version\/(\d+(\.\d+){1,2})/);
            if (safariVersionMatch && safariVersionMatch[1]) {
                browserVersion = safariVersionMatch[1];
            } else {
                // 如果没有 'Version/', 则尝试从 'Safari/X.Y' 提取 (常见于较新的 iOS Safari)
                // 这通常是 WebKit 版本号，但有时也直接对应 Safari 版本
                safariVersionMatch = userAgent.match(/Safari\/(\d+(\.\d+){1,2})/);
                if (safariVersionMatch && safariVersionMatch[1]) {
                    // 为了尽量获取接近 Safari 应用的版本号，而不是纯粹的 WebKit 构建号，
                    // 这个部分可能需要根据实际 userAgent 字符串的模式进一步细化。
                    // 对于iOS, 例如 "Safari/604.1", 如果没有 "Version/X.Y", 这个可能是最接近的。
                    // 如果目标是显示与桌面Safari版本号类似的格式，"Version/X.Y" 是首选。
                    browserVersion = safariVersionMatch[1];
                }
            }
            // 根据新需求，不再附加操作系统信息 (如 macOS 或 iOS 版本)
        }
        // 对于其他未知浏览器，将保持 "未知浏览器 未知版本"

        browserVersionInput.value = `${browserName} ${browserVersion}`;
    }
    // ****** ************************************** ******

    // 初始化时自动填充浏览器信息
    autofillBrowserInfo();

    // ****** 统一的标签页激活函数 ******
    function activateTab(targetId) {
        contentSections.forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');

            sidebarMenuItems.forEach(item => {
                item.classList.remove('active');
                if (item.dataset.target === targetId) {
                    item.classList.add('active');
                }
            });

            bottomNavItems.forEach(item => {
                item.classList.remove('active');
                if (item.dataset.target === targetId) {
                    item.classList.add('active');
                }
            });

            if (targetId === 'results-section') {
                loadUploadedResults();
            }
        }
    }
    // ****** *********************** ******

    sidebarMenuItems.forEach(item => {
        item.addEventListener('click', () => {
            activateTab(item.dataset.target);
        });
    });

    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            activateTab(item.dataset.target);
        });
    });

    const initiallyActiveSection = document.querySelector('.content-section.active');
    if (initiallyActiveSection) {
        activateTab(initiallyActiveSection.id);
    }

    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(uploadForm);
        const data = {
            speedometerScore: formData.get('speedometerScore'),
            speedometerError: formData.get('speedometerError'),
            browserVersion: formData.get('browserVersion'), // 此处获取的是 readonly 输入框的值
            cpuInfo: formData.get('cpuInfo'),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!data.speedometerScore || !data.speedometerError || !data.browserVersion || !data.cpuInfo) {
            showMessage('请填写所有必填字段。', 'error');
            return;
        }

        try {
            await db.collection('speedometer_results').add(data);
            showMessage('结果上传成功，已保存到 Firebase Firestore！', 'success');
            uploadForm.reset();
            autofillBrowserInfo(); // 表单重置后重新填充浏览器信息，使用更新后的逻辑

        } catch (error) {
            console.error('上传结果失败:', error);
            showMessage(`上传结果失败: ${error.message || '未知错误'}`, 'error');
        }
    });

    async function loadUploadedResults() {
        if (!resultsList || !loadingMessage) return;
        resultsList.innerHTML = '';
        loadingMessage.style.display = 'block';

        try {
            const snapshot = await db.collection('speedometer_results')
                .orderBy('timestamp', 'desc')
                .get();
            loadingMessage.style.display = 'none';

            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    const result = doc.data();
                    const listItem = document.createElement('li');
                    const uploadTime = result.timestamp ? result.timestamp.toDate().toLocaleString() : 'N/A';

                    const scoreEl = document.createElement('strong');
                    scoreEl.textContent = `分数: ${result.speedometerScore || 'N/A'}`;
                    listItem.appendChild(scoreEl);
                    listItem.appendChild(document.createElement('br'));

                    const errorText = document.createTextNode(`误差: ${result.speedometerError || 'N/A'}`);
                    listItem.appendChild(errorText);
                    listItem.appendChild(document.createElement('br'));

                    const browserText = document.createTextNode(`浏览器: ${result.browserVersion || 'N/A'}`);
                    listItem.appendChild(browserText);
                    listItem.appendChild(document.createElement('br'));

                    const cpuText = document.createTextNode(`CPU: ${result.cpuInfo || 'N/A'}`);
                    listItem.appendChild(cpuText);
                    listItem.appendChild(document.createElement('br'));

                    const timeEl = document.createElement('p');
                    timeEl.textContent = `上传时间: ${uploadTime}`;
                    listItem.appendChild(timeEl);

                    resultsList.appendChild(listItem);
                });
            } else {
                resultsList.innerHTML = '<li><p>暂无上传结果。</p></li>';
            }
        } catch (error)
        {
            console.error('加载结果失败:', error);
            loadingMessage.style.display = 'none';
            resultsList.innerHTML = `<li><p class="error-message">加载结果失败: ${error.message || '未知错误'}</p></li>`;
        }
    }

    function showMessage(msg, type) {
        if (!messageDiv) return;
        messageDiv.textContent = msg;
        messageDiv.className = '';
        messageDiv.classList.add(type);
        messageDiv.classList.remove('hidden');

        void messageDiv.offsetWidth;

        messageDiv.style.display = 'block';
        messageDiv.style.opacity = '1';

        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 500);
        }, 5000);
    }

    if (document.getElementById('results-section')?.classList.contains('active')) {
        loadUploadedResults();
    }
});
