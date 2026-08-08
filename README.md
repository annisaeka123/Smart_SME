# Smart SME - Sistem Manajemen & POS Kasir Pintar


## 📋 Penjelasan Sistem
**Smart SME** adalah sebuah aplikasi kasir (*Point of Sales*) dan manajemen bisnis terintegrasi yang dirancang khusus untuk Usaha Kecil Menengah (UKM). Aplikasi ini bertujuan untuk mendigitalkan arus keuangan, memantau *inventory* (bahan baku), dan mempercepat layanan transaksi kasir.

Sistem telah dilengkapi dengan gerbang **Otentikasi Supabase** dan **Role-Based Access Control (RBAC)** yang mengunci ketat apa saja yang bisa dilihat atau diubah oleh karyawan berdasarkan posisinya.


## 🛡️ Hak Akses (3-Role System)
Demi menjaga keamanan data bisnis (terutama laporan keuangan), aplikasi ini memisahkan otoritas karyawan secara permanen tanpa fitur "Switch Role" menjadi tiga jenis akun:

1. 👑 **Owner Bisnis (Pemilik)**
   - Menduduki kasta tertinggi dalam sistem.
   - **Hak Akses**: Dapat membuka *SEMUA* menu (Dashboard Laba Rugi, POS Kasir, Daftar Produk, Bahan Baku, Transaksi Kas, dan Reimbursement).
   - *Tujuan*: Memantau omzet harian secara *real-time* tanpa batas.

2. 💳 **Kasir (Khusus POS)**
   - **Hak Akses**: Sangat dibatasi. Saat berhasil masuk (*login*), sistem akan otomatis mengunci dan memaksa Kasir hanya berada di aplikasi **POS Kasir**.
   - *Route Guard*: Apabila Kasir dengan sengaja mengubah URL situs (misal menjadi `/dashboard`), sistem akan langsung memantulkannya perlahan kembali ke halaman POS.

3. 👨‍🍳 **Staf / Barista (Khusus Operasional & Nota)**
   - **Hak Akses**: Terbatas pada menu administrasi klaim / **Reimbursements**.
   - *Tujuan*: Staf tidak bisa mengintip urusan omzet atau mesin kasir, tapi bisa mengajukan atau melaporkan klaim nota belanja operasional harian / bahan baku.


## 🗺️ Alur & Tata Cara Penggunaan
Bagi penguji / pengguna awam yang baru pertama kali menjalankan sistem Smart SME, silakan ikuti petunjuk berikut:

---
> **⚠️ PENGUMUMAN PENTING (FASE PENGUJIAN)**
> Saat ini, sistem berada dalam mode publik / *open-beta* terbuka.
> **Siapapun bisa mendaftar (Register) dan mencoba semua _Role_ tanpa perlu verifikasi email.** 
> Namun, tidak lama lagi fitur registrasi umum ini akan ditiadakan, diubah, atau membutuhkan akses persetujuan (approval) khusus agar tidak sembarang orang luar bisa mendaftar atau login ke dalam sistem bisnis ini.
---

### Langkah 1: Registrasi Akun (Pemilihan Jabatan)
1. Buka aplikasi dan arahkan ke halaman **Daftar Akun**.
2. Masukkan **Nama Lengkap**, **Email**, dan **Password** (minimal 6 karakter).
3. Yang terpenting: **Pilih Tipe Akun (Role)** yang ingin Anda coba! Silakan buat 3 buah akun dengan *email* bebas secara terpisah jika ingin melihat perbedaan layar antar *role*.
4. Klik **Daftar**; sistem kami akan menghapus semua spasi siluman (*auto-sanitize*) secara otomatis jadi Anda tak perlu khawatir *error* alamat tak valid!

### Langkah 2: Proses Login & Navigasi
1. Jika sudah punya akun, silahkan lakukan login.
2. Segera setelah layar Anda lolos masuk (otentikasi diizinkan):
   - Jika Anda mendaftar sebagai **Kasir**, perhatikan ke panel sebelah kiri layar Anda (Sidebar); ia akan otomatis mencukur nyaris semua menunya dan hanya *Standby* untuk menerima pesanan / klik barang di mesin kasir (POS).
   - Klik logo inisial nama Anda di pojok kiri bawah (Profil Section) jika ingin segera melakukan **Logout**.


---
*Dikembangkan dengan Next.js App Router, Tailwind CSS, Supabase Backend Services, dan Dideploy di Vercel.*