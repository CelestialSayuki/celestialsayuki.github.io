document.addEventListener('DOMContentLoaded', () => {
    // ****** Firebase 配置 ******
    const firebaseConfig = {
        apiKey: "AIzaSyAdRlF2QHuVPBI86khxM-4YT06VSY0-s_0", // 替换为您的真实配置
        authDomain: "speedometerdatauploader.firebaseapp.com",
        projectId: "speedometerdatauploader",
        storageBucket: "speedometerdatauploader.firebasestorage.app",
        messagingSenderId: "61305463721",
        appId: "1:61305463721:web:6398ea7898ca75ba135ab8"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    // ****** ****************** ******

    // DOM 元素获取
    const sidebarMenuItems = document.querySelectorAll('.sidebar .menu-item');
    const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const uploadForm = document.getElementById('uploadForm');
    const messageDiv = document.getElementById('message');
    const resultsList = document.getElementById('results-list');
    const loadingMessage = document.getElementById('loading-message');
    const browserVersionInput = document.getElementById('browserVersion');
    const submitBenchmarkButton = document.getElementById('submitBenchmarkButton');
    
    // 自定义选择框相关 (上传表单中的跑分类型)
    const benchmarkTypeHiddenInput = document.getElementById('benchmarkType'); // 隐藏的 input
    const customBenchmarkTypeWrapper = document.getElementById('customBenchmarkTypeWrapper');

    // 筛选器元素 (仍然是原生 select)
    const filterBenchmarkTypeSelect = document.getElementById('filterBenchmarkType');
    const filterBrowserVersionSelect = document.getElementById('filterBrowserVersion');
    const filterCpuInfoSelect = document.getElementById('filterCpuInfo');
    const resetFiltersButton = document.getElementById('resetFiltersButton');

    let benchmarkChart = null;
    let allBenchmarkData = [];

    // ****** 自定义选择框初始化和逻辑 ******
    function initializeCustomSelects() {
        // 目前只针对上传表单中的 benchmarkType 进行自定义
        if (!customBenchmarkTypeWrapper) return;

        const wrapper = customBenchmarkTypeWrapper; // 直接使用已获取的wrapper
        const trigger = wrapper.querySelector('.custom-select-trigger');
        const hiddenInput = benchmarkTypeHiddenInput; // 直接使用已获取的hidden input
        const valueDisplay = trigger.querySelector('.custom-select-value');
        const optionsContainer = wrapper.querySelector('.custom-select-options');
        const options = optionsContainer.querySelectorAll('.custom-select-option');

        if (!trigger || !hiddenInput || !valueDisplay || !optionsContainer) return;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (wrapper.classList.contains('disabled')) return;
            // 如果有其他自定义选择框，可以在这里统一关闭，目前只有一个，所以只toggle自己
            // closeAllOtherCustomSelects(wrapper);
            wrapper.classList.toggle('open');
        });

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                if (wrapper.classList.contains('disabled')) return;

                valueDisplay.textContent = option.textContent;
                hiddenInput.value = option.dataset.value;
                
                const changeEvent = new Event('change', { bubbles: true });
                hiddenInput.dispatchEvent(changeEvent);
                
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                wrapper.classList.remove('open');
            });
        });

        // 点击页面其他地方关闭自定义选择框 (如果它是打开的)
        document.addEventListener('click', () => {
            if (wrapper.classList.contains('open')) {
                wrapper.classList.remove('open');
            }
        });
    }
    initializeCustomSelects(); // 初始化页面上的自定义选择框

    // ****** 检测iOS/iPadOS设备 ******
    function isIOSorIPadOS() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
            return true;
        }
        if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) { // iPadOS 13+
            return true;
        }
        return false;
    }

    // ****** 处理iOS/iPadOS设备上的跑分类型选择 ******
    function handleBenchmarkTypeForAppleMobileDevices() {
        if (isIOSorIPadOS()) {
            if (customBenchmarkTypeWrapper && benchmarkTypeHiddenInput) {
                const peakOptionText = "Peak";
                const peakOptionValue = "Peak";

                const valueDisplay = customBenchmarkTypeWrapper.querySelector('.custom-select-value');
                if (valueDisplay) valueDisplay.textContent = peakOptionText;
                
                benchmarkTypeHiddenInput.value = peakOptionValue;

                customBenchmarkTypeWrapper.classList.add('disabled');
                const trigger = customBenchmarkTypeWrapper.querySelector('.custom-select-trigger');
                if (trigger) trigger.removeAttribute('tabindex');

                const optionsContainer = customBenchmarkTypeWrapper.querySelector('.custom-select-options');
                if (optionsContainer) {
                    optionsContainer.querySelectorAll('.custom-select-option').forEach(opt => {
                        opt.classList.remove('selected');
                        if (opt.dataset.value === peakOptionValue) {
                            opt.classList.add('selected');
                        }
                    });
                }
            }
        } else {
            if (customBenchmarkTypeWrapper) {
                customBenchmarkTypeWrapper.classList.remove('disabled');
                const trigger = customBenchmarkTypeWrapper.querySelector('.custom-select-trigger');
                if (trigger) trigger.setAttribute('tabindex', '0');
            }
        }
    }
    handleBenchmarkTypeForAppleMobileDevices();


    function autofillBrowserInfo() {
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

    function activateTab(targetId) {
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
                loadUploadedResults();
            }
        }
    }

    sidebarMenuItems.forEach(item => item.addEventListener('click', () => activateTab(item.dataset.target)));
    bottomNavItems.forEach(item => item.addEventListener('click', () => activateTab(item.dataset.target)));

    const initiallyActiveSection = document.querySelector('.content-section.active');
    if (initiallyActiveSection) activateTab(initiallyActiveSection.id);

    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (submitBenchmarkButton) submitBenchmarkButton.disabled = true;

        const formData = new FormData(uploadForm);
        const data = {
            speedometerScore: parseFloat(formData.get('speedometerScore')) || 0,
            speedometerError: formData.get('speedometerError'),
            benchmarkType: formData.get('benchmarkType'), // FormData 会获取隐藏 input 的值
            browserVersion: formData.get('browserVersion'),
            cpuInfo: formData.get('cpuInfo'),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!data.speedometerScore || !data.speedometerError || !data.benchmarkType || !data.browserVersion || !data.cpuInfo) {
            showMessage('请填写所有必填字段，包括跑分类型。', 'error');
            if (submitBenchmarkButton) submitBenchmarkButton.disabled = false;
            return;
        }

        try {
            await db.collection('speedometer_results').add(data);
            showMessage('结果上传成功！', 'success');
            uploadForm.reset();
            autofillBrowserInfo();
            
            // 表单重置后，自定义选择框需要手动恢复显示和隐藏 input 的值
            if (customBenchmarkTypeWrapper && benchmarkTypeHiddenInput) {
                const defaultOption = customBenchmarkTypeWrapper.querySelector('.custom-select-option[data-value="Base"]'); // 或者第一个选项
                const valueDisplay = customBenchmarkTypeWrapper.querySelector('.custom-select-value');
                if (defaultOption && valueDisplay) {
                    valueDisplay.textContent = defaultOption.textContent;
                    benchmarkTypeHiddenInput.value = defaultOption.dataset.value;
                    customBenchmarkTypeWrapper.querySelectorAll('.custom-select-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    defaultOption.classList.add('selected');
                }
            }
            handleBenchmarkTypeForAppleMobileDevices(); // 再次应用 iOS/iPadOS 逻辑
            
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

    function populateFilterOptions(data) {
        if (!filterBenchmarkTypeSelect || !filterBrowserVersionSelect || !filterCpuInfoSelect) return;

        const uniqueBenchmarkTypes = [...new Set(data.map(item => item.benchmarkType).filter(Boolean))].sort();
        const uniqueBrowserVersions = [...new Set(data.map(item => item.browserVersion).filter(Boolean))].sort();
        const uniqueCpuInfos = [...new Set(data.map(item => item.cpuInfo).filter(Boolean))].sort();

        filterBenchmarkTypeSelect.innerHTML = '<option value="">所有类型</option>';
        uniqueBenchmarkTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            filterBenchmarkTypeSelect.appendChild(option);
        });

        filterBrowserVersionSelect.innerHTML = '<option value="">所有版本</option>';
        uniqueBrowserVersions.forEach(version => {
            const option = document.createElement('option');
            option.value = version;
            option.textContent = version;
            filterBrowserVersionSelect.appendChild(option);
        });

        filterCpuInfoSelect.innerHTML = '<option value="">所有CPU</option>';
        uniqueCpuInfos.forEach(cpu => {
            const option = document.createElement('option');
            option.value = cpu;
            option.textContent = cpu;
            filterCpuInfoSelect.appendChild(option);
        });
    }
    
    function applyFiltersAndRender() {
        if (!allBenchmarkData.length && benchmarkChart) {
            benchmarkChart.dispose();
            benchmarkChart = null;
            const chartContainer = document.getElementById('benchmarkChartContainer');
            if(chartContainer) chartContainer.innerHTML = '<p style="text-align:center; padding-top: 50px;">暂无数据可用于生成图表。</p>';
            renderResultsList([]);
            return;
        }
        if (!allBenchmarkData.length) {
             renderResultsList([]);
             const chartContainer = document.getElementById('benchmarkChartContainer');
             if(chartContainer) chartContainer.innerHTML = '<p style="text-align:center; padding-top: 50px;">暂无数据可用于生成图表。</p>';
            return;
        }

        const selectedBenchmarkType = filterBenchmarkTypeSelect.value;
        const selectedBrowserVersion = filterBrowserVersionSelect.value;
        const selectedCpuInfo = filterCpuInfoSelect.value;

        let filteredData = allBenchmarkData;

        if (selectedBenchmarkType) {
            filteredData = filteredData.filter(item => item.benchmarkType === selectedBenchmarkType);
        }
        if (selectedBrowserVersion) {
            filteredData = filteredData.filter(item => item.browserVersion === selectedBrowserVersion);
        }
        if (selectedCpuInfo) {
            filteredData = filteredData.filter(item => item.cpuInfo === selectedCpuInfo);
        }
        
        renderResultsList(filteredData);

        const chartDataProcessed = {};
        filteredData.forEach(item => {
            const key = item.cpuInfo;
            if (!chartDataProcessed[key] || item.speedometerScore > chartDataProcessed[key].score) {
                chartDataProcessed[key] = {
                    device: key,
                    score: item.speedometerScore,
                    benchmarkType: item.benchmarkType,
                    browserVersion: item.browserVersion,
                    speedometerError: item.speedometerError,
                    timestamp: item.timestamp
                };
            }
        });
        
        const chartDataForEcharts = Object.values(chartDataProcessed).sort((a,b) => b.score - a.score);

        renderBenchmarkChart(chartDataForEcharts);
    }

    function renderResultsList(dataToRender) {
        resultsList.innerHTML = '';
        if (dataToRender.length === 0) {
            resultsList.innerHTML = '<li><p>没有符合筛选条件的结果。</p></li>';
            return;
        }
        dataToRender.forEach(result => {
            const listItem = document.createElement('li');
            const uploadTime = result.timestamp ? result.timestamp.toDate().toLocaleString() : 'N/A';
            listItem.innerHTML = `
                <strong>分数:</strong> ${result.speedometerScore || 'N/A'} (误差: ${result.speedometerError || 'N/A'})<br>
                <strong>类型:</strong> ${result.benchmarkType || 'N/A'}<br>
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
        
        const currentBenchmarkTypeFilter = filterBenchmarkTypeSelect.value;
        const currentBrowserFilter = filterBrowserVersionSelect.value;
        const currentCpuFilter = filterCpuInfoSelect.value;

        try {
            const snapshot = await db.collection('speedometer_results')
                .orderBy('timestamp', 'desc')
                .get();
            
            allBenchmarkData = [];
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    allBenchmarkData.push(doc.data());
                });
            }
            
            populateFilterOptions(allBenchmarkData);
            
            if (filterBenchmarkTypeSelect.querySelector(`option[value="${currentBenchmarkTypeFilter}"]`)) {
                 filterBenchmarkTypeSelect.value = currentBenchmarkTypeFilter;
            } else {
                 filterBenchmarkTypeSelect.value = "";
            }
            if (filterBrowserVersionSelect.querySelector(`option[value="${currentBrowserFilter}"]`)) {
                 filterBrowserVersionSelect.value = currentBrowserFilter;
            } else {
                 filterBrowserVersionSelect.value = "";
            }
            if (filterCpuInfoSelect.querySelector(`option[value="${currentCpuFilter}"]`)) {
                filterCpuInfoSelect.value = currentCpuFilter;
            } else {
                filterCpuInfoSelect.value = "";
            }

            applyFiltersAndRender();

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
            allBenchmarkData = [];
            populateFilterOptions([]);
        }
    }

    function renderBenchmarkChart(dataForChart) {
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
            return;
        }
        
        const chartOption = {
            title: {
                text: '设备最高跑分对比 (Speedometer 3.1)',
                left: 'center'
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: function (params) {
                    const item = params[0];
                    const originalDataItem = dataForChart.find(d => d.device === item.name && d.score === item.value);
                    if (originalDataItem) {
                         return `
                            <strong>设备 (CPU): ${item.name}</strong><br/>
                            最高分数: ${item.value}<br/>
                            跑分类型: ${originalDataItem.benchmarkType || 'N/A'}<br/>
                            浏览器: ${originalDataItem.browserVersion || 'N/A'}<br/>
                            误差: ${originalDataItem.speedometerError || 'N/A'}<br/>
                            记录时间: ${originalDataItem.timestamp ? originalDataItem.timestamp.toDate().toLocaleString() : 'N/A'}
                        `;
                    }
                    return `${item.name}<br/>分数: ${item.value}`;
                }
            },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: {
                type: 'category',
                data: dataForChart.map(item => item.device),
                axisLabel: { interval: 0, rotate: 30, formatter: function (value) { return value.length > 15 ? value.substring(0, 15) + '...' : value; } }
            },
            yAxis: { type: 'value', name: '最高分数' },
            dataZoom: [
                { type: 'slider', start: 0, end: dataForChart.length > 10 ? (10 / dataForChart.length * 100) : 100 },
                { type: 'inside', start: 0, end: 100 }
            ],
            series: [{
                name: '最高分数',
                type: 'bar',
                barMaxWidth: '60%',
                data: dataForChart.map(item => item.score),
                itemStyle: { borderRadius: [5, 5, 0, 0] },
                label: { show: true, position: 'top', formatter: '{c}' }
            }]
        };
        benchmarkChart.setOption(chartOption, true);

        window.removeEventListener('resize', resizeChart);
        window.addEventListener('resize', resizeChart);
    }
    
    function resizeChart() {
        if (benchmarkChart) {
            benchmarkChart.resize();
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

    // 事件监听器绑定
    filterBenchmarkTypeSelect.addEventListener('change', applyFiltersAndRender);
    filterBrowserVersionSelect.addEventListener('change', applyFiltersAndRender);
    filterCpuInfoSelect.addEventListener('change', applyFiltersAndRender);
    resetFiltersButton.addEventListener('click', () => {
        filterBenchmarkTypeSelect.value = '';
        filterBrowserVersionSelect.value = '';
        filterCpuInfoSelect.value = '';
        applyFiltersAndRender();
    });

    if (document.getElementById('results-section')?.classList.contains('active')) {
        loadUploadedResults();
    }
});
