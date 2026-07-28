# Generator Label Surat PosIND KCU Batam

Website statis untuk membuat label surat dalam jumlah berapa pun, mengambil data dari surat penawaran, dan mengunduh hasil sebagai PDF A4 multi-halaman.

## Fitur utama

- Ukuran label tetap meskipun hanya ada satu label.
- Jumlah label tidak dibatasi; halaman PDF bertambah otomatis.
- Tata letak dua kolom yang dimulai dari sudut kiri atas kertas.
- Pilihan ukuran ringkas (hingga 8/A4), standar (hingga 6/A4), dan besar (hingga 4/A4).
- Impor otomatis dari DOCX, PDF berbasis teks, dan TXT.
- Dapat mengunggah beberapa surat sekaligus; satu file menjadi satu label.
- PDF A4 210 × 297 mm tanpa margin dokumen, dengan jarak label minimum 0,5 mm dari tepi.
- Logo PosIND resmi dari file yang disediakan.
- Alamat pengirim: Jalan Ibnu Soetowo No. 2, Batam Center, Kota Batam.
- Semua data label diproses di browser. Tidak memerlukan backend.
- SEO lengkap: metadata, Open Graph, structured data, sitemap, robots.txt, manifest, dan security headers.

## Cara deploy ke GitHub dan Cloudflare Pages

1. Ekstrak ZIP lalu upload seluruh isi folder ke repository GitHub.
2. Di Cloudflare Pages pilih **Create application → Pages → Connect to Git**.
3. Pilih repository yang berisi file website.
4. Framework preset: **None**.
5. Build command: kosong.
6. Build output directory: `/`.
7. Simpan dan deploy.

## Domain

Canonical, Open Graph, `robots.txt`, dan `sitemap.xml` menggunakan:

`https://label.posnew.com/`

Ganti URL tersebut bila subdomain akhirnya berbeda.

## Catatan impor surat

- DOCX dan TXT diproses langsung di browser.
- Pembacaan PDF berbasis teks menggunakan PDF.js yang dimuat dari jsDelivr ketika fitur PDF pertama kali dipakai.
- PDF hasil scan/foto tidak dapat dibaca otomatis karena website tidak menggunakan OCR.
- Hasil ekstraksi selalu ditampilkan kembali pada formulir agar dapat diperiksa sebelum PDF dibuat.

## Catatan pencetakan

File PDF tidak menambahkan margin halaman. Kemampuan mencetak sampai tepi fisik kertas bergantung pada dukungan borderless printer.
