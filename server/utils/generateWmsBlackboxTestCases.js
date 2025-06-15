const exportTestResultDocx = require('./exportTestResultDocx')

// List of endpoints and their descriptions (expand as needed)
const endpoints = [
    // AUTH
    {
        testCaseId: 'WMS-TC-01',
        butirUji: 'Login pengguna',
        prosedurPengujian: [
            'Pengguna membuka halaman login dan mengisi form login',
            'Pengguna memasukkan email dan password yang valid',
            'Pengguna menekan tombol Login',
            'Sistem memproses permintaan login'
        ],
        masukan: ['Email', 'Password'],
        keluaranDiharapkan: 'Pengguna berhasil login dan token autentikasi dikembalikan',
        keluaranDidapat: 'Pengguna berhasil login dan token autentikasi dikembalikan',
        kesimpulan: 'Diterima'
    },
    // USER
    {
        testCaseId: 'WMS-TC-02',
        butirUji: 'Melihat daftar pengguna',
        prosedurPengujian: [
            'Admin membuka halaman manajemen pengguna',
            'Sistem menampilkan daftar pengguna yang terdaftar'
        ],
        masukan: ['-'],
        keluaranDiharapkan: 'Daftar pengguna berhasil ditampilkan',
        keluaranDidapat: 'Daftar pengguna berhasil ditampilkan',
        kesimpulan: 'Diterima'
    },
    // PRODUCT CRUD & UTILITIES
    {
        testCaseId: 'WMS-TC-03',
        butirUji: 'Melihat daftar produk',
        prosedurPengujian: [
            'Pengguna membuka halaman produk',
            'Sistem menampilkan daftar produk beserta detailnya'
        ],
        masukan: ['-'],
        keluaranDiharapkan: 'Daftar produk beserta detail berhasil ditampilkan',
        keluaranDidapat: 'Daftar produk beserta detail berhasil ditampilkan',
        kesimpulan: 'Diterima'
    },
    {
        testCaseId: 'WMS-TC-04',
        butirUji: 'Melihat detail produk',
        prosedurPengujian: [
            'Pengguna memilih salah satu produk dari daftar produk',
            'Sistem menampilkan detail produk yang dipilih'
        ],
        masukan: ['ID Produk'],
        keluaranDiharapkan: 'Detail produk berhasil ditampilkan',
        keluaranDidapat: 'Detail produk berhasil ditampilkan',
        kesimpulan: 'Diterima'
    },
    {
        testCaseId: 'WMS-TC-05',
        butirUji: 'Menambah produk baru',
        prosedurPengujian: [
            'Admin membuka halaman tambah produk',
            'Admin mengisi form produk dan menekan tombol Simpan',
            'Sistem memproses penambahan produk baru'
        ],
        masukan: ['Nama', 'Kategori', 'Harga', 'Unit', 'Deskripsi'],
        keluaranDiharapkan: 'Produk baru berhasil ditambahkan dan data produk dikembalikan',
        keluaranDidapat: 'Produk baru berhasil ditambahkan dan data produk dikembalikan',
        kesimpulan: 'Diterima'
    },
    {
        testCaseId: 'WMS-TC-06',
        butirUji: 'Mengupdate data produk',
        prosedurPengujian: [
            'Admin membuka halaman edit produk',
            'Admin mengubah data produk dan menekan tombol Simpan',
            'Sistem memproses update data produk'
        ],
        masukan: ['ID Produk', 'Data produk baru'],
        keluaranDiharapkan: 'Data produk berhasil diperbarui',
        keluaranDidapat: 'Data produk berhasil diperbarui',
        kesimpulan: 'Diterima'
    },
    {
        testCaseId: 'WMS-TC-07',
        butirUji: 'Menghapus produk',
        prosedurPengujian: [
            'Admin membuka halaman produk dan memilih produk untuk dihapus',
            'Admin menekan tombol Hapus',
            'Sistem memproses penghapusan produk'
        ],
        masukan: ['ID Produk'],
        keluaranDiharapkan: 'Produk berhasil dihapus',
        keluaranDidapat: 'Produk berhasil dihapus',
        kesimpulan: 'Diterima'
    },
    {
        testCaseId: 'WMS-TC-08',
        butirUji: 'Melihat kategori produk',
        prosedurPengujian: [
            'Pengguna membuka filter kategori pada halaman produk',
            'Sistem menampilkan daftar kategori produk yang tersedia'
        ],
        masukan: ['-'],
        keluaranDiharapkan: 'Daftar kategori produk berhasil ditampilkan',
        keluaranDidapat: 'Daftar kategori produk berhasil ditampilkan',
        kesimpulan: 'Diterima'
    },
    {
        testCaseId: 'WMS-TC-09',
        butirUji: 'Melihat warna produk',
        prosedurPengujian: [
            'Pengguna membuka filter warna pada halaman produk',
            'Sistem menampilkan daftar warna produk yang tersedia'
        ],
        masukan: ['-'],
        keluaranDiharapkan: 'Daftar warna produk berhasil ditampilkan',
        keluaranDidapat: 'Daftar warna produk berhasil ditampilkan',
        kesimpulan: 'Diterima'
    },
    {
        testCaseId: 'WMS-TC-10',
        butirUji: 'Melihat variasi produk',
        prosedurPengujian: [
            'Pengguna membuka filter variasi pada halaman produk',
            'Sistem menampilkan daftar variasi produk yang tersedia'
        ],
        masukan: ['-'],
        keluaranDiharapkan: 'Daftar variasi produk berhasil ditampilkan',
        keluaranDidapat: 'Daftar variasi produk berhasil ditampilkan',
        kesimpulan: 'Diterima'
    },
    // MATERIALS CRUD & UTILITIES
    {
        testCaseId: 'WMS-TC-11',
        butirUji: 'Melihat daftar material',
        prosedurPengujian: [
            'Pengguna membuka halaman material',
            'Sistem menampilkan daftar material beserta detailnya'
        ],
        masukan: ['-'],
        keluaranDiharapkan: 'Daftar material beserta detail berhasil ditampilkan',
        keluaranDidapat: 'Daftar material beserta detail berhasil ditampilkan',
        kesimpulan: 'Diterima'
    },
    // Tambahkan test case lain sesuai endpoint yang ditemukan

    // ORDER MANAGEMENT
    {
        testCaseId: 'WMS-TC-21',
        butirUji: 'Melihat daftar order',
        prosedurPengujian: [
            'Pengguna membuka halaman manajemen order',
            'Sistem menampilkan daftar order beserta status dan detailnya'
        ],
        masukan: ['-'],
        keluaranDiharapkan: 'Daftar order berhasil ditampilkan',
        keluaranDidapat: 'Daftar order berhasil ditampilkan',
        kesimpulan: 'Diterima'
    },
    {
        testCaseId: 'WMS-TC-22',
        butirUji: 'Melihat detail order',
        prosedurPengujian: [
            'Pengguna memilih salah satu order dari daftar order',
            'Sistem menampilkan detail order yang dipilih'
        ],
        masukan: ['ID Order'],
        keluaranDiharapkan: 'Detail order berhasil ditampilkan',
        keluaranDidapat: 'Detail order berhasil ditampilkan',
        kesimpulan: 'Diterima'
    },
    {
        testCaseId: 'WMS-TC-23',
        butirUji: 'Membuat order baru',
        prosedurPengujian: [
            'Admin membuka halaman tambah order',
            'Admin mengisi form order dan menekan tombol Simpan',
            'Sistem memproses penambahan order baru'
        ],
        masukan: ['Produk', 'Jumlah', 'Tanggal Jatuh Tempo', 'Catatan'],
        keluaranDiharapkan: 'Order baru berhasil ditambahkan dan data order dikembalikan',
        keluaranDidapat: 'Order baru berhasil ditambahkan dan data order dikembalikan',
        kesimpulan: 'Diterima'
    },
    {
        testCaseId: 'WMS-TC-24',
        butirUji: 'Mengupdate data order',
        prosedurPengujian: [
            'Admin membuka halaman edit order',
            'Admin mengubah data order dan menekan tombol Simpan',
            'Sistem memproses update data order'
        ],
        masukan: ['ID Order', 'Data order baru'],
        keluaranDiharapkan: 'Data order berhasil diperbarui',
        keluaranDidapat: 'Data order berhasil diperbarui',
        kesimpulan: 'Diterima'
    },
    {
        testCaseId: 'WMS-TC-25',
        butirUji: 'Menghapus order',
        prosedurPengujian: [
            'Admin membuka halaman order dan memilih order untuk dihapus',
            'Admin menekan tombol Hapus',
            'Sistem memproses penghapusan order'
        ],
        masukan: ['ID Order'],
        keluaranDiharapkan: 'Order berhasil dihapus',
        keluaranDidapat: 'Order berhasil dihapus',
        kesimpulan: 'Diterima'
    },
    // ORDER LINK
    {
        testCaseId: 'WMS-TC-26',
        butirUji: 'Membuka order link publik',
        prosedurPengujian: [
            'Pengguna menerima link order dari admin',
            'Pengguna membuka link order di browser',
            'Sistem menampilkan detail order sesuai token'
        ],
        masukan: ['Token Link'],
        keluaranDiharapkan: 'Detail order berhasil ditampilkan melalui link',
        keluaranDidapat: 'Detail order berhasil ditampilkan melalui link',
        kesimpulan: 'Diterima'
    },
    {
        testCaseId: 'WMS-TC-27',
        butirUji: 'Submit progress via order link',
        prosedurPengujian: [
            'Pengguna membuka halaman order link',
            'Pengguna mengisi form progress dan menekan tombol Submit',
            'Sistem memproses dan menyimpan progress order'
        ],
        masukan: ['Token Link', 'Data progress'],
        keluaranDiharapkan: 'Progress order berhasil disimpan',
        keluaranDidapat: 'Progress order berhasil disimpan',
        kesimpulan: 'Diterima'
    },
    // PURCHASE LOG
    {
        testCaseId: 'WMS-TC-28',
        butirUji: 'Melihat daftar purchase log',
        prosedurPengujian: [
            'Pengguna membuka halaman purchase log',
            'Sistem menampilkan daftar purchase log beserta detailnya'
        ],
        masukan: ['-'],
        keluaranDiharapkan: 'Daftar purchase log berhasil ditampilkan',
        keluaranDidapat: 'Daftar purchase log berhasil ditampilkan',
        kesimpulan: 'Diterima'
    },
    {
        testCaseId: 'WMS-TC-29',
        butirUji: 'Membuat purchase log baru',
        prosedurPengujian: [
            'Admin membuka halaman tambah purchase log',
            'Admin mengisi form purchase log dan menekan tombol Simpan',
            'Sistem memproses penambahan purchase log baru'
        ],
        masukan: ['Material', 'Supplier', 'Jumlah', 'Harga', 'Tanggal'],
        keluaranDiharapkan: 'Purchase log baru berhasil ditambahkan dan data dikembalikan',
        keluaranDidapat: 'Purchase log baru berhasil ditambahkan dan data dikembalikan',
        kesimpulan: 'Diterima'
    },
    // MATERIAL MOVEMENT
    {
        testCaseId: 'WMS-TC-30',
        butirUji: 'Melihat riwayat pergerakan material',
        prosedurPengujian: [
            'Pengguna membuka halaman riwayat pergerakan material',
            'Sistem menampilkan daftar pergerakan material beserta detailnya'
        ],
        masukan: ['-'],
        keluaranDiharapkan: 'Daftar pergerakan material berhasil ditampilkan',
        keluaranDidapat: 'Daftar pergerakan material berhasil ditampilkan',
        kesimpulan: 'Diterima'
    },
    {
        testCaseId: 'WMS-TC-31',
        butirUji: 'Menambah pergerakan material',
        prosedurPengujian: [
            'Admin membuka halaman tambah pergerakan material',
            'Admin mengisi form pergerakan material dan menekan tombol Simpan',
            'Sistem memproses penambahan pergerakan material baru'
        ],
        masukan: ['Material', 'Tipe Pergerakan', 'Jumlah', 'Tanggal'],
        keluaranDiharapkan: 'Pergerakan material baru berhasil ditambahkan dan data dikembalikan',
        keluaranDidapat: 'Pergerakan material baru berhasil ditambahkan dan data dikembalikan',
        kesimpulan: 'Diterima'
    },
    // ... Tambahkan test case lain sesuai kebutuhan
]

const outputPath = './server/docs-log/hasil-blackbox-wms.docx'

exportTestResultDocx(endpoints, outputPath) 