/**
 * KEUANGANKU - CHARTS.JS
 * Fungsi Grafik Chart.js
 * Digunakan oleh: index.html, grafik.html
 */

// ============================================
// CHART INSTANCES (Global)
// ============================================
let barChartInstance = null;
let pieChartInstance = null;
let lineChartInstance = null;

// ============================================
// DATA PROCESSING
// ============================================

/**
 * Proses data untuk grafik
 * @param {Array} transactions - Array transaksi
 * @returns {Object} Data terproses untuk chart
 */
function processChartData(transactions) {
    if (!transactions || transactions.length === 0) {
        return null;
    }

    // Sort by date
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 1. Monthly data (Bar Chart)
    const monthlyData = {};
    transactions.forEach(t => {
        const monthKey = t.date.substring(0, 7); // YYYY-MM
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { income: 0, expense: 0 };
        }
        monthlyData[monthKey][t.type] += t.amount;
    });

    const months = Object.keys(monthlyData);
    const last6Months = months.slice(-6); // Ambil 6 bulan terakhir
    
    const monthlyResult = {
        labels: last6Months.map(m => {
            const [year, month] = m.split('-');
            return `${month}/${year}`;
        }),
        income: last6Months.map(m => monthlyData[m].income),
        expense: last6Months.map(m => monthlyData[m].expense)
    };

    // 2. Category data (Pie Chart) - hanya pengeluaran
    const categoryData = {};
    transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
        });

    const categoryResult = {
        labels: Object.keys(categoryData),
        data: Object.values(categoryData)
    };

    // 3. Balance trend (Line Chart)
    let runningBalance = 0;
    const balanceData = [];
    const dateLabels = [];
    
    transactions.forEach(t => {
        runningBalance += t.type === 'income' ? t.amount : -t.amount;
        dateLabels.push(t.date);
        balanceData.push(runningBalance);
    });

    // Sampling jika data terlalu banyak
    let sampledLabels = dateLabels;
    let sampledData = balanceData;
    
    if (dateLabels.length > 30) {
        const step = Math.ceil(dateLabels.length / 30);
        sampledLabels = dateLabels.filter((_, i) => i % step === 0);
        sampledData = balanceData.filter((_, i) => i % step === 0);
    }

    const trendResult = {
        labels: sampledLabels,
        data: sampledData
    };

    return {
        monthly: monthlyResult,
        category: categoryResult,
        trend: trendResult
    };
}

// ============================================
// CHART CREATION
// ============================================

/**
 * Update/Create Bar Chart (Pemasukan vs Pengeluaran)
 * @param {Array} labels - Label bulan
 * @param {Array} incomeData - Data pemasukan
 * @param {Array} expenseData - Data pengeluaran
 */
function updateBarChart(labels, incomeData, expenseData) {
    const ctx = document.getElementById('barChart');
    if (!ctx) return;

    // Destroy existing
    if (barChartInstance) {
        barChartInstance.destroy();
    }

    // Dark mode colors
    const gridColor = 'rgba(148, 163, 184, 0.1)';
    const textColor = '#94a3b8';

    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Pemasukan',
                    data: incomeData,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 0,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(16, 185, 129, 1)'
                },
                {
                    label: 'Pengeluaran',
                    data: expenseData,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 0,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(239, 68, 68, 1)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            label += 'Rp ' + context.parsed.y.toLocaleString('id-ID');
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            if (value >= 1000000) {
                                return 'Rp ' + (value / 1000000).toFixed(1) + 'M';
                            }
                            return 'Rp ' + (value / 1000).toFixed(0) + 'K';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update/Create Pie Chart (Distribusi Kategori)
 * @param {Array} labels - Label kategori
 * @param {Array} data - Data nominal
 */
function updatePieChart(labels, data) {
    const ctx = document.getElementById('pieChart');
    if (!ctx) return;

    if (pieChartInstance) {
        pieChartInstance.destroy();
    }

    // Color palette
    const colors = [
        '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', 
        '#ef4444', '#ec4899', '#06b6d4', '#f97316',
        '#84cc16', '#6366f1'
    ];

    const backgroundColors = labels.map((_, i) => colors[i % colors.length]);

    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#94a3b8',
                        usePointStyle: true,
                        padding: 15,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return [
                                `${label}: Rp ${value.toLocaleString('id-ID')}`,
                                `(${percentage}%)`
                            ];
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update/Create Line Chart (Trend Saldo)
 * @param {Array} labels - Label tanggal
 * @param {Array} data - Data saldo
 */
function updateLineChart(labels, data) {
    const ctx = document.getElementById('lineChart');
    if (!ctx) return;

    if (lineChartInstance) {
        lineChartInstance.destroy();
    }

    const gridColor = 'rgba(148, 163, 184, 0.1)';
    const textColor = '#94a3b8';

    // Create gradient
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    lineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Saldo Kumulatif',
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#1e293b',
                pointBorderWidth: 2,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return 'Saldo: Rp ' + context.parsed.y.toLocaleString('id-ID');
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: textColor,
                        maxTicksLimit: 8
                    }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            if (value >= 1000000) {
                                return 'Rp ' + (value / 1000000).toFixed(1) + 'M';
                            }
                            return 'Rp ' + (value / 1000).toFixed(0) + 'K';
                        }
                    }
                }
            }
        }
    });
}

// ============================================
// MAIN UPDATE FUNCTION
// ============================================

/**
 * Update semua grafik
 * Dipanggil saat data berubah atau halaman dimuat
 */
async function updateAllCharts() {
    try {
        const transactions = await getAllTransactions();
        
        if (transactions.length === 0) {
            console.log('No data for charts');
            return;
        }

        const chartData = processChartData(transactions);
        if (!chartData) return;

        // Update each chart
        updateBarChart(
            chartData.monthly.labels,
            chartData.monthly.income,
            chartData.monthly.expense
        );

        updatePieChart(
            chartData.category.labels,
            chartData.category.data
        );

        updateLineChart(
            chartData.trend.labels,
            chartData.trend.data
        );

        console.log('Charts updated successfully');
        
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

/**
 * Refresh charts (manual trigger)
 */
function refreshCharts() {
    updateAllCharts();
    showNotification('Grafik diperbarui! 📊', 'success');
}