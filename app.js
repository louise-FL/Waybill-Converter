(() => {
  'use strict';
  const PAGE_W = 297, PAGE_H = 210, MARGIN = 10;
  const MID = PAGE_W / 2;                    
  const AREA_W = MID - 2 * MARGIN, AREA_H = PAGE_H - 2 * MARGIN; 
  const MAX_PX = 4500;                  
  const $ = id => document.getElementById(id);

  const items = [];          // {id,name,url,w,h,data}
  let page = 0, pdfBlob = null, pdfUrl = null, uid = 0, pasteN = 0;

  const el = {
    dz: $('dropzone'), input: $('fileInput'), browse: $('browseBtn'), err: $('error'),
    list: $('list'), count: $('count'), clear: $('clearBtn'), hint: $('listHint'),
    paper: $('paper'), prev: $('prevBtn'), next: $('nextBtn'), info: $('pageInfo'),
    showGuide: $('showGuide'), printGuide: $('printGuide'),
    gen: $('generateBtn'), dl: $('downloadBtn'), status: $('status')
  };

  function layout(w, h) {
    const s = Math.min(AREA_W / w, AREA_H / h);
    const dw = w * s, dh = h * s;
    const y = MARGIN + (AREA_H - dh) / 2;
    return { dw, dh, y, xL: MARGIN + (AREA_W - dw) / 2, xR: MID + MARGIN + (AREA_W - dw) / 2 };
  }

  // ---- Messages ----
  let errTimer;
  function showError(msg) {
    el.err.textContent = msg; el.err.hidden = false;
    clearTimeout(errTimer); errTimer = setTimeout(() => el.err.hidden = true, 7000);
  }

  function loadImage(url) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img); img.onerror = () => rej(new Error('decode'));
      img.src = url;
    });
  }
  async function addFiles(files, pasted) {
    const bad = [];
    for (const f of files) {
      const okType = /^image\/jpe?g$/i.test(f.type) || /\.jpe?g$/i.test(f.name);
      if (!okType && !(pasted && /^image\//.test(f.type))) { bad.push(f.name || 'pasted item'); continue; }
      const url = URL.createObjectURL(f);
      try {
        const img = await loadImage(url);
        const name = pasted ? `Pasted_image_${++pasteN}.jpg` : f.name;
        items.push({ id: ++uid, name, url, w: img.naturalWidth, h: img.naturalHeight, img, data: null });
      } catch { URL.revokeObjectURL(url); bad.push(f.name || 'image'); }
    }
    if (bad.length) showError(`Only JPG/JPEG images are supported. Skipped: ${bad.join(', ')}`);
    page = Math.max(0, Math.min(page, items.length - 1));
    if (files.length && items.length && !bad.length) page = items.length - 1;
    changed();
  }

  function removeItem(id) {
    const i = items.findIndex(x => x.id === id);
    if (i < 0) return;
    URL.revokeObjectURL(items[i].url); items.splice(i, 1);
    page = Math.max(0, Math.min(page, items.length - 1));
    changed();
  }
  function clearAll() {
    items.forEach(x => URL.revokeObjectURL(x.url)); items.length = 0; page = 0; changed();
  }

  function changed() {
    invalidatePdf();
    renderList(); renderPreview();
    el.count.textContent = items.length;
    el.clear.disabled = el.gen.disabled = !items.length;
    el.hint.textContent = items.length ? 'Drag thumbnails to change the page order.' : 'No images yet.';
  }
  function renderList() {
    el.list.innerHTML = '';
    items.forEach((it, i) => {
      const li = document.createElement('li');
      li.className = 'item'; li.dataset.id = it.id;
      li.innerHTML = '<span class="no"></span><button class="rm" title="Remove" aria-label="Remove image">&times;</button><img alt=""><div class="name"></div>';
      li.querySelector('.no').textContent = i + 1;
      li.querySelector('img').src = it.url;
      li.querySelector('.name').textContent = it.name; li.title = it.name;
      li.querySelector('.rm').onclick = () => removeItem(it.id);
      el.list.appendChild(li);
    });
  }
  const pct = (v, total) => (v / total * 100) + '%';
  function renderPreview() {
    const p = el.paper; p.innerHTML = '';
    if (!items.length) {
      p.innerHTML = '<div class="empty">Add an image to see the preview</div>';
      el.info.textContent = 'Page 0 of 0'; el.prev.disabled = el.next.disabled = true; return;
    }
    const it = items[page], L = layout(it.w, it.h);
    [MARGIN, MID + MARGIN].forEach(x0 => {
      const m = document.createElement('div'); m.className = 'margin';
      Object.assign(m.style, { left: pct(x0, PAGE_W), top: pct(MARGIN, PAGE_H), width: pct(AREA_W, PAGE_W), height: pct(AREA_H, PAGE_H) });
      p.appendChild(m);
    });
    [L.xL, L.xR].forEach(x => {
      const im = document.createElement('img'); im.className = 'pimg'; im.src = it.url; im.alt = '';
      Object.assign(im.style, { left: pct(x, PAGE_W), top: pct(L.y, PAGE_H), width: pct(L.dw, PAGE_W), height: pct(L.dh, PAGE_H) });
      p.appendChild(im);
    });
    if (el.showGuide.checked) {
      const g = document.createElement('div'); g.className = 'guide'; g.style.left = pct(MID, PAGE_W); p.appendChild(g);
    }
    el.info.textContent = `Page ${page + 1} of ${items.length}`;
    el.prev.disabled = page === 0; el.next.disabled = page >= items.length - 1;
  }

  function toJpegData(it) {
    if (it.data) return it.data;
    const s = Math.min(1, MAX_PX / Math.max(it.w, it.h));
    const c = document.createElement('canvas');
    c.width = Math.round(it.w * s); c.height = Math.round(it.h * s);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(it.img, 0, 0, c.width, c.height);
    return (it.data = c.toDataURL('image/jpeg', 0.95));
  }
  function invalidatePdf() {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    pdfBlob = pdfUrl = null; el.dl.hidden = true; el.status.hidden = true;
  }
  async function generate() {
    if (!items.length || !window.jspdf) { if (!window.jspdf) showError('PDF library failed to load. Check your internet connection and refresh.'); return; }
    el.gen.disabled = true; el.gen.textContent = 'Generating…';
    await new Promise(r => setTimeout(r, 30));
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      try { doc.viewerPreferences({ PrintScaling: 'None' }); } catch {}
      items.forEach((it, i) => {
        if (i) doc.addPage('a4', 'landscape');
        const L = layout(it.w, it.h), data = toJpegData(it), alias = 'img' + it.id;
        doc.addImage(data, 'JPEG', L.xL, L.y, L.dw, L.dh, alias, 'NONE');
        doc.addImage(data, 'JPEG', L.xR, L.y, L.dw, L.dh, alias, 'NONE');
        if (el.printGuide.checked) {
          doc.setDrawColor(150); doc.setLineWidth(0.1);
          doc.setLineDashPattern([2, 2], 0);
          doc.line(MID, MARGIN, MID, PAGE_H - MARGIN);
          doc.setLineDashPattern([], 0);
        }
      });
      pdfBlob = doc.output('blob');
      pdfUrl = URL.createObjectURL(pdfBlob);
      el.status.textContent = `Success! Generated ${items.length} page${items.length > 1 ? 's' : ''} (A4 landscape, 10 mm margins).`;
      el.status.hidden = false; el.dl.hidden = false;
    } catch (e) {
      console.error(e); showError('Something went wrong while creating the PDF. Try fewer or smaller images.');
    }
    el.gen.textContent = 'Generate PDF'; el.gen.disabled = !items.length;
  }
  function download() {
    if (!pdfUrl) return;
    const a = document.createElement('a'); a.href = pdfUrl; a.download = 'Waybill_Formatted.pdf';
    document.body.appendChild(a); a.click(); a.remove();
  }

  el.browse.onclick = e => { e.stopPropagation(); el.input.click(); };
  el.dz.onclick = () => el.input.click();
  el.dz.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.input.click(); } };
  el.input.onchange = () => { addFiles([...el.input.files]); el.input.value = ''; };
  ['dragenter', 'dragover'].forEach(t => el.dz.addEventListener(t, e => { e.preventDefault(); el.dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(t => el.dz.addEventListener(t, e => { e.preventDefault(); el.dz.classList.remove('drag'); }));
  el.dz.addEventListener('drop', e => addFiles([...e.dataTransfer.files]));

  ['dragover', 'drop'].forEach(t => window.addEventListener(t, e => e.preventDefault()));
  document.addEventListener('paste', e => {
    const files = [...(e.clipboardData?.items || [])].filter(i => i.kind === 'file' && i.type.startsWith('image/')).map(i => i.getAsFile()).filter(Boolean);
    if (files.length) { e.preventDefault(); addFiles(files, true); }
  });
  el.clear.onclick = clearAll;
  el.prev.onclick = () => { if (page > 0) { page--; renderPreview(); } };
  el.next.onclick = () => { if (page < items.length - 1) { page++; renderPreview(); } };
  el.showGuide.onchange = renderPreview;
  el.printGuide.onchange = invalidatePdf;
  el.gen.onclick = generate;
  el.dl.onclick = download;

  if (window.Sortable) {
    Sortable.create(el.list, {
      animation: 150, ghostClass: 'sortable-ghost', filter: '.rm', preventOnFilter: false,
      onEnd: e => {
        if (e.oldIndex === e.newIndex) return;
        const [m] = items.splice(e.oldIndex, 1); items.splice(e.newIndex, 0, m);
        page = e.newIndex; changed();
      }
    });
  }
  window.addEventListener('beforeunload', () => { items.forEach(x => URL.revokeObjectURL(x.url)); if (pdfUrl) URL.revokeObjectURL(pdfUrl); });
  changed();
})();
