// File: script.js

// 1. Konfigurasi Klien Supabase
const SUPABASE_URL = 'https://xzcbgqayotjsdzhejwie.supabase.co'; // Ganti dengan URL Anda
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Y2JncWF5b3Rqc2R6aGVqd2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTM0NTYsImV4cCI6MjA2NTQ2OTQ1Nn0.LnBVr2AvHJumtnhN7ULpEXrUqVHTxFksDDI4qhFQAtc'; // Ganti dengan Kunci Anon Anda

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Fungsi untuk mengambil dan menampilkan data
async function loadTransaksi() {
    // Ambil data dari tabel 'transaksi', urutkan dari yang terbaru
    const { data: transaksi, error } = await supabase
        .from('transaksi')
        .select('*')
        .order('tanggal', { ascending: false })
        .order('id', { ascending: false });

    if (error) {
        console.error('Error mengambil data:', error);
        return;
    }

    // 3. Dapatkan elemen HTML dari DOM
    const riwayatTbody = document.getElementById('riwayat-transaksi');
    const totalPemasukanEl = document.getElementById('total-pemasukan');
    const totalPengeluaranEl = document.getElementById('total-pengeluaran');
    const saldoAkhirEl = document.getElementById('saldo-akhir');

    // Kosongkan isi tabel sebelum diisi data baru
    riwayatTbody.innerHTML = '';

    if (transaksi.length === 0) {
        riwayatTbody.innerHTML = '<tr><td colspan="3" class="text-center py-4">Belum ada transaksi.</td></tr>';
    }

    // 4. Hitung total dan tampilkan setiap baris transaksi
    let pemasukan = 0;
    let pengeluaran = 0;

    transaksi.forEach(t => {
        // Tambahkan baris baru ke tabel
        const row = document.createElement('tr');
        const tipeKelasWarna = t.tipe === 'pemasukan' ? 'text-success' : 'text-danger';
        const tipeSimbol = t.tipe === 'pemasukan' ? '+' : '-';

        row.innerHTML = `
            <td>${new Date(t.tanggal).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}</td>
            <td>${t.deskripsi}</td>
            <td class="text-end fw-bold ${tipeKelasWarna}">
                ${tipeSimbol} Rp ${parseFloat(t.jumlah).toLocaleString('id-ID')}
            </td>
        `;
        riwayatTbody.appendChild(row);

        // Akumulasi total
        if (t.tipe === 'pemasukan') {
            pemasukan += parseFloat(t.jumlah);
        } else {
            pengeluaran += parseFloat(t.jumlah);
        }
    });

    // 5. Update total di kartu statistik
    const saldo = pemasukan - pengeluaran;
    totalPemasukanEl.textContent = `Rp ${pemasukan.toLocaleString('id-ID')}`;
    totalPengeluaranEl.textContent = `Rp ${pengeluaran.toLocaleString('id-ID')}`;
    saldoAkhirEl.textContent = `Rp ${saldo.toLocaleString('id-ID')}`;
}

// 6. Jalankan fungsi saat halaman selesai dimuat
document.addEventListener('DOMContentLoaded', loadTransaksi);