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

    const filterBrowserVersionCheckboxesContainer = document.getElementById('filterBrowserVersionCheckboxes');
    const selectAllBrowserButton = document.getElementById('selectAllBrowserButton');
    const deselectAllBrowserButton = document.getElementById('deselectAllBrowserButton');
    const filterCpuInfoCheckboxesContainer = document.getElementById('filterCpuInfoCheckboxes');
    const selectAllCpuButton = document.getElementById('selectAllCpuButton');
    const deselectAllCpuButton = document.getElementById('deselectAllCpuButton');

    const resetFiltersButton = document.getElementById('resetFiltersButton');
    const refreshResultsButton = document.getElementById('refreshResultsButton');

    const benchmarkChartContainerBase = document.getElementById('benchmarkChartContainerBase');
    const benchmarkChartContainerWebview = document.getElementById('benchmarkChartContainerWebview');
    const benchmarkChartContainerPeak = document.getElementById('benchmarkChartContainerPeak');

    let benchmarkChartBase = null;
    let benchmarkChartWebview = null;
    let benchmarkChartPeak = null;
    let allBenchmarkData = [];

    const TARGET_MANUFACTURERS = ['Intel', 'AMD', 'Apple', 'Google'];

    function isTargetManufacturer(cpuInfo) {
        if (!cpuInfo) return false;
        const firstWord = cpuInfo.split(' ')[0];
        return TARGET_MANUFACTURERS.includes(firstWord);
    }

    function processChartDataForEcharts(dataArray, isPeakChart = false) {
        const chartDataProcessed = {};
        dataArray.forEach(item => {
            const key = item.cpuInfo;
            if (!chartDataProcessed[key] || item.speedometerScore > chartDataProcessed[key].score) {
                chartDataProcessed[key] = {
                    device: key,
                    score: item.speedometerScore,
                    benchmarkType: item.benchmarkType,
                    browserVersion: item.browserVersion,
                    speedometerError: item.speedometerError,
                    timestamp: item.timestamp,
                    isPeakData: isPeakChart ? true : (item.isPeakData || false)
                };
            }
        });
        return Object.values(chartDataProcessed).sort((a, b) => b.score - a.score);
    }

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
        if (!filterBrowserVersionCheckboxesContainer || !filterCpuInfoCheckboxesContainer) return;

        const uniqueBrowserVersions = [...new Set(data.map(item => item.browserVersion).filter(Boolean))].sort();
        const uniqueCpuInfos = [...new Set(data.map(item => item.cpuInfo).filter(Boolean))].sort();

        filterBrowserVersionCheckboxesContainer.innerHTML = '';
        uniqueBrowserVersions.forEach(version => {
            const checkboxId = `browser-${version.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const checkboxHtml = `
                <label for="${checkboxId}">
                    <input type="checkbox" id="${checkboxId}" value="${version}" name="filterBrowserVersion">
                    ${version}
                </label>
            `;
            filterBrowserVersionCheckboxesContainer.insertAdjacentHTML('beforeend', checkboxHtml);
        });
        filterBrowserVersionCheckboxesContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', applyFiltersAndRender);
        });

        filterCpuInfoCheckboxesContainer.innerHTML = '';
        uniqueCpuInfos.forEach(cpu => {
            const checkboxId = `cpu-${cpu.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const checkboxHtml = `
                <label for="${checkboxId}">
                    <input type="checkbox" id="${checkboxId}" value="${cpu}" name="filterCpuInfo">
                    ${cpu}
                </label>
            `;
            filterCpuInfoCheckboxesContainer.insertAdjacentHTML('beforeend', checkboxHtml);
        });
        filterCpuInfoCheckboxesContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', applyFiltersAndRender);
        });
    }

    function applyFiltersAndRender() {
        if (!allBenchmarkData.length) {
            showNoDataState(benchmarkChartContainerPeak, benchmarkChartPeak, 'Peak');
            showNoDataState(benchmarkChartContainerBase, benchmarkChartBase, 'Base');
            showNoDataState(benchmarkChartContainerWebview, benchmarkChartWebview, 'Webview');
            return;
        }

        const selectedBrowserVersions = Array.from(filterBrowserVersionCheckboxesContainer.querySelectorAll('input[name="filterBrowserVersion"]:checked'))
                                             .map(checkbox => checkbox.value);
        const selectedCpuInfos = Array.from(filterCpuInfoCheckboxesContainer.querySelectorAll('input[name="filterCpuInfo"]:checked'))
                                           .map(checkbox => checkbox.value);

        let filteredData = allBenchmarkData;

        if (selectedBrowserVersions.length > 0) {
            filteredData = filteredData.filter(item => selectedBrowserVersions.includes(item.browserVersion));
        }
        if (selectedCpuInfos.length > 0) {
            filteredData = filteredData.filter(item => selectedCpuInfos.includes(item.cpuInfo));
        }

        const rawDataForBase = filteredData.filter(item => item.benchmarkType === 'Base');
        const rawDataForWebview = filteredData.filter(item => item.benchmarkType === 'Webview');
        const rawDataForPeak = filteredData.filter(item => item.benchmarkType === 'Peak');

        const peakScoresMap = new Map();
        rawDataForPeak.forEach(item => {
            if (!peakScoresMap.has(item.cpuInfo) || item.speedometerScore > peakScoresMap.get(item.cpuInfo).speedometerScore) {
                peakScoresMap.set(item.cpuInfo, item);
            }
        });

        const intermediateDataForBaseChart = [];
        const processedBaseCpuInfos = new Set();

        rawDataForBase.forEach(item => {
            let itemToAdd = { ...item, isPeakData: false };
            if (isTargetManufacturer(item.cpuInfo)) {
                const peakData = peakScoresMap.get(item.cpuInfo);
                if (peakData) {
                    itemToAdd.speedometerScore = peakData.speedometerScore;
                    itemToAdd.speedometerError = peakData.speedometerError;
                    itemToAdd.timestamp = peakData.timestamp;
                    itemToAdd.isPeakData = true;
                }
            }
            intermediateDataForBaseChart.push(itemToAdd);
            processedBaseCpuInfos.add(itemToAdd.cpuInfo);
        });

        peakScoresMap.forEach((peakItem, cpuInfo) => {
            if (isTargetManufacturer(cpuInfo) && !processedBaseCpuInfos.has(cpuInfo)) {
                intermediateDataForBaseChart.push({
                    ...peakItem,
                    benchmarkType: 'Base',
                    isPeakData: true,
                });
                processedBaseCpuInfos.add(cpuInfo);
            }
        });

        const intermediateDataForWebviewChart = [];
        const processedWebviewCpuInfos = new Set();

        rawDataForWebview.forEach(item => {
            let itemToAdd = { ...item, isPeakData: false };
            if (isTargetManufacturer(item.cpuInfo)) {
                const peakData = peakScoresMap.get(item.cpuInfo);
                if (peakData) {
                    itemToAdd.speedometerScore = peakData.speedometerScore;
                    itemToAdd.speedometerError = peakData.speedometerError;
                    itemToAdd.timestamp = peakData.timestamp;
                    itemToAdd.isPeakData = true;
                }
            }
            intermediateDataForWebviewChart.push(itemToAdd);
            processedWebviewCpuInfos.add(itemToAdd.cpuInfo);
        });

        peakScoresMap.forEach((peakItem, cpuInfo) => {
            if (isTargetManufacturer(cpuInfo) && !processedWebviewCpuInfos.has(cpuInfo)) {
                intermediateDataForWebviewChart.push({
                    ...peakItem,
                    benchmarkType: 'Webview',
                    isPeakData: true,
                });
                processedWebviewCpuInfos.add(cpuInfo);
            }
        });
        const finalChartDataForPeak = processChartDataForEcharts(rawDataForPeak, true);
        const finalChartDataForBase = processChartDataForEcharts(intermediateDataForBaseChart);
        const finalChartDataForWebview = processChartDataForEcharts(intermediateDataForWebviewChart);

        renderBenchmarkChart(benchmarkChartContainerPeak, benchmarkChartPeak, finalChartDataForPeak, 'Peak');
        renderBenchmarkChart(benchmarkChartContainerBase, benchmarkChartBase, finalChartDataForBase, 'Base');
        renderBenchmarkChart(benchmarkChartContainerWebview, benchmarkChartWebview, finalChartDataForWebview, 'Webview');
    }

    async function loadUploadedResults() {
        showLoadingState(benchmarkChartContainerPeak, 'Peak');
        showLoadingState(benchmarkChartContainerBase, 'Base');
        showLoadingState(benchmarkChartContainerWebview, 'Webview');

        const currentSelectedBrowserVersions = Array.from(filterBrowserVersionCheckboxesContainer.querySelectorAll('input[name="filterBrowserVersion"]:checked'))
                                             .map(checkbox => checkbox.value);
        const currentSelectedCpuInfos = Array.from(filterCpuInfoCheckboxesContainer.querySelectorAll('input[name="filterCpuInfo"]:checked'))
                                           .map(checkbox => checkbox.value);

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

            filterBrowserVersionCheckboxesContainer.querySelectorAll('input[name="filterBrowserVersion"]').forEach(checkbox => {
                if (currentSelectedBrowserVersions.includes(checkbox.value)) {
                    checkbox.checked = true;
                }
            });
            filterCpuInfoCheckboxesContainer.querySelectorAll('input[name="filterCpuInfo"]').forEach(checkbox => {
                if (currentSelectedCpuInfos.includes(checkbox.value)) {
                    checkbox.checked = true;
                }
            });

            applyFiltersAndRender();

        } catch (error) {
            showErrorInChartContainer(benchmarkChartContainerPeak, `Peak 类型图表数据加载失败: ${error.message || '未知错误'}`);
            showErrorInChartContainer(benchmarkChartContainerBase, `Base 类型图表数据加载失败: ${error.message || '未知错误'}`);
            showErrorInChartContainer(benchmarkChartContainerWebview, `Webview 类型图表数据加载失败: ${error.message || '未知错误'}`);
            allBenchmarkData = [];
            populateFilterOptions([]);
        }
    }

    function renderBenchmarkChart(container, chartInstance, chartDataForEcharts, titlePrefix) {
        let chartContentWrapper = container.querySelector('.chart-content-wrapper');
        let chartMessageOverlay = container.querySelector('.chart-message-overlay');

        if (!chartContentWrapper) {
            chartContentWrapper = document.createElement('div');
            chartContentWrapper.classList.add('chart-content-wrapper');
            Array.from(container.children).forEach(child => {
                if (child.tagName !== 'H2') {
                    chartContentWrapper.appendChild(child);
                }
            });
            container.appendChild(chartContentWrapper);
        } else {
            chartContentWrapper.innerHTML = '';
        }

        if (!chartMessageOverlay) {
            chartMessageOverlay = document.createElement('div');
            chartMessageOverlay.classList.add('chart-message-overlay');
            container.appendChild(chartMessageOverlay);
        }

        chartContentWrapper.style.opacity = '0';
        chartMessageOverlay.classList.add('active');
        chartMessageOverlay.innerHTML = `<p>正在加载数据...</p>`;


        if (!echarts || !container) {
            chartMessageOverlay.innerHTML = `<p style="color: red;">${titlePrefix} 类型图表初始化失败。</p>`;
            container.classList.remove('chart-hidden');
            container.style.display = 'block';
            container.style.height = '';
            container.style.marginBottom = '';
            container.style.paddingTop = '';
            container.style.paddingBottom = '';
            container.style.border = '';
            return null;
        }

        if (chartInstance) {
            chartInstance.dispose();
        }

        if (chartDataForEcharts.length === 0) {
            chartMessageOverlay.innerHTML = '<p>没有符合筛选条件的数据可生成图表。</p>';
            container.classList.add('chart-hidden');
            container.addEventListener('transitionend', function handler() {
                if (container.classList.contains('chart-hidden')) {
                    container.style.display = 'none';
                }
                container.removeEventListener('transitionend', handler);
            }, { once: true });
            return null;
        } else {
            container.style.display = 'block';
            requestAnimationFrame(() => {
                container.classList.remove('chart-hidden');
                container.style.height = '';
                container.style.marginBottom = '';
                container.style.paddingTop = '';
                container.style.paddingBottom = '';
                container.style.border = '';
            });

            setTimeout(() => {
                chartMessageOverlay.classList.remove('active');
                chartContentWrapper.style.opacity = '1';

                const chartDiv = document.createElement('div');
                chartDiv.style.width = '100%';
                chartDiv.style.height = 'auto';
                chartContentWrapper.appendChild(chartDiv);

                const itemHeight = 25;
                const minChartHeight = 100;
                const calculatedHeight = Math.max(minChartHeight, chartDataForEcharts.length * itemHeight + 100);
                chartDiv.style.height = `${calculatedHeight}px`;

                chartInstance = echarts.init(chartDiv);

                const option = {
                    title: {
                        text: `${titlePrefix} 类型设备最高跑分对比 (Speedometer 3.1)`,
                        left: 'center',
                        top: '10px'
                    },
                    tooltip: {
                        trigger: 'axis',
                        axisPointer: { type: 'shadow' },
                        formatter: function (params) {
                            const item = params[0];
                            const originalDataItem = chartDataForEcharts.find(d => d.device === item.name && d.score === item.value);
                            if (originalDataItem) {
                                const date = originalDataItem.timestamp ? new Date(originalDataItem.timestamp) : null;
                                let scoreInfo = `最高分数: ${item.value}<br/>`;

                                return `
                                    <strong>设备 (CPU): ${item.name}</strong><br/>
                                    ${scoreInfo}
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
                        data: chartDataForEcharts.map(item => ({
                            value: item.score,
                            itemStyle: {
                                color: item.isPeakData ? '#ffa500' : '#007bff'
                            }
                        })),
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
            }, 300);
        }
        return chartInstance;
    }

    function showLoadingState(container, type) {
        let chartContentWrapper = container.querySelector('.chart-content-wrapper');
        let chartMessageOverlay = container.querySelector('.chart-message-overlay');

        if (!chartContentWrapper) {
            chartContentWrapper = document.createElement('div');
            chartContentWrapper.classList.add('chart-content-wrapper');
            Array.from(container.children).forEach(child => {
                if (child.tagName !== 'H2') {
                    chartContentWrapper.appendChild(child);
                }
            });
            container.appendChild(chartContentWrapper);
        } else {
            chartContentWrapper.style.opacity = '0';
        }

        if (!chartMessageOverlay) {
            chartMessageOverlay = document.createElement('div');
            chartMessageOverlay.classList.add('chart-message-overlay');
            container.appendChild(chartMessageOverlay);
        }

        container.classList.remove('chart-hidden');
        container.style.display = 'block';
        container.style.height = '';
        container.style.marginBottom = '';
        container.style.paddingTop = '';
        container.style.paddingBottom = '';
        container.style.border = '';

        chartMessageOverlay.innerHTML = `<p>正在加载数据...</p>`;
        chartMessageOverlay.classList.add('active');

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

    function showNoDataState(container, chartInstance, type) {
        let chartContentWrapper = container.querySelector('.chart-content-wrapper');
        let chartMessageOverlay = container.querySelector('.chart-message-overlay');

        if (!chartContentWrapper) {
            chartContentWrapper = document.createElement('div');
            chartContentWrapper.classList.add('chart-content-wrapper');
            Array.from(container.children).forEach(child => {
                if (child.tagName !== 'H2') {
                    chartContentWrapper.appendChild(child);
                }
            });
            container.appendChild(chartContentWrapper);
        } else {
            chartContentWrapper.style.opacity = '0';
        }

        if (!chartMessageOverlay) {
            chartMessageOverlay = document.createElement('div');
            chartMessageOverlay.classList.add('chart-message-overlay');
            container.appendChild(chartMessageOverlay);
        }

        chartMessageOverlay.innerHTML = `<p>暂无数据可用于生成图表。</p>`;
        chartMessageOverlay.classList.add('active');

        container.classList.add('chart-hidden');
        container.addEventListener('transitionend', function handler() {
            if (container.classList.contains('chart-hidden')) {
                container.style.display = 'none';
            }
            container.removeEventListener('transitionend', handler);
        }, { once: true });

        if (chartInstance) {
            chartInstance.dispose();
            chartInstance = null;
        }
    }

    function showErrorInChartContainer(container, errorMessage) {
        let chartContentWrapper = container.querySelector('.chart-content-wrapper');
        let chartMessageOverlay = container.querySelector('.chart-message-overlay');

        if (!chartContentWrapper) {
            chartContentWrapper = document.createElement('div');
            chartContentWrapper.classList.add('chart-content-wrapper');
            Array.from(container.children).forEach(child => {
                if (child.tagName !== 'H2') {
                    chartContentWrapper.appendChild(child);
                }
            });
            container.appendChild(chartContentWrapper);
        } else {
            chartContentWrapper.style.opacity = '0';
        }

        if (!chartMessageOverlay) {
            chartMessageOverlay = document.createElement('div');
            chartMessageOverlay.classList.add('chart-message-overlay');
            container.appendChild(chartMessageOverlay);
        }

        chartMessageOverlay.innerHTML = `<p style="color: red;">${errorMessage}</p>`;
        chartMessageOverlay.classList.add('active');

        container.classList.remove('chart-hidden');
        container.style.display = 'block';
        container.style.height = '';
        container.style.marginBottom = '';
        container.style.paddingTop = '';
        container.style.paddingBottom = '';
        container.style.border = '';
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

    if (selectAllBrowserButton) {
        selectAllBrowserButton.addEventListener('click', () => {
            filterBrowserVersionCheckboxesContainer.querySelectorAll('input[name="filterBrowserVersion"]').forEach(checkbox => {
                checkbox.checked = true;
            });
            applyFiltersAndRender();
        });
    }

    if (deselectAllBrowserButton) {
        deselectAllBrowserButton.addEventListener('click', () => {
            filterBrowserVersionCheckboxesContainer.querySelectorAll('input[name="filterBrowserVersion"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            applyFiltersAndRender();
        });
    }

    if (selectAllCpuButton) {
        selectAllCpuButton.addEventListener('click', () => {
            filterCpuInfoCheckboxesContainer.querySelectorAll('input[name="filterCpuInfo"]').forEach(checkbox => {
                checkbox.checked = true;
            });
            applyFiltersAndRender();
        });
    }

    if (deselectAllCpuButton) {
        deselectAllCpuButton.addEventListener('click', () => {
            filterCpuInfoCheckboxesContainer.querySelectorAll('input[name="filterCpuInfo"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            applyFiltersAndRender();
        });
    }

    if (resetFiltersButton) {
        resetFiltersButton.addEventListener('click', () => {
            if(filterBrowserVersionCheckboxesContainer) {
                filterBrowserVersionCheckboxesContainer.querySelectorAll('input[name="filterBrowserVersion"]').forEach(checkbox => {
                    checkbox.checked = false;
                });
            }
            if(filterCpuInfoCheckboxesContainer) {
                filterCpuInfoCheckboxesContainer.querySelectorAll('input[name="filterCpuInfo"]').forEach(checkbox => {
                    checkbox.checked = false;
                });
            }
            applyFiltersAndRender();
        });
    }
    if (refreshResultsButton) {
        refreshResultsButton.addEventListener('click', () => {
            loadUploadedResults();
        });
    }
});
