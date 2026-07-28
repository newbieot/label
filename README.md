# Generator Label Pengiriman PosIND KCU Batam

Website statis untuk membuat 1–4 label pengiriman pada satu halaman A4 dan mengunduhnya langsung sebagai PDF.

## Fitur

- PDF A4 210 × 297 mm tanpa margin halaman.
- Tata letak hemat kertas: 1 label penuh di atas; 2 label berdampingan; 3–4 label dalam grid 2 kolom.
- Logo PosIND dari file resmi yang disediakan.
- Alamat pengirim tetap: Jalan Ibnu Soetowo No. 2, Batam Center, Kota Batam.
- Semua proses berlangsung di browser, tanpa backend dan tanpa unggah data.
- Responsif, dapat dipasang sebagai PWA, dan dilengkapi metadata SEO.

## Deploy ke GitHub dan Cloudflare Pages

1. Ekstrak ZIP ini lalu upload seluruh isi folder ke repository GitHub.
2. Di Cloudflare Pages pilih **Create application → Pages → Connect to Git**.
3. Pilih repository.
4. Framework preset: **None**.
5. Build command: kosongkan.
6. Build output directory: `/`.
7. Simpan dan deploy.

## Domain dan SEO

Metadata canonical, Open Graph, `robots.txt`, dan `sitemap.xml` saat ini menggunakan:

`https://label.posnew.com/`

Ganti URL tersebut di `index.html`, `robots.txt`, dan `sitemap.xml` bila domain akhir berbeda.

## Catatan pencetakan

PDF yang dihasilkan tidak mempunyai margin halaman. Jarak label dari tepi default 1,5 mm. Pencetakan fisik sampai tepi kertas tetap bergantung pada kemampuan borderless printer.
