// File: script.js - Versi Lengkap (Baca & Tambah Data)

// =================================================================
// BAGIAN 1: KONFIGURASI & INISIALISASI
// =================================================================

// Konfigurasi Klien Supabase
// (Gunakan URL dan Kunci Anon Publik dari dashboard Supabase Anda)
const SUPABASE_URL = 'https://xzcbgqayotjsdzhejwie.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Y2JncWF5b3Rqc2R6aGVqd2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTM0NTYsImV4cCI6MjA2NTQ2OTQ1Nn0.LnBVr2AvHJumtnhN7ULpEXrUqVHTxFksDDI4qhFQAtc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Dapatkan semua elemen HTML yang akan kita manipulasi
const riwayatTbody = document.getElementById('riwayat-transaksi');
const totalPemasukanEl = document.getElementById('total-pemasukan');
const totalPengeluaranEl = document.getElementById('total-pengeluaran');
const saldoAkhirEl = document.getElementById('saldo-akhir');
const formTambah = document.getElementById('form-tambah');
const buttonText = document.getElementById('button-text');
const buttonSpinner = document.getElementById('button-spinner');

// =================================================================
// BAGIAN 2: FUNGSI UTAMA
// =================================================================

/**
 * Fungsi ini mengambil semua data transaksi dari Supabase,
 * menghitung total, lalu menampilkannya di halaman HTML.
 */
async function loadTransaksi() {
    // Tampilkan pesan "Memuat data..." saat fungsi berjalan
    riwayatTbody.innerHTML = '<tr><td colspan="3" class="text-center py-4">Memuat data...</td></tr>';

    // Ambil data dari tabel 'transaksi', urutkan dari yang terbaru
    const { data: transaksi, error } = await supabase
        .from('transaksi')
        .select('*')
        .order('tanggal', { ascending: false })
        .order('id', { ascending: false });

    // Jika ada error saat mengambil data, tampilkan di console dan hentikan fungsi
    if (error) {
        console.error('Error mengambil data:', error);
        riwayatTbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-danger">Gagal memuat data.</td></tr>';
        return;
    }

    // Kosongkan isi tabel sebelum diisi data baru
    riwayatTbody.innerHTML = '';

    // Jika tidak ada data transaksi, tampilkan pesan
    if (transaksi.length === 0) {
        riwayatTbody.innerHTML = '<tr><td colspan="3" class="text-center py-4">Belum ada transaksi.</td></tr>';
    }

    // Hitung total dan tampilkan setiap baris transaksi
    let pemasukan = 0;
    let pengeluaran = 0;

    transaksi.forEach(t => {
        // Buat elemen <tr> baru untuk setiap transaksi
        const row = document.createElement('tr');
        const tipeKelasWarna = t.tipe === 'pemasukan' ? 'text-success' : 'text-danger';
        const tipeSimbol = t.tipe === 'pemasukan' ? '+' : '-';

        // Isi HTML untuk baris tersebut
        row.innerHTML = `
            <td>${new Date(t.tanggal).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}</td>
            <td>${t.deskripsi}</td>
            <td class="text-end fw-bold ${tipeKelasWarna}">
                ${tipeSimbol} Rp ${parseFloat(t.jumlah).toLocaleString('id-ID')}
            </td>
        `;
        // Tambahkan baris ke dalam tabel
        riwayatTbody.appendChild(row);

        // Akumulasi total
        if (t.tipe === 'pemasukan') {
            pemasukan += parseFloat(t.jumlah);
        } else {
            pengeluaran += parseFloat(t.jumlah);
        }
    });

    // Update total di kartu statistik
    const saldo = pemasukan - pengeluaran;
    totalPemasukanEl.textContent = `Rp ${pemasukan.toLocaleString('id-ID')}`;
    totalPengeluaranEl.textContent = `Rp ${pengeluaran.toLocaleString('id-ID')}`;
    saldoAkhirEl.textContent = `Rp ${saldo.toLocaleString('id-ID')}`;
}

// =================================================================
// BAGIAN 3: EVENT LISTENERS (PENDENGAR AKSI PENGGUNA)
// =================================================================

// 1. Jalankan fungsi loadTransaksi() saat halaman selesai dimuat pertama kali.
document.addEventListener('DOMContentLoaded', loadTransaksi);

// 2. Tambahkan event listener yang akan berjalan saat form tambah data di-submit.
formTambah.addEventListener('submit', async (event) => {
    // Mencegah form melakukan refresh halaman (perilaku default)
    event.preventDefault();

    // Tampilkan status "loading" pada tombol submit
    buttonText.textContent = 'Menyimpan...';
    buttonSpinner.classList.remove('d-none');
    formTambah.querySelector('button').disabled = true;

    // Ambil semua data dari input di dalam form
    const deskripsi = formTambah.elements['deskripsi'].value;
    const jumlah = formTambah.elements['jumlah'].value;
    const tipe = formTambah.elements['tipe'].value;
    const tanggal = formTambah.elements['tanggal'].value;

    // Kirim data ke tabel 'transaksi' di Supabase
    const { error } = await supabase
        .from('transaksi')
        .insert([
            { deskripsi: deskripsi, jumlah: jumlah, tipe: tipe, tanggal: tanggal }
        ]);

    // Periksa apakah ada error saat proses insert
    if (error) {
        console.error('Gagal menambah data:', error);
        alert('Gagal menyimpan data! Lihat console untuk detail.');
    } else {
        // Jika berhasil:
        // a. Reset (kosongkan) semua input di form
        formTambah.reset();
        // b. Muat ulang daftar transaksi agar data baru langsung muncul di tabel
        await loadTransaksi(); 
    }

    // Kembalikan tombol ke keadaan normal setelah proses selesai
    buttonText.textContent = 'Simpan Transaksi';
    buttonSpinner.classList.add('d-none');
    formTambah.querySelector('button').disabled = false;
});