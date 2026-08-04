# Generator Label Surat PosIND KCU Batam

Website statis untuk membuat label surat dalam jumlah berapa pun, mengambil data dari surat penawaran, dan mengunduh hasil sebagai PDF A4 multi-halaman.

## Fitur utama

- Lebar label tetap sekitar setengah A4; satu label tidak melebar memenuhi kertas.
- Tinggi label adaptif mengikuti panjang penerima, alamat, dan perihal.
- Ukuran huruf otomatis dibuat lebih besar ketika teks pendek, lalu diperkecil secara terkendali untuk teks panjang.
- Ruang alamat dan perihal dihitung berdasarkan isi sehingga tidak ada blok kosong berlebihan.
- Jumlah label tidak dibatasi; halaman PDF bertambah otomatis.
- Tata letak dua kolom yang dimulai dari sudut kiri atas kertas.
- Pilihan kepadatan ringkas, standar, dan besar.
- Impor fleksibel dari XLSX dan CSV dengan pemilihan sheet, baris judul, kolom utama, kolom tambahan, serta teks tetap/cadangan.
- Deteksi otomatis nama kolom umum seperti Nomor Surat, Tujuan Surat, Penerima, Alamat, Kota, dan Perihal.
- Baris kosong spreadsheet dilewati otomatis dan hasil lima baris pertama dapat ditinjau sebelum impor.
- Impor otomatis dari DOCX, PDF berbasis teks, dan TXT tetap tersedia.
- Dapat mengunggah beberapa surat DOCX/PDF/TXT sekaligus; satu file menjadi satu label.
- PDF A4 210 x 297 mm tanpa margin dokumen, dengan jarak label minimum 0,5 mm dari tepi.
- Logo PosIND resmi dari file yang disediakan.
- Alamat pengirim: Jalan Ibnu Soetowo No. 2, Batam Center, Kota Batam.
- Semua data label diproses di browser. Tidak memerlukan backend.
- SEO lengkap: metadata, Open Graph, structured data, sitemap, robots.txt, manifest, dan security headers.

## Cara deploy ke GitHub dan Cloudflare Pages

1. Ekstrak ZIP lalu upload seluruh isi folder ke repository GitHub.
2. Di Cloudflare Pages pilih **Create application -> Pages -> Connect to Git**.
3. Pilih repository yang berisi file website.
4. Framework preset: **None**.
5. Build command: kosong.
6. Build output directory: `/`.
7. Simpan dan deploy.

## Domain

Canonical, Open Graph, `robots.txt`, dan `sitemap.xml` menggunakan:

`https://label.posnew.com/`

## Catatan impor Excel dan surat

- XLSX dan CSV diproses langsung di browser tanpa mengunggah isi spreadsheet ke server.
- Untuk XLSX/CSV, unggah satu spreadsheet per proses, pilih sheet dan baris judul, lalu sesuaikan pemetaan kolom sebelum menekan tombol impor.
- Kolom tambahan digabung dengan baris baru untuk penerima/alamat dan dengan spasi untuk nomor surat/perihal.
- DOCX dan TXT diproses langsung di browser.
- Pembacaan PDF berbasis teks menggunakan PDF.js yang dimuat dari jsDelivr ketika fitur PDF pertama kali dipakai.
- PDF hasil scan/foto tidak dapat dibaca otomatis karena website tidak menggunakan OCR.
- Hasil ekstraksi selalu ditampilkan kembali pada formulir agar dapat diperiksa sebelum PDF dibuat.

## Catatan pencetakan

File PDF tidak menambahkan margin halaman. Kemampuan mencetak sampai tepi fisik kertas bergantung pada dukungan borderless printer.


## Footer
Footer bergaya konsisten dengan lacak.posnew.com. Tautan **PosNew Hub** mengarah ke https://posnew.com/.

## Version 5 – English footer

- Footer text and accessibility labels are now in English.
- **PosNew Hub** continues to link directly to `https://posnew.com/`.


## Version 6 – Flexible Excel import

- Menambahkan pembaca XLSX mandiri di browser tanpa mengubah format label dan tanpa library backend.
- Menambahkan impor CSV dengan deteksi pemisah koma, titik koma, atau tab.
- Menambahkan pemetaan kolom fleksibel, pratinjau data, deteksi sheet/header, dan teks tetap untuk field yang tidak tersedia di Excel.
