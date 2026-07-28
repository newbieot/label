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
- Impor otomatis dari DOCX, PDF berbasis teks, dan TXT.
- Dapat mengunggah beberapa surat sekaligus; satu file menjadi satu label.
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

## Catatan impor surat

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
