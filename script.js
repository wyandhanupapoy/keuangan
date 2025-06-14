// File: script.js - Versi Kompleks (CRUD + Chart)

// =================================================================
// BAGIAN 1: KONFIGURASI & INISIALISASI
// =================================================================
const SUPABASE_URL = 'https://xzcbgqayotjsdzhejwie.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Y2JncWF5b3Rqc2R6aGVqd2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTM0NTYsImV4cCI6MjA2NTQ2OTQ1Nn0.LnBVr2AvHJumtnhN7ULpEXrUqVHTxFksDDI4qhFQAtc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let editModal = null; // Variabel untuk menyimpan instance modal Bootstrap
let doughnutChart = null; // Variabel untuk menyimpan instance grafik

// =================================================================
// BAGIAN 2: FUNGSI UTAMA & PEMBANTU
// =================================================================

/**
 * Fungsi utama untuk memuat, menghitung, dan merender semua data
 */
async function loadTransaksi() {
    const riwayatTbody = document.getElementById('riwayat-transaksi');
    riwayatTbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Memuat data...</td></tr>';

    const { data: transaksi, error } = await supabase.from('transaksi').select('*').order('tanggal', { ascending: false }).order('id', { ascending: false });

    if (error) {
        console.error('Error mengambil data:', error);
        riwayatTbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Gagal memuat data.</td></tr>';
        return;
    }

    riwayatTbody.innerHTML = '';
    if (transaksi.length === 0) {
        riwayatTbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Belum ada transaksi.</td></tr>';
    }

    let pemasukan = 0;
    let pengeluaran = 0;

    transaksi.forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(t.tanggal).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'})}</td>
            <td>${t.deskripsi}</td>
            <td class="text-end fw-bold ${t.tipe === 'pemasukan' ? 'text-success' : 'text-danger'}">
                ${t.tipe === 'pemasukan' ? '+' : '-'} Rp ${parseFloat(t.jumlah).toLocaleString('id-ID')}
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${t.id}" title="Edit">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${t.id}" title="Hapus">
                    <i class="bi bi-trash3-fill"></i>
                </button>
            </td>
        `;
        riwayatTbody.appendChild(row);

        if (t.tipe === 'pemasukan') pemasukan += parseFloat(t.jumlah);
        else pengeluaran += parseFloat(t.jumlah);
    });

    // Update statistik
    document.getElementById('total-pemasukan').textContent = `Rp ${pemasukan.toLocaleString('id-ID')}`;
    document.getElementById('total-pengeluaran').textContent = `Rp ${pengeluaran.toLocaleString('id-ID')}`;
    document.getElementById('saldo-akhir').textContent = `Rp ${(pemasukan - pengeluaran).toLocaleString('id-ID')}`;
    
    // Render grafik
    renderChart(pemasukan, pengeluaran);
    
    // Tambahkan event listener untuk tombol edit dan hapus yang baru dibuat
    attachActionListeners();
}

/**
 * Merender atau memperbarui grafik distribusi
 */
function renderChart(pemasukan, pengeluaran) {
    const ctx = document.getElementById('chart-distribusi').getContext('2d');
    const chartData = {
        labels: ['Pemasukan', 'Pengeluaran'],
        datasets: [{
            data: [pemasukan, pengeluaran],
            backgroundColor: ['#198754', '#dc3545'],
            hoverOffset: 4
        }]
    };

    if (doughnutChart) {
        doughnutChart.data = chartData;
        doughnutChart.update();
    } else {
        doughnutChart = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } }
        });
    }
}

/**
 * Menambahkan event listener ke semua tombol aksi (edit/hapus)
 */
function attachActionListeners() {
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (confirm('Anda yakin ingin menghapus transaksi ini?')) {
                await supabase.from('transaksi').delete().eq('id', id);
                await loadTransaksi();
            }
        });
    });

    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const { data } = await supabase.from('transaksi').select('*').eq('id', id).single();
            
            document.getElementById('edit-id').value = data.id;
            document.getElementById('edit-deskripsi').value = data.deskripsi;
            document.getElementById('edit-jumlah').value = data.jumlah;
            document.getElementById('edit-tipe').value = data.tipe;
            document.getElementById('edit-tanggal').value = data.tanggal;
            
            editModal.show();
        });
    });
}

// =================================================================
// BAGIAN 3: EVENT LISTENERS UTAMA
// =================================================================

// Jalankan saat seluruh halaman HTML selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi Modal Bootstrap
    editModal = new bootstrap.Modal(document.getElementById('modal-edit'));
    
    // Panggil data untuk pertama kali
    loadTransaksi();

    // Event listener untuk form tambah data
    document.getElementById('form-tambah').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('button');
        button.disabled = true;

        await supabase.from('transaksi').insert([{
            deskripsi: form.elements.deskripsi.value,
            jumlah: form.elements.jumlah.value,
            tipe: form.elements.tipe.value,
            tanggal: form.elements.tanggal.value,
        }]);

        form.reset();
        button.disabled = false;
        await loadTransaksi();
    });

    // Event listener untuk tombol simpan di modal edit
    document.getElementById('tombol-simpan-edit').addEventListener('click', async () => {
        const id = document.getElementById('edit-id').value;
        const button = document.getElementById('tombol-simpan-edit');
        button.disabled = true;

        await supabase.from('transaksi').update({
            deskripsi: document.getElementById('edit-deskripsi').value,
            jumlah: document.getElementById('edit-jumlah').value,
            tipe: document.getElementById('edit-tipe').value,
            tanggal: document.getElementById('edit-tanggal').value,
        }).eq('id', id);

        button.disabled = false;
        editModal.hide();
        await loadTransaksi();
    });
});