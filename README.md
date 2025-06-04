# WMS Roselover

Warehouse Management System (WMS) untuk Roselover, aplikasi pengelolaan produksi dan inventaris berbasis web.

## Fitur Utama

- **Autentikasi**: Login, logout, manajemen user (admin only)
- **Dashboard**: Ringkasan status order, stok, dan progres produksi
- **Order & Produk**: Pencatatan dan manajemen pesanan dan produk
- **Material**: Pengelolaan stok bahan, keluar-masuk material
- **Progress Report**: Pemantauan dan update status produksi
- **Tailor Link**: Tautan dinamis untuk penjahit tanpa perlu login

## Dokumentasi API

### User Management API

| Endpoint | Method | Deskripsi | Role |
|----------|--------|-----------|------|
| `/api/auth/users` | GET | Mendapatkan daftar semua user | Admin |
| `/api/auth/users/:id` | GET | Mendapatkan detail user berdasarkan ID | Admin |
| `/api/auth/users` | POST | Membuat user baru | Admin |
| `/api/auth/users/:id` | PUT | Mengupdate informasi user | Admin |
| `/api/auth/users/:id/toggle-status` | PUT | Mengaktifkan/nonaktifkan user | Admin |

### Authentication API

| Endpoint | Method | Deskripsi | Role |
|----------|--------|-----------|------|
| `/api/auth/register` | POST | Mendaftarkan user baru | Public |
| `/api/auth/login` | POST | Login dan mendapatkan token | Public |

### Dashboard API

| Endpoint | Method | Deskripsi | Role |
|----------|--------|-----------|------|
| `/api/dashboard/summary` | GET | Mendapatkan ringkasan data dashboard | All |

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Express.js, Sequelize ORM
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Token)

## Instalasi dan Penggunaan

### 1. Clone Repository

```bash
git clone <repository-url>
cd wms-01
```

### 2. Instalasi Dependencies

```bash
# Instalasi dependencies frontend
cd client
npm install

# Instalasi dependencies backend
cd ../server
npm install
```

### 3. Konfigurasi Environment

```bash
# Di folder server, buat .env file
cp .env.example .env
# Edit .env sesuai konfigurasi lokal
```

### 4. Menjalankan Aplikasi

```bash
# Menjalankan frontend (client)
cd client
npm run dev

# Menjalankan backend (server)
cd ../server
npm run dev
```

## Struktur Project

```
wms-01/
├── client/               # Frontend (Next.js)
│   ├── app/              # Next.js App Router
│   ├── components/       # Reusable components
│   └── ...
├── server/               # Backend (Express.js)
│   ├── controllers/      # API controllers
│   ├── middleware/       # Express middleware
│   ├── models/           # Sequelize models
│   ├── routes/           # API routes
│   └── ...
└── README.md             # Dokumentasi project
``` 