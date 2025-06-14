// File: script.js - Versi Final (Full Auth & CRUD)

// =================================================================
// BAGIAN 1: KONFIGURASI & INISIALISASI
// =================================================================
const SUPABASE_URL = 'https://xzcbgqayotjsdzhejwie.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Y2JncWF5b3Rqc2R6aGVqd2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTM0NTYsImV4cCI6MjA2NTQ2OTQ1Nn0.LnBVr2AvHJumtnhN7ULpEXrUqVHTxFksDDI4qhFQAtc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let editModal = null;
let doughnutChart = null;

// =================================================================
// BAGIAN 2: FUNGSI CRUD & GRAFIK (Create, Read, Update, Delete)
// =================================================================

async function loadTransaksi() {
    // ... (kode fungsi loadTransaksi dari versi kompleks sebelumnya SAMA PERSIS, tidak perlu diubah) ...
    // ... (Ia sudah aman karena RLS akan memfilter data secara otomatis di server) ...
    const riwayatTbody = document.getElementById('riwayat-transaksi');
    riwayatTbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Memuat data...</td></tr>';
    const { data: transaksi, error } = await supabase.from('transaksi').select('*').order('tanggal', { ascending: false }).order('id', { ascending: false });
    if (error) { console.error('Error mengambil data:', error); riwayatTbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Gagal memuat data.</td></tr>'; return; }
    riwayatTbody.innerHTML = '';
    if (transaksi.length === 0) { riwayatTbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Belum ada transaksi.</td></tr>'; }
    let pemasukan = 0, pengeluaran = 0;
    transaksi.forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${new Date(t.tanggal).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'})}</td><td>${t.deskripsi}</td><td class="text-end fw-bold ${t.tipe === 'pemasukan' ? 'text-success' : 'text-danger'}">${t.tipe === 'pemasukan' ? '+' : '-'} Rp ${parseFloat(t.jumlah).toLocaleString('id-ID')}</td><td class="text-center"><button class="btn btn-sm btn-outline-primary btn-edit" data-id="${t.id}"><i class="bi bi-pencil-square"></i></button> <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${t.id}"><i class="bi bi-trash3-fill"></i></button></td>`;
        riwayatTbody.appendChild(row);
        if (t.tipe === 'pemasukan') pemasukan += parseFloat(t.jumlah); else pengeluaran += parseFloat(t.jumlah);
    });
    document.getElementById('total-pemasukan').textContent = `Rp ${pemasukan.toLocaleString('id-ID')}`;
    document.getElementById('total-pengeluaran').textContent = `Rp ${pengeluaran.toLocaleString('id-ID')}`;
    document.getElementById('saldo-akhir').textContent = `Rp ${(pemasukan - pengeluaran).toLocaleString('id-ID')}`;
    renderChart(pemasukan, pengeluaran);
    attachActionListeners();
}

function renderChart(pemasukan, pengeluaran) {
    // ... (kode fungsi renderChart dari versi kompleks sebelumnya SAMA PERSIS) ...
    const ctx = document.getElementById('chart-distribusi').getContext('2d');
    const chartData = { labels: ['Pemasukan', 'Pengeluaran'], datasets: [{ data: [pemasukan, pengeluaran], backgroundColor: ['#198754', '#dc3545'], hoverOffset: 4 }] };
    if (doughnutChart) { doughnutChart.data = chartData; doughnutChart.update(); } 
    else { doughnutChart = new Chart(ctx, { type: 'doughnut', data: chartData, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } } }); }
}

function attachActionListeners() {
    // ... (kode fungsi attachActionListeners dari versi kompleks sebelumnya SAMA PERSIS) ...
    document.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', async e => { const id = e.currentTarget.getAttribute('data-id'); if (confirm('Anda yakin?')) { await supabase.from('transaksi').delete().eq('id', id); await loadTransaksi(); } }));
    document.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', async e => { const id = e.currentTarget.getAttribute('data-id'); const { data } = await supabase.from('transaksi').select('*').eq('id', id).single(); document.getElementById('edit-id').value = data.id; document.getElementById('edit-deskripsi').value = data.deskripsi; document.getElementById('edit-jumlah').value = data.jumlah; document.getElementById('edit-tipe').value = data.tipe; document.getElementById('edit-tanggal').value = data.tanggal; editModal.show(); }));
}

// =================================================================
// BAGIAN 3: FUNGSI OTENTIKASI PENGGUNA
// =================================================================

const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const tombolLogout = document.getElementById('tombol-logout');
const authAlert = document.getElementById('auth-alert');

// --- Fungsi untuk menampilkan pesan error di form auth ---
const showAlert = (message) => {
    authAlert.textContent = message;
    authAlert.classList.remove('d-none');
}

// --- Event listener untuk form login ---
formLogin.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = formLogin.elements['login-email'].value;
    const password = formLogin.elements['login-password'].value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showAlert(error.message);
    else formLogin.reset();
});

// --- Event listener untuk form register ---
formRegister.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = formRegister.elements['register-email'].value;
    const password = formRegister.elements['register-password'].value;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) showAlert(error.message);
    else showAlert('Registrasi berhasil! Silakan cek email Anda untuk verifikasi.');
});

// --- Event listener untuk tombol logout ---
tombolLogout.addEventListener('click', async () => {
    await supabase.auth.signOut();
});

// =================================================================
// BAGIAN 4: MANAJEMEN TAMPILAN & SESI
// =================================================================

const loader = document.getElementById('app-loader');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const userEmailEl = document.getElementById('user-email');

// Fungsi ini adalah jantung dari aplikasi.
// Ia berjalan setiap kali ada perubahan status login (login, logout, halaman dimuat).
supabase.auth.onAuthStateChange((event, session) => {
    loader.classList.add('d-none'); // Selalu sembunyikan loader setelah cek status

    if (session) {
        // Jika ada sesi (pengguna login)
        appContainer.style.display = 'block';
        authContainer.classList.add('d-none');
        userEmailEl.textContent = session.user.email;
        loadTransaksi(); // Muat data transaksi milik pengguna ini
    } else {
        // Jika tidak ada sesi (pengguna logout)
        appContainer.style.display = 'none';
        authContainer.classList.remove('d-none');
        userEmailEl.textContent = '';
    }
});

// =================================================================
// BAGIAN 5: INISIALISASI APLIKASI
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi Modal Bootstrap untuk edit
    editModal = new bootstrap.Modal(document.getElementById('modal-edit'));

    // Event listener untuk form tambah (disesuaikan untuk menyertakan user_id)
    document.getElementById('form-tambah').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const { data: { user } } = await supabase.auth.getUser(); // Dapatkan user yg login

        if (user) {
            await supabase.from('transaksi').insert([{
                deskripsi: form.elements.deskripsi.value,
                jumlah: form.elements.jumlah.value,
                tipe: form.elements.tipe.value,
                tanggal: form.elements.tanggal.value,
                user_id: user.id // KIRIM USER ID KE DATABASE
            }]);
            form.reset();
            await loadTransaksi();
        }
    });

    // Event listener untuk tombol simpan di modal edit
    document.getElementById('tombol-simpan-edit').addEventListener('click', async () => {
        const id = document.getElementById('edit-id').value;
        await supabase.from('transaksi').update({
            deskripsi: document.getElementById('edit-deskripsi').value,
            jumlah: document.getElementById('edit-jumlah').value,
            tipe: document.getElementById('edit-tipe').value,
            tanggal: document.getElementById('edit-tanggal').value,
        }).eq('id', id);
        editModal.hide();
        await loadTransaksi();
    });
});