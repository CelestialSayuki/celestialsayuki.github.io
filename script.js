document.addEventListener('DOMContentLoaded', () => {
    // ****** Firebase 配置 - 请替换为您的 Firebase 项目配置 ******
    // 从 Firebase 控制台 -> 项目设置 -> 您的应用 -> 选择您的 Web 应用 -> 复制配置
    const firebaseConfig = {
      apiKey: "AIzaSyAdRlF2QHuVPBI86khxM-4YT06VSY0-s_0", // 替换为您的 apiKey
      authDomain: "speedometerdatauploader.firebaseapp.com", // 替换为您的 authDomain
      projectId: "speedometerdatauploader", // 替换为您的 projectId
      storageBucket: "speedometerdatauploader.firebasestorage.app", // 替换为您的 storageBucket
      messagingSenderId: "61305463721", // 替换为您的 messagingSenderId
      appId: "1:61305463721:web:6398ea7898ca75ba135ab8" // 替换为您的 appId
    };

    // 初始化 Firebase
    // 确保您已经在 index.html 中引入了 Firebase SDKs
    // <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
    // <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore(); // 获取 Firestore 数据库实例
    // ****** ******************************************** ******

    const menuItems = document.querySelectorAll('.menu-item');
    const contentSections = document.querySelectorAll('.content-section');
    const uploadForm = document.getElementById('uploadForm');
    const messageDiv = document.getElementById('message');
    const resultsList = document.getElementById('results-list');
    const loadingMessage = document.getElementById('loading-message');

    // 侧边栏菜单切换逻辑
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // 移除所有菜单项的 active 状态
            menuItems.forEach(i => i.classList.remove('active'));
            // 添加当前点击菜单项的 active 状态
            item.classList.add('active');

            // 隐藏所有内容区
            contentSections.forEach(section => section.classList.remove('active'));

            const targetId = item.dataset.target;
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');

                // 如果切换到“查看已上传结果”部分，则加载数据
                if (targetId === 'results-section') {
                    loadUploadedResults();
                }
            }
        });
    });

    // 表单提交逻辑 (上传结果) - 现在使用 Firestore
    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(uploadForm);
        const data = {
            speedometerScore: formData.get('speedometerScore'),
            speedometerError: formData.get('speedometerError'),
            browserVersion: formData.get('browserVersion'),
            cpuInfo: formData.get('cpuInfo'),
            // 使用 Firestore 的服务器时间戳，更准确可靠
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        // 简易验证：只检查必填字段是否为空
        if (!data.speedometerScore || !data.speedometerError || !data.browserVersion || !data.cpuInfo) {
            showMessage('请填写所有必填字段。', 'error');
            return;
        }

        try {
            // 将数据添加到 'speedometer_results' 集合
            // Firebase 会自动生成一个唯一的文档 ID
            await db.collection('speedometer_results').add(data);

            showMessage('结果上传成功，已保存到 Firebase Firestore！', 'success');
            uploadForm.reset(); // 清空表单
        } catch (error) {
            console.error('上传结果失败:', error);
            showMessage(`上传结果失败: ${error.message || '未知错误'}`, 'error');
        }
    });

    // 加载已上传结果的逻辑 - 现在使用 Firestore
    async function loadUploadedResults() {
        resultsList.innerHTML = ''; // 清空之前的结果
        loadingMessage.style.display = 'block'; // 显示加载消息

        try {
            // 从 'speedometer_results' 集合获取数据，按时间戳降序排序
            const snapshot = await db.collection('speedometer_results')
                                     .orderBy('timestamp', 'desc') // 按时间戳字段降序排序
                                     .get(); // 获取所有文档

            loadingMessage.style.display = 'none'; // 隐藏加载消息

            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    const result = doc.data(); // 获取文档数据
                    const listItem = document.createElement('li');

                    // Firestore 的 timestamp 字段是一个 Timestamp 对象，需要转换为 JavaScript Date 对象
                    const uploadTime = result.timestamp ? result.timestamp.toDate().toLocaleString() : 'N/A';

                    listItem.innerHTML = `
                        <strong>分数:</strong> ${result.speedometerScore || 'N/A'}<br>
                        <strong>误差:</strong> ${result.speedometerError || 'N/A'}<br>
                        <strong>浏览器:</strong> ${result.browserVersion || 'N/A'}<br>
                        <strong>CPU:</strong> ${result.cpuInfo || 'N/A'}<br>
                        <p>上传时间: ${uploadTime}</p>
                    `;
                    resultsList.appendChild(listItem);
                });
            } else {
                resultsList.innerHTML = '<p>暂无上传结果。</p>';
            }
        } catch (error) {
            console.error('加载结果失败:', error);
            resultsList.innerHTML = `<p class="error-message">加载结果失败: ${error.message || '未知错误'}</p>`;
        }
    }

    // 显示消息的辅助函数
    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = ''; // 清除之前的类
        messageDiv.classList.add(type); // 添加新的类型类 (success/error)
        messageDiv.classList.remove('hidden'); // 显示消息
        // 确保消息可见，然后才开始隐藏计时
        messageDiv.style.display = 'block';
        messageDiv.style.opacity = '1';

        setTimeout(() => {
            messageDiv.style.opacity = '0';
            // 完全透明后才隐藏 display
            setTimeout(() => {
                messageDiv.style.display = 'none';
                messageDiv.classList.add('hidden'); // 保持 hidden 类，以便下次显示时重置
            }, 500); // 等待过渡完成
        }, 5000);
    }
});
