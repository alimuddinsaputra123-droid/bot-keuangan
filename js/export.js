/**
 * KEUANGANKU - EXPORT.JS (DEBUG VERSION)
 * Fungsi Export dengan Import yang Diperbaiki Total
 */

console.log('[Export.js] Loaded successfully');

// ============================================
// EXPORT TO EXCEL (.xlsx)
// ============================================

async function exportToExcel() {
    try {
        const transactions = await getAllTransactions();
        
        if (transactions.length === 0) {
            showNotification('Tidak ada data untuk diexport!', 'warning');
            return;
        }

        const excelData = transactions.map(t => ({
            'ID': t.id,
            'Tanggal': t.date,
            'Deskripsi': t.description,
            'Kategori': t.category,
            'Jenis': t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
            'Jumlah (Rp)': t.amount
        }));

        const wsData = XLSX.utils.json_to_sheet(excelData);
        wsData['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];

        const summary = await calculateSummary(transactions);
        const summaryData = [
            { 'Keterangan': 'Total Pemasukan', 'Nilai (Rp)': summary.income },
            { 'Keterangan': 'Total Pengeluaran', 'Nilai (Rp)': summary.expense },
            { 'Keterangan': 'Saldo Akhir', 'Nilai (Rp)': summary.balance },
            { 'Keterangan': 'Jumlah Transaksi', 'Nilai': summary.count }
        ];

        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsData, 'Data Transaksi');
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

        const filename = `Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        showNotification('File Excel berhasil diunduh! 📗', 'success');
        
    } catch (error) {
        console.error('[Export] Excel error:', error);
        showNotification('Gagal export Excel', 'error');
    }
}

async function exportToExcelFiltered() {
    try {
        if (!currentTransactions || currentTransactions.length === 0) {
            showNotification('Tidak ada data filter untuk diexport!', 'warning');
            return;
        }

        const excelData = currentTransactions.map(t => ({
            'Tanggal': t.date,
            'Deskripsi': t.description,
            'Kategori': t.category,
            'Jenis': t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
            'Jumlah (Rp)': t.amount
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [{ wch: 12 }, { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Filtered');

        const filename = `Laporan_Filtered_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        showNotification('Excel filter berhasil diunduh! 📗', 'success');
        
    } catch (error) {
        console.error('[Export] Filtered error:', error);
        showNotification('Gagal export filter', 'error');
    }
}

// ============================================
// EXPORT TO PDF (.pdf)
// ============================================

async function exportToPDF(type = 'full') {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 35, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('LAPORAN KEUANGAN', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 105, 30, { align: 'center' });

        let yPosition = 45;

        const transactions = await getAllTransactions();
        const summary = await calculateSummary(transactions);

        if (type === 'summary' || type === 'full') {
            doc.setFillColor(30, 41, 59);
            doc.roundedRect(10, yPosition, 190, 35, 3, 3, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('RINGKASAN KEUANGAN', 15, yPosition + 8);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(203, 213, 225);
            
            doc.text(`Total Pemasukan: Rp ${formatNumber(summary.income)}`, 15, yPosition + 16);
            doc.text(`Total Pengeluaran: Rp ${formatNumber(summary.expense)}`, 110, yPosition + 16);
            doc.text(`Saldo Akhir: Rp ${formatNumber(summary.balance)}`, 15, yPosition + 24);
            doc.text(`Jumlah Transaksi: ${summary.count}`, 110, yPosition + 24);
            
            yPosition += 45;

            if (document.getElementById('barChart') && document.getElementById('pieChart')) {
                if (yPosition > 200) {
                    doc.addPage();
                    yPosition = 20;
                }

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('GRAFIK ANALISIS', 105, yPosition, { align: 'center' });
                yPosition += 10;

                try {
                    const barCanvas = document.getElementById('barChart');
                    const barImg = barCanvas.toDataURL('image/png');
                    doc.addImage(barImg, 'PNG', 10, yPosition, 90, 70);
                    
                    const pieCanvas = document.getElementById('pieChart');
                    const pieImg = pieCanvas.toDataURL('image/png');
                    doc.addImage(pieImg, 'PNG', 110, yPosition, 90, 70);
                    
                    yPosition += 80;
                } catch (e) {
                    console.error('[Export] Chart error:', e);
                }
            }
        }

        if (type === 'transactions' || type === 'full') {
            if (yPosition > 200) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('DAFTAR TRANSAKSI', 105, yPosition, { align: 'center' });
            yPosition += 12;

            doc.setFillColor(59, 130, 246);
            doc.rect(10, yPosition, 190, 10, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            
            doc.text('TGL', 12, yPosition + 6.5);
            doc.text('DESKRIPSI', 40, yPosition + 6.5);
            doc.text('KATEGORI', 100, yPosition + 6.5);
            doc.text('JENIS', 140, yPosition + 6.5);
            doc.text('JUMLAH', 175, yPosition + 6.5);
            
            yPosition += 10;

            doc.setFont('helvetica', 'normal');
            const displayData = transactions.slice(0, 50);
            
            displayData.forEach((t, index) => {
                if (yPosition > 280) {
                    doc.addPage();
                    yPosition = 20;
                    
                    doc.setFillColor(59, 130, 246);
                    doc.rect(10, yPosition, 190, 10, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFont('helvetica', 'bold');
                    doc.text('TGL', 12, yPosition + 6.5);
                    doc.text('DESKRIPSI', 40, yPosition + 6.5);
                    doc.text('KATEGORI', 100, yPosition + 6.5);
                    doc.text('JENIS', 140, yPosition + 6.5);
                    doc.text('JUMLAH', 175, yPosition + 6.5);
                    yPosition += 10;
                }

                if (index % 2 === 0) {
                    doc.setFillColor(30, 41, 59);
                    doc.rect(10, yPosition, 190, 8, 'F');
                }

                doc.setTextColor(203, 213, 225);
                doc.setFontSize(8);
                
                const dateStr = t.date.substring(0, 10);
                const descStr = t.description.length > 25 ? t.description.substring(0, 22) + '...' : t.description;
                const catStr = t.category.length > 10 ? t.category.substring(0, 8) + '..' : t.category;
                const typeStr = t.type === 'income' ? 'Masuk' : 'Keluar';
                const amountStr = 'Rp ' + formatNumber(t.amount);
                
                doc.text(dateStr, 12, yPosition + 5.5);
                doc.text(descStr, 40, yPosition + 5.5);
                doc.text(catStr, 100, yPosition + 5.5);
                doc.text(typeStr, 140, yPosition + 5.5);
                doc.text(amountStr, 175, yPosition + 5.5);
                
                yPosition += 8;
            });

            if (transactions.length > 50) {
                yPosition += 5;
                doc.setTextColor(148, 163, 184);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                doc.text(`* Menampilkan 50 dari ${transactions.length} transaksi.`, 105, yPosition, { align: 'center' });
            }
        }

        const filename = `Laporan_${type}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        
        showNotification(`PDF ${type} berhasil diunduh! 📕`, 'success');
        
    } catch (error) {
        console.error('[Export] PDF error:', error);
        showNotification('Gagal export PDF', 'error');
    }
}

// ============================================
// EXPORT TO JSON (Backup)
// ============================================

async function exportToJSON() {
    try {
        const transactions = await getAllTransactions();
        
        if (transactions.length === 0) {
            showNotification('Tidak ada data untuk di-backup!', 'warning');
            return;
        }

        const backupData = {
            app: 'KeuanganKu',
            version: '2.0',
            exportedAt: new Date().toISOString(),
            data: transactions
        };

        const dataStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `Backup_Keuangan_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        showNotification('Backup berhasil! 💾', 'success');
        
    } catch (error) {
        console.error('[Export] JSON error:', error);
        showNotification('Gagal backup data', 'error');
    }
}

// ============================================
// IMPORT FROM JSON - VERSI TOTAL FIX
// ============================================

/**
 * Import data dari JSON dengan debugging lengkap
 */
async function importFromJSON(file) {
    console.log('[Import] ========================================');
    console.log('[Import] Starting import process');
    console.log('[Import] File:', file ? file.name : 'null');
    console.log('[Import] File size:', file ? file.size : 0, 'bytes');
    console.log('[Import] ========================================');
    
    // STEP 1: Validasi File
    if (!file) {
        console.error('[Import] ERROR: No file provided');
        showNotification('Pilih file terlebih dahulu!', 'warning');
        return;
    }

    if (!file.name.endsWith('.json')) {
        console.error('[Import] ERROR: Invalid file type:', file.name);
        showNotification('File harus berformat .json!', 'error');
        return;
    }

    // STEP 2: Show loading
    showNotification('Membaca file... ⏳', 'info', 3000);
    
    // STEP 3: Read File dengan Promise wrapper
    try {
        const fileContent = await readFileAsText(file);
        console.log('[Import] File read successfully, size:', fileContent.length);
        
        // STEP 4: Parse JSON
        let parsedData;
        try {
            parsedData = JSON.parse(fileContent);
            console.log('[Import] JSON parsed successfully');
        } catch (parseError) {
            console.error('[Import] JSON parse error:', parseError);
            showNotification('File JSON rusak atau tidak valid!', 'error');
            return;
        }
        
        // STEP 5: Extract data dengan berbagai format
        let dataToImport = extractDataFromJSON(parsedData);
        console.log('[Import] Extracted', dataToImport.length, 'items');
        
        if (dataToImport.length === 0) {
            showNotification('Tidak ada data transaksi yang valid!', 'warning');
            return;
        }
        
        // STEP 6: Validasi setiap item
        const validItems = validateImportItems(dataToImport);
        console.log('[Import] Valid items:', validItems.length, 'of', dataToImport.length);
        
        if (validItems.length === 0) {
            showNotification('Tidak ada data valid yang bisa diimport!', 'error');
            return;
        }
        
        // STEP 7: Konfirmasi user
        const skipCount = dataToImport.length - validItems.length;
        let confirmMsg = `Import ${validItems.length} transaksi?`;
        if (skipCount > 0) {
            confirmMsg += `\n(${skipCount} item tidak valid di-skip)`;
        }
        
        if (!confirm(confirmMsg)) {
            console.log('[Import] Cancelled by user');
            return;
        }
        
        // STEP 8: PROSES IMPORT UTAMA
        showNotification(`Mengimport ${validItems.length} data...`, 'info', 5000);
        
        const result = await processImport(validItems);
        
        // STEP 9: Hasil
        console.log('[Import] ========================================');
        console.log('[Import] Result:', result);
        console.log('[Import] ========================================');
        
        if (result.success > 0) {
            showNotification(`${result.success} transaksi berhasil diimport! ✅`, 'success');
            refreshAllData();
        } else {
            showNotification('Gagal mengimport data!', 'error');
        }
        
        if (result.failed > 0) {
            console.error('[Import] Failed items:', result.errors);
            showNotification(`${result.failed} item gagal (cek console)`, 'warning');
        }
        
    } catch (error) {
        console.error('[Import] FATAL ERROR:', error);
        showNotification('Error fatal: ' + error.message, 'error');
    }
}

/**
 * Read file as text dengan Promise
 */
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            console.log('[Import] FileReader onload triggered');
            resolve(e.target.result);
        };
        
        reader.onerror = (e) => {
            console.error('[Import] FileReader error:', e);
            reject(new Error('Gagal membaca file'));
        };
        
        reader.onabort = () => {
            console.error('[Import] FileReader aborted');
            reject(new Error('Pembacaan file dibatalkan'));
        };
        
        console.log('[Import] Starting FileReader...');
        reader.readAsText(file);
    });
}

/**
 * Extract data dari berbagai format JSON
 */
function extractDataFromJSON(parsed) {
    console.log('[Import] Extracting from format:', typeof parsed);
    
    // Format 1: App backup dengan property data
    if (parsed.data && Array.isArray(parsed.data)) {
        console.log('[Import] Format detected: App backup');
        return parsed.data;
    }
    
    // Format 2: Array langsung
    if (Array.isArray(parsed)) {
        console.log('[Import] Format detected: Raw array');
        return parsed;
    }
    
    // Format 3: Object dengan transactions
    if (parsed.transactions && Array.isArray(parsed.transactions)) {
        console.log('[Import] Format detected: Object with transactions');
        return parsed.transactions;
    }
    
    // Format 4: Single object (wrap in array)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        if (parsed.date && parsed.amount) {
            console.log('[Import] Format detected: Single object');
            return [parsed];
        }
    }
    
    console.error('[Import] Unknown format:', Object.keys(parsed));
    return [];
}

/**
 * Validasi setiap item import
 */
function validateImportItems(items) {
    return items.filter((item, index) => {
        // Harus object
        if (!item || typeof item !== 'object') {
            console.warn(`[Import] Item ${index}: Not an object`);
            return false;
        }
        
        // Harus ada date
        if (!item.date || typeof item.date !== 'string') {
            console.warn(`[Import] Item ${index}: Missing date`);
            return false;
        }
        
        // Harus ada description
        if (!item.description || typeof item.description !== 'string') {
            console.warn(`[Import] Item ${index}: Missing description`);
            return false;
        }
        
        // Harus ada amount yang valid
        const amount = parseFloat(item.amount);
        if (isNaN(amount) || amount <= 0) {
            console.warn(`[Import] Item ${index}: Invalid amount`, item.amount);
            return false;
        }
        
        return true;
    });
}

/**
 * Proses import dengan transaction batching
 */
async function processImport(items) {
    console.log('[Import] Processing', items.length, 'items');
    
    const result = {
        success: 0,
        failed: 0,
        errors: []
    };
    
    // Batching: proses 5 item sekaligus untuk performa
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        console.log(`[Import] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(items.length/BATCH_SIZE)}`);
        
        // Proses batch secara parallel
        const batchPromises = batch.map((item, batchIndex) => 
            importSingleItem(item, i + batchIndex)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Hitung hasil
        batchResults.forEach((res, idx) => {
            if (res.status === 'fulfilled') {
                result.success++;
            } else {
                result.failed++;
                result.errors.push({
                    item: batch[idx].description || 'unknown',
                    error: res.reason.message
                });
            }
        });
        
        // Update progress setiap batch
        const progress = Math.min(i + BATCH_SIZE, items.length);
        showNotification(`Import: ${progress}/${items.length}...`, 'info', 1500);
        
        // Delay kecil untuk UI thread
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return result;
}

/**
 * Import single item dengan retry
 */
async function importSingleItem(item, index) {
    try {
        // Bersihkan dan normalisasi data
        const cleanItem = {
            date: String(item.date).trim(),
            description: String(item.description || '').trim(),
            category: String(item.category || 'Lainnya').trim(),
            type: (item.type === 'income') ? 'income' : 'expense',
            amount: parseFloat(item.amount),
            timestamp: item.timestamp || Date.now()
        };
        
        // Validasi tambahan
        if (cleanItem.description.length === 0) {
            throw new Error('Deskripsi kosong');
        }
        
        if (cleanItem.date.length === 0) {
            throw new Error('Tanggal kosong');
        }
        
        // Coba import dengan retry 1x
        try {
            await addTransaction(cleanItem);
            return { success: true };
        } catch (err) {
            console.warn(`[Import] Retry ${index} after error:`, err.message);
            await new Promise(r => setTimeout(r, 100));
            await addTransaction(cleanItem);
            return { success: true, retried: true };
        }
        
    } catch (error) {
        console.error(`[Import] Item ${index} failed:`, error.message);
        throw error;
    }
}

/**
 * Refresh semua data di halaman
 */
function refreshAllData() {
    console.log('[Import] Refreshing all data...');
    
    setTimeout(async () => {
        // Refresh transaksi list
        if (typeof loadTransactions === 'function') {
            console.log('[Import] Calling loadTransactions()');
            loadTransactions();
        }
        
        // Refresh charts
        if (typeof updateAllCharts === 'function') {
            console.log('[Import] Calling updateAllCharts()');
            updateAllCharts();
        }
        
        // Refresh preview
        if (typeof updatePreview === 'function') {
            console.log('[Import] Calling updatePreview()');
            updatePreview();
        }
        
        // Update badge
        try {
            const summary = await calculateSummary();
            const badge = document.getElementById('transCount');
            if (badge) {
                badge.textContent = summary.count;
            }
            console.log('[Import] Badge updated to:', summary.count);
        } catch (e) {
            console.error('[Import] Badge update failed:', e);
        }
    }, 500);
}

// ============================================
// SETUP IMPORT LISTENER - VERSI ROBUST
// ============================================

/**
 * Setup file input listener dengan multiple fallback
 */
function setupImportListener(inputId = 'importFile') {
    console.log('[Import] Setting up listener for:', inputId);
    
    // Tunggu DOM ready
    const setup = () => {
        const input = document.getElementById(inputId);
        
        if (!input) {
            console.warn('[Import] Input not found:', inputId);
            // Retry after delay
            setTimeout(setup, 1000);
            return;
        }
        
        console.log('[Import] Input found:', input);
        
        // Hapus listener lama dengan cara yang aman
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        // Attach event listener
        newInput.addEventListener('change', function(e) {
            console.log('[Import] ========================================');
            console.log('[Import] CHANGE EVENT TRIGGERED!');
            console.log('[Import] Files:', e.target.files);
            console.log('[Import] ========================================');
            
            const file = e.target.files[0];
            
            if (!file) {
                console.warn('[Import] No file selected');
                return;
            }
            
            console.log('[Import] File selected:', {
                name: file.name,
                size: file.size,
                type: file.type
            });
            
            // Panggil import
            importFromJSON(file);
            
            // Reset input setelah delay
            setTimeout(() => {
                newInput.value = '';
                console.log('[Import] Input reset');
            }, 100);
        });
        
        // Fallback: click handler untuk button wrapper
        const wrapper = newInput.closest('.export-card, div');
        if (wrapper) {
            const btn = wrapper.querySelector('button');
            if (btn && !btn.onclick) {
                btn.addEventListener('click', (e) => {
                    if (e.target !== newInput) {
                        console.log('[Import] Triggering input click via button');
                        newInput.click();
                    }
                });
            }
        }
        
        console.log('[Import] Listener setup complete');
    };
    
    // Jalankan setup
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }
}

// ============================================
// GLOBAL DEBUG HELPERS
// ============================================

// Expose untuk debugging dari console
window.debugImport = {
    test: () => {
        console.log('[Debug] Import system ready');
        console.log('[Debug] addTransaction exists:', typeof addTransaction);
        console.log('[Debug] getAllTransactions exists:', typeof getAllTransactions);
    },
    
    createSampleFile: () => {
        const sampleData = {
            app: 'KeuanganKu',
            version: '2.0',
            exportedAt: new Date().toISOString(),
            data: [
                {
                    date: new Date().toISOString().split('T')[0],
                    description: 'Test Import ' + Date.now(),
                    category: 'Lainnya',
                    type: 'expense',
                    amount: 50000,
                    timestamp: Date.now()
                }
            ]
        };
        
        const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'test-import.json';
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('[Debug] Sample file created and downloaded');
    },
    
    checkDB: async () => {
        const trans = await getAllTransactions();
        console.log('[Debug] Current transactions:', trans.length);
        return trans;
    }
};

console.log('[Export.js] All functions loaded');