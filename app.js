(() => {
  'use strict';

  const A4 = { widthMm: 210, heightMm: 297 };
  const STORAGE_KEY = 'label-posind-kcu-batam-v3';
  const LEGACY_STORAGE_KEY = 'label-posind-kcu-batam-v2';
  const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
  const PDFJS_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
  const SIZE_CONFIG = {
    compact: { minHeight: 49, maxHeight: 78, name: 'Ringkas' },
    standard: { minHeight: 68, maxHeight: 105, name: 'Standar' },
    large: { minHeight: 102, maxHeight: 155, name: 'Besar' }
  };
  const DEFAULT_LABEL = {
    noSurat: '150/BKL/ENTERPRISE/0726',
    kepada: 'Branch Manager\nBank Syariah Nasional (BSN) KC Batam',
    alamat: 'Batam',
    perihal: 'Penawaran Kerja Sama Pengiriman dan Barang Pindahan Pegawai'
  };
  const EMPTY_LABEL = { noSurat: '', kepada: '', alamat: '', perihal: '' };

  const state = {
    margin: 0.5,
    size: 'compact',
    previewPage: 0,
    labels: [{ ...EMPTY_LABEL }]
  };

  const els = {
    forms: document.getElementById('labelForms'),
    canvas: document.getElementById('previewCanvas'),
    edgeMargin: document.getElementById('edgeMargin'),
    labelSize: document.getElementById('labelSize'),
    resetBtn: document.getElementById('resetBtn'),
    sampleBtn: document.getElementById('sampleBtn'),
    addLabelBtn: document.getElementById('addLabelBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    labelCountPill: document.getElementById('labelCountPill'),
    layoutSummary: document.getElementById('layoutSummary'),
    previewScalePill: document.getElementById('previewScalePill'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    pageIndicator: document.getElementById('pageIndicator'),
    fileInput: document.getElementById('letterFile'),
    dropZone: document.getElementById('dropZone'),
    importStatus: document.getElementById('importStatus'),
    toast: document.getElementById('toast')
  };

  const logo = new Image();
  logo.src = 'assets/logo-posind.png';
  logo.onload = () => renderPreview();

  const MEASURE_SCALE = 6;
  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = 1600;
  measureCanvas.height = 1200;
  const measureCtx = measureCanvas.getContext('2d');

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function normalizeText(value) {
    return String(value || '').replace(/\r/g, '').replace(/\u00a0/g, ' ').trim();
  }

  function isBlankLabel(label) {
    return !['noSurat', 'kepada', 'alamat', 'perihal'].some(key => normalizeText(label?.[key]));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || !Array.isArray(saved.labels)) return;
      const labels = saved.count ? saved.labels.slice(0, Math.max(1, Number(saved.count))) : saved.labels;
      state.labels = labels.length ? labels.map(label => ({ ...EMPTY_LABEL, ...label })) : [{ ...EMPTY_LABEL }];
      state.margin = [0.5, 1.5, 3].includes(Number(saved.margin)) ? Number(saved.margin) : 0.5;
      state.size = SIZE_CONFIG[saved.size] ? saved.size : 'compact';
    } catch (_) {
      // Abaikan data lokal yang rusak.
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        margin: state.margin,
        size: state.size,
        labels: state.labels
      }));
    } catch (_) {
      // Aplikasi tetap berjalan saat penyimpanan lokal diblokir.
    }
  }

  function labelSummary(data) {
    const no = normalizeText(data.noSurat) || 'Nomor belum diisi';
    const recipient = normalizeText(data.kepada).split('\n').filter(Boolean).slice(-1)[0] || 'Penerima belum diisi';
    return `${no} · ${recipient}`;
  }

  function createLabelCard(index, openIndex) {
    const data = state.labels[index];
    const canDelete = state.labels.length > 1;
    return `
      <details class="label-card" data-label-index="${index}" ${index === openIndex ? 'open' : ''}>
        <summary>
          <span class="label-summary">
            <strong>Label ${index + 1}</strong>
            <span data-summary-index="${index}">${escapeHtml(labelSummary(data))}</span>
          </span>
          <span class="chevron" aria-hidden="true">⌄</span>
        </summary>
        <div class="label-card-body">
          <div class="card-actions">
            <button class="mini-button" type="button" data-action="duplicate" data-index="${index}">Duplikat</button>
            <button class="mini-button danger" type="button" data-action="delete" data-index="${index}">${canDelete ? 'Hapus' : 'Kosongkan'}</button>
          </div>
          <div class="field">
            <label for="noSurat-${index}">Nomor surat</label>
            <input id="noSurat-${index}" data-field="noSurat" data-index="${index}" maxlength="80" autocomplete="off" value="${escapeHtml(data.noSurat)}" placeholder="Contoh: 150/BKL/ENTERPRISE/0726">
          </div>
          <div class="field">
            <label for="kepada-${index}">Kepada siapa</label>
            <textarea id="kepada-${index}" data-field="kepada" data-index="${index}" maxlength="260" rows="2" placeholder="Contoh: Branch Manager&#10;Nama instansi">${escapeHtml(data.kepada)}</textarea>
            <span class="field-note">Gunakan baris baru untuk jabatan dan nama instansi.</span>
          </div>
          <div class="field">
            <label for="alamat-${index}">Alamat penerima</label>
            <textarea id="alamat-${index}" data-field="alamat" data-index="${index}" maxlength="360" rows="2" placeholder="Alamat lengkap atau kota tujuan">${escapeHtml(data.alamat)}</textarea>
          </div>
          <div class="field">
            <label for="perihal-${index}">Perihal</label>
            <textarea id="perihal-${index}" data-field="perihal" data-index="${index}" maxlength="320" rows="2" placeholder="Perihal surat atau dokumen">${escapeHtml(data.perihal)}</textarea>
          </div>
        </div>
      </details>`;
  }

  function renderForms(openIndex = 0) {
    els.forms.innerHTML = state.labels.map((_, index) => createLabelCard(index, openIndex)).join('');
    els.labelCountPill.textContent = `${state.labels.length} label`;
    els.edgeMargin.value = String(state.margin);
    els.labelSize.value = state.size;
    updateLayoutSummary();
  }

  function getStyleProfile() {
    if (state.size === 'large') {
      return {
        pad: 4, logoW: 20, logoY: 3, numberBoxW: 39.5, numberBoxH: 12.5, numberY: 3,
        senderY: 22.2, senderFont: 2.9, senderSubFont: 2.5, senderLineHeight: 3.55,
        dividerY: 34.5, recipientGapTop: 3.2, recipientGapBottom: 2.7,
        iconR: 4.6, iconGap: 2.6, headingFont: 3.25, recipientFont: 4.1,
        recipientMinFont: 2.65, addressFont: 3.25, addressMinFont: 2.15,
        recipientMaxLines: 4, addressMaxLines: 4,
        docSize: 7.2, subjectPadTop: 2.5, subjectPadBottom: 2.5,
        subjectLabelFont: 3.05, subjectFont: 3.05, subjectMinFont: 1.95, subjectMaxLines: 4
      };
    }
    if (state.size === 'standard') {
      return {
        pad: 3.5, logoW: 17, logoY: 3, numberBoxW: 39.5, numberBoxH: 12.5, numberY: 3,
        senderY: 19.2, senderFont: 2.55, senderSubFont: 2.25, senderLineHeight: 3.2,
        dividerY: 29.8, recipientGapTop: 2.8, recipientGapBottom: 2.35,
        iconR: 4.05, iconGap: 2.3, headingFont: 2.9, recipientFont: 3.55,
        recipientMinFont: 2.35, addressFont: 2.85, addressMinFont: 1.95,
        recipientMaxLines: 4, addressMaxLines: 4,
        docSize: 6.2, subjectPadTop: 2.2, subjectPadBottom: 2.2,
        subjectLabelFont: 2.75, subjectFont: 2.7, subjectMinFont: 1.75, subjectMaxLines: 4
      };
    }
    return {
      pad: 3, logoW: 15, logoY: 2.4, numberBoxW: 37, numberBoxH: 11.5, numberY: 2.3,
      senderY: 16.2, senderFont: 2.35, senderSubFont: 2.08, senderLineHeight: 2.85,
      dividerY: 25.3, recipientGapTop: 2.2, recipientGapBottom: 1.9,
      iconR: 3.45, iconGap: 1.9, headingFont: 2.65, recipientFont: 3.25,
      recipientMinFont: 2.15, addressFont: 2.65, addressMinFont: 1.85,
      recipientMaxLines: 4, addressMaxLines: 4,
      docSize: 5.5, subjectPadTop: 1.85, subjectPadBottom: 1.85,
      subjectLabelFont: 2.5, subjectFont: 2.45, subjectMinFont: 1.65, subjectMaxLines: 4
    };
  }

  function measureFit(text, maxWidthMm, maxLines, startFontMm, minFontMm, fontWeight = 400) {
    return fitWrappedText(
      measureCtx,
      normalizeText(text) || '—',
      maxWidthMm * MEASURE_SCALE,
      maxLines,
      startFontMm * MEASURE_SCALE,
      minFontMm * MEASURE_SCALE,
      fontWeight
    );
  }

  function computeLabelMetrics(data, widthMm) {
    const profile = getStyleProfile();
    const contentWidth = widthMm - profile.pad * 2;
    const recipientTextWidth = contentWidth - profile.iconR * 2 - profile.iconGap;
    const recipient = measureFit(data.kepada, recipientTextWidth, profile.recipientMaxLines, profile.recipientFont, profile.recipientMinFont, 820);
    const address = measureFit(data.alamat, recipientTextWidth, profile.addressMaxLines, profile.addressFont, profile.addressMinFont, 520);

    measureCtx.font = `800 ${profile.subjectLabelFont * MEASURE_SCALE}px Inter, Arial, sans-serif`;
    const subjectLabelWidthMm = measureCtx.measureText('Perihal:').width / MEASURE_SCALE + .85;
    const subjectTextWidth = Math.max(20, contentWidth - profile.docSize - 1.4 - subjectLabelWidthMm);
    const subject = measureFit(data.perihal, subjectTextWidth, profile.subjectMaxLines, profile.subjectFont, profile.subjectMinFont, 520);

    const headingHeight = profile.headingFont * 1.08;
    const recipientLinesHeight = (recipient.size / MEASURE_SCALE) * 1.12 * recipient.lines.length;
    const addressLinesHeight = (address.size / MEASURE_SCALE) * 1.14 * address.lines.length;
    const recipientContentHeight = headingHeight + .7 + recipientLinesHeight + .45 + addressLinesHeight;
    const recipientSectionHeight = profile.recipientGapTop + Math.max(profile.iconR * 2 + .6, recipientContentHeight) + profile.recipientGapBottom;

    const subjectTextHeight = (subject.size / MEASURE_SCALE) * 1.14 * subject.lines.length;
    const subjectContentHeight = Math.max(profile.docSize, subjectTextHeight, profile.subjectLabelFont * 1.12);
    const subjectSectionHeight = profile.subjectPadTop + subjectContentHeight + profile.subjectPadBottom;

    const rawHeight = profile.dividerY + recipientSectionHeight + subjectSectionHeight + 1.0;
    const config = SIZE_CONFIG[state.size];
    const height = Math.min(config.maxHeight, Math.max(config.minHeight, Math.ceil(rawHeight * 10) / 10));

    return {
      profile,
      height,
      recipient,
      address,
      subject,
      recipientTextWidth,
      subjectTextWidth,
      subjectLabelWidthMm,
      recipientSectionHeight,
      subjectSectionHeight,
      subjectDividerMm: height - subjectSectionHeight - 1.0
    };
  }

  function getLayoutInfo() {
    const gap = 1.2;
    const margin = state.margin;
    const width = (A4.widthMm - margin * 2 - gap) / 2;
    const pages = [[]];
    const allItems = [];
    let pageIndex = 0;
    let y = margin;

    for (let index = 0; index < state.labels.length; index += 2) {
      const firstMetrics = computeLabelMetrics(state.labels[index], width);
      const secondMetrics = index + 1 < state.labels.length ? computeLabelMetrics(state.labels[index + 1], width) : null;
      const rowHeight = Math.max(firstMetrics.height, secondMetrics?.height || 0);

      if (pages[pageIndex].length && y + rowHeight > A4.heightMm - margin) {
        pageIndex += 1;
        pages.push([]);
        y = margin;
      }

      const first = { index, box: { x: margin, y, w: width, h: firstMetrics.height }, metrics: firstMetrics };
      pages[pageIndex].push(first);
      allItems.push({ ...first, pageIndex });

      if (secondMetrics) {
        const second = { index: index + 1, box: { x: margin + width + gap, y, w: width, h: secondMetrics.height }, metrics: secondMetrics };
        pages[pageIndex].push(second);
        allItems.push({ ...second, pageIndex });
      }
      y += rowHeight + gap;
    }

    return { gap, margin, width, pages, allItems };
  }

  function findPageForLabel(index) {
    return getLayoutInfo().allItems.find(item => item.index === index)?.pageIndex || 0;
  }

  function getPageCount() {
    return Math.max(1, getLayoutInfo().pages.length);
  }

  function updateLayoutSummary() {
    const layout = getLayoutInfo();
    const heights = layout.allItems.map(item => item.box.h);
    const minHeight = heights.length ? Math.min(...heights) : SIZE_CONFIG[state.size].minHeight;
    const maxHeight = heights.length ? Math.max(...heights) : SIZE_CONFIG[state.size].minHeight;
    const heightText = Math.abs(maxHeight - minHeight) < .05
      ? `${minHeight.toFixed(1)} mm`
      : `${minHeight.toFixed(1)}–${maxHeight.toFixed(1)} mm`;
    const firstPageCount = layout.pages[0]?.length || 0;
    els.layoutSummary.textContent = `${SIZE_CONFIG[state.size].name}: lebar tetap ${layout.width.toFixed(1)} mm · tinggi adaptif ${heightText} · ${firstPageCount} label di halaman pertama · ${layout.pages.length} halaman PDF.`;
    els.previewScalePill.textContent = `${layout.width.toFixed(1)} mm · tinggi adaptif`;
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

  function wrapLines(ctx, text, maxWidth) {
    const lines = [];
    const paragraphs = normalizeText(text).split('\n');
    paragraphs.forEach(paragraph => {
      if (!paragraph) return;
      const words = paragraph.split(/\s+/);
      let current = '';
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width <= maxWidth || !current) current = test;
        else { lines.push(current); current = word; }
      }
      if (current) lines.push(current);
    });
    return lines;
  }

  function fitWrappedText(ctx, text, maxWidth, maxLines, startFontPx, minFontPx, fontWeight = 400) {
    let size = startFontPx;
    let lines = [];
    while (size >= minFontPx) {
      ctx.font = `${fontWeight} ${size}px Inter, Arial, sans-serif`;
      lines = wrapLines(ctx, text, maxWidth);
      const widest = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
      if (lines.length <= maxLines && widest <= maxWidth) break;
      size -= Math.max(.45, startFontPx * .035);
    }
    if (!lines.length) lines = ['—'];
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      let last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
      lines[maxLines - 1] = `${last.trim()}…`;
    }
    return { size, lines };
  }

  function drawLines(ctx, lines, x, y, lineHeight, color) {
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  }

  function drawScissors(ctx, x, y, s, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, s * .075);
    ctx.beginPath();
    ctx.arc(x, y, s * .17, 0, Math.PI * 2);
    ctx.arc(x + s * .32, y + s * .17, s * .17, 0, Math.PI * 2);
    ctx.moveTo(x + s * .12, y + s * .05);
    ctx.lineTo(x + s * .88, y - s * .38);
    ctx.moveTo(x + s * .23, y + s * .12);
    ctx.lineTo(x + s * .88, y + s * .50);
    ctx.stroke();
    ctx.restore();
  }

  function drawPersonIcon(ctx, cx, cy, radius, navy) {
    ctx.save();
    ctx.fillStyle = navy;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy - radius * .28, radius * .25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + radius * .38, radius * .48, Math.PI, Math.PI * 2);
    ctx.lineTo(cx + radius * .48, cy + radius * .55);
    ctx.lineTo(cx - radius * .48, cy + radius * .55);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawDocumentIcon(ctx, x, y, size, orange) {
    ctx.save();
    ctx.strokeStyle = orange;
    ctx.lineWidth = Math.max(1, size * .075);
    roundRect(ctx, x, y, size * .72, size, size * .08); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + size * .16, y + size * .32); ctx.lineTo(x + size * .55, y + size * .32);
    ctx.moveTo(x + size * .16, y + size * .50); ctx.lineTo(x + size * .55, y + size * .50);
    ctx.moveTo(x + size * .16, y + size * .68); ctx.lineTo(x + size * .48, y + size * .68);
    ctx.stroke(); ctx.restore();
  }

  function drawLabel(ctx, box, data, scale, suppliedMetrics = null) {
    const mm = value => value * scale;
    const x = mm(box.x), y = mm(box.y), w = mm(box.w), h = mm(box.h);
    const metrics = suppliedMetrics || computeLabelMetrics(data, box.w);
    const p = metrics.profile;
    const pad = mm(p.pad);
    const navy = '#142b63';
    const orange = '#ef4b23';
    const ink = '#101828';
    const muted = '#536079';
    const cut = '#7e8797';
    const inner = mm(.85);

    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, w, h);

    ctx.setLineDash([mm(.75), mm(.55)]);
    ctx.lineWidth = mm(.18);
    ctx.strokeStyle = cut;
    roundRect(ctx, x + mm(.12), y + mm(.12), w - mm(.24), h - mm(.24), mm(2.1));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.lineWidth = mm(.28);
    ctx.strokeStyle = navy;
    roundRect(ctx, x + inner, y + inner, w - inner * 2, h - inner * 2, mm(1.8));
    ctx.stroke();
    drawScissors(ctx, x + w - mm(1.9), y + mm(.35), mm(2.4), '#555d6c');

    const contentX = x + pad;
    const contentRight = x + w - pad;
    const logoW = mm(p.logoW);
    const logoH = logoW * (210 / 240);
    const logoY = y + mm(p.logoY);
    if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, contentX, logoY, logoW, logoH);

    const numberBoxW = mm(p.numberBoxW);
    const numberBoxH = mm(p.numberBoxH);
    const numberX = contentRight - numberBoxW;
    const numberY = y + mm(p.numberY);
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = navy;
    ctx.lineWidth = mm(.25);
    roundRect(ctx, numberX, numberY, numberBoxW, numberBoxH, mm(1.35));
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = navy;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `500 ${mm(state.size === 'compact' ? 2.15 : 2.35)}px Inter, Arial, sans-serif`;
    ctx.fillText('No. Surat:', numberX + mm(1.7), numberY + mm(1.2));
    const noFit = fitWrappedText(ctx, normalizeText(data.noSurat) || '—', numberBoxW - mm(3.4), 2, mm(state.size === 'compact' ? 2.45 : 2.7), mm(1.85), 800);
    ctx.font = `800 ${noFit.size}px Inter, Arial, sans-serif`;
    drawLines(ctx, noFit.lines, numberX + mm(1.7), numberY + mm(4.55), noFit.size * 1.06, navy);

    const senderY = y + mm(p.senderY);
    ctx.fillStyle = ink;
    ctx.font = `800 ${mm(p.senderFont)}px Inter, Arial, sans-serif`;
    ctx.fillText('Dari:', contentX, senderY);
    const fromWidth = ctx.measureText('Dari:').width;
    ctx.font = `500 ${mm(p.senderFont)}px Inter, Arial, sans-serif`;
    ctx.fillText('KANTOR POS BATAM', contentX + fromWidth + mm(.65), senderY);
    ctx.fillStyle = muted;
    ctx.font = `500 ${mm(p.senderSubFont)}px Inter, Arial, sans-serif`;
    drawLines(
      ctx,
      ['KCU Batam 29400', 'Jalan Ibnu Soetowo No. 2, Batam Center, Kota Batam'],
      contentX,
      senderY + mm(p.senderFont + .8),
      mm(p.senderLineHeight),
      muted
    );

    const dividerY = y + mm(p.dividerY);
    ctx.strokeStyle = orange;
    ctx.lineWidth = mm(.48);
    ctx.beginPath();
    ctx.moveTo(contentX, dividerY);
    ctx.lineTo(contentRight, dividerY);
    ctx.stroke();

    const recipientTop = dividerY + mm(p.recipientGapTop);
    const iconR = mm(p.iconR);
    const textX = contentX + iconR * 2 + mm(p.iconGap);
    const headingHeight = mm(p.headingFont * 1.08);
    const recipientSizePx = (metrics.recipient.size / MEASURE_SCALE) * scale;
    const addressSizePx = (metrics.address.size / MEASURE_SCALE) * scale;
    const recipientTextHeight = headingHeight + mm(.7)
      + metrics.recipient.lines.length * recipientSizePx * 1.12
      + mm(.45)
      + metrics.address.lines.length * addressSizePx * 1.14;
    const iconCx = contentX + iconR;
    const iconCy = recipientTop + Math.max(iconR + mm(.3), recipientTextHeight / 2);
    drawPersonIcon(ctx, iconCx, iconCy, iconR, navy);

    ctx.font = `800 ${mm(p.headingFont)}px Inter, Arial, sans-serif`;
    ctx.fillStyle = navy;
    ctx.fillText('Kepada Yth.', textX, recipientTop);

    ctx.font = `820 ${recipientSizePx}px Inter, Arial, sans-serif`;
    const recipientY = recipientTop + headingHeight + mm(.7);
    drawLines(ctx, metrics.recipient.lines, textX, recipientY, recipientSizePx * 1.12, ink);

    ctx.font = `520 ${addressSizePx}px Inter, Arial, sans-serif`;
    const addressY = recipientY + metrics.recipient.lines.length * recipientSizePx * 1.12 + mm(.45);
    drawLines(ctx, metrics.address.lines, textX, addressY, addressSizePx * 1.14, ink);

    const subjectDividerY = y + mm(metrics.subjectDividerMm);
    ctx.strokeStyle = '#aeb7c5';
    ctx.lineWidth = mm(.18);
    ctx.setLineDash([mm(.65), mm(.5)]);
    ctx.beginPath();
    ctx.moveTo(contentX, subjectDividerY);
    ctx.lineTo(contentRight, subjectDividerY);
    ctx.stroke();
    ctx.setLineDash([]);

    const docSize = mm(p.docSize);
    const docX = contentX + mm(.45);
    const subjectContentHeight = mm(metrics.subjectSectionHeight - p.subjectPadTop - p.subjectPadBottom);
    const docY = subjectDividerY + mm(p.subjectPadTop) + Math.max(0, (subjectContentHeight - docSize) / 2);
    drawDocumentIcon(ctx, docX, docY, docSize, orange);

    const subjectX = docX + docSize + mm(state.size === 'compact' ? 1.4 : 1.9);
    const subjectY = subjectDividerY + mm(p.subjectPadTop);
    ctx.fillStyle = orange;
    ctx.font = `800 ${mm(p.subjectLabelFont)}px Inter, Arial, sans-serif`;
    ctx.fillText('Perihal:', subjectX, subjectY);
    const subjectLabelWidth = ctx.measureText('Perihal:').width + mm(.85);
    const subjectSizePx = (metrics.subject.size / MEASURE_SCALE) * scale;
    ctx.font = `520 ${subjectSizePx}px Inter, Arial, sans-serif`;
    drawLines(ctx, metrics.subject.lines, subjectX + subjectLabelWidth, subjectY, subjectSizePx * 1.14, ink);
    ctx.restore();
  }

  function renderPage(ctx, widthPx, heightPx, pageIndex = 0) {
    const scale = widthPx / A4.widthMm;
    const layout = getLayoutInfo();
    const items = layout.pages[pageIndex] || [];
    ctx.save();
    ctx.clearRect(0, 0, widthPx, heightPx);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, widthPx, heightPx);
    items.forEach(item => drawLabel(ctx, item.box, state.labels[item.index], scale, item.metrics));
    ctx.restore();
  }

  function renderPreview() {
    const pages = getPageCount();
    state.previewPage = Math.min(Math.max(0, state.previewPage), pages - 1);
    const ctx = els.canvas.getContext('2d', { alpha: false });
    renderPage(ctx, els.canvas.width, els.canvas.height, state.previewPage);
    els.pageIndicator.textContent = `Halaman ${state.previewPage + 1} dari ${pages}`;
    els.prevPageBtn.disabled = state.previewPage === 0;
    els.nextPageBtn.disabled = state.previewPage >= pages - 1;
    updateLayoutSummary();
  }

  function validate() {
    for (let index = 0; index < state.labels.length; index++) {
      const label = state.labels[index];
      const emptyKey = ['noSurat', 'kepada', 'alamat', 'perihal'].find(key => !normalizeText(label[key]));
      if (!emptyKey) continue;
      const card = els.forms.querySelector(`[data-label-index="${index}"]`);
      if (card) card.open = true;
      card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card?.querySelector(`[data-field="${emptyKey}"]`)?.focus();
      showToast(`Lengkapi data Label ${index + 1} terlebih dahulu.`);
      return false;
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

  function jpegBytesFromCanvas(canvas, quality = .95) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const binary = atob(dataUrl.split(',')[1]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function createPdfWithJpegs(images) {
    const pageW = 595.2756;
    const pageH = 841.8898;
    const objectCount = 2 + images.length * 3;
    const objects = new Array(objectCount + 1);
    const pageRefs = [];

    images.forEach((image, index) => pageRefs.push(`${3 + index * 3} 0 R`));
    objects[1] = bytesFromString('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    objects[2] = bytesFromString(`2 0 obj\n<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${images.length} >>\nendobj\n`);

    images.forEach((image, index) => {
      const pageObj = 3 + index * 3;
      const imageObj = pageObj + 1;
      const contentObj = pageObj + 2;
      objects[pageObj] = bytesFromString(`${pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im${index} ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>\nendobj\n`);
      objects[imageObj] = concatBytes([
        bytesFromString(`${imageObj} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`),
        image.bytes,
        bytesFromString('\nendstream\nendobj\n')
      ]);
      const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im${index} Do\nQ\n`;
      objects[contentObj] = bytesFromString(`${contentObj} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);
    });

    const header = concatBytes([bytesFromString('%PDF-1.4\n%'), new Uint8Array([0xE2,0xE3,0xCF,0xD3]), bytesFromString('\n')]);
    const parts = [header];
    const offsets = new Array(objectCount + 1).fill(0);
    let cursor = header.length;
    for (let index = 1; index <= objectCount; index++) {
      offsets[index] = cursor;
      parts.push(objects[index]);
      cursor += objects[index].length;
    }
    const xrefOffset = cursor;
    let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
    for (let index = 1; index <= objectCount; index++) xref += `${String(offsets[index]).padStart(10,'0')} 00000 n \n`;
    parts.push(bytesFromString(`${xref}trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
    return concatBytes(parts);
  }

  async function downloadPdf() {
    if (!validate()) return;
    els.downloadBtn.disabled = true;
    const originalLabel = els.downloadBtn.innerHTML;
    try {
      const pageCount = getPageCount();
      const dpi = 220;
      const width = Math.round((A4.widthMm / 25.4) * dpi);
      const height = Math.round((A4.heightMm / 25.4) * dpi);
      const images = [];
      for (let page = 0; page < pageCount; page++) {
        els.downloadBtn.innerHTML = `<span aria-hidden="true">…</span> Halaman ${page + 1}/${pageCount}`;
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 12)));
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        renderPage(canvas.getContext('2d', { alpha: false }), width, height, page);
        images.push({ bytes: jpegBytesFromCanvas(canvas), width, height });
      }
      const pdf = createPdfWithJpegs(images);
      const blob = new Blob([pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const firstNumber = normalizeText(state.labels[0].noSurat).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
      anchor.href = url;
      anchor.download = state.labels.length === 1
        ? `label-${firstNumber || 'surat-posind'}.pdf`
        : `label-posind-${state.labels.length}-data.pdf`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1600);
      showToast(`PDF ${pageCount} halaman berhasil diunduh.`);
    } catch (error) {
      console.error(error);
      showToast('PDF belum berhasil dibuat. Silakan coba kembali.');
    } finally {
      els.downloadBtn.disabled = false;
      els.downloadBtn.innerHTML = originalLabel;
    }
  }

  function findEocd(view) {
    const minimum = Math.max(0, view.byteLength - 65557);
    for (let offset = view.byteLength - 22; offset >= minimum; offset--) {
      if (view.getUint32(offset, true) === 0x06054b50) return offset;
    }
    return -1;
  }

  async function extractZipEntry(arrayBuffer, targetName) {
    const view = new DataView(arrayBuffer);
    const eocd = findEocd(view);
    if (eocd < 0) throw new Error('Struktur DOCX tidak dikenali.');
    const entries = view.getUint16(eocd + 10, true);
    let offset = view.getUint32(eocd + 16, true);
    const decoder = new TextDecoder('utf-8');

    for (let index = 0; index < entries; index++) {
      if (view.getUint32(offset, true) !== 0x02014b50) break;
      const compression = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localOffset = view.getUint32(offset + 42, true);
      const name = decoder.decode(new Uint8Array(arrayBuffer, offset + 46, nameLength));
      if (name === targetName) {
        if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('Data DOCX tidak valid.');
        const localNameLength = view.getUint16(localOffset + 26, true);
        const localExtraLength = view.getUint16(localOffset + 28, true);
        const dataStart = localOffset + 30 + localNameLength + localExtraLength;
        const compressed = new Uint8Array(arrayBuffer, dataStart, compressedSize);
        if (compression === 0) return compressed.slice();
        if (compression !== 8 || !('DecompressionStream' in window)) throw new Error('Browser belum mendukung pembacaan DOCX ini.');
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
      }
      offset += 46 + nameLength + extraLength + commentLength;
    }
    throw new Error('Isi utama surat tidak ditemukan dalam DOCX.');
  }

  function documentXmlToText(xmlText) {
    const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (xml.getElementsByTagName('parsererror').length) throw new Error('Isi DOCX tidak dapat dibaca.');
    const paragraphs = Array.from(xml.getElementsByTagNameNS('*', 'p'));
    return paragraphs.map(paragraph => {
      const pieces = [];
      const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_ELEMENT);
      let node = walker.currentNode;
      while (node) {
        if (node.localName === 't') pieces.push(node.textContent || '');
        else if (node.localName === 'tab') pieces.push('\t');
        else if (node.localName === 'br') pieces.push('\n');
        node = walker.nextNode();
      }
      return pieces.join('');
    }).filter(line => line.trim()).join('\n');
  }

  async function extractDocxText(file) {
    const buffer = await file.arrayBuffer();
    const xmlBytes = await extractZipEntry(buffer, 'word/document.xml');
    return documentXmlToText(new TextDecoder('utf-8').decode(xmlBytes));
  }

  async function extractPdfText(file) {
    let pdfjs;
    try {
      pdfjs = await import(PDFJS_URL);
    } catch (_) {
      throw new Error('Pembaca PDF tidak dapat dimuat. Periksa koneksi internet atau unggah file DOCX.');
    }
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const output = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items
        .filter(item => item.str && item.str.trim())
        .map(item => ({ text: item.str.trim(), x: item.transform[4], y: item.transform[5] }))
        .sort((a, b) => Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x);
      const lines = [];
      for (const item of items) {
        const current = lines[lines.length - 1];
        if (!current || Math.abs(current.y - item.y) > 2) lines.push({ y: item.y, parts: [item] });
        else current.parts.push(item);
      }
      output.push(lines.map(line => line.parts.sort((a,b) => a.x - b.x).map(part => part.text).join(' ')).join('\n'));
    }
    return output.join('\n');
  }

  function cleanLine(value) {
    return String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  }

  function parseOfferLetter(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n').map(cleanLine).filter(Boolean);
    const lower = lines.map(line => line.toLowerCase());
    const numberPattern = /\b\d{1,6}\s*\/\s*[a-z0-9.-]+(?:\s*\/\s*[a-z0-9.-]+){1,6}\b/i;

    let noSurat = '';
    const nomorIndex = lower.findIndex(line => /^nomor\b/.test(line));
    const numberSearch = nomorIndex >= 0 ? lines.slice(nomorIndex, nomorIndex + 12) : lines;
    for (const line of numberSearch) {
      const match = line.match(numberPattern);
      if (match) { noSurat = match[0].replace(/\s*\/\s*/g, '/'); break; }
    }
    if (!noSurat) {
      const match = lines.join(' ').match(numberPattern);
      if (match) noSurat = match[0].replace(/\s*\/\s*/g, '/');
    }

    const kepadaIndex = lower.findIndex(line => /^kepada\s+yth\.?/.test(line));
    const hormatIndex = lower.findIndex((line, index) => index > kepadaIndex && /^dengan\s+hormat/.test(line));
    const recipientEnd = hormatIndex >= 0 ? hormatIndex : lines.length;
    const diIndex = lines.findIndex((line, index) => index > kepadaIndex && index < recipientEnd && /^di\s*:?$/i.test(line));

    let kepadaLines = [];
    let alamatLines = [];
    if (kepadaIndex >= 0) {
      const stop = diIndex >= 0 ? diIndex : recipientEnd;
      kepadaLines = lines.slice(kepadaIndex + 1, stop).filter(line => !/^[\s:\-]+$/.test(line));
      if (diIndex >= 0) alamatLines = lines.slice(diIndex + 1, recipientEnd).filter(line => !/^[\s:\-]+$/.test(line));
    }

    const perihalIndex = lower.findIndex(line => /^perihal\b/.test(line));
    let perihal = '';
    if (perihalIndex >= 0) {
      const inline = lines[perihalIndex].replace(/^perihal\s*:?\s*/i, '').trim();
      const end = kepadaIndex > perihalIndex ? kepadaIndex : Math.min(lines.length, perihalIndex + 12);
      const after = lines.slice(perihalIndex + 1, end).filter(line => {
        if (/^[\s:\-]+$/.test(line)) return false;
        if (/^(nomor|lampiran|perihal)$/i.test(line)) return false;
        if (noSurat && line.includes(noSurat)) return false;
        if (numberPattern.test(line)) return false;
        return true;
      });
      perihal = [inline, ...after].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    }

    if (!alamatLines.length && kepadaLines.length > 2) {
      const addressStart = kepadaLines.findIndex(line => /^(jl\.?|jalan|gedung|komplek|kawasan|kota|kabupaten|batam\b)/i.test(line));
      if (addressStart > 0) {
        alamatLines = kepadaLines.slice(addressStart);
        kepadaLines = kepadaLines.slice(0, addressStart);
      }
    }

    const result = {
      noSurat: noSurat.trim(),
      kepada: kepadaLines.join('\n').trim(),
      alamat: alamatLines.join('\n').trim(),
      perihal: perihal.trim()
    };
    result.missing = ['noSurat','kepada','alamat','perihal'].filter(key => !normalizeText(result[key]));
    return result;
  }

  async function extractFileText(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.docx')) return extractDocxText(file);
    if (name.endsWith('.pdf')) return extractPdfText(file);
    if (name.endsWith('.txt')) return file.text();
    throw new Error('Format file belum didukung. Gunakan DOCX, PDF, atau TXT.');
  }

  function showImportStatus(message, isError = false) {
    els.importStatus.textContent = message;
    els.importStatus.classList.toggle('error', isError);
    els.importStatus.classList.add('show');
  }

  async function importFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    showImportStatus(`Membaca ${files.length} file…`);
    els.fileInput.disabled = true;
    const parsed = [];
    const failures = [];

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      showImportStatus(`Membaca ${index + 1}/${files.length}: ${file.name}`);
      try {
        const text = await extractFileText(file);
        const data = parseOfferLetter(text);
        parsed.push({ file, data });
      } catch (error) {
        console.error(error);
        failures.push(`${file.name}: ${error.message}`);
      }
    }

    if (parsed.length) {
      const replaceFirst = state.labels.length === 1 && isBlankLabel(state.labels[0]);
      parsed.forEach((entry, index) => {
        const label = { ...EMPTY_LABEL, ...entry.data };
        if (replaceFirst && index === 0) state.labels[0] = label;
        else state.labels.push(label);
      });
      state.previewPage = findPageForLabel(state.labels.length - 1);
      renderForms(Math.max(0, state.labels.length - 1));
      renderPreview(); saveState();
      const incomplete = parsed.filter(entry => entry.data.missing.length).length;
      const details = incomplete ? ` ${incomplete} label perlu diperiksa karena ada data yang belum terbaca.` : ' Semua data utama berhasil dibaca.';
      showImportStatus(`${parsed.length} file ditambahkan menjadi label.${details}${failures.length ? ` ${failures.length} file gagal.` : ''}`, failures.length > 0);
      showToast(`${parsed.length} label berhasil diimpor.`);
    } else {
      showImportStatus(failures.join(' · ') || 'File belum dapat dibaca.', true);
    }
    els.fileInput.value = '';
    els.fileInput.disabled = false;
  }

  function addLabel(data = EMPTY_LABEL, afterIndex = state.labels.length - 1) {
    const insertAt = Math.min(state.labels.length, Math.max(0, afterIndex + 1));
    state.labels.splice(insertAt, 0, { ...EMPTY_LABEL, ...data });
    state.previewPage = findPageForLabel(insertAt);
    renderForms(insertAt); renderPreview(); saveState();
    requestAnimationFrame(() => els.forms.querySelector(`[data-label-index="${insertAt}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }

  function deleteLabel(index) {
    if (state.labels.length === 1) state.labels[0] = { ...EMPTY_LABEL };
    else state.labels.splice(index, 1);
    state.previewPage = Math.min(state.previewPage, getPageCount() - 1);
    renderForms(Math.min(index, state.labels.length - 1)); renderPreview(); saveState();
  }

  function setExample() {
    state.labels = [{ ...DEFAULT_LABEL }];
    state.margin = 0.5;
    state.size = 'compact';
    state.previewPage = 0;
    renderForms(0); renderPreview(); saveState();
    showToast('Contoh surat BSN dimuat.');
  }

  function resetAll() {
    state.labels = [{ ...EMPTY_LABEL }];
    state.margin = 0.5;
    state.size = 'compact';
    state.previewPage = 0;
    renderForms(0); renderPreview(); saveState();
    els.importStatus.classList.remove('show', 'error');
    showToast('Semua data dikosongkan.');
  }

  let toastTimer;
  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add('show');
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 3000);
  }

  els.forms.addEventListener('input', event => {
    const target = event.target;
    if (!target.matches('[data-field]')) return;
    const index = Number(target.dataset.index);
    if (!state.labels[index]) return;
    state.labels[index][target.dataset.field] = target.value;
    const summary = els.forms.querySelector(`[data-summary-index="${index}"]`);
    if (summary) summary.textContent = labelSummary(state.labels[index]);
    renderPreview(); saveState();
  });

  els.forms.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const index = Number(button.dataset.index);
    if (button.dataset.action === 'duplicate') addLabel(state.labels[index], index);
    if (button.dataset.action === 'delete') deleteLabel(index);
  });

  els.addLabelBtn.addEventListener('click', () => addLabel());
  els.resetBtn.addEventListener('click', resetAll);
  els.sampleBtn.addEventListener('click', setExample);
  els.downloadBtn.addEventListener('click', downloadPdf);

  els.edgeMargin.addEventListener('change', event => {
    state.margin = Number(event.target.value);
    state.previewPage = 0;
    renderPreview(); saveState();
  });

  els.labelSize.addEventListener('change', event => {
    state.size = SIZE_CONFIG[event.target.value] ? event.target.value : 'compact';
    state.previewPage = 0;
    renderPreview(); saveState();
  });

  els.prevPageBtn.addEventListener('click', () => { state.previewPage--; renderPreview(); });
  els.nextPageBtn.addEventListener('click', () => { state.previewPage++; renderPreview(); });
  els.fileInput.addEventListener('change', event => importFiles(event.target.files));

  ['dragenter','dragover'].forEach(type => els.dropZone.addEventListener(type, event => {
    event.preventDefault();
    els.dropZone.classList.add('dragover');
  }));
  ['dragleave','drop'].forEach(type => els.dropZone.addEventListener(type, event => {
    event.preventDefault();
    els.dropZone.classList.remove('dragover');
  }));
  els.dropZone.addEventListener('drop', event => importFiles(event.dataTransfer.files));

  loadState();
  renderForms(0);
  renderPreview();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
