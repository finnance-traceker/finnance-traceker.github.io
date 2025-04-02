// script.js (Versi Final dengan Saldo Berjalan dan Tfoot)

// Gunakan window.jspdf untuk jsPDF
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', () => {
    // --- Referensi Elemen DOM ---
    const transactionForm = document.getElementById('transaction-form');
    const transactionIdInput = document.getElementById('transaction-id');
    const tanggalInput = document.getElementById('tanggal');
    const keteranganInput = document.getElementById('keterangan');
    const jenisInput = document.getElementById('jenis');
    const jumlahInput = document.getElementById('jumlah');
    const formError = document.getElementById('form-error');

    // Card Ringkasan Atas (Total Keseluruhan)
    const totalPemasukanEl = document.getElementById('total-pemasukan');
    const totalPengeluaranEl = document.getElementById('total-pengeluaran');
    const saldoAkhirEl = document.getElementById('saldo-akhir');

    // Tabel Riwayat
    const riwayatTransaksiBody = document.getElementById('riwayat-transaksi-body');

    // Footer Tabel (Total Filtered)
    const tfootTotalPemasukan = document.getElementById('tfoot-total-pemasukan');
    const tfootTotalPengeluaran = document.getElementById('tfoot-total-pengeluaran');
    const tfootSaldoAkhir = document.getElementById('tfoot-saldo-akhir');

    // Filter & Search
    const filterTanggalMulai = document.getElementById('filter-tanggal-mulai');
    const filterTanggalAkhir = document.getElementById('filter-tanggal-akhir');
    const cariTransaksiInput = document.getElementById('cari-transaksi');

    // Tombol
    const btnAdd = document.getElementById('btn-add');
    const btnUpdate = document.getElementById('btn-update');
    const btnCancel = document.getElementById('btn-cancel-update');
    const btnDelete = document.getElementById('btn-delete'); // Tombol Hapus di form
    const exportPdfBtn = document.getElementById('export-pdf-btn');

    // --- State Aplikasi ---
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let isEditMode = false;
    let currentEditId = null;

    // --- Fungsi Format Mata Uang Rupiah ---
    const formatRupiah = (number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(number);
    };

    // --- Fungsi Render Transaksi ke Tabel (Saldo Berjalan + Tfoot Totals) ---
    const renderTransactions = (transactionsToRender = transactions) => {
        riwayatTransaksiBody.innerHTML = ''; // Kosongkan tabel body
        let runningBalance = 0;
        let totalPemasukanFiltered = 0;
        let totalPengeluaranFiltered = 0;

        if (transactionsToRender.length === 0) {
            // Pastikan colspan=7 sesuai jumlah kolom th baru
            riwayatTransaksiBody.innerHTML = `<tr><td colspan="7" class="text-center" id="no-data-message">Belum ada transaksi.</td></tr>`;
            // Set tfoot totals to 0 when no data
            tfootTotalPemasukan.textContent = formatRupiah(0);
            tfootTotalPengeluaran.textContent = formatRupiah(0);
            tfootSaldoAkhir.textContent = formatRupiah(0);
            return;
        }

        transactionsToRender.forEach((trx, index) => {
            let incomeAmountStr = "-";
            let expenseAmountStr = "-";

            if (trx.jenis === 'pemasukan') {
                runningBalance += trx.jumlah;
                totalPemasukanFiltered += trx.jumlah; // Akumulasi pemasukan terfilter
                incomeAmountStr = formatRupiah(trx.jumlah);
            } else { // pengeluaran
                runningBalance -= trx.jumlah;
                totalPengeluaranFiltered += trx.jumlah; // Akumulasi pengeluaran terfilter
                expenseAmountStr = formatRupiah(trx.jumlah);
            }

            const row = document.createElement('tr');
            row.classList.add('transaction-row');
            row.setAttribute('data-id', trx.id);

            // Sesuaikan jumlah kolom (7 kolom)
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${new Date(trx.tanggal).toLocaleDateString('id-ID')}</td>
                <td>${trx.keterangan}</td>
                <td class="text-end ${trx.jenis === 'pemasukan' ? 'text-success' : ''}">${incomeAmountStr}</td>
                <td class="text-end ${trx.jenis === 'pengeluaran' ? 'text-danger' : ''}">${expenseAmountStr}</td>
                <td class="text-end fw-bold">${formatRupiah(runningBalance)}</td>
                <td>
                    <div class="action-buttons d-flex justify-content-center">
                        <button class="btn btn-sm btn-outline-warning btn-edit me-1" data-id="${trx.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete-row" data-id="${trx.id}" title="Hapus">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            `;
            riwayatTransaksiBody.appendChild(row);
        });

        // Update tfoot totals SETELAH loop selesai
        tfootTotalPemasukan.textContent = formatRupiah(totalPemasukanFiltered);
        tfootTotalPengeluaran.textContent = formatRupiah(totalPengeluaranFiltered);
        // Saldo akhir di tfoot adalah saldo berjalan dari baris terakhir
        tfootSaldoAkhir.textContent = formatRupiah(runningBalance);
    };

    // --- Fungsi Update Ringkasan (Card Atas) ---
    // Fungsi ini tetap menghitung total KESELURUHAN transaksi, bukan yang terfilter
    const updateSummary = () => {
        const totalPemasukan = transactions
            .filter(trx => trx.jenis === 'pemasukan')
            .reduce((sum, trx) => sum + trx.jumlah, 0);

        const totalPengeluaran = transactions
            .filter(trx => trx.jenis === 'pengeluaran')
            .reduce((sum, trx) => sum + trx.jumlah, 0);

        // Saldo akhir keseluruhan (untuk card atas)
        const saldoAkhir = totalPemasukan - totalPengeluaran;

        totalPemasukanEl.textContent = formatRupiah(totalPemasukan);
        totalPengeluaranEl.textContent = formatRupiah(totalPengeluaran);
        saldoAkhirEl.textContent = formatRupiah(saldoAkhir);
    };

    // --- Fungsi Simpan ke Local Storage ---
    const saveTransactions = () => {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    };

     // --- Fungsi Reset Form dan Mode ---
    window.resetForm = () => { // Jadikan global agar bisa dipanggil dari HTML
        transactionForm.reset();
        transactionIdInput.value = '';
        isEditMode = false;
        currentEditId = null;
        btnAdd.classList.remove('d-none'); // Tampilkan tombol Tambah
        btnUpdate.classList.add('d-none'); // Sembunyikan tombol Update
        btnDelete.disabled = true; // Disable tombol Hapus di form
        btnCancel.classList.add('d-none'); // Sembunyikan tombol batal
        keteranganInput.focus(); // Fokus kembali ke keterangan
        formError.classList.add('d-none'); // Sembunyikan pesan error
    }

    // --- Fungsi Filter dan Pencarian ---
    const filterAndSearch = () => {
        const start = filterTanggalMulai.value;
        const end = filterTanggalAkhir.value;
        const searchTerm = cariTransaksiInput.value.toLowerCase();

        let filtered = transactions.filter(trx => {
            const trxDate = new Date(trx.tanggal);
            trxDate.setHours(0, 0, 0, 0); // Normalisasi waktu ke awal hari
            const dateMatch = (!start || trxDate >= new Date(start)) && (!end || trxDate <= new Date(end));
            const searchMatch = !searchTerm || trx.keterangan.toLowerCase().includes(searchTerm);
            return dateMatch && searchMatch;
        });

        // Urutkan hasil filter dari terlama ke terbaru (PENTING untuk saldo berjalan)
        filtered.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal) || a.id - b.id);

        renderTransactions(filtered); // Render hasil filter yang sudah diurutkan
    };


    // --- Event Listener: Submit Form (Tambah/Update) ---
    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Mencegah submit default

        // Validasi sederhana
        if (!tanggalInput.value || !keteranganInput.value || !jenisInput.value || !jumlahInput.value) {
            formError.textContent = "Harap isi semua field yang wajib diisi.";
            formError.classList.remove('d-none');
            return;
        }
         if (Number(jumlahInput.value) <= 0) {
            formError.textContent = "Jumlah harus lebih besar dari 0.";
            formError.classList.remove('d-none');
            return;
        }
        formError.classList.add('d-none');


        const newTransaction = {
            id: isEditMode ? currentEditId : Date.now(), // Gunakan ID lama jika edit, buat baru jika tambah
            tanggal: tanggalInput.value,
            keterangan: keteranganInput.value.trim(),
            jenis: jenisInput.value,
            jumlah: parseInt(jumlahInput.value)
        };

        if (isEditMode) {
            // --- Logika Update ---
            const index = transactions.findIndex(trx => trx.id === currentEditId);
            if (index !== -1) {
                transactions[index] = newTransaction;
            }
        } else {
            // --- Logika Tambah ---
            transactions.push(newTransaction);
        }

         // Urutkan transaksi berdasarkan tanggal terlama di atas
        transactions.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal) || a.id - b.id);


        saveTransactions();
        updateSummary(); // Update card ringkasan atas (total keseluruhan)
        filterAndSearch(); // Render ulang tabel dengan urutan baru dan filter aktif
        resetForm();
    });


     // --- Event Listener: Klik pada Tabel (Edit/Delete per Baris) ---
    riwayatTransaksiBody.addEventListener('click', (e) => {
        // Cek apakah tombol Edit yang diklik
        if (e.target.classList.contains('btn-edit') || e.target.closest('.btn-edit')) {
            const button = e.target.closest('.btn-edit');
            const idToEdit = parseInt(button.getAttribute('data-id'));
            const transactionToEdit = transactions.find(trx => trx.id === idToEdit);

            if (transactionToEdit) {
                isEditMode = true;
                currentEditId = idToEdit;

                // Isi form
                transactionIdInput.value = transactionToEdit.id;
                tanggalInput.value = transactionToEdit.tanggal;
                keteranganInput.value = transactionToEdit.keterangan;
                jenisInput.value = transactionToEdit.jenis;
                jumlahInput.value = transactionToEdit.jumlah;

                // Ubah tampilan tombol
                btnAdd.classList.add('d-none');
                btnUpdate.classList.remove('d-none');
                btnCancel.classList.remove('d-none');
                btnDelete.disabled = false;
                btnDelete.setAttribute('data-id', currentEditId);

                transactionForm.scrollIntoView({ behavior: 'smooth' });
                keteranganInput.focus();
            }
        }

        // Cek apakah tombol Hapus (di baris tabel) yang diklik
        if (e.target.classList.contains('btn-delete-row') || e.target.closest('.btn-delete-row')) {
            const button = e.target.closest('.btn-delete-row');
            const idToDelete = parseInt(button.getAttribute('data-id'));

            if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
                transactions = transactions.filter(trx => trx.id !== idToDelete);
                saveTransactions();
                updateSummary(); // Update total keseluruhan
                filterAndSearch(); // Render ulang tabel
                // Jika yang dihapus adalah item yang sedang diedit, reset form
                if(isEditMode && currentEditId === idToDelete) {
                    resetForm();
                }
            }
        }
    });

    // --- Event Listener: Tombol Hapus di Form (hanya aktif saat edit) ---
    btnDelete.addEventListener('click', () => {
         if (!isEditMode || !currentEditId) return; // Hanya jalan jika mode edit

         const idToDelete = currentEditId;

         if (confirm('Apakah Anda yakin ingin menghapus transaksi yang sedang diedit ini?')) {
            transactions = transactions.filter(trx => trx.id !== idToDelete);
            saveTransactions();
            updateSummary();
            filterAndSearch();
            resetForm(); // Reset form setelah berhasil hapus
        }
    });


    // --- Event Listeners untuk Filter dan Pencarian (otomatis) ---
    filterTanggalMulai.addEventListener('change', filterAndSearch);
    filterTanggalAkhir.addEventListener('change', filterAndSearch);
    cariTransaksiInput.addEventListener('input', filterAndSearch); // 'input' untuk live search

    // --- Event Listener: Export PDF (Sesuai Tabel + Summary di Akhir) ---
    exportPdfBtn.addEventListener('click', () => {
        const doc = new jsPDF();

        // 1. Dapatkan data yang sudah difilter dan diurutkan
        const start = filterTanggalMulai.value;
        const end = filterTanggalAkhir.value;
        const searchTerm = cariTransaksiInput.value.toLowerCase();
        let filteredData = transactions.filter(trx => {
             const trxDate = new Date(trx.tanggal);
             trxDate.setHours(0, 0, 0, 0);
             const dateMatch = (!start || trxDate >= new Date(start)) && (!end || trxDate <= new Date(end));
             const searchMatch = !searchTerm || trx.keterangan.toLowerCase().includes(searchTerm);
             return dateMatch && searchMatch;
        });
        // Urutkan data ini sama seperti di tabel
        filteredData.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal) || a.id - b.id);


        let dataToExport = [];
        let pdfRunningBalance = 0;
        let pdfTotalPemasukan = 0; // Hitung total pemasukan untuk PDF
        let pdfTotalPengeluaran = 0; // Hitung total pengeluaran untuk PDF

        // 2. Proses data untuk format PDF
        filteredData.forEach((trx) => {
            let incomeAmountStr = "-";
            let expenseAmountStr = "-";

            if (trx.jenis === 'pemasukan') {
                pdfRunningBalance += trx.jumlah;
                pdfTotalPemasukan += trx.jumlah; // Akumulasi PDF
                incomeAmountStr = formatRupiah(trx.jumlah);
            } else { // pengeluaran
                pdfRunningBalance -= trx.jumlah;
                pdfTotalPengeluaran += trx.jumlah; // Akumulasi PDF
                expenseAmountStr = formatRupiah(trx.jumlah);
            }

             // Format baris untuk PDF (5 kolom data + saldo berjalan)
             dataToExport.push([
                 new Date(trx.tanggal).toLocaleDateString('id-ID'),
                 trx.keterangan,
                 incomeAmountStr,
                 expenseAmountStr,
                 formatRupiah(pdfRunningBalance) // Saldo berjalan
             ]);
        });

        // 3. Cek jika ada data untuk diekspor
        if (dataToExport.length === 0) {
            alert('Tidak ada data transaksi (sesuai filter) untuk diexport.');
            return;
        }

        // 4. Buat PDF
        doc.setFontSize(18);
        doc.text("Laporan Riwayat Transaksi", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);

        // Tambahkan informasi filter jika ada
        const filterInfo = [];
         if (filterTanggalMulai.value) filterInfo.push(`Dari: ${new Date(filterTanggalMulai.value).toLocaleDateString('id-ID')}`);
         if (filterTanggalAkhir.value) filterInfo.push(`Sampai: ${new Date(filterTanggalAkhir.value).toLocaleDateString('id-ID')}`);
         if (cariTransaksiInput.value) filterInfo.push(`Cari: "${cariTransaksiInput.value}"`);
         if (filterInfo.length > 0) {
            doc.setFontSize(10);
             doc.text(`Filter Aktif: ${filterInfo.join(', ')}`, 14, 30);
         }

        // Gunakan autoTable (sesuaikan head)
        doc.autoTable({
            startY: filterInfo.length > 0 ? 35 : 30,
            head: [['Tanggal', 'Keterangan', 'Pemasukan', 'Pengeluaran', 'Saldo']], // 5 kolom header
            body: dataToExport,
            theme: 'striped',
            headStyles: { fillColor: [22, 160, 133] }, // Warna header
            columnStyles: { // Meratakan kolom angka ke kanan
                2: { halign: 'right' }, // Pemasukan
                3: { halign: 'right' }, // Pengeluaran
                4: { halign: 'right' }  // Saldo
            },
            didDrawPage: function (data) {
                // Footer Halaman
                doc.setFontSize(10);
                doc.setTextColor(150);
                 const pageCount = doc.internal.getNumberOfPages();
                 doc.text('Halaman ' + data.pageNumber + ' dari ' + pageCount, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });

         // Tambahkan Ringkasan di akhir PDF

        // ** ADD Summary Section to PDF (Aligned Right) **
        const finalY = doc.lastAutoTable.finalY + 10; // Posisi Y tetap sama (di bawah tabel)
        const pageWidth = doc.internal.pageSize.getWidth();
        const rightMargin = 14; // Sesuaikan jika margin kanan Anda berbeda
        const xAlignRight = pageWidth - rightMargin; // Koordinat X untuk rata kanan

        // Judul Ringkasan (rata kanan)
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        // Gunakan xAlignRight dan tambahkan { align: 'right' }
        doc.text('Ringkasan (Berdasarkan Filter):', xAlignRight, finalY, { align: 'right' });

        // Detail Ringkasan (rata kanan)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        // Gunakan xAlignRight dan tambahkan { align: 'right' } untuk setiap baris teks
        doc.text(`Total Pemasukan: ${formatRupiah(pdfTotalPemasukan)}`, xAlignRight, finalY + 7, { align: 'right' });
        doc.text(`Total Pengeluaran: ${formatRupiah(pdfTotalPengeluaran)}`, xAlignRight, finalY + 14, { align: 'right' });
        doc.text(`Saldo Akhir: ${formatRupiah(pdfRunningBalance)}`, xAlignRight, finalY + 21, { align: 'right' });


        // Nama file PDF (tetap sama)
        const fileName = `Riwayat_Transaksi_${new Date().toISOString().slice(0,10)}.pdf`;
        doc.save(fileName);
    }); // Akhir dari exportPdfBtn listener

    // --- Inisialisasi Aplikasi ---
    updateSummary(); // Hitung total keseluruhan untuk kartu atas saat load
    filterAndSearch(); // Lakukan filter awal (tampilkan semua data terurut) dan render tabel saat load
    resetForm(); // Pastikan form bersih saat load
});
