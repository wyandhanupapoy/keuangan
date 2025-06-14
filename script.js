// Konfigurasi Supabase - Ganti dengan kredensial Anda
const SUPABASE_URL = 'https://xzcbgqayotjsdzhejwie.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Y2JncWF5b3Rqc2R6aGVqd2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTM0NTYsImV4cCI6MjA2NTQ2OTQ1Nn0.LnBVr2AvHJumtnhN7ULpEXrUqVHTxFksDDI4qhFQAtc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elemen DOM Utama
const appLoader = document.getElementById('app-loader');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const editModal = document.getElementById('modal-edit');

// State Aplikasi
const state = {
    transactions: [],
    pemasukan: 0,
    pengeluaran: 0,
};

let doughnutChart = null;

// =================================================================
// FUNGSI UTILITAS
// =================================================================

const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

const setButtonLoading = (button, isLoading) => {
    const spinner = button.querySelector('.animate-spin');
    button.disabled = isLoading;
    if (spinner) spinner.classList.toggle('hidden', !isLoading);
};

const showToast = (title, message, type = 'success') => {
    const toast = document.getElementById('app-toast');
    const toastTitle = document.getElementById('toast-title');
    const toastBody = document.getElementById('toast-body');
    const toastIcon = document.getElementById('toast-icon');

    toastTitle.textContent = title;
    toastBody.textContent = message;
    
    // Reset classes
    toast.classList.remove('bg-green-100', 'dark:bg-green-900', 'bg-red-100', 'dark:bg-red-900');
    toastIcon.innerHTML = '';
    
    if (type === 'success') {
        toast.classList.add('bg-green-100', 'dark:bg-green-900', 'text-green-800', 'dark:text-green-200');
        toastIcon.innerHTML = '<i class="bi bi-check-circle-fill text-green-500 text-2xl"></i>';
    } else { // danger
        toast.classList.add('bg-red-100', 'dark:bg-red-900', 'text-red-800', 'dark:text-red-200');
        toastIcon.innerHTML = '<i class="bi bi-x-circle-fill text-red-500 text-2xl"></i>';
    }

    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
};

const setDefaultDate = () => {
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('tanggal').value = today;
};

// =================================================================
// FUNGSI RENDER & PEMBARUAN UI
// =================================================================

const renderSummaryCards = () => {
    document.getElementById('total-pemasukan').textContent = formatRupiah(state.pemasukan);
    document.getElementById('total-pengeluaran').textContent = formatRupiah(state.pengeluaran);
    document.getElementById('saldo-akhir').textContent = formatRupiah(state.pemasukan - state.pengeluaran);
};

const renderTransactionHistory = () => {
    const tbody = document.getElementById('riwayat-transaksi');
    tbody.innerHTML = '';

    if (state.transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8"><div class="flex flex-col items-center text-gray-500"><i class="bi bi-journal-x text-4xl"></i><p class="mt-2 font-medium">Belum ada transaksi</p><p class="text-sm">Silakan tambahkan transaksi baru.</p></div></td></tr>';
        return;
    }

    state.transactions.forEach(t => {
        const row = document.createElement('tr');
        row.className = 'border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50';
        row.innerHTML = `
            <td class="py-3 px-4">${new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
            <td class="py-3 px-4">${t.deskripsi}</td>
            <td class="py-3 px-4 text-right font-bold ${t.tipe === 'pemasukan' ? 'text-green-500' : 'text-red-500'}">
                ${t.tipe === 'pemasukan' ? '+' : '-'} ${formatRupiah(t.jumlah)}
            </td>
            <td class="py-3 px-4 text-center">
                <button class="btn-edit text-blue-500 hover:text-blue-700 p-1" data-id="${t.id}" title="Edit"><i class="bi bi-pencil-square"></i></button>
                <button class="btn-delete text-red-500 hover:text-red-700 p-1" data-id="${t.id}" title="Hapus"><i class="bi bi-trash3-fill"></i></button>
            </td>`;
        tbody.appendChild(row);
    });
};

const renderChart = () => {
    const ctx = document.getElementById('chart-distribusi').getContext('2d');
    const chartContainer = document.getElementById('chart-container');
    const isDarkMode = document.documentElement.classList.contains('dark');
    const chartData = {
        labels: ['Pemasukan', 'Pengeluaran'],
        datasets: [{
            data: [state.pemasukan, state.pengeluaran],
            backgroundColor: ['#10b981', '#ef4444'],
            borderColor: isDarkMode ? '#1f2937' : '#ffffff', // gray-800 or white
            borderWidth: 4,
            hoverOffset: 8,
        }]
    };

    if (state.pemasukan === 0 && state.pengeluaran === 0) {
        chartContainer.innerHTML = '<div class="flex flex-col items-center text-gray-500"><i class="bi bi-pie-chart text-4xl"></i><p class="mt-2 text-sm text-center">Grafik akan muncul di sini setelah ada transaksi.</p></div>';
        if (doughnutChart) doughnutChart.destroy();
        doughnutChart = null;
        return;
    } else if (!document.getElementById('chart-distribusi')) {
        chartContainer.innerHTML = '<canvas id="chart-distribusi"></canvas>';
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { color: isDarkMode ? '#e5e7eb' : '#374151' } },
            tooltip: { callbacks: { label: (context) => `${context.label}: ${formatRupiah(context.raw)}` } }
        },
        cutout: '70%'
    };

    if (doughnutChart) {
        doughnutChart.data = chartData;
        doughnutChart.options = options;
        doughnutChart.update();
    } else {
        doughnutChart = new Chart(ctx, { type: 'doughnut', data: chartData, options: options });
    }
};

const updateUI = () => {
    renderSummaryCards();
    renderTransactionHistory();
    renderChart();
    attachActionListeners();
};

// =================================================================
// FUNGSI INTERAKSI SUPABASE (CRUD)
// =================================================================

async function fetchAndSetState() {
    const tbody = document.getElementById('riwayat-transaksi');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8"><div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>';

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");

        const { data, error } = await supabase.from('transaksi').select('*').eq('user_id', user.id).order('tanggal', { ascending: false }).order('id', { ascending: false });
        if (error) throw error;
        
        state.transactions = data;
        state.pemasukan = data.filter(t => t.tipe === 'pemasukan').reduce((acc, t) => acc + t.jumlah, 0);
        state.pengeluaran = data.filter(t => t.tipe === 'pengeluaran').reduce((acc, t) => acc + t.jumlah, 0);

        updateUI();
    } catch (error) {
        showToast('Error', 'Gagal memuat data transaksi. Periksa koneksi Anda.', 'danger');
        console.error('Fetch error:', error.message);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">Gagal memuat data.</td></tr>';
    }
}

// =================================================================
// EVENT LISTENERS & HANDLERS
// =================================================================

function attachActionListeners() {
    document.querySelectorAll('.btn-delete').forEach(b => b.onclick = handleDelete);
    document.querySelectorAll('.btn-edit').forEach(b => b.onclick = handleEditShow);
}

async function handleDelete(e) {
    if (confirm('Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.')) {
        const id = e.currentTarget.getAttribute('data-id');
        try {
            const { error } = await supabase.from('transaksi').delete().eq('id', id);
            if (error) throw error;
            showToast('Berhasil', 'Transaksi telah dihapus.', 'success');
            await fetchAndSetState();
        } catch (error) {
            showToast('Error', `Gagal menghapus: ${error.message}`, 'danger');
        }
    }
}

async function handleEditShow(e) {
    const id = e.currentTarget.getAttribute('data-id');
    try {
        const { data, error } = await supabase.from('transaksi').select('*').eq('id', id).single();
        if (error || !data) throw new Error(error?.message || 'Data tidak ditemukan');
        document.getElementById('edit-id').value = data.id;
        document.getElementById('edit-deskripsi').value = data.deskripsi;
        document.getElementById('edit-jumlah').value = data.jumlah;
        document.getElementById('edit-tipe').value = data.tipe;
        document.getElementById('edit-tanggal').value = data.tanggal;
        editModal.classList.remove('hidden');
    } catch (error) {
        showToast('Error', `Tidak dapat memuat data: ${error.message}`, 'danger');
    }
}

const handleAuthForm = async (form, isLogin) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    setButtonLoading(button, true);

    const email = form.elements[isLogin ? 'login-email' : 'register-email'].value;
    const password = form.elements[isLogin ? 'login-password' : 'register-password'].value;
    const authAlert = document.getElementById('auth-alert');
    authAlert.classList.add('hidden');

    try {
        const { error } = isLogin 
            ? await supabase.auth.signInWithPassword({ email, password })
            : await supabase.auth.signUp({ email, password });
        
        if (error) throw error;
        
        if (!isLogin) {
            authAlert.textContent = 'Registrasi berhasil! Silakan cek email Anda untuk verifikasi.';
            authAlert.className = 'p-4 mb-6 text-sm rounded-lg bg-green-100 text-green-800';
            authAlert.classList.remove('hidden');
        }
        form.reset();
    } catch (error) {
        authAlert.textContent = error.message;
        authAlert.className = 'p-4 mb-6 text-sm rounded-lg bg-red-100 text-red-700';
        authAlert.classList.remove('hidden');
    } finally {
        setButtonLoading(button, false);
    }
};

const exportToCSV = () => {
    if (state.transactions.length === 0) {
        showToast('Info', 'Tidak ada data untuk diekspor.', 'danger');
        return;
    }
    const headers = ['Tanggal', 'Deskripsi', 'Jumlah', 'Tipe'];
    const csvRows = [
        headers.join(','),
        ...state.transactions.map(t => [
            new Date(t.tanggal).toLocaleDateString('id-ID'),
            `"${t.deskripsi.replace(/"/g, '""')}"`,
            t.jumlah,
            t.tipe
        ].join(','))
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KeuanganKu_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Berhasil', 'Data CSV sedang diunduh.', 'success');
};

const setupTheme = () => {
    const themeIcon = document.getElementById('theme-icon');
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        themeIcon.className = 'bi bi-sun-fill';
    } else {
        document.documentElement.classList.remove('dark');
        themeIcon.className = 'bi bi-moon-stars-fill';
    }
};

const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setupTheme();
    if (doughnutChart) renderChart(); // Re-render chart for color changes
};

// =================================================================
// INISIALISASI APLIKASI
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    setupTheme();
    setDefaultDate();
    document.getElementById('copyright-year').textContent = new Date().getFullYear();

    // Event Listeners Global
    document.getElementById('toggle-dark-mode').addEventListener('click', toggleDarkMode);
    document.getElementById('export-csv').addEventListener('click', exportToCSV);
    document.getElementById('tombol-logout').addEventListener('click', () => supabase.auth.signOut());
    document.getElementById('toast-close').addEventListener('click', () => document.getElementById('app-toast').classList.add('hidden'));
    
    // Auth Tabs & Forms
    document.getElementById('tab-login').addEventListener('click', (e) => {
        document.getElementById('form-login').classList.remove('hidden');
        document.getElementById('form-register').classList.add('hidden');
        e.currentTarget.classList.add('border-blue-500', 'text-gray-900', 'dark:text-white');
        e.currentTarget.classList.remove('text-gray-500', 'dark:text-gray-400');
        document.getElementById('tab-register').classList.remove('border-blue-500', 'text-gray-900', 'dark:text-white');
        document.getElementById('tab-register').classList.add('text-gray-500', 'dark:text-gray-400');
    });
    document.getElementById('tab-register').addEventListener('click', (e) => {
        document.getElementById('form-register').classList.remove('hidden');
        document.getElementById('form-login').classList.add('hidden');
        e.currentTarget.classList.add('border-blue-500', 'text-gray-900', 'dark:text-white');
        e.currentTarget.classList.remove('text-gray-500', 'dark:text-gray-400');
        document.getElementById('tab-login').classList.remove('border-blue-500', 'text-gray-900', 'dark:text-white');
        document.getElementById('tab-login').classList.add('text-gray-500', 'dark:text-gray-400');
    });

    document.getElementById('form-login').addEventListener('submit', (e) => handleAuthForm(e.currentTarget, true));
    document.getElementById('form-register').addEventListener('submit', (e) => handleAuthForm(e.currentTarget, false));

    // Form Tambah Transaksi
    document.getElementById('form-tambah').addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = e.currentTarget.querySelector('button[type="submit"]');
        setButtonLoading(button, true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const newTransaction = {
                deskripsi: document.getElementById('deskripsi').value,
                jumlah: parseFloat(document.getElementById('jumlah').value),
                tipe: document.getElementById('tipe').value,
                tanggal: document.getElementById('tanggal').value,
                user_id: user.id
            };
            const { error } = await supabase.from('transaksi').insert([newTransaction]);
            if (error) throw error;
            showToast('Berhasil', 'Transaksi baru telah ditambahkan.', 'success');
            e.target.reset();
            setDefaultDate();
            await fetchAndSetState();
        } catch (error) {
            showToast('Gagal', `Tidak dapat menyimpan: ${error.message}`, 'danger');
        } finally {
            setButtonLoading(button, false);
        }
    });
    
    // Modal Edit
    document.getElementById('tombol-batal-edit').addEventListener('click', () => editModal.classList.add('hidden'));
    document.getElementById('form-edit').addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = document.getElementById('tombol-simpan-edit');
        setButtonLoading(button, true);
        try {
            const id = document.getElementById('edit-id').value;
            const updatedTransaction = {
                deskripsi: document.getElementById('edit-deskripsi').value,
                jumlah: parseFloat(document.getElementById('edit-jumlah').value),
                tipe: document.getElementById('edit-tipe').value,
                tanggal: document.getElementById('edit-tanggal').value,
            };
            const { error } = await supabase.from('transaksi').update(updatedTransaction).eq('id', id);
            if (error) throw error;
            showToast('Berhasil', 'Perubahan telah disimpan.', 'success');
            editModal.classList.add('hidden');
            await fetchAndSetState();
        } catch (error) {
            showToast('Gagal', `Tidak dapat menyimpan: ${error.message}`, 'danger');
        } finally {
            setButtonLoading(button, false);
        }
    });

    // Cek Status Autentikasi
    supabase.auth.onAuthStateChange(async (event, session) => {
        appLoader.classList.add('hidden');
        if (session) {
            appContainer.classList.remove('hidden');
            authContainer.classList.add('hidden');
            document.getElementById('user-email').textContent = session.user.email;
            await fetchAndSetState();
        } else {
            appContainer.classList.add('hidden');
            authContainer.classList.remove('hidden');
            document.getElementById('user-email').textContent = '';
            if (doughnutChart) doughnutChart.destroy();
            doughnutChart = null;
        }
    });
});