(() => {
  'use strict';

  const A4 = { widthMm: 210, heightMm: 297 };
  const STORAGE_KEY = 'label-posind-kcu-batam-v1';
  const DEFAULT_LABEL = {
    noSurat: '150/BKL/ENTERPRISE/0726',
    kepada: 'Branch Manager\nBank Syariah Nasional (BSN) KC Batam',
    alamat: 'Batam',
    perihal: 'Penawaran Kerja Sama Pengiriman dan Barang Pindahan Pegawai'
  };
  const EMPTY_LABEL = { noSurat: '', kepada: '', alamat: '', perihal: '' };

  const state = {
    count: 1,
    margin: 1.5,
    labels: [{ ...DEFAULT_LABEL }, { ...EMPTY_LABEL }, { ...EMPTY_LABEL }, { ...EMPTY_LABEL }]
  };

  const els = {
    forms: document.getElementById('labelForms'),
    canvas: document.getElementById('previewCanvas'),
    countRadios: [...document.querySelectorAll('input[name="labelCount"]')],
    edgeMargin: document.getElementById('edgeMargin'),
    resetBtn: document.getElementById('resetBtn'),
    sampleBtn: document.getElementById('sampleBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    toast: document.getElementById('toast')
  };

  const logo = new Image();
  logo.src = 'assets/logo-posind.png';
  logo.onload = () => renderPreview();

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !Array.isArray(saved.labels)) return;
      state.count = Math.min(4, Math.max(1, Number(saved.count) || 1));
      state.margin = [1.5, 3, 5].includes(Number(saved.margin)) ? Number(saved.margin) : 1.5;
      state.labels = Array.from({ length: 4 }, (_, i) => ({ ...EMPTY_LABEL, ...(saved.labels[i] || {}) }));
    } catch (_) {
      // Ignore malformed local data.
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // The app still works when storage is disabled.
    }
  }

  function createLabelCard(index) {
    const data = state.labels[index];
    const copyButton = index > 0
      ? `<button class="copy-button" type="button" data-copy-from="${index - 1}" data-copy-to="${index}">Salin label ${index}</button>`
      : '';

    return `
      <section class="label-card" data-label-index="${index}" aria-labelledby="label-title-${index}">
        <div class="label-card-header">
          <strong id="label-title-${index}">Label ${index + 1}</strong>
          ${copyButton}
        </div>
        <div class="label-card-body">
          <div class="field">
            <label for="noSurat-${index}">Nomor surat</label>
            <input id="noSurat-${index}" data-field="noSurat" data-index="${index}" maxlength="60" autocomplete="off" value="${escapeHtml(data.noSurat)}" placeholder="Contoh: 150/BKL/ENTERPRISE/0726">
          </div>
          <div class="field">
            <label for="kepada-${index}">Kepada siapa</label>
            <textarea id="kepada-${index}" data-field="kepada" data-index="${index}" maxlength="180" rows="2" placeholder="Contoh: Branch Manager&#10;Nama instansi">${escapeHtml(data.kepada)}</textarea>
            <span class="char-hint">Boleh menggunakan baris baru</span>
          </div>
          <div class="field">
            <label for="alamat-${index}">Alamat penerima</label>
            <textarea id="alamat-${index}" data-field="alamat" data-index="${index}" maxlength="240" rows="2" placeholder="Alamat lengkap penerima">${escapeHtml(data.alamat)}</textarea>
          </div>
          <div class="field">
            <label for="perihal-${index}">Perihal</label>
            <textarea id="perihal-${index}" data-field="perihal" data-index="${index}" maxlength="220" rows="2" placeholder="Perihal surat atau dokumen">${escapeHtml(data.perihal)}</textarea>
          </div>
        </div>
      </section>`;
  }

  function renderForms() {
    els.forms.innerHTML = Array.from({ length: state.count }, (_, i) => createLabelCard(i)).join('');
    els.countRadios.forEach(radio => { radio.checked = Number(radio.value) === state.count; });
    els.edgeMargin.value = String(state.margin);
  }

  function getLayout(count, margin) {
    const gap = 2.2;
    const labelHeight = count === 1 ? 72.5 : 72;
    const fullWidth = A4.widthMm - margin * 2;
    if (count === 1) return [{ x: margin, y: margin, w: fullWidth, h: labelHeight }];

    const colWidth = (A4.widthMm - margin * 2 - gap) / 2;
    const positions = [
      { x: margin, y: margin, w: colWidth, h: labelHeight },
      { x: margin + colWidth + gap, y: margin, w: colWidth, h: labelHeight },
      { x: margin, y: margin + labelHeight + gap, w: colWidth, h: labelHeight },
      { x: margin + colWidth + gap, y: margin + labelHeight + gap, w: colWidth, h: labelHeight }
    ];
    return positions.slice(0, count);
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function normalizeText(value) {
    return String(value || '').replace(/\r/g, '').trim();
  }

  function wrapLines(ctx, text, maxWidth) {
    const lines = [];
    const paragraphs = normalizeText(text).split('\n');
    paragraphs.forEach((paragraph, pIndex) => {
      if (!paragraph) {
        lines.push('');
        return;
      }
      const words = paragraph.split(/\s+/);
      let current = '';
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width <= maxWidth || !current) current = test;
        else {
          lines.push(current);
          current = word;
        }
      }
      if (current) lines.push(current);
      if (pIndex < paragraphs.length - 1 && paragraph) {
        // Explicit line breaks are already represented by paragraph boundaries.
      }
    });
    return lines;
  }

  function fitWrappedText(ctx, text, maxWidth, maxLines, startFontPx, minFontPx, fontWeight = 400) {
    let size = startFontPx;
    let lines = [];
    while (size >= minFontPx) {
      ctx.font = `${fontWeight} ${size}px Inter, Arial, sans-serif`;
      lines = wrapLines(ctx, text, maxWidth);
      const widestLine = lines.reduce((widest, line) => Math.max(widest, ctx.measureText(line).width), 0);
      if (lines.length <= maxLines && widestLine <= maxWidth) break;
      size -= Math.max(0.5, startFontPx * 0.035);
    }
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      let last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
      lines[maxLines - 1] = `${last.trim()}…`;
    }
    return { size, lines };
  }

  function drawLines(ctx, lines, x, y, lineHeight, color, align = 'left') {
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  }

  function drawScissors(ctx, x, y, s, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, s * .08);
    ctx.beginPath();
    ctx.arc(x, y, s * .18, 0, Math.PI * 2);
    ctx.arc(x + s * .34, y + s * .18, s * .18, 0, Math.PI * 2);
    ctx.moveTo(x + s * .14, y + s * .06);
    ctx.lineTo(x + s * .92, y - s * .40);
    ctx.moveTo(x + s * .25, y + s * .13);
    ctx.lineTo(x + s * .92, y + s * .54);
    ctx.stroke();
    ctx.restore();
  }

  function drawPersonIcon(ctx, cx, cy, radius, navy) {
    ctx.save();
    ctx.fillStyle = navy;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy - radius * .28, radius * .25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + radius * .38, radius * .48, Math.PI, Math.PI * 2);
    ctx.lineTo(cx + radius * .48, cy + radius * .55);
    ctx.lineTo(cx - radius * .48, cy + radius * .55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawDocumentIcon(ctx, x, y, size, orange) {
    ctx.save();
    ctx.strokeStyle = orange;
    ctx.lineWidth = Math.max(1, size * .075);
    roundRect(ctx, x, y, size * .72, size, size * .08);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + size * .16, y + size * .32);
    ctx.lineTo(x + size * .55, y + size * .32);
    ctx.moveTo(x + size * .16, y + size * .50);
    ctx.lineTo(x + size * .55, y + size * .50);
    ctx.moveTo(x + size * .16, y + size * .68);
    ctx.lineTo(x + size * .48, y + size * .68);
    ctx.stroke();
    ctx.restore();
  }

  function drawLabel(ctx, box, data, scale) {
    const mm = value => value * scale;
    const x = mm(box.x), y = mm(box.y), w = mm(box.w), h = mm(box.h);
    const compact = box.w < 150;
    const pad = mm(compact ? 3.5 : 4.2);
    const navy = '#11275f';
    const orange = '#ef4b23';
    const ink = '#101828';
    const muted = '#536079';
    const cut = '#7e8797';
    const inner = compact ? mm(1.05) : mm(1.15);

    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, w, h);

    ctx.setLineDash([mm(.85), mm(.65)]);
    ctx.lineWidth = mm(.22);
    ctx.strokeStyle = cut;
    roundRect(ctx, x + mm(.2), y + mm(.2), w - mm(.4), h - mm(.4), mm(2.6));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.lineWidth = mm(.34);
    ctx.strokeStyle = navy;
    roundRect(ctx, x + inner, y + inner, w - inner * 2, h - inner * 2, mm(2.25));
    ctx.stroke();

    drawScissors(ctx, x + w - mm(2.2), y + mm(.5), mm(2.8), '#555d6c');

    const contentX = x + pad;
    const contentRight = x + w - pad;
    const logoW = mm(compact ? 16.5 : 22.5);
    const logoH = logoW * (210 / 244);
    const logoY = y + mm(compact ? 3.4 : 3.2);
    if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, contentX, logoY, logoW, logoH);

    const numberBoxW = mm(compact ? 35.5 : 52);
    const numberBoxH = mm(compact ? 13.1 : 13.8);
    const numberX = contentRight - numberBoxW;
    const numberY = y + mm(3.5);
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = navy;
    ctx.lineWidth = mm(.28);
    roundRect(ctx, numberX, numberY, numberBoxW, numberBoxH, mm(1.6));
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = navy;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = `500 ${mm(compact ? 2.45 : 2.7)}px Inter, Arial, sans-serif`;
    ctx.fillText('No. Surat:', numberX + mm(2), numberY + mm(1.55));
    const noSize = fitWrappedText(ctx, normalizeText(data.noSurat) || '—', numberBoxW - mm(4), 2, mm(compact ? 2.75 : 3.15), mm(2.05), 800);
    ctx.font = `800 ${noSize.size}px Inter, Arial, sans-serif`;
    drawLines(ctx, noSize.lines, numberX + mm(2), numberY + mm(compact ? 5.3 : 5.5), noSize.size * 1.08, navy);

    const titleX = contentX + logoW + mm(compact ? 2.7 : 3.8);
    const titleMax = Math.max(mm(10), numberX - titleX - mm(2));
    ctx.fillStyle = navy;
    const titleFit = fitWrappedText(ctx, 'LABEL PENGIRIMAN', titleMax, compact ? 2 : 1, mm(compact ? 3.15 : 4.6), mm(2.6), 850);
    ctx.font = `850 ${titleFit.size}px Inter, Arial, sans-serif`;
    drawLines(ctx, titleFit.lines, titleX, y + mm(compact ? 5.3 : 5.7), titleFit.size * 1.05, navy);
    if (!compact) {
      ctx.font = `700 ${mm(2.15)}px Inter, Arial, sans-serif`;
      ctx.fillStyle = muted;
      ctx.fillText('POSIND KCU BATAM 29400', titleX, y + mm(11.4));
    }

    const senderY = y + mm(compact ? 20.3 : 23.2);
    ctx.fillStyle = ink;
    ctx.font = `800 ${mm(compact ? 2.45 : 2.75)}px Inter, Arial, sans-serif`;
    ctx.fillText('Dari:', contentX, senderY);
    const dariWidth = ctx.measureText('Dari:').width;
    ctx.font = `500 ${mm(compact ? 2.45 : 2.75)}px Inter, Arial, sans-serif`;
    ctx.fillText('KANTOR POS BATAM', contentX + dariWidth + mm(.8), senderY);
    ctx.fillStyle = muted;
    ctx.font = `500 ${mm(compact ? 2.15 : 2.45)}px Inter, Arial, sans-serif`;
    const senderLines = compact
      ? ['KCU Batam 29400 · Jalan Ibnu Soetowo No. 2', 'Batam Center, Kota Batam']
      : ['KCU Batam 29400', 'Jalan Ibnu Soetowo No. 2, Batam Center, Kota Batam'];
    drawLines(ctx, senderLines, contentX, senderY + mm(compact ? 3.5 : 3.9), mm(compact ? 3.05 : 3.35), muted);

    const dividerY = y + mm(compact ? 31.9 : 34.5);
    ctx.strokeStyle = orange;
    ctx.lineWidth = mm(.55);
    ctx.beginPath(); ctx.moveTo(contentX, dividerY); ctx.lineTo(contentRight, dividerY); ctx.stroke();

    const recipientTop = dividerY + mm(compact ? 3.2 : 3.6);
    const iconR = mm(compact ? 3.9 : 4.7);
    const iconCx = contentX + iconR;
    const iconCy = recipientTop + iconR + mm(.5);
    drawPersonIcon(ctx, iconCx, iconCy, iconR, navy);

    const textX = contentX + iconR * 2 + mm(compact ? 2.2 : 3);
    const textMax = contentRight - textX;
    ctx.font = `800 ${mm(compact ? 2.65 : 3.05)}px Inter, Arial, sans-serif`;
    ctx.fillStyle = navy;
    ctx.fillText('Kepada Yth.', textX, recipientTop);

    const kepadaFit = fitWrappedText(ctx, normalizeText(data.kepada) || '—', textMax, compact ? 3 : 3, mm(compact ? 3.15 : 4.05), mm(compact ? 2.35 : 2.75), 820);
    ctx.font = `820 ${kepadaFit.size}px Inter, Arial, sans-serif`;
    drawLines(ctx, kepadaFit.lines, textX, recipientTop + mm(compact ? 3.8 : 4.5), kepadaFit.size * 1.13, ink);
    const kepadaHeight = kepadaFit.lines.length * kepadaFit.size * 1.13;

    const alamatStart = recipientTop + mm(compact ? 4.2 : 4.9) + kepadaHeight;
    const alamatFit = fitWrappedText(ctx, normalizeText(data.alamat) || '—', textMax, compact ? 2 : 2, mm(compact ? 2.45 : 2.85), mm(2.0), 500);
    ctx.font = `500 ${alamatFit.size}px Inter, Arial, sans-serif`;
    drawLines(ctx, alamatFit.lines, textX, alamatStart, alamatFit.size * 1.15, ink);

    const subjectDividerY = y + h - mm(compact ? 14.9 : 14.6);
    ctx.strokeStyle = '#aeb7c5';
    ctx.lineWidth = mm(.2);
    ctx.setLineDash([mm(.7), mm(.55)]);
    ctx.beginPath(); ctx.moveTo(contentX, subjectDividerY); ctx.lineTo(contentRight, subjectDividerY); ctx.stroke();
    ctx.setLineDash([]);

    const docSize = mm(compact ? 6.3 : 7.1);
    const docX = contentX + mm(.6);
    const docY = subjectDividerY + mm(compact ? 2.2 : 2.0);
    drawDocumentIcon(ctx, docX, docY, docSize, orange);

    const subjectX = docX + docSize + mm(compact ? 1.8 : 2.3);
    const subjectY = subjectDividerY + mm(compact ? 3.0 : 3.1);
    ctx.fillStyle = orange;
    ctx.font = `800 ${mm(compact ? 2.5 : 2.95)}px Inter, Arial, sans-serif`;
    ctx.fillText('Perihal:', subjectX, subjectY);
    const perihalLabelW = ctx.measureText('Perihal:').width + mm(1.1);
    const perihalMax = contentRight - (subjectX + perihalLabelW);
    const perihalFit = fitWrappedText(ctx, normalizeText(data.perihal) || '—', perihalMax, compact ? 3 : 2, mm(compact ? 2.25 : 2.75), mm(1.75), 500);
    ctx.font = `500 ${perihalFit.size}px Inter, Arial, sans-serif`;
    drawLines(ctx, perihalFit.lines, subjectX + perihalLabelW, subjectY, perihalFit.size * 1.13, ink);

    ctx.restore();
  }

  function renderPage(ctx, widthPx, heightPx) {
    const scale = widthPx / A4.widthMm;
    ctx.save();
    ctx.clearRect(0, 0, widthPx, heightPx);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, widthPx, heightPx);
    getLayout(state.count, state.margin).forEach((box, index) => drawLabel(ctx, box, state.labels[index], scale));
    ctx.restore();
  }

  function renderPreview() {
    const canvas = els.canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    renderPage(ctx, canvas.width, canvas.height);
  }

  function validate() {
    for (let i = 0; i < state.count; i++) {
      const label = state.labels[i];
      if (!normalizeText(label.noSurat) || !normalizeText(label.kepada) || !normalizeText(label.alamat) || !normalizeText(label.perihal)) {
        const card = els.forms.querySelector(`[data-label-index="${i}"]`);
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const emptyKey = ['noSurat', 'kepada', 'alamat', 'perihal'].find(key => !normalizeText(label[key]));
        const input = card?.querySelector(`[data-field="${emptyKey}"]`);
        input?.focus();
        showToast(`Lengkapi data Label ${i + 1} terlebih dahulu.`);
        return false;
      }
    }
    return true;
  }

  function bytesFromString(value) {
    return new TextEncoder().encode(value);
  }

  function concatBytes(parts) {
    const length = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) { output.set(part, offset); offset += part.length; }
    return output;
  }

  function jpegBytesFromCanvas(canvas, quality = .94) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const binary = atob(dataUrl.split(',')[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function createPdfWithJpeg(jpegBytes, imageWidth, imageHeight) {
    const pageW = 595.2756;
    const pageH = 841.8898;
    const objects = [];
    objects[1] = bytesFromString('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    objects[2] = bytesFromString('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    objects[3] = bytesFromString(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
    objects[4] = concatBytes([
      bytesFromString(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`),
      jpegBytes,
      bytesFromString('\nendstream\nendobj\n')
    ]);
    const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;
    objects[5] = bytesFromString(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);

    const header = concatBytes([
      bytesFromString('%PDF-1.4\n%'),
      new Uint8Array([0xE2, 0xE3, 0xCF, 0xD3]),
      bytesFromString('\n')
    ]);
    const parts = [header];
    const offsets = [0];
    let cursor = header.length;
    for (let i = 1; i <= 5; i++) {
      offsets[i] = cursor;
      parts.push(objects[i]);
      cursor += objects[i].length;
    }
    const xrefOffset = cursor;
    let xref = 'xref\n0 6\n0000000000 65535 f \n';
    for (let i = 1; i <= 5; i++) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    const trailer = `${xref}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    parts.push(bytesFromString(trailer));
    return concatBytes(parts);
  }

  async function downloadPdf() {
    if (!validate()) return;
    els.downloadBtn.disabled = true;
    els.downloadBtn.innerHTML = '<span aria-hidden="true">…</span> Membuat PDF';
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 40)));

    try {
      const dpi = 220;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round((A4.widthMm / 25.4) * dpi);
      canvas.height = Math.round((A4.heightMm / 25.4) * dpi);
      const ctx = canvas.getContext('2d', { alpha: false });
      renderPage(ctx, canvas.width, canvas.height);
      const jpeg = jpegBytesFromCanvas(canvas);
      const pdf = createPdfWithJpeg(jpeg, canvas.width, canvas.height);
      const blob = new Blob([pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const cleanNumber = normalizeText(state.labels[0].noSurat).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
      anchor.href = url;
      anchor.download = `label-pengiriman-${cleanNumber || 'posind'}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      showToast('PDF berhasil dibuat dan diunduh.');
    } catch (error) {
      console.error(error);
      showToast('PDF belum berhasil dibuat. Silakan coba kembali.');
    } finally {
      els.downloadBtn.disabled = false;
      els.downloadBtn.innerHTML = '<span aria-hidden="true">↓</span> Unduh PDF';
    }
  }

  let toastTimer;
  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add('show');
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2800);
  }

  function setExample() {
    state.count = 1;
    state.margin = 1.5;
    state.labels = [{ ...DEFAULT_LABEL }, { ...EMPTY_LABEL }, { ...EMPTY_LABEL }, { ...EMPTY_LABEL }];
    renderForms(); renderPreview(); saveState();
    showToast('Contoh label BSN dimuat.');
  }

  function resetAll() {
    state.count = 1;
    state.margin = 1.5;
    state.labels = Array.from({ length: 4 }, () => ({ ...EMPTY_LABEL }));
    renderForms(); renderPreview(); saveState();
    showToast('Semua data dikosongkan.');
  }

  els.countRadios.forEach(radio => radio.addEventListener('change', event => {
    state.count = Number(event.target.value);
    renderForms(); renderPreview(); saveState();
  }));

  els.edgeMargin.addEventListener('change', event => {
    state.margin = Number(event.target.value);
    renderPreview(); saveState();
  });

  els.forms.addEventListener('input', event => {
    const target = event.target;
    if (!target.matches('[data-field]')) return;
    const index = Number(target.dataset.index);
    state.labels[index][target.dataset.field] = target.value;
    renderPreview(); saveState();
  });

  els.forms.addEventListener('click', event => {
    const button = event.target.closest('[data-copy-to]');
    if (!button) return;
    const from = Number(button.dataset.copyFrom);
    const to = Number(button.dataset.copyTo);
    state.labels[to] = { ...state.labels[from] };
    renderForms(); renderPreview(); saveState();
    showToast(`Label ${from + 1} disalin ke Label ${to + 1}.`);
  });

  els.resetBtn.addEventListener('click', resetAll);
  els.sampleBtn.addEventListener('click', setExample);
  els.downloadBtn.addEventListener('click', downloadPdf);

  loadState();
  renderForms();
  renderPreview();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
