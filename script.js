const SUPABASE_URL = 'https://xzcbgqayotjsdzhejwie.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Y2JncWF5b3Rqc2R6aGVqd2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTM0NTYsImV4cCI6MjA2NTQ2OTQ1Nn0.LnBVr2AvHJumtnhN7ULpEXrUqVHTxFksDDI4qhFQAtc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let editModal = null;
let appToast = null;
let doughnutChart = null;

// Utility Functions
const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

const showToast = (title, message, type = 'success') => {
    const toast = document.getElementById('app-toast');
    const toastTitle = document.getElementById('toast-title');
    const toastBody = document.getElementById('toast-body');
    toastTitle.textContent = title;
    toastBody.textContent = message;
    
    toast.classList.remove('bg-green-100', 'bg-red-100');
    toast.classList.add(type === 'success' ? 'bg-green-100' : 'bg-red-100');
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
};

const setButtonLoading = (button, isLoading) => {
    const spinner = button.querySelector('.spinner-border');
    button.disabled = isLoading;
    spinner.classList.toggle('hidden', !isLoading);
};

const validateForm = (form) => {
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isValid = true;
    inputs.forEach(input => {
        if (!input.value) {
            input.classList.add('border-red-500');
            isValid = false;
        } else {
            input.classList.remove('border-red-500');
        }
    });
    return isValid;
};

// CRUD Functions
async function loadTransaksi() {
    const riwayatTbody = document.getElementById('riwayat-transaksi');
    riwayatTbody.innerHTML = '<tr><td colspan="4" class="text-center py-5"><div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>';

    try {
        const { data: transaksi, error } = await supabase.from('transaksi').select('*').order('tanggal', { ascending: false }).order('id', { ascending: false });
        
        if (error) throw new Error(error.message);

        riwayatTbody.innerHTML = transaksi.length === 0 
            ? '<tr><td colspan="4" class="text-center py-5"><i class="bi bi-journal-x fs-2 text-gray-500"></i><p class="mt-2 mb-0 text-gray-500">Belum ada transaksi.</p><p class="text-sm text-gray-500">Coba tambahkan transaksi baru.</p></td></tr>'
            : '';

        let pemasukan = 0, pengeluaran = 0;
        transaksi.forEach(t => {
            const tipeIcon = t.tipe === 'pemasukan' 
                ? '<i class="bi bi-plus-circle-fill text-green-500 mr-2"></i>'
                : '<i class="bi bi-dash-circle-fill text-red-500 mr-2"></i>';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="py-3 px-4">${new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td class="py-3 px-4">${t.deskripsi}</td>
                <td class="py-3 px-4 text-right font-bold ${t.tipe === 'pemasukan' ? 'text-green-500' : 'text-red-500'}">
                    ${t.tipe === 'pemasukan' ? '+' : '-'} ${formatRupiah(t.jumlah)}
                </td>
                <td class="py-3 px-4 text-center">
                    <button class="btn-edit text-blue-500 hover:text-blue-700 mr-2" data-id="${t.id}" title="Edit"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn-delete text-red-500 hover:text-red-700" data-id="${t.id}" title="Hapus"><i class="bi bi-trash3-fill"></i></button>
                </td>`;
            riwayatTbody.appendChild(row);
            
            if (t.tipe === 'pemasukan') pemasukan += parseFloat(t.jumlah);
            else pengeluaran += parseFloat(t.jumlah);
        });

        document.getElementById('total-pemasukan').textContent = formatRupiah(pemasukan);
        document.getElementById('total-pengeluaran').textContent = formatRupiah(pengeluaran);
        document.getElementById('saldo-akhir').textContent = formatRupiah(pemasukan - pengeluaran);
        
        renderChart(pemasukan, pengeluaran);
        attachActionListeners();
    } catch (error) {
        riwayatTbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500">Gagal memuat data. Periksa koneksi Anda.</td></tr>';
        showToast('Error', 'Gagal memuat transaksi.', 'danger');
    }
}

function renderChart(pemasukan, pengeluaran) {
    const ctx = document.getElementById('chart-distribusi').getContext('2d');
    const chartContainer = document.getElementById('chart-container');
    const chartData = {
        labels: ['Pemasukan', 'Pengeluaran'],
        datasets: [{
            data: [pemasukan, pengeluaran],
            backgroundColor: ['#10b981', '#ef4444'],
            borderColor: '#fff',
            borderWidth: 2,
            hoverOffset: 12
        }]
    };

    if (pemasukan === 0 && pengeluaran === 0) {
        chartContainer.innerHTML = '<p class="text-gray-500 text-center text-sm">Data grafik akan muncul setelah ada transaksi.</p>';
        if (doughnutChart) doughnutChart.destroy();
        doughnutChart = null;
        return;
    } else if (!document.getElementById('chart-distribusi')) {
        chartContainer.innerHTML = '<canvas id="chart-distribusi" class="h-full"></canvas>';
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { color: document.documentElement.classList.contains('dark') ? '#fff' : '#000' } },
            tooltip: { callbacks: { label: (context) => `${context.label}: ${formatRupiah(context.raw)}` } }
        },
        cutout: '60%'
    };

    if (doughnutChart) {
        doughnutChart.data = chartData;
        doughnutChart.options = options;
        doughnutChart.update();
    } else {
        doughnutChart = new Chart(ctx, { type: 'doughnut', data: chartData, options: options });
    }
}

function attachActionListeners() {
    document.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', async e => {
        if (confirm('Anda yakin ingin menghapus transaksi ini?')) {
            const id = e.currentTarget.getAttribute('data-id');
            try {
                const { error } = await supabase.from('transaksi').delete().eq('id', id);
                if (error) throw new Error(error.message);
                showToast('Berhasil', 'Transaksi telah dihapus.', 'success');
                await loadTransaksi();
            } catch (error) {
                showToast('Error', 'Gagal menghapus transaksi.', 'danger');
            }
        }
    }));

    document.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', async e => {
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
            showToast('Error', 'Tidak dapat memuat data transaksi.', 'danger');
        }
    }));
}

// Authentication Functions
const showAlert = (message) => {
    const authAlert = document.getElementById('auth-alert');
    authAlert.textContent = message;
    authAlert.classList.remove('hidden');
    setTimeout(() => authAlert.classList.add('hidden'), 5000);
};

const handleAuthForm = async (formId, isLogin) => {
    const form = document.getElementById(formId);
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateForm(form)) {
            showAlert('Harap isi semua kolom dengan benar.');
            return;
        }

        const email = form.elements[`${isLogin ? 'login' : 'register'}-email`].value;
        const password = form.elements[`${isLogin ? 'login' : 'register'}-password`].value;
        const button = form.querySelector('button[type="submit"]');
        setButtonLoading(button, true);

        try {
            const { error } = isLogin 
                ? await supabase.auth.signInWithPassword({ email, password })
                : await supabase.auth.signUp({ email, password });
            
            if (error) throw new Error(error.message);
            
            if (!isLogin) showAlert('Registrasi berhasil! Silakan cek email Anda untuk verifikasi.');
            form.reset();
        } catch (error) {
            showAlert(error.message);
        } finally {
            setButtonLoading(button, false);
        }
    });
};

// Export CSV
const exportToCSV = async () => {
    try {
        const { data: transaksi, error } = await supabase.from('transaksi').select('*').order('tanggal', { ascending: false });
        if (error) throw new Error(error.message);

        const headers = ['Tanggal', 'Deskripsi', 'Jumlah', 'Tipe'];
        const csv = [
            headers.join(','),
            ...transaksi.map(t => [
                new Date(t.tanggal).toLocaleDateString('id-ID'),
                `"${t.deskripsi.replace(/"/g, '""')}"`,
                t.jumlah,
                t.tipe
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `keuanganKu-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        showToast('Error', 'Gagal mengekspor data.', 'danger');
    }
};

// Dark Mode Toggle
const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    if (doughnutChart) renderChart(
        parseFloat(document.getElementById('total-pemasukan').textContent.replace(/[^0-9,-]+/g, '')),
        parseFloat(document.getElementById('total-pengeluaran').textContent.replace(/[^0-9,-]+/g, ''))
    );
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Modal and Toast
    editModal = document.getElementById('modal-edit');
    appToast = document.getElementById('app-toast');
    document.getElementById('tombol-batal-edit').addEventListener('click', () => editModal.classList.add('hidden'));
    document.getElementById('toast-close').addEventListener('click', () => appToast.classList.add('hidden'));

    // Set Copyright Year
    document.getElementById('copyright-year').textContent = new Date().getFullYear();

    // Initialize Forms
    handleAuthForm('form-login', true);
    handleAuthForm('form-register', false);
    document.getElementById('form-tambah').addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateForm(event.currentTarget)) {
            showToast('Gagal', 'Harap isi semua kolom dengan benar.', 'danger');
            return;
        }

        const button = event.currentTarget.querySelector('button[type="submit"]');
        setButtonLoading(button, true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sesi tidak valid. Silakan login kembali.');

            const { error } = await supabase.from('transaksi').insert([{
                deskripsi: event.currentTarget.elements.deskripsi.value,
                jumlah: event.currentTarget.elements.jumlah.value,
                tipe: event.currentTarget.elements.tipe.value,
                tanggal: event.currentTarget.elements.tanggal.value || new Date().toISOString().slice(0, 10),
                user_id: user.id
            }]);

            if (error) throw new Error(error.message);

            showToast('Berhasil', 'Transaksi baru berhasil ditambahkan.', 'success');
            event.currentTarget.reset();
            document.getElementById('tanggal').value = new Date().toISOString().slice(0, 10);
            await loadTransaksi();
        } catch (error) {
            showToast('Gagal', error.message, 'danger');
        } finally {
            setButtonLoading(button, false);
        }
    });

    document.getElementById('form-edit').addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateForm(event.currentTarget)) {
            showToast('Gagal', 'Harap isi semua kolom dengan benar.', 'danger');
            return;
        }

        const button = document.getElementById('tombol-simpan-edit');
        setButtonLoading(button, true);

        try {
            const id = document.getElementById('edit-id').value;
            const { error } = await supabase.from('transaksi').update({
                deskripsi: document.getElementById('edit-deskripsi').value,
                jumlah: document.getElementById('edit-jumlah').value,
                tipe: document.getElementById('edit-tipe').value,
                tanggal: document.getElementById('edit-tanggal').value,
            }).eq('id', id);

            if (error) throw new Error(error.message);

            showToast('Berhasil', 'Perubahan telah disimpan.', 'success');
            editModal.classList.add('hidden');
            await loadTransaksi();
        } catch (error) {
            showToast('Gagal', error.message, 'danger');
        } finally {
            setButtonLoading(button, false);
        }
    });

    // Tab Switching
    document.getElementById('tab-login').addEventListener('click', () => {
        document.getElementById('form-login').classList.remove('hidden');
        document.getElementById('form-register').classList.add('hidden');
        document.getElementById('tab-login').classList.add('border-blue-500');
        document.getElementById('tab-register').classList.remove('border-blue-500');
    });

    document.getElementById('tab-register').addEventListener('click', () => {
        document.getElementById('form-register').classList.remove('hidden');
        document.getElementById('form-login').classList.add('hidden');
        document.getElementById('tab-register').classList.add('border-blue-500');
        document.getElementById('tab-login').classList.remove('border-blue-500');
    });

    // Export CSV
    document.getElementById('export-csv').addEventListener('click', exportToCSV);

    // Dark Mode
    if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');
    document.getElementById('toggle-dark-mode').addEventListener('click', toggleDarkMode);

    // Set Default Date
    document.getElementById('tanggal').value = new Date().toISOString().slice(0, 10);

    // Auth State Change
    supabase.auth.onAuthStateChange((event, session) => {
        const loader = document.getElementById('app-loader');
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        const userEmailEl = document.getElementById('user-email');

        loader.classList.add('hidden');

        if (session) {
            appContainer.classList.remove('hidden');
            authContainer.classList.add('hidden');
            userEmailEl.textContent = session.user.email;
            loadTransaksi();
        } else {
            appContainer.classList.add('hidden');
            authContainer.classList.remove('hidden');
            userEmailEl.textContent = '';
            if (doughnutChart) doughnutChart.destroy();
            doughnutChart = null;
        }
    });

    document.getElementById('tombol-logout').addEventListener('click', async () => {
        try {
            await supabase.auth.signOut();
            showToast('Berhasil', 'Anda telah logout.', 'success');
        } catch (error) {
            showToast('Error', 'Gagal logout.', 'danger');
        }
    });
});