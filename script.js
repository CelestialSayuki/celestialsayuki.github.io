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

    const filterBenchmarkTypeSelect = document.getElementById('filterBenchmarkType');
    const filterBrowserVersionSelect = document.getElementById('filterBrowserVersion');
    const filterCpuInfoSelect = document.getElementById('filterCpuInfo');
    const resetFiltersButton = document.getElementById('resetFiltersButton');
    const refreshResultsButton = document.getElementById('refreshResultsButton');
    const benchmarkChartContainer = document.getElementById('benchmarkChartContainer');

    let benchmarkChart = null;
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

        if (userAgent.includes('Edg') || userAgent.includes('EdgA')) {
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
                    resizeChart();
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
                resizeChart();
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
                    resizeChart();
                }, 100);
            }
        } catch (error) {
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
        if (!allBenchmarkData.length) {
            if (benchmarkChart) {
                benchmarkChart.dispose();
                benchmarkChart = null;
            }
            if (benchmarkChartContainer) {
                benchmarkChartContainer.innerHTML = '<p style="text-align:center; padding-top: 50px;">暂无数据可用于生成图表。</p>';
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
        if (benchmarkChartContainer) {
            benchmarkChartContainer.style.display = 'block';
            benchmarkChartContainer.innerHTML = '<p style="text-align:center; padding-top: 50px;">正在加载数据...</p>';
            if (benchmarkChart) {
                benchmarkChart.dispose();
                benchmarkChart = null;
            }
        }

        const currentBenchmarkTypeFilter = filterBenchmarkTypeSelect.value;
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
            if (benchmarkChartContainer) {
                benchmarkChartContainer.style.display = 'block';
                benchmarkChartContainer.innerHTML = `<p style="text-align:center; padding-top: 50px; color: red;">图表数据加载失败: ${error.message || '未知错误'}</p>`;
            }
            allBenchmarkData = [];
            populateFilterOptions([]);
        }
    }

    function renderBenchmarkChart(dataForChart) {
        if (!echarts || !benchmarkChartContainer) {
            if (benchmarkChartContainer) benchmarkChartContainer.innerHTML = '<p style="text-align:center; padding-top: 50px; color: red;">图表初始化失败。</p>';
            return;
        }

        benchmarkChartContainer.innerHTML = '';
        benchmarkChartContainer.style.display = 'block';

        const itemHeight = 35;
        const minChartHeight = 300;
        const calculatedHeight = Math.max(minChartHeight, dataForChart.length * itemHeight + 100);
        benchmarkChartContainer.style.height = `${calculatedHeight}px`; // 将高度设置移到初始化前

        if (benchmarkChart) {
            benchmarkChart.dispose();
        }
        benchmarkChart = echarts.init(benchmarkChartContainer); // ECharts 初始化

        if (dataForChart.length === 0) {
            benchmarkChartContainer.innerHTML = '<p style="text-align:center; padding-top: 50px;">没有符合筛选条件的数据可生成图表。</p>';
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
                        const date = originalDataItem.timestamp ? new Date(originalDataItem.timestamp) : null;
                        return `
                            <strong>设备 (CPU): ${item.name}</strong><br/>
                            最高分数: ${item.value}<br/>
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
                data: dataForChart.map(item => item.device),
                inverse: true,
                axisLabel: {
                    interval: 0,
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
        benchmarkChart.resize(); // 在设置选项后立即调用 resize
    }

    function resizeChart() {
        if (benchmarkChart) {
            benchmarkChart.resize();
        }
    }

    window.addEventListener('resize', resizeChart);

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
    if (refreshResultsButton) {
        refreshResultsButton.addEventListener('click', () => {
            loadUploadedResults();
        });
    }
});
