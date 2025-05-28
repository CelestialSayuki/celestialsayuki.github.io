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

    // ****** 自动填充浏览器版本信息函数 ******
    function autofillBrowserInfo() {
        if (!browserVersionInput) return;

        let userAgent = navigator.userAgent;
        let browserName = '未知浏览器';
        let browserVersion = '未知版本';
        let osInfo = ''; // For specific OS details like macOS version for Safari

        // Detailed User Agent Parsing
        if (/Edg\/([\d.]+)/.test(userAgent)) {
            browserName = 'Edge';
            browserVersion = RegExp.$1;
        } else if (/Firefox\/([\d.]+)/.test(userAgent)) {
            browserName = 'Firefox';
            browserVersion = RegExp.$1;
        } else if (/OPR\/([\d.]+)/.test(userAgent) || /Opera\/([\d.]+)/.test(userAgent)) {
            browserName = 'Opera';
            browserVersion = RegExp.$1 || userAgent.match(/Opera\/([\d.]+)/)[1]; // OPR or Opera
        } else if (/Chrome\/([\d.]+)/.test(userAgent) && !/Edg/.test(userAgent)) { // Ensure not Edge masquerading as Chrome
            browserName = 'Chrome';
            browserVersion = RegExp.$1;
        } else if (/Safari\/([\d.]+)/.test(userAgent) && !/Chrome/.test(userAgent) && !/Edg/.test(userAgent)) { // Ensure not Chrome/Edge
            browserName = 'Safari';
            // Try to get version from "Version/" first, then "Safari/"
            const versionMatch = userAgent.match(/Version\/([\d.]+)/);
            if (versionMatch && versionMatch[1]) {
                browserVersion = versionMatch[1];
            } else {
                const safariVersionMatch = userAgent.match(/Safari\/([\d.]+)/);
                if (safariVersionMatch && safariVersionMatch[1]) {
                    browserVersion = safariVersionMatch[1];
                }
            }
            // Check for macOS version for Safari
            const osxMatch = userAgent.match(/Mac OS X ([\d_]+)/);
            if (osxMatch && osxMatch[1]) {
                osInfo = ` (macOS ${osxMatch[1].replace(/_/g, '.')})`;
            }
            // Check for iOS version for Safari
            const iOSMatch = userAgent.match(/CPU OS ([\d_]+) like Mac OS X/);
            if (iOSMatch && iOSMatch[1]) {
                 // The label asks for system version for Safari users (e.g., iOS 18.5)
                browserVersionInput.value = `iOS ${iOSMatch[1].replace(/_/g, '.')}`;
                return; // Early exit if iOS is detected and set
            }
        }
        browserVersionInput.value = `${browserName} ${browserVersion}${osInfo}`;
    }
    // ****** 自动填充浏览器版本信息结束 ******

    // 初始化时自动填充浏览器信息
    autofillBrowserInfo();

    // ****** 统一的标签页激活函数 ******
    function activateTab(targetId) {
        // 隐藏所有内容区
        contentSections.forEach(section => section.classList.remove('active'));
        // 激活目标内容区
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');

            // 更新侧边栏菜单项的 active 状态
            sidebarMenuItems.forEach(item => {
                item.classList.remove('active');
                if (item.dataset.target === targetId) {
                    item.classList.add('active');
                }
            });

            // 更新底部导航项的 active 状态
            bottomNavItems.forEach(item => {
                item.classList.remove('active');
                if (item.dataset.target === targetId) {
                    item.classList.add('active');
                }
            });

            // 如果切换到“查看已上传结果”部分，则加载数据
            if (targetId === 'results-section') {
                loadUploadedResults();
            }
        }
    }
    // ****** *********************** ******

    // 侧边栏菜单切换逻辑
    sidebarMenuItems.forEach(item => {
        item.addEventListener('click', () => {
            activateTab(item.dataset.target);
        });
    });

    // 底部导航菜单切换逻辑
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            activateTab(item.dataset.target);
        });
    });

    // 初始化：确保默认激活的标签页在所有导航中都激活
    const initiallyActiveSection = document.querySelector('.content-section.active');
    if (initiallyActiveSection) {
        activateTab(initiallyActiveSection.id);
    }


    // 表单提交逻辑 (上传结果)
    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(uploadForm);
        const data = {
            speedometerScore: formData.get('speedometerScore'),
            speedometerError: formData.get('speedometerError'),
            browserVersion: formData.get('browserVersion'),
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
            autofillBrowserInfo(); // 表单重置后重新填充浏览器信息
        } catch (error) {
            console.error('上传结果失败:', error);
            showMessage(`上传结果失败: ${error.message || '未知错误'}`, 'error');
        }
    });

    // 加载已上传结果的逻辑
    async function loadUploadedResults() {
        if (!resultsList || !loadingMessage) return; // Guard clause
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

                    // Using textContent for security and proper display of data
                    const scoreEl = document.createElement('strong');
                    scoreEl.textContent = `分数: ${result.speedometerScore || 'N/A'}`;

                    const errorEl = document.createElement('p');
                    errorEl.textContent = `误差: ${result.speedometerError || 'N/A'}`;
                    
                    const browserEl = document.createElement('p');
                    browserEl.textContent = `浏览器/系统: ${result.browserVersion || 'N/A'}`;
                    
                    const cpuEl = document.createElement('p');
                    cpuEl.textContent = `CPU: ${result.cpuInfo || 'N/A'}`;

                    const timeEl = document.createElement('p');
                    timeEl.className = 'upload-time'; // For potential specific styling
                    timeEl.textContent = `上传时间: ${uploadTime}`;

                    listItem.appendChild(scoreEl);
                    listItem.appendChild(errorEl);
                    listItem.appendChild(browserEl);
                    listItem.appendChild(cpuEl);
                    listItem.appendChild(timeEl);
                    resultsList.appendChild(listItem);
                });
            } else {
                resultsList.innerHTML = '<li><p>暂无上传结果。</p></li>';
            }
        } catch (error) {
            console.error('加载结果失败:', error);
            loadingMessage.style.display = 'none';
            resultsList.innerHTML = `<li><p class="error-message">加载结果失败: ${error.message || '未知错误'}</p></li>`;
        }
    }

    // 显示消息的辅助函数
    function showMessage(msg, type) {
        if (!messageDiv) return; // Guard clause
        messageDiv.textContent = msg;
        messageDiv.className = ''; // Clear previous classes before adding new ones
        messageDiv.classList.add(type); // 'success' or 'error'
        messageDiv.classList.remove('hidden'); // Make sure it's not display:none from .hidden

        // Trigger reflow to ensure transition plays
        void messageDiv.offsetWidth;
        
        messageDiv.style.display = 'block'; // Should be handled by removing .hidden mostly
        messageDiv.style.opacity = '1';

        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                // Only add 'hidden' if you intend to use it to control display:none
                // If CSS controls display via opacity and a general .hidden class, ensure consistency
                messageDiv.style.display = 'none';
                // messageDiv.classList.add('hidden'); // Re-add if needed for initial state
            }, 500); // Match CSS transition time
        }, 5000);
    }

    // Initial load if results section is active by default (though usually upload is first)
    if (document.getElementById('results-section')?.classList.contains('active')) {
        loadUploadedResults();
    }
});
