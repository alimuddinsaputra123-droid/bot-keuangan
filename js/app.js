/**
 * KEUANGANKU - APP.JS
 * Database (IndexedDB) & Fungsi Utama
 * Digunakan oleh semua halaman
 */

// ============================================
// CONFIGURATION
// ============================================
const DB_NAME = 'KeuanganDB';
const DB_VERSION = 1;
const STORE_NAME = 'transactions';

// ============================================
// GLOBAL VARIABLES
// ============================================
let db = null;
let currentTransactions = []; // Untuk filter export

// ============================================
// DATABASE INITIALIZATION
// ============================================

/**
 * Inisialisasi IndexedDB
 * @returns {Promise} Database instance
 */
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database connected successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            // Create object store
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                
                // Create indexes
                store.createIndex('date', 'date', { unique: false });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('category', 'category', { unique: false });
                
                console.log('Object store and indexes created');
            }
        };
    });
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Tambah transaksi baru - VERSI STABIL
 * @param {Object} transaction - Data transaksi
 * @returns {Promise} ID transaksi yang dibuat
 */
function addTransaction(transaction) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        // Validasi data
        if (!transaction.date || !transaction.description || !transaction.amount) {
            reject(new Error('Data transaksi tidak lengkap'));
            return;
        }

        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        // Pastikan timestamp ada
        if (!transaction.timestamp) {
            transaction.timestamp = new Date().getTime();
        }
        
        const request = store.add(transaction);

        request.onsuccess = (event) => {
            console.log('[DB] Transaction added, ID:', event.target.result);
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error('[DB] Add error:', event.target.error);
            reject(event.target.error);
        };
        
        // Handle transaction error
        tx.onerror = (event) => {
            console.error('[DB] Transaction error:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Ambil semua transaksi
 * @returns {Promise} Array transaksi
 */
function getAllTransactions() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

/**
 * Hapus transaksi by ID
 * @param {number} id - ID transaksi
 * @returns {Promise}
 */
function deleteTransaction(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

/**
 * Hapus semua transaksi
 * @returns {Promise}
 */
function clearAllTransactions() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// ============================================
// SUMMARY CALCULATIONS
// ============================================

/**
 * Hitung ringkasan keuangan
 * @param {Array} transactions - Array transaksi (opsional, default semua)
 * @returns {Object} { income, expense, balance, count }
 */
function calculateSummary(transactions = null) {
    return new Promise(async (resolve) => {
        const data = transactions || await getAllTransactions();
        
        const income = data
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const expense = data
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        resolve({
            income,
            expense,
            balance: income - expense,
            count: data.length
        });
    });
}

// ============================================
// FORMATTING UTILITIES
// ============================================

/**
 * Format angka ke Rupiah
 * @param {number} num - Angka
 * @returns {string} Format Rupiah
 */
function formatRupiah(num) {
    return 'Rp ' + num.toLocaleString('id-ID');
}

/**
 * Format angka saja (tanpa Rp)
 * @param {number} num - Angka
 * @returns {string} Format number
 */
function formatNumber(num) {
    return num.toLocaleString('id-ID');
}

/**
 * Format tanggal
 * @param {string} dateStr - String tanggal (YYYY-MM-DD)
 * @returns {string} Format tanggal Indonesia
 */
function formatDate(dateStr) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
}

/**
 * Format tanggal lengkap
 * @param {string} dateStr - String tanggal
 * @returns {string} Format tanggal lengkap
 */
function formatDateLong(dateStr) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
}

/**
 * Format bulan tahun
 * @param {string} monthStr - String bulan (YYYY-MM)
 * @returns {string} Format "Januari 2024"
 */
function formatMonthYear(monthStr) {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

/**
 * Tampilkan notifikasi toast
 * @param {string} message - Pesan
 * @param {string} type - success | error | warning | info
 * @param {number} duration - Durasi dalam ms (default 3000)
 */
function showNotification(message, type = 'success', duration = 3000) {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Icon based on type
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `
        <span style="font-size: 1.2rem;">${icons[type]}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// ============================================
// NAVIGATION & UI UTILITIES
// ============================================

/**
 * Toggle hamburger menu
 */
function toggleMenu() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (hamburger && sidebar && overlay) {
        hamburger.classList.toggle('active');
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

/**
 * Tutup menu (untuk navigasi)
 */
function closeMenu() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (hamburger && sidebar && overlay) {
        hamburger.classList.remove('active');
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
}

/**
 * Set active menu item berdasarkan halaman
 */
function setActiveMenu() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.classList.remove('active');
        const href = item.getAttribute('href');
        if (href && href.includes(currentPage)) {
            item.classList.add('active');
        }
    });
}

/**
 * Update indicator online/offline
 */
function updateOnlineStatus() {
    const indicator = document.getElementById('syncIndicator');
    if (!indicator) return;
    
    if (navigator.onLine) {
        indicator.classList.remove('offline');
        indicator.title = 'Online';
    } else {
        indicator.classList.add('offline');
        indicator.title = 'Offline - Data tersimpan lokal';
    }
}

// ============================================
// PWA INSTALLATION
// ============================================

let deferredPrompt = null;

/**
 * Setup PWA install button
 */
function setupInstallButton() {
    const installBtn = document.getElementById('installBtn');
    if (!installBtn) return;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'block';
    });

    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            showNotification('Aplikasi berhasil diinstall! 📱', 'success');
            installBtn.style.display = 'none';
        }
        
        deferredPrompt = null;
    });
}

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================

/**
 * Register Service Worker
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('service-worker.js')
                .then((registration) => {
                    console.log('SW registered:', registration.scope);
                })
                .catch((error) => {
                    console.log('SW registration failed:', error);
                });
        });
    }
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize app (panggil di setiap halaman)
 */
async function initApp() {
    try {
        // Init database
        await initDatabase();
        
        // Setup UI
        setActiveMenu();
        updateOnlineStatus();
        setupInstallButton();
        registerServiceWorker();
        
        // Event listeners
        window.addEventListener('online', () => {
            updateOnlineStatus();
            showNotification('Kembali online! 🌐', 'success', 2000);
        });
        
        window.addEventListener('offline', () => {
            updateOnlineStatus();
            showNotification('Mode offline aktif 📴', 'warning', 2000);
        });
        
        // Close menu on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });
        
        console.log('App initialized successfully');
        
    } catch (error) {
        console.error('App initialization failed:', error);
        showNotification('Gagal memuat aplikasi', 'error');
    }
}

// Auto-init jika DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}