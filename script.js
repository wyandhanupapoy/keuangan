// File: script.js - Versi Ultimate "Tak Tertandingi"

document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // BAGIAN 1: KONFIGURASI & INISIALISASI GLOBAL
    // =================================================================
    const SUPABASE_URL = 'https://xzcbgqayotjsdzhejwie.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Y2JncWF5b3Rqc2R6aGVqd2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTM0NTYsImV4cCI6MjA2NTQ2OTQ1Nn0.LnBVr2AvHJumtnhN7ULpEXrUqVHTxFksDDI4qhFQAtc';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Inisialisasi komponen Bootstrap
    const transactionModal = new bootstrap.Modal(document.getElementById('transaction-modal'));
    const appToast = new bootstrap.Toast(document.getElementById('app-toast'), { delay: 4000 });

    // State Aplikasi Terpusat
    let appState = {
        user: null,
        transactions: [],
        filteredTransactions: [],
        summary: { income: 0, expense: 0, balance: 0 },
        filter: 'all',
        searchTerm: '',
        isLoading: true,
    };
    let doughnutChart = null;

    // =================================================================
    // BAGIAN 2: MANAJEMEN STATE & RENDER UI
    // =================================================================
    
    function setState(newState) {
        appState = { ...appState, ...newState };
        processAndRender();
    }

    function processAndRender() {
        // Proses filtering dan searching
        let filtered = appState.transactions;
        if (appState.filter !== 'all') {
            filtered = filtered.filter(t => t.tipe === appState.filter);
        }
        if (appState.searchTerm) {
            filtered = filtered.filter(t => t.deskripsi.toLowerCase().includes(appState.searchTerm.toLowerCase()));
        }
        appState.filteredTransactions = filtered;

        // Proses kalkulasi summary
        let income = 0, expense = 0;
        appState.transactions.forEach(t => {
            if (t.tipe === 'pemasukan') income += t.jumlah;
            else expense += t.jumlah;
        });
        appState.summary = { income, expense, balance: income - expense };

        // Render semua komponen UI
        renderUI();
    }

    function renderUI() {
        renderSummary();
        renderTransactionList();
        renderChart();
    }
    
    // =================================================================
    // BAGIAN 3: FUNGSI-FUNGSI RENDER KOMPONEN
    // =================================================================

    const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    function animateCountUp(element, endValue) {
        let startValue = parseFloat(element.dataset.currentValue || 0);
        element.dataset.currentValue = endValue;
        const duration = 1000;
        let startTime = null;

        function animation(currentTime) {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const currentValue = startValue + (endValue - startValue) * progress;
            element.textContent = formatRupiah(currentValue);
            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        }
        requestAnimationFrame(animation);
    }

    function renderSummary() {
        animateCountUp(document.getElementById('total-pemasukan'), appState.summary.income);
        animateCountUp(document.getElementById('total-pengeluaran'), appState.summary.expense);
        animateCountUp(document.getElementById('saldo-akhir'), appState.summary.balance);
    }
    
    function renderTransactionList() {
        const container = document.getElementById('transaction-list-container');
        if (appState.isLoading) {
            container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>';
            return;
        }
        if (appState.transactions.length === 0) {
            container.innerHTML = `<div class="empty-state">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="#adb5bd"/></svg>
                <h5 class="mt-3">Belum Ada Transaksi</h5>
                <p class="text-muted">Klik tombol '+' untuk menambahkan transaksi pertamamu.</p>
            </div>`;
            return;
        }
        if (appState.filteredTransactions.length === 0) {
            container.innerHTML = `<div class="empty-state"><h5 class="mt-3">Tidak Ada Hasil</h5><p class="text-muted">Coba ubah kata kunci pencarian atau filter Anda.</p></div>`;
            return;
        }

        container.innerHTML = appState.filteredTransactions.map(t => `
            <div class="transaction-list-item transaction-${t.tipe}" style="animation-delay: ${Math.random()*0.3}s">
                <div class="transaction-icon text-${t.tipe === 'pemasukan' ? 'success' : 'danger'}">
                    <i class="bi bi-arrow-${t.tipe === 'pemasukan' ? 'down' : 'up'}-circle-fill"></i>
                </div>
                <div class="transaction-details">
                    <div class="fw-bold">${t.deskripsi}</div>
                    <div class="text-muted small">${new Date(t.tanggal).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</div>
                </div>
                <div class="transaction-amount text-${t.tipe === 'pemasukan' ? 'success' : 'danger'} me-3">
                    ${t.tipe === 'pemasukan' ? '+' : '-'} ${formatRupiah(t.jumlah)}
                </div>
                <div class="transaction-actions">
                    <button class="btn btn-sm btn-action rounded-circle btn-edit" data-id="${t.id}"><i class="bi bi-pencil-fill"></i></button>
                    <button class="btn btn-sm btn-action rounded-circle btn-delete" data-id="${t.id}"><i class="bi bi-trash3-fill"></i></button>
                </div>
            </div>
        `).join('');
    }
    
    const textCenterPlugin = {
        id: 'textCenter',
        afterDraw(chart) {
            const { ctx, _active } = chart;
            if (_active.length > 0) return; // Don't draw if hovering
            const { width, height } = chart;
            ctx.restore();
            const text = formatRupiah(appState.summary.balance);
            ctx.font = 'bold 1.5rem Poppins';
            ctx.fillStyle = '#343a40';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, width / 2, height / 2 - 10);
            
            ctx.font = '0.9rem Poppins';
            ctx.fillStyle = '#6c757d';
            ctx.fillText('Saldo Akhir', width / 2, height / 2 + 15);
            ctx.save();
        }
    };

    function renderChart() {
        const ctx = document.getElementById('chart-distribusi').getContext('2d');
        if (doughnutChart) doughnutChart.destroy();
        doughnutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pemasukan', 'Pengeluaran'],
                datasets: [{
                    data: [appState.summary.income, appState.summary.expense],
                    backgroundColor: ['rgba(25, 135, 84, 0.8)', 'rgba(220, 53, 69, 0.8)'],
                    borderColor: '#ffffff',
                    borderWidth: 4,
                    hoverOffset: 15,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '75%',
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label}: ${formatRupiah(c.raw)}` } } }
            },
            plugins: [textCenterPlugin]
        });
    }

    // =================================================================
    // BAGIAN 4: SERVICE LAYER (Interaksi dengan Supabase)
    // =================================================================

    async function fetchTransactions() {
        setState({ isLoading: true });
        const { data, error } = await supabase.from('transaksi').select('*').order('tanggal', { ascending: false });
        if (error) {
            console.error(error);
            showToast('Gagal memuat data.', 'danger');
        } else {
            setState({ transactions: data, isLoading: false });
        }
    }

    async function addTransaction(transactionData) {
        const tempId = `temp_${Date.now()}`;
        const optimisticData = { ...transactionData, id: tempId, user_id: appState.user.id };
        setState({ transactions: [optimisticData, ...appState.transactions] });

        const { data, error } = await supabase.from('transaksi').insert(transactionData).select().single();
        if (error) {
            console.error(error);
            showToast('Gagal menyimpan transaksi.', 'danger');
            setState({ transactions: appState.transactions.filter(t => t.id !== tempId) });
        } else {
            setState({ transactions: appState.transactions.map(t => t.id === tempId ? data : t) });
            showToast('Transaksi berhasil disimpan.', 'success');
        }
    }

    async function updateTransaction(id, transactionData) {
        const originalTransactions = [...appState.transactions];
        const updatedTransactions = originalTransactions.map(t => t.id === id ? { ...t, ...transactionData } : t);
        setState({ transactions: updatedTransactions });

        const { error } = await supabase.from('transaksi').update(transactionData).eq('id', id);
        if (error) {
            console.error(error);
            showToast('Gagal memperbarui transaksi.', 'danger');
            setState({ transactions: originalTransactions }); // Revert on error
        } else {
            showToast('Transaksi berhasil diperbarui.', 'success');
        }
    }
    
    async function deleteTransaction(id) {
        const originalTransactions = [...appState.transactions];
        const deletedTransaction = originalTransactions.find(t => t.id === id);
        setState({ transactions: originalTransactions.filter(t => t.id !== id) });

        let undo = false;
        showToast(`Transaksi dihapus. <button id="undo-btn" class="btn btn-sm btn-link text-white p-0 ms-2">Urungkan</button>`, 'warning', () => { undo = true; });
        
        await new Promise(resolve => setTimeout(resolve, 4000)); // wait for undo

        if (undo) {
            setState({ transactions: originalTransactions });
            return;
        }

        const { error } = await supabase.from('transaksi').delete().eq('id', id);
        if (error) {
            console.error(error);
            showToast('Gagal menghapus permanen.', 'danger');
            setState({ transactions: originalTransactions }); // Revert on error
        }
    }

    // =================================================================
    // BAGIAN 5: OTENTIKASI PENGGUNA
    // =================================================================
    
    function handleAuthStateChange(event, session) {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        
        if (session) {
            setState({ user: session.user });
            document.getElementById('user-email').textContent = session.user.email;
            document.body.classList.remove('auth-active');
            authContainer.classList.remove('visible');
            setTimeout(() => {
                appContainer.classList.add('visible');
                fetchTransactions();
            }, 300);
        } else {
            setState({ user: null, transactions: [] });
            document.body.classList.add('auth-active');
            appContainer.classList.remove('visible');
            setTimeout(() => authContainer.classList.add('visible'), 300);
        }
    }

    // =================================================================
    // BAGIAN 6: EVENT LISTENERS
    // =================================================================

    // --- Auth Listeners ---
    document.getElementById('form-login').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { email, password } = Object.fromEntries(new FormData(e.target));
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) document.getElementById('auth-alert').textContent = error.message, document.getElementById('auth-alert').classList.remove('d-none');
    });
    document.getElementById('form-register').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { email, password } = Object.fromEntries(new FormData(e.target));
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) document.getElementById('auth-alert').textContent = error.message, document.getElementById('auth-alert').classList.remove('d-none');
        else document.getElementById('auth-alert').textContent = 'Registrasi berhasil! Cek email untuk verifikasi.', document.getElementById('auth-alert').classList.remove('d-none'), document.getElementById('auth-alert').classList.replace('alert-danger', 'alert-success');
    });
    document.getElementById('tombol-logout').addEventListener('click', () => supabase.auth.signOut());
    
    // --- App Listeners ---
    document.getElementById('fab-add').addEventListener('click', () => {
        document.getElementById('form-transaksi').reset();
        document.getElementById('form-transaksi').classList.remove('was-validated');
        document.getElementById('transaksi-id').value = '';
        document.getElementById('modal-title').textContent = 'Tambah Transaksi Baru';
        document.getElementById('tanggal').valueAsDate = new Date();
        transactionModal.show();
    });

    document.getElementById('form-transaksi').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!e.target.checkValidity()) {
            e.target.classList.add('was-validated');
            return;
        }
        const id = document.getElementById('transaksi-id').value;
        const transactionData = {
            deskripsi: document.getElementById('deskripsi').value,
            jumlah: parseFloat(document.getElementById('jumlah').value),
            tipe: document.getElementById('tipe').value,
            tanggal: document.getElementById('tanggal').value,
        };
        if (id) {
            await updateTransaction(id, transactionData);
        } else {
            await addTransaction(transactionData);
        }
        transactionModal.hide();
    });
    
    document.getElementById('transaction-list-container').addEventListener('click', e => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');
        if (btnEdit) {
            const id = btnEdit.dataset.id;
            const t = appState.transactions.find(tr => tr.id == id);
            document.getElementById('modal-title').textContent = 'Edit Transaksi';
            document.getElementById('transaksi-id').value = t.id;
            document.getElementById('deskripsi').value = t.deskripsi;
            document.getElementById('jumlah').value = t.jumlah;
            document.getElementById('tipe').value = t.tipe;
            document.getElementById('tanggal').value = t.tanggal;
            transactionModal.show();
        }
        if (btnDelete) {
            deleteTransaction(btnDelete.dataset.id);
        }
    });

    document.getElementById('search-input').addEventListener('input', e => setState({ searchTerm: e.target.value }));
    
    document.getElementById('filter-btn-group').addEventListener('click', e => {
        if (e.target.matches('button')) {
            document.querySelector('#filter-btn-group .btn.active').classList.remove('active');
            e.target.classList.add('active');
            setState({ filter: e.target.dataset.filter });
        }
    });

    document.querySelector('.toast-container').addEventListener('click', e => {
        if (e.target.id === 'undo-btn') {
            e.target.dispatchEvent(new CustomEvent('undo', { bubbles: true }));
            appToast.hide();
        }
    });
    
    function showToast(message, type = 'success', onUndo = null) {
        const toastBody = document.querySelector('#app-toast .toast-body');
        const toastEl = document.getElementById('app-toast');
        toastBody.innerHTML = message;
        toastEl.classList.remove('bg-success', 'bg-danger', 'bg-warning');
        toastEl.classList.add(`bg-${type}`, 'text-white');
        
        if (onUndo) {
            toastBody.addEventListener('undo', onUndo, { once: true });
        }
        appToast.show();
    }
    
    // =================================================================
    // BAGIAN 7: TITIK MASUK APLIKASI
    // =================================================================
    supabase.auth.onAuthStateChange(handleAuthStateChange);
});