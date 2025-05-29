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
    const submitBenchmarkButton = document.getElementById('submitBenchmarkButton');

    // 筛选器元素
    const filterBrowserVersionSelect = document.getElementById('filterBrowserVersion');
    const filterCpuInfoSelect = document.getElementById('filterCpuInfo');
    const resetFiltersButton = document.getElementById('resetFiltersButton');

    let benchmarkChart = null;
    let allBenchmarkData = []; // 用于存储从 Firebase 获取的原始数据

    function autofillBrowserInfo() { /* ... (此函数保持不变) ... */
        if (!browserVersionInput) return;
        let userAgent = navigator.userAgent;
        let browserName = '未知浏览器';
        let browserVersion = '未知版本';

        if (userAgent.includes('Edg')) {
            browserName = 'Edge';
            const edgeVersion = userAgent.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/);
            if (edgeVersion && edgeVersion[1]) browserVersion = edgeVersion[1];
        } else if (userAgent.includes('Firefox')) {
            browserName = 'Firefox';
            const firefoxVersion = userAgent.match(/Firefox\/(\d+\.\d+)/);
            if (firefoxVersion && firefoxVersion[1]) browserVersion = firefoxVersion[1];
        } else if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
            browserName = 'Opera';
            const operaVersion = userAgent.match(/(OPR|Opera)\/(\d+\.\d+\.\d+\.\d+)/);
            if (operaVersion && operaVersion[2]) browserVersion = operaVersion[2];
        } else if (userAgent.includes('Chrome') && !userAgent.includes('Safari')) {
            browserName = 'Chrome';
            const chromeVersion = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
            if (chromeVersion && chromeVersion[1]) browserVersion = chromeVersion[1];
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
            browserName = 'Safari';
            let safariVersionMatch = userAgent.match(/Version\/(\d+(\.\d+){1,2})/);
            if (safariVersionMatch && safariVersionMatch[1]) {
                browserVersion = safariVersionMatch[1];
            } else {
                safariVersionMatch = userAgent.match(/Safari\/(\d+(\.\d+){1,2})/);
                if (safariVersionMatch && safariVersionMatch[1]) {
                    browserVersion = safariVersionMatch[1];
                }
            }
        }
        browserVersionInput.value = `${browserName} ${browserVersion}`;
    }
    autofillBrowserInfo();

    function activateTab(targetId) { /* ... (此函数保持不变，但内部调用 loadUploadedResults 时会触发新逻辑) ... */
        contentSections.forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
            sidebarMenuItems.forEach(item => {
                item.classList.remove('active');
                if (item.dataset.target === targetId) item.classList.add('active');
            });
            bottomNavItems.forEach(item => {
                item.classList.remove('active');
                if (item.dataset.target === targetId) item.classList.add('active');
            });
            if (targetId === 'results-section') {
                loadUploadedResults(); // 这个函数现在会加载数据并填充筛选器
            }
        }
    }

    sidebarMenuItems.forEach(item => item.addEventListener('click', () => activateTab(item.dataset.target)));
    bottomNavItems.forEach(item => item.addEventListener('click', () => activateTab(item.dataset.target)));

    const initiallyActiveSection = document.querySelector('.content-section.active');
    if (initiallyActiveSection) activateTab(initiallyActiveSection.id);

    uploadForm.addEventListener('submit', async (event) => { /* ... (此函数保持不变) ... */
        event.preventDefault();
        if (submitBenchmarkButton) submitBenchmarkButton.disabled = true;

        const formData = new FormData(uploadForm);
        const data = {
            speedometerScore: parseFloat(formData.get('speedometerScore')) || 0,
            speedometerError: formData.get('speedometerError'),
            browserVersion: formData.get('browserVersion'),
            cpuInfo: formData.get('cpuInfo'),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!data.speedometerScore || !data.speedometerError || !data.browserVersion || !data.cpuInfo) {
            showMessage('请填写所有必填字段。', 'error');
            if (submitBenchmarkButton) submitBenchmarkButton.disabled = false;
            return;
        }

        try {
            await db.collection('speedometer_results').add(data);
            showMessage('结果上传成功！', 'success');
            uploadForm.reset();
            autofillBrowserInfo();
            // 如果上传成功后希望立即刷新结果列表和图表 (如果当前在结果页)
            if (document.getElementById('results-section').classList.contains('active')) {
                loadUploadedResults();
            }
        } catch (error) {
            console.error('上传结果失败:', error);
            showMessage(`上传结果失败: ${error.message || '未知错误'}`, 'error');
        } finally {
            if (submitBenchmarkButton) submitBenchmarkButton.disabled = false;
        }
    });

    // 动态填充筛选器选项
    function populateFilterOptions(data) {
        if (!filterBrowserVersionSelect || !filterCpuInfoSelect) return;

        const uniqueBrowserVersions = [...new Set(data.map(item => item.browserVersion).filter(Boolean))].sort();
        const uniqueCpuInfos = [...new Set(data.map(item => item.cpuInfo).filter(Boolean))].sort();

        // 清空现有选项 (保留 "所有...")
        filterBrowserVersionSelect.innerHTML = '<option value="">所有版本</option>';
        filterCpuInfoSelect.innerHTML = '<option value="">所有CPU</option>';

        uniqueBrowserVersions.forEach(version => {
            const option = document.createElement('option');
            option.value = version;
            option.textContent = version;
            filterBrowserVersionSelect.appendChild(option);
        });

        uniqueCpuInfos.forEach(cpu => {
            const option = document.createElement('option');
            option.value = cpu;
            option.textContent = cpu;
            filterCpuInfoSelect.appendChild(option);
        });
    }
    
    // 应用筛选并重新渲染图表和列表
    function applyFiltersAndRender() {
        if (!allBenchmarkData.length) return; // 如果没有原始数据，则不执行

        const selectedBrowserVersion = filterBrowserVersionSelect.value;
        const selectedCpuInfo = filterCpuInfoSelect.value;

        let filteredData = allBenchmarkData;

        if (selectedBrowserVersion) {
            filteredData = filteredData.filter(item => item.browserVersion === selectedBrowserVersion);
        }
        if (selectedCpuInfo) {
            filteredData = filteredData.filter(item => item.cpuInfo === selectedCpuInfo);
        }
        
        // 渲染列表 (显示所有符合筛选条件的数据)
        renderResultsList(filteredData);

        // 为图表准备数据：按 CPU 型号分组，取每个 CPU 的最高分
        // 如果指定了 CPU 筛选，图表将只显示该 CPU 的最高分
        // 如果没有指定 CPU 筛选，图表将显示所有（符合浏览器筛选的）CPU 的各自最高分
        const chartDataProcessed = {};
        filteredData.forEach(item => {
            const key = item.cpuInfo; // 使用 CPU Info 作为设备标识
            if (!chartDataProcessed[key] || item.speedometerScore > chartDataProcessed[key].score) {
                chartDataProcessed[key] = {
                    device: key,
                    score: item.speedometerScore,
                    // 保留其他信息用于 tooltip
                    browserVersion: item.browserVersion,
                    speedometerError: item.speedometerError,
                    timestamp: item.timestamp
                };
            }
        });
        
        // 将处理后的对象转换为数组给 ECharts
        const chartDataForEcharts = Object.values(chartDataProcessed).sort((a,b) => b.score - a.score); // 按分数降序排列

        renderBenchmarkChart(chartDataForEcharts);
    }

    // 渲染详细数据列表
    function renderResultsList(dataToRender) {
        resultsList.innerHTML = ''; // 清空现有列表
        if (dataToRender.length === 0) {
            resultsList.innerHTML = '<li><p>没有符合筛选条件的结果。</p></li>';
            return;
        }
        dataToRender.forEach(result => {
            const listItem = document.createElement('li');
            const uploadTime = result.timestamp ? result.timestamp.toDate().toLocaleString() : 'N/A';
            listItem.innerHTML = `
                <strong>分数:</strong> ${result.speedometerScore || 'N/A'} (误差: ${result.speedometerError || 'N/A'})<br>
                <strong>浏览器:</strong> ${result.browserVersion || 'N/A'}<br>
                <strong>CPU:</strong> ${result.cpuInfo || 'N/A'}<br>
                <p class="upload-time">上传时间: ${uploadTime}</p>
            `;
            resultsList.appendChild(listItem);
        });
    }


    async function loadUploadedResults() {
        if (!resultsList || !loadingMessage) return;
        
        const chartContainer = document.getElementById('benchmarkChartContainer');
        loadingMessage.style.display = 'block';
        resultsList.style.display = 'none';
        if (chartContainer) chartContainer.style.display = 'none';
        // 重置筛选器选项，但保留当前选中的值（如果存在）
        const currentBrowserFilter = filterBrowserVersionSelect.value;
        const currentCpuFilter = filterCpuInfoSelect.value;

        try {
            const snapshot = await db.collection('speedometer_results')
                .orderBy('timestamp', 'desc')
                .get();
            
            allBenchmarkData = []; // 清空旧的全局数据
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    allBenchmarkData.push(doc.data());
                });
            }
            
            populateFilterOptions(allBenchmarkData); // 用新数据填充筛选器选项
            // 恢复之前的筛选状态
            if (filterBrowserVersionSelect.querySelector(`option[value="${currentBrowserFilter}"]`)) {
                 filterBrowserVersionSelect.value = currentBrowserFilter;
            } else {
                 filterBrowserVersionSelect.value = ""; // 如果旧选项不存在了，则重置
            }
            if (filterCpuInfoSelect.querySelector(`option[value="${currentCpuFilter}"]`)) {
                filterCpuInfoSelect.value = currentCpuFilter;
            } else {
                filterCpuInfoSelect.value = "";
            }


            applyFiltersAndRender(); // 根据筛选（或无筛选）渲染图表和列表

            loadingMessage.style.display = 'none';
            resultsList.style.display = '';
            if (chartContainer) chartContainer.style.display = 'block';

        } catch (error) {
            console.error('加载结果失败:', error);
            loadingMessage.style.display = 'none';
            resultsList.style.display = '';
            if (chartContainer) chartContainer.style.display = 'block';
            resultsList.innerHTML = `<li><p class="error-message">加载结果失败: ${error.message || '未知错误'}</p></li>`;
            if (chartContainer) chartContainer.innerHTML = '<p style="text-align:center; padding-top: 50px; color: red;">图表数据加载失败。</p>';
            allBenchmarkData = []; // 出错时清空数据
            populateFilterOptions([]); // 清空筛选器
        }
    }

    function renderBenchmarkChart(dataForChart) { // dataForChart 是 [{device: 'CPU_A', score: MAX_SCORE_A}, ...]
        const chartContainer = document.getElementById('benchmarkChartContainer');
        if (!echarts || !chartContainer) {
            console.error('ECharts 未加载或图表容器未找到');
            if (chartContainer) chartContainer.innerHTML = '<p style="text-align:center; padding-top: 50px; color: red;">图表初始化失败。</p>';
            return;
        }

        if (benchmarkChart) {
            benchmarkChart.dispose();
        }
        benchmarkChart = echarts.init(chartContainer);

        if (dataForChart.length === 0) {
            chartContainer.innerHTML = '<p style="text-align:center; padding-top: 50px;">没有符合筛选条件的数据可生成图表。</p>';
            // 如果希望在没有数据时也显示一个空的ECharts图表框架，可以清除innerHTML并继续setOption一个空系列
            // benchmarkChart.clear(); // 清除旧内容
            // benchmarkChart.setOption({ /* ... 空图表的配置 ... */ });
            return;
        }
        
        const chartOption = {
            title: {
                text: '设备最高跑分对比 (Speedometer 3.1)',
                left: 'center'
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' }, // 柱状图用 shadow
                formatter: function (params) {
                    const item = params[0]; // 条形图只有一个系列
                    const originalDataItem = dataForChart.find(d => d.device === item.name && d.score === item.value); // 从传入的数据中找到对应项
                    if (originalDataItem) {
                         return `
                            <strong>设备: ${item.name}</strong><br/>
                            最高分数: ${item.value}<br/>
                            浏览器: ${originalDataItem.browserVersion || 'N/A'}<br/>
                            误差: ${originalDataItem.speedometerError || 'N/A'}<br/>
                            记录时间: ${originalDataItem.timestamp ? originalDataItem.timestamp.toDate().toLocaleString() : 'N/A'}
                        `;
                    }
                    return `${item.name}<br/>分数: ${item.value}`;
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: dataForChart.map(item => item.device), // X轴：设备 (CPU Info)
                axisLabel: {
                    interval: 0, //确保所有标签都显示
                    rotate: 30, // 如果标签太长，可以旋转
                    formatter: function (value) { // 标签过长时截断
                        return value.length > 15 ? value.substring(0, 15) + '...' : value;
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: '最高分数'
            },
            dataZoom: [
                { type: 'slider', start: 0, end: dataForChart.length > 10 ? (10 / dataForChart.length * 100) : 100 }, // 如果数据多，默认显示一部分
                { type: 'inside', start: 0, end: 100 }
            ],
            series: [
                {
                    name: '最高分数',
                    type: 'bar', // 修改为条形图
                    barMaxWidth: '60%', // 设置柱子最大宽度
                    data: dataForChart.map(item => item.score), // Y轴：分数
                    itemStyle: {
                        borderRadius: [5, 5, 0, 0] // 柱子顶部圆角
                    },
                    label: { // 在柱子顶部显示数值
                        show: true,
                        position: 'top',
                        formatter: '{c}' // {c} 代表数据值
                    }
                }
            ]
        };
        benchmarkChart.setOption(chartOption);

        window.removeEventListener('resize', resizeChart); // 先移除旧的监听器，防止重复添加
        window.addEventListener('resize', resizeChart);
    }
    
    function resizeChart() {
        if (benchmarkChart) {
            benchmarkChart.resize();
        }
    }

    function showMessage(msg, type) { /* ... (此函数保持不变) ... */
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

    // 事件监听器绑定
    filterBrowserVersionSelect.addEventListener('change', applyFiltersAndRender);
    filterCpuInfoSelect.addEventListener('change', applyFiltersAndRender);
    resetFiltersButton.addEventListener('click', () => {
        filterBrowserVersionSelect.value = '';
        filterCpuInfoSelect.value = '';
        applyFiltersAndRender();
    });

    // 确保首次加载时，如果结果页是激活状态，则加载数据和图表
    if (document.getElementById('results-section')?.classList.contains('active')) {
        loadUploadedResults();
    }
});
