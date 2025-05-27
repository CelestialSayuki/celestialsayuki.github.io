document.addEventListener('DOMContentLoaded', () => {
    // ****** 请替换为你的 Google Apps Script Web App URL ******
    // 这个 URL 是你部署 Google Apps Script 为 Web App 后获得的。
    // 它将同时处理上传 (POST 请求) 和读取 (GET 请求) 操作。
    const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyH3Ra8vRj7xcLtng_8vxkBls-_FMlrRKJn6APBFygmXUjbhfqEkVh6qoaSDwlCIdOZ/exec';
    // ****** ******************************************** ******

    const menuItems = document.querySelectorAll('.menu-item');
    const contentSections = document.querySelectorAll('.content-section')
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

    // 表单提交逻辑 (上传结果)
    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(uploadForm);
        const data = {
            action: 'upload', // 添加 action 字段，告诉 Apps Script 这是上传操作
            // 不再使用 parseFloat，直接获取字符串值
            speedometerScore: formData.get('speedometerScore'),
            speedometerError: formData.get('speedometerError'),
            browserVersion: formData.get('browserVersion'),
            cpuInfo: formData.get('cpuInfo'),
            timestamp: new Date().toISOString() // 添加时间戳
        };

        // 简易验证：只检查字段是否为空字符串 (required 属性已经保证不完全为空)
        if (!data.speedometerScore || !data.speedometerError || !data.browserVersion || !data.cpuInfo) {
            showMessage('请填写所有必填字段。', 'error');
            return;
        }

        try {
            const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();

            if (response.ok && responseData.status === 'success') {
                showMessage('结果上传成功，已保存到 Google 表格！', 'success');
                uploadForm.reset(); // 清空表单
            } else {
                showMessage(`上传结果失败: ${responseData.message || '未知错误'}`, 'error');
            }
        } catch (error) {
            console.error('网络错误或服务器响应异常:', error);
            showMessage('网络错误或服务器响应异常，请稍后重试。', 'error');
        }
    });

    // 加载已上传结果的逻辑
    async function loadUploadedResults() {
        resultsList.innerHTML = ''; // 清空之前的结果
        loadingMessage.style.display = 'block'; // 显示加载消息

        try {
            // 对于读取操作，我们发送 GET 请求，并带上 action 参数
            const response = await fetch(`${GOOGLE_SHEETS_WEB_APP_URL}?action=read`);
            const responseData = await response.json();

            if (response.ok && responseData.status === 'success') {
                loadingMessage.style.display = 'none'; // 隐藏加载消息

                if (responseData.results && responseData.results.length > 0) {
                    // 确保数据中存在 Timestamp 字段用于排序 (注意大小写，与 Google Sheets 表头一致)
                    responseData.results.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp)); // 按时间戳降序排序

                    responseData.results.forEach(result => {
                        const listItem = document.createElement('li');
                        // 显示误差时，可以根据需要添加 "%" 符号，或者直接显示数字
                        listItem.innerHTML = `
                            <strong>分数:</strong> ${result.SpeedometerScore || 'N/A'} ±${result.SpeedometerError || 'N/A'}<br>
                            <strong>浏览器:</strong> ${result.BrowserVersion || 'N/A'}<br>
                            <strong>CPU:</strong> ${result.CpuInfo || 'N/A'}<br>
                            <p>上传时间: ${new Date(result.Timestamp).toLocaleString()}</p>
                        `;
                        resultsList.appendChild(listItem);
                    });
                } else {
                    resultsList.innerHTML = '<p>暂无上传结果。</p>';
                }
            } else {
                loadingMessage.style.display = 'none';
                resultsList.innerHTML = `<p class="error-message">加载结果失败: ${responseData.message || '未知错误'}</p>`;
            }
        } catch (error) {
            console.error('加载结果网络错误或服务器响应异常:', error);
            loadingMessage.style.display = 'none';
            resultsList.innerHTML = `<p class="error-message">加载结果时发生网络错误，请稍后重试。</p>`;
        }
    }

    // 显示消息的辅助函数
    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = ''; // 清除之前的类
        messageDiv.classList.add(type); // 添加新的类型类 (success/error)
        messageDiv.classList.remove('hidden'); // 显示消息
        setTimeout(() => {
            messageDiv.classList.add('hidden'); // 5秒后隐藏消息
        }, 5000);
    }
});
