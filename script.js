document.addEventListener('DOMContentLoaded', () => {
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

    const sidebarMenuItems = document.querySelectorAll('.sidebar .menu-item');
    const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const uploadForm = document.getElementById('uploadForm');
    const messageDiv = document.getElementById('message');
    const browserVersionInput = document.getElementById('browserVersion');
    const submitBenchmarkButton = document.getElementById('submitBenchmarkButton');
    const benchmarkTypeSelectForm = document.getElementById('benchmarkType');

    const filterBenchmarkTypeSelect = document.getElementById('filterBenchmarkType');
    const filterBrowserVersionSelect = document.getElementById('filterBrowserVersion');
    const filterCpuInfoSelect = document.getElementById('filterCpuInfo');
    const resetFiltersButton = document.getElementById('resetFiltersButton');

    let benchmarkChart = null;
    let allBenchmarkData = [];

    function isIOSorIPadOS() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
            return true;
        }
        if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
            return true;
        }
        return false;
    }

    function handleBenchmarkTypeForAppleMobileDevices() {
        if (isIOSorIPadOS()) {
            if (benchmarkTypeSelectForm) {
                benchmarkTypeSelectForm.value = 'Peak';
                benchmarkTypeSelectForm.disabled = true;
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
        } else if (userAgent.includes('Chrome') && !userAgent.includes('Safari') && !userAgent.includes('Edg')) {
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
    if (initiallyActiveSection) {
        if (initiallyActiveSection.id === 'results-section') {
            loadUploadedResults();
        } else {
            activateTab(initiallyActiveSection.id);
        }
    }

    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (submitBenchmarkButton) submitBenchmarkButton.disabled = true;

        const formData = new FormData(uploadForm);
        const data = {
            speedometerScore: parseFloat(formData.get('speedometerScore')) || 0,
            speedometerError: formData.get('speedometerError'),
            benchmarkType: benchmarkTypeSelectForm.value,
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
            handleBenchmarkTypeForAppleMobileDevices();
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
        const chartContainer = document.getElementById('benchmarkChartContainer');

        if (!allBenchmarkData.length) {
            if (benchmarkChart) {
                benchmarkChart.dispose();
                benchmarkChart = null;
            }
            if (chartContainer) {
                chartContainer.innerHTML = '<p style="text-align:center; padding-top: 50px;">暂无数据可用于生成图表。</p>';
            }
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

    async function loadUploadedResults() {
        const chartContainer = document.getElementById('benchmarkChartContainer');

        if (chartContainer) {
            chartContainer.style.display = 'block';
        }

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

        } catch (error) {
            console.error('加载结果失败:', error);
            if (chartContainer) {
                chartContainer.style.display = 'block';
                chartContainer.innerHTML = `<p style="text-align:center; padding-top: 50px; color: red;">图表数据加载失败: ${error.message || '未知错误'}</p>`;
            }
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

        chartContainer.style.display = 'block';

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
                            记录时间: ${originalDataItem.timestamp && originalDataItem.timestamp.toDate ? originalDataItem.timestamp.toDate().toLocaleString() : 'N/A'}
                        `;
                    }
                    return `${item.name}<br/>分数: ${item.value}`;
                }
            },
            grid: {
                left: '10%',
                right: '8%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: '最高分数',
                nameLocation: 'center',
                nameGap: 20
            },
            yAxis: {
                type: 'category',
                data: dataForChart.map(item => item.device),
                inverse: true,
                axisLabel: {
                    interval: 0,
                    formatter: function (value) {
                        return value.length > 25 ? value.substring(0, 25) + '...' : value;
                    }
                }
            },
            series: [{
                name: '最高分数',
                type: 'bar',
                barMaxWidth: '60%',
                data: dataForChart.map(item => item.score),
                itemStyle: {
                    borderRadius: [0, 5, 5, 0]
                },
                label: {
                    show: true,
                    position: 'right',
                    formatter: '{c}'
                }
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
                messageDiv.classList.add('hidden');
            }, 500);
        }, 5000);
    }

    if (filterBenchmarkTypeSelect) filterBenchmarkTypeSelect.addEventListener('change', applyFiltersAndRender);
    if (filterBrowserVersionSelect) filterBrowserVersionSelect.addEventListener('change', applyFiltersAndRender);
    if (filterCpuInfoSelect) filterCpuInfoSelect.addEventListener('change', applyFiltersAndRender);
    if (resetFiltersButton) {
        resetFiltersButton.addEventListener('click', () => {
            if(filterBenchmarkTypeSelect) filterBenchmarkTypeSelect.value = '';
            if(filterBrowserVersionSelect) filterBrowserVersionSelect.value = '';
            if(filterCpuInfoSelect) filterCpuInfoSelect.value = '';
            applyFiltersAndRender();
        });
    }
});
