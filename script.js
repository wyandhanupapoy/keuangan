// File: script.js - Versi Final (Full Auth & CRUD) - UI/UX Ditingkatkan

// =================================================================
// BAGIAN 1: KONFIGURASI & INISIALISASI
// =================================================================
const SUPABASE_URL = 'https://xzcbgqayotjsdzhejwie.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Y2JncWF5b3Rqc2R6aGVqd2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTM0NTYsImV4cCI6MjA2NTQ2OTQ1Nn0.LnBVr2AvHJumtnhN7ULpEXrUqVHTxFksDDI4qhFQAtc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let editModal = null;
let appToast = null;
let doughnutChart = null;

// =================================================================
// BAGIAN 2: FUNGSI UTILITAS & TAMPILAN
// =================================================================

// Fungsi untuk format mata uang Rupiah
const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

// Fungsi untuk menampilkan notifikasi toast
const showToast = (title, message, type = 'success') => {
    const toastTitle = document.getElementById('toast-title');
    const toastBody = document.getElementById('toast-body');
    const toastHeader = document.querySelector('#app-toast .toast-header');

    toastTitle.textContent = title;
    toastBody.textContent = message;
    
    // Ganti warna header toast sesuai tipe
    toastHeader.classList.remove('bg-success', 'bg-danger', 'text-white');
    if (type === 'success') {
        toastHeader.classList.add('bg-success', 'text-white');
    } else if (type === 'danger') {
        toastHeader.classList.add('bg-danger', 'text-white');
    }
    
    appToast.show();
};

// Fungsi untuk mengelola loading state pada tombol
const setButtonLoading = (button, isLoading) => {
    const spinner = button.querySelector('.spinner-border');
    if (isLoading) {
        button.disabled = true;
        spinner.classList.remove('d-none');
    } else {
        button.disabled = false;
        spinner.classList.add('d-none');
    }
};

// =================================================================
// BAGIAN 3: FUNGSI CRUD & GRAFIK
// =================================================================

async function loadTransaksi() {
    const riwayatTbody = document.getElementById('riwayat-transaksi');
    riwayatTbody.innerHTML = '<tr><td colspan="4" class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Memuat...</span></div></td></tr>';
    
    const { data: transaksi, error } = await supabase.from('transaksi').select('*').order('tanggal', { ascending: false }).order('id', { ascending: false });
    
    if (error) {
        console.error('Error mengambil data:', error);
        riwayatTbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Gagal memuat data. Periksa koneksi Anda.</td></tr>';
        return;
    }
    
    riwayatTbody.innerHTML = '';
    if (transaksi.length === 0) {
        riwayatTbody.innerHTML = '<tr><td colspan="4" class="text-center py-5"><i class="bi bi-journal-x fs-2 text-muted"></i><p class="mt-2 mb-0 text-muted">Belum ada transaksi.</p><p class="small text-muted">Coba tambahkan transaksi baru.</p></td></tr>';
    }
    
    let pemasukan = 0, pengeluaran = 0;
    transaksi.forEach(t => {
        const tipeIcon = t.tipe === 'pemasukan' 
            ? '<i class="bi bi-plus-circle-fill text-success me-2"></i>'
            : '<i class="bi bi-dash-circle-fill text-danger me-2"></i>';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
            <td>${t.deskripsi}</td>
            <td class="text-end fw-bold ${t.tipe === 'pemasukan' ? 'text-success' : 'text-danger'}">
                ${t.tipe === 'pemasukan' ? '+' : '-'} ${formatRupiah(t.jumlah)}
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary btn-action btn-edit" data-id="${t.id}" title="Edit"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-sm btn-outline-danger btn-action btn-delete" data-id="${t.id}" title="Hapus"><i class="bi bi-trash3-fill"></i></button>
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
}

function renderChart(pemasukan, pengeluaran) {
    const ctx = document.getElementById('chart-distribusi').getContext('2d');
    const chartContainer = document.getElementById('chart-container');
    const chartData = {
        labels: ['Pemasukan', 'Pengeluaran'],
        datasets: [{
            data: [pemasukan, pengeluaran],
            backgroundColor: ['#198754', '#dc3545'],
            borderColor: '#fff',
            borderWidth: 2,
            hoverOffset: 8
        }]
    };

    if (pemasukan === 0 && pengeluaran === 0) {
        chartContainer.innerHTML = '<p class="text-muted text-center small">Data grafik akan muncul di sini setelah ada transaksi.</p>';
        if (doughnutChart) {
            doughnutChart.destroy();
            doughnutChart = null;
        }
        return;
    } else if (!document.getElementById('chart-distribusi')) {
        chartContainer.innerHTML = '<canvas id="chart-distribusi"></canvas>';
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.label}: ${formatRupiah(context.raw)}`
                }
            }
        },
        cutout: '70%'
    };

    if (doughnutChart) {
        doughnutChart.data = chartData;
        doughnutChart.update();
    } else {
        doughnutChart = new Chart(ctx, { type: 'doughnut', data: chartData, options: options });
    }
}


function attachActionListeners() {
    document.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', async e => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Anda yakin ingin menghapus transaksi ini?')) {
            const { error } = await supabase.from('transaksi').delete().eq('id', id);
            if(error) {
                showToast('Error', 'Gagal menghapus data.', 'danger');
            } else {
                showToast('Berhasil', 'Transaksi telah dihapus.', 'success');
                await loadTransaksi();
            }
        }
    }));
    
    document.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', async e => {
        const id = e.currentTarget.getAttribute('data-id');
        const { data, error } = await supabase.from('transaksi').select('*').eq('id', id).single();
        if(error || !data) {
            showToast('Error', 'Tidak dapat menemukan data transaksi.', 'danger');
            return;
        }
        document.getElementById('edit-id').value = data.id;
        document.getElementById('edit-deskripsi').value = data.deskripsi;
        document.getElementById('edit-jumlah').value = data.jumlah;
        document.getElementById('edit-tipe').value = data.tipe;
        document.getElementById('edit-tanggal').value = data.tanggal;
        editModal.show();
    }));
}

// =================================================================
// BAGIAN 4: FUNGSI OTENTIKASI PENGGUNA
// =================================================================

const showAlert = (message) => {
    const authAlert = document.getElementById('auth-alert');
    authAlert.textContent = message;
    authAlert.classList.remove('d-none');
}

document.getElementById('form-login').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.elements['login-email'].value;
    const password = form.elements['login-password'].value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) showAlert(error.message);
    else form.reset();
});

document.getElementById('form-register').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.elements['register-email'].value;
    const password = form.elements['register-password'].value;
    const { error } = await supabase.auth.signUp({ email, password });
    
    if (error) showAlert(error.message);
    else {
        showAlert('Registrasi berhasil! Silakan cek email Anda untuk verifikasi.');
        form.reset();
    }
});

document.getElementById('tombol-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
});

// =================================================================
// BAGIAN 5: MANAJEMEN TAMPILAN & SESI
// =================================================================

supabase.auth.onAuthStateChange((event, session) => {
    const loader = document.getElementById('app-loader');
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const userEmailEl = document.getElementById('user-email');

    loader.classList.add('d-none');

    if (session) {
        appContainer.style.display = 'block';
        authContainer.classList.add('d-none');
        userEmailEl.textContent = session.user.email;
        loadTransaksi();
    } else {
        appContainer.style.display = 'none';
        authContainer.classList.remove('d-none');
        userEmailEl.textContent = '';
        if(doughnutChart) doughnutChart.destroy(); doughnutChart = null;
    }
});

// =================================================================
// BAGIAN 6: INISIALISASI APLIKASI
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi Modal dan Toast Bootstrap
    editModal = new bootstrap.Modal(document.getElementById('modal-edit'));
    appToast = new bootstrap.Toast(document.getElementById('app-toast'));

    // Set tahun copyright secara dinamis
    document.getElementById('copyright-year').textContent = new Date().getFullYear();

    // Event listener untuk form tambah
    document.getElementById('form-tambah').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('button[type="submit"]');
        setButtonLoading(button, true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showToast("Sesi Tidak Valid", "Silakan login kembali.", "danger");
            setButtonLoading(button, false);
            return;
        }

        const { error } = await supabase.from('transaksi').insert([{
            deskripsi: form.elements.deskripsi.value,
            jumlah: form.elements.jumlah.value,
            tipe: form.elements.tipe.value,
            tanggal: form.elements.tanggal.value || new Date().toISOString().slice(0, 10),
            user_id: user.id
        }]);

        if (error) {
            showToast('Gagal', 'Data gagal disimpan. Periksa kembali isian Anda.', 'danger');
            console.error('Gagal menambah data:', error);
        } else {
            showToast('Berhasil', 'Transaksi baru berhasil ditambahkan.', 'success');
            form.reset();
            document.getElementById('tanggal').value = new Date().toISOString().slice(0, 10);
            await loadTransaksi();
        }
        setButtonLoading(button, false);
    });
    
    // Set tanggal default untuk form tambah
    document.getElementById('tanggal').value = new Date().toISOString().slice(0, 10);

    // Event listener untuk tombol simpan di modal edit
    document.getElementById('tombol-simpan-edit').addEventListener('click', async () => {
        const id = document.getElementById('edit-id').value;
        const { error } = await supabase.from('transaksi').update({
            deskripsi: document.getElementById('edit-deskripsi').value,
            jumlah: document.getElementById('edit-jumlah').value,
            tipe: document.getElementById('edit-tipe').value,
            tanggal: document.getElementById('edit-tanggal').value,
        }).eq('id', id);

        if(error){
            showToast('Gagal', 'Perubahan gagal disimpan.', 'danger');
        } else {
            showToast('Berhasil', 'Perubahan telah disimpan.', 'success');
            editModal.hide();
            await loadTransaksi();
        }
    });
});