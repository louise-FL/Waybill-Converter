# Waybill PDF Formatter

Browser-only tool that turns JPG images into an A4 landscape PDF with each image duplicated left/right (10 mm margins, fold line at 148.5 mm). No backend, no uploads.

## Deploy on GitHub Pages
1. Create a repo and upload `index.html`, `style.css`, `app.js` (and this README).
2. Settings → Pages → Source: `Deploy from a branch` → `main` / `(root)` → Save.
3. Open `https://<your-username>.github.io/<repo-name>/`.

Libraries (jsPDF 2.5.1, SortableJS 1.15.0) load from the jsDelivr CDN.

## Printing
Print at **100% / Actual Size** (not "Fit to page").
