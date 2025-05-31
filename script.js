import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = 'https://pdmmtiiwdazcvcbyxkor.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkbW10aWl3ZGF6Y3ZjYnl4a29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MjM3NTMsImV4cCI6MjA2NDA5OTc1M30.FOebKEr65b9mkWH8rCCePYkeNVCWny52T8SqTtX2cjs';

    const SPEEDOMETER_IFRAME_ORIGIN = '*';

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const sidebarMenuItems = document.querySelectorAll('.sidebar .menu-item');
    const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const uploadForm = document.getElementById('uploadForm');
    const messageDiv = document.getElementById('message');
    const browserVersionInput = document.getElementById('browserVersion');
    const submitBenchmarkButton = document.getElementById('submitBenchmarkButton');
    const benchmarkTypeSelectForm = document.getElementById('benchmarkType');
    const speedometerScoreInput = document.getElementById('speedometerScore');
    const speedometerErrorInput = document.getElementById('speedometerError');
    const cpuInfoInput = document.getElementById('cpuInfo');

    const filterBrowserVersionSelect = document.getElementById('filterBrowserVersion');
    const filterCpuInfoSelect = document.getElementById('filterCpuInfo');
    const resetFiltersButton = document.getElementById('resetFiltersButton');
    const refreshResultsButton = document.getElementById('refreshResultsButton');

    const benchmarkChartContainerBase = document.getElementById('benchmarkChartContainerBase');
    const benchmarkChartContainerWebview = document.getElementById('benchmarkChartContainerWebview');
    const benchmarkChartContainerPeak = document.getElementById('benchmarkChartContainerPeak');

    let benchmarkChartBase = null;
    let benchmarkChartWebview = null;
    let benchmarkChartPeak = null;
    let allBenchmarkData = [];

    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'speedometerResult') {
            const { score, error } = event.data;
            
            if (speedometerScoreInput) speedometerScoreInput.value = score;
            if (speedometerErrorInput) speedometerErrorInput.value = error;

            if (submitBenchmarkButton) {
                if (speedometerScoreInput.value && speedometerErrorInput.value && benchmarkTypeSelectForm.value && cpuInfoInput.value && browserVersionInput.value) {
                    submitBenchmarkButton.click();
                } else {
                    showMessage('Speedometer 跑分完成，请检查并填写所有必填信息后上传。', 'info');
                }
            } else {
                if (speedometerScoreInput.value && speedometerErrorInput.value && benchmarkTypeSelectForm.value && cpuInfoInput.value && browserVersionInput.value) {
                    uploadForm.dispatchEvent(new Event('submit', { cancelable: true }));
                } else {
                    showMessage('Speedometer 跑分完成，请检查并填写所有必填信息后上传。', 'info');
                }
            }
        } else if (event.data && event.data.type === 'speedometerResultError') {
            const { message } = event.data;
            showMessage(`Speedometer 跑分失败: ${message}`, 'error');
        }
    });

    function lockBenchmarkTypeForSafari() {
        const userAgent = navigator.userAgent;
        const isPureSafari = userAgent.includes('Safari') &&
                             !userAgent.includes('Chrome') &&
                             !userAgent.includes('Edg') &&
                             !userAgent.includes('OPR') &&
                             !userAgent.includes('Opera');

        if (isPureSafari) {
            if (benchmarkTypeSelectForm) {
                benchmarkTypeSelectForm.value = 'Peak';
                benchmarkTypeSelectForm.disabled = true;
            }
        } else {
            if (benchmarkTypeSelectForm && benchmarkTypeSelectForm.disabled) {
                benchmarkTypeSelectForm.disabled = false;
            }
        }
    }
    lockBenchmarkTypeForSafari();

    function autofillBrowserInfo() {
        if (!browserVersionInput) return;
        let userAgent = navigator.userAgent;
        let browserName = '未知浏览器';
        let browserVersion = '未知版本';

        if (userAgent.includes('HeyTapBrowser')) {
            browserName = 'OppoBrowser';
            const heyTapBrowserVersion = userAgent.match(/HeyTapBrowser\/(\d+(\.\d+){1,3})/);
            if (heyTapBrowserVersion && heyTapBrowserVersion[1]) {
                browserVersion = heyTapBrowserVersion[1];
            }
            const chromeCoreVersion = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
            if (chromeCoreVersion && chromeCoreVersion[1]) {
                browserVersion += ` (Chrome ${chromeCoreVersion[1]})`;
            }
        }
        else if (userAgent.includes('HuaweiBrowser')) {
            browserName = 'HuaweiBrowser';
            const huaweiBrowserVersion = userAgent.match(/HuaweiBrowser\/(\d+\.\d+\.\d+\.\d+)/);
            if (huaweiBrowserVersion && huaweiBrowserVersion[1]) {
                browserVersion = huaweiBrowserVersion[1];
            }
            const chromeVersionMatch = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
            if (chromeVersionMatch && chromeVersionMatch[1]) {
                browserVersion += ` (Chrome ${chromeVersionMatch[1]})`;
            }
        } else if (userAgent.includes('Edg') || userAgent.includes('EdgA')) {
            browserName = 'Edge';
            const edgeVersion = userAgent.match(/Edg(?:A)?\/(\d+\.\d+\.\d+\.\d+)/);
            if (edgeVersion && edgeVersion[1]) browserVersion = edgeVersion[1];
        } else if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
            browserName = 'Opera';
            const operaVersion = userAgent.match(/(OPR|Opera)\/(\d+\.\d+\.\d+\.\d+)/);
            if (operaVersion && operaVersion[2]) browserVersion = operaVersion[2];
        } else if (userAgent.includes('Chrome')) {
            browserName = 'Chrome';
            const chromeVersion = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
            if (chromeVersion && chromeVersion[1]) browserVersion = chromeVersion[1];
        } else if (userAgent.includes('Firefox')) {
            browserName = 'Firefox';
            const firefoxVersion = userAgent.match(/Firefox\/(\d+\.\d+)/);
            if (firefoxVersion && firefoxVersion[1]) browserVersion = firefoxVersion[1];
        } else if (userAgent.includes('Safari')) {
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

        if (browserName === '未知浏览器') {
            browserVersionInput.value = userAgent;
        } else {
            browserVersionInput.value = `${browserName} ${browserVersion}`;
        }
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
                setTimeout(() => {
                    resizeCharts();
                }, 100);
            }
        }
    }

    sidebarMenuItems.forEach(item => item.addEventListener('click', () => activateTab(item.dataset.target)));
    bottomNavItems.forEach(item => item.addEventListener('click', () => activateTab(item.dataset.target)));

    const initiallyActiveSection = document.querySelector('.content-section.active');
    if (initiallyActiveSection) {
        if (initiallyActiveSection.id === 'results-section') {
            loadUploadedResults();
            setTimeout(() => {
                resizeCharts();
            }, 100);
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
        };

        if (!data.speedometerScore || !data.speedometerError || !data.benchmarkType || !data.browserVersion || !data.cpuInfo) {
            showMessage('请填写所有必填字段，包括跑分类型和 CPU 型号。', 'error');
            if (submitBenchmarkButton) submitBenchmarkButton.disabled = false;
            return;
        }

        try {
            const { data: insertedData, error } = await supabase
                .from('speedometer_results')
                .insert([data]);

            if (error) {
                throw error;
            }

            showMessage('结果上传成功！', 'success');
            uploadForm.reset();
            autofillBrowserInfo();
            lockBenchmarkTypeForSafari();
            if (document.getElementById('results-section').classList.contains('active')) {
                loadUploadedResults();
                setTimeout(() => {
                    resizeCharts();
                }, 100);
            }
        } catch (error) {
            showMessage(`上传结果失败: ${error.message || '未知错误'}`, 'error');
        } finally {
            if (submitBenchmarkButton) submitBenchmarkButton.disabled = false;
        }
    });

    function populateFilterOptions(data) {
        if (!filterBrowserVersionSelect || !filterCpuInfoSelect) return;

        const uniqueBrowserVersions = [...new Set(data.map(item => item.browserVersion).filter(Boolean))].sort();
        const uniqueCpuInfos = [...new Set(data.map(item => item.cpuInfo).filter(Boolean))].sort();

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
        if (!allBenchmarkData.length) {
            clearAndShowNoData(benchmarkChartContainerBase, benchmarkChartBase, 'Peak');
            clearAndShowNoData(benchmarkChartContainerWebview, benchmarkChartWebview, 'Base');
            clearAndShowNoData(benchmarkChartContainerPeak, benchmarkChartPeak, 'Webview');
            return;
        }

        const selectedBrowserVersion = filterBrowserVersionSelect.value;
        const selectedCpuInfo = filterCpuInfoSelect.value;

        let filteredData = allBenchmarkData;

        if (selectedBrowserVersion) {
            filteredData = filteredData.filter(item => item.browserVersion === selectedBrowserVersion);
        }
        if (selectedCpuInfo) {
            filteredData = filteredData.filter(item => item.cpuInfo === selectedCpuInfo);
        }

        const dataForBase = filteredData.filter(item => item.benchmarkType === 'Base');
        const dataForWebview = filteredData.filter(item => item.benchmarkType === 'Webview');
        const dataForPeak = filteredData.filter(item => item.benchmarkType === 'Peak');

        benchmarkChartPeak = renderBenchmarkChart(benchmarkChartContainerPeak, benchmarkChartPeak, dataForPeak, 'Peak');
        benchmarkChartBase = renderBenchmarkChart(benchmarkChartContainerBase, benchmarkChartBase, dataForBase, 'Base');
        benchmarkChartWebview = renderBenchmarkChart(benchmarkChartContainerWebview, benchmarkChartWebview, dataForWebview, 'Webview');
    }

    async function loadUploadedResults() {
        clearAndShowLoading(benchmarkChartContainerPeak, 'Peak');
        clearAndShowLoading(benchmarkChartContainerBase, 'Base');
        clearAndShowLoading(benchmarkChartContainerWebview, 'Webview');

        const currentBrowserFilter = filterBrowserVersionSelect.value;
        const currentCpuFilter = filterCpuInfoSelect.value;

        try {
            const { data, error } = await supabase
                .from('speedometer_results')
                .select('*')
                .order('timestamp', { ascending: false });

            if (error) {
                throw error;
            }

            allBenchmarkData = [];
            if (data && data.length > 0) {
                allBenchmarkData = data;
            }

            populateFilterOptions(allBenchmarkData);

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
            showErrorInChartContainer(benchmarkChartContainerPeak, `Peak 类型图表数据加载失败: ${error.message || '未知错误'}`);
            showErrorInChartContainer(benchmarkChartContainerBase, `Base 类型图表数据加载失败: ${error.message || '未知错误'}`);
            showErrorInChartContainer(benchmarkChartContainerWebview, `Webview 类型图表数据加载失败: ${error.message || '未知错误'}`);
            allBenchmarkData = [];
            populateFilterOptions([]);
        }
    }

    function renderBenchmarkChart(container, chartInstance, data, titlePrefix) {
        if (!echarts || !container) {
            container.innerHTML = `<p style="text-align:center; padding-top: 50px; color: red;">${titlePrefix} 类型图表初始化失败。</p>`;
            return null;
        }

        container.innerHTML = `<h2>${titlePrefix} 类型跑分</h2>`;
        const chartDiv = document.createElement('div');
        chartDiv.style.width = '100%';
        chartDiv.style.height = 'auto';
        chartDiv.style.minHeight = '300px';
        container.appendChild(chartDiv);

        const itemHeight = 15;
        const minChartHeight = 300;
        const calculatedHeight = Math.max(minChartHeight, data.length * itemHeight + 100);
        chartDiv.style.height = `${calculatedHeight}px`;

        if (chartInstance) {
            chartInstance.dispose();
        }
        chartInstance = echarts.init(chartDiv);

        if (data.length === 0) {
            chartDiv.innerHTML = '<p style="text-align:center; padding-top: 50px;">没有符合筛选条件的数据可生成图表。</p>';
            return null;
        }

        const chartDataProcessed = {};
        data.forEach(item => {
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

        const chartDataForEcharts = Object.values(chartDataProcessed).sort((a, b) => b.score - a.score);

        const option = {
            title: {
                text: `${titlePrefix} 类型设备跑分对比 (Speedometer 3.1)`,
                left: 'center',
                top: '12px'
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: function (params) {
                    const item = params[0];
                    const originalDataItem = chartDataForEcharts.find(d => d.device === item.name && d.score === item.value);
                    if (originalDataItem) {
                        const date = originalDataItem.timestamp ? new Date(originalDataItem.timestamp) : null;
                        return `
                            <strong>设备 (CPU): ${item.name}</strong><br/>
                            分数: ${item.value}<br/>
                            跑分类型: ${originalDataItem.benchmarkType || 'N/A'}<br/>
                            浏览器: ${originalDataItem.browserVersion || 'N/A'}<br/>
                            误差: ${originalDataItem.speedometerError || 'N/A'}<br/>
                            记录时间: ${date ? date.toLocaleString() : 'N/A'}
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
                data: chartDataForEcharts.map(item => item.device),
                inverse: true,
                axisLabel: {
                    interval: 0,
                }
            },
            series: [{
                name: '最高分数',
                type: 'bar',
                barMaxWidth: '60%',
                data: chartDataForEcharts.map(item => item.score),
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
        chartInstance.setOption(option, true);
        chartInstance.resize();
        return chartInstance;
    }

    function clearAndShowLoading(container, type) {
        if (container) {
            container.innerHTML = `<h2>${type} 类型跑分</h2><p style="text-align:center; padding-top: 50px;">正在加载数据...</p>`;
            if (type === 'Base' && benchmarkChartBase) {
                benchmarkChartBase.dispose();
                benchmarkChartBase = null;
            } else if (type === 'Webview' && benchmarkChartWebview) {
                benchmarkChartWebview.dispose();
                benchmarkChartWebview = null;
            } else if (type === 'Peak' && benchmarkChartPeak) {
                benchmarkChartPeak.dispose();
                benchmarkChartPeak = null;
            }
        }
    }

    function clearAndShowNoData(container, chartInstance, type) {
        if (container) {
            container.innerHTML = `<h2>${type} 类型跑分</h2><p style="text-align:center; padding-top: 50px;">暂无数据可用于生成图表。</p>`;
            if (chartInstance) {
                chartInstance.dispose();
                chartInstance = null;
            }
        }
    }

    function showErrorInChartContainer(container, errorMessage) {
        if (container) {
            container.innerHTML = `<p style="text-align:center; padding-top: 50px; color: red;">${errorMessage}</p>`;
        }
    }

    function resizeCharts() {
        if (benchmarkChartBase) {
            benchmarkChartBase.resize();
        }
        if (benchmarkChartWebview) {
            benchmarkChartWebview.resize();
        }
        if (benchmarkChartPeak) {
            benchmarkChartPeak.resize();
        }
    }

    window.addEventListener('resize', resizeCharts);

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

    if (filterBrowserVersionSelect) filterBrowserVersionSelect.addEventListener('change', applyFiltersAndRender);
    if (filterCpuInfoSelect) filterCpuInfoSelect.addEventListener('change', applyFiltersAndRender);
    if (resetFiltersButton) {
        resetFiltersButton.addEventListener('click', () => {
            if(filterBrowserVersionSelect) filterBrowserVersionSelect.value = '';
            if(filterCpuInfoSelect) filterCpuInfoSelect.value = '';
            applyFiltersAndRender();
        });
    }
    if (refreshResultsButton) {
        refreshResultsButton.addEventListener('click', () => {
            loadUploadedResults();
        });
    }
});
