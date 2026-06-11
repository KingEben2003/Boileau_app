import { jsPDF } from "jspdf";

// ─── Constants ────────────────────────────────────────────────────────────────
const PW = 210;          // A4 width  mm
const PH = 297;          // A4 height mm
const ML = 20;           // margin left
const MR = 20;           // margin right
const CW = PW - ML - MR; // content width = 170mm
const MB = 22;           // margin bottom (footer zone)
const PT = 0.352778;     // 1pt in mm

const C = {
  indigo900: [30,  27,  75],
  indigo700: [67,  56, 202],
  indigo500: [99, 102, 241],
  indigo200: [199, 210, 254],
  indigo100: [224, 231, 255],
  indigoHdr: [79,  70, 229],
  gray900:   [17,  24,  39],
  gray700:   [55,  65,  81],
  gray400:   [156, 163, 175],
  gray200:   [229, 231, 235],
  white:     [255, 255, 255],
};

const TYPE_LABELS = {
  brief:    "Résumé rapide",
  medium:   "Résumé moyen",
  detailed: "Résumé détaillé",
};

// ─── Inline markdown stripping ────────────────────────────────────────────────
function strip(text) {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1");
}

// ─── Markdown → block list ────────────────────────────────────────────────────
function parseMarkdown(md) {
  const blocks = [];
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();

    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: strip(line.slice(4).trim()) });
    } else if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: strip(line.slice(3).trim()) });
    } else if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: strip(line.slice(2).trim()) });
    } else if (/^[-*•]\s+/.test(line)) {
      blocks.push({ type: "bullet", text: strip(line.replace(/^[-*•]\s+/, "")) });
    } else if (/^\d+\.\s+/.test(line)) {
      // Read the number directly from the markdown — do NOT use an internal counter
      // that would reset on empty lines between items
      const num = parseInt(line.match(/^(\d+)/)[1], 10);
      blocks.push({ type: "numbered", num, text: strip(line.replace(/^\d+\.\s+/, "")) });
    } else if (line.trim() === "") {
      if (blocks.length && blocks[blocks.length - 1].type !== "spacer") {
        blocks.push({ type: "spacer" });
      }
    } else {
      blocks.push({ type: "paragraph", text: strip(line) });
    }
  }
  return blocks;
}

// ─── Header (first page only) ─────────────────────────────────────────────────
function drawHeader(doc, docTitle, summaryType, dateStr) {
  // Header background
  doc.setFillColor(...C.indigoHdr);
  doc.rect(0, 0, PW, 44, "F");

  // Branding
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...C.white);
  doc.text("BOILEAU", ML, 17);

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.indigo200);
  doc.text("Assistant d'apprentissage IA", ML, 24);

  // Summary type pill (right side)
  const typeLabel = (TYPE_LABELS[summaryType] || summaryType).toUpperCase();
  doc.setFontSize(7.5);
  doc.setTextColor(...C.indigo200);
  doc.text(typeLabel, PW - MR, 17, { align: "right" });

  // Date
  doc.setFontSize(7.5);
  doc.text(dateStr, PW - MR, 24, { align: "right" });

  // Separator line inside header
  doc.setDrawColor(...C.indigo500);
  doc.setLineWidth(0.4);
  doc.line(ML, 30, PW - MR, 30);

  // Document title below separator
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...C.white);
  const titleLines = doc.splitTextToSize(docTitle || "Document", CW);
  doc.text(titleLines, ML, 38);

  // Bottom border of header area
  const headerBottom = 44 + titleLines.length * 13 * PT * 1.35;
  doc.setFillColor(...C.indigo100);
  doc.rect(0, 44, PW, 0.6, "F");

  return Math.max(52, Math.round(headerBottom + 8));
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function drawFooter(doc, page, total) {
  const y = PH - 10;
  doc.setDrawColor(...C.gray200);
  doc.setLineWidth(0.3);
  doc.line(ML, y - 4, PW - MR, y - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.gray400);
  doc.text("Généré par BOILEAU AI", ML, y);
  doc.text(`Page ${page} / ${total}`, PW - MR, y, { align: "right" });
}

// ─── Main export function ──────────────────────────────────────────────────────
export function exportSummaryAsPdf({ content, documentTitle, summaryType, generatedAt }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const dateStr = generatedAt
    ? new Date(generatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  const blocks = parseMarkdown(content || "");

  // Track pages for footer pass
  let pageNum = 1;
  const pages = [pageNum]; // list of page numbers created

  // Draw first page header and get starting Y
  let y = drawHeader(doc, documentTitle, summaryType, dateStr);

  const contentBottom = PH - MB;

  // Line heights (mm) for each type
  const lh = (pt, ratio = 1.45) => pt * PT * ratio;

  const newPage = () => {
    pages.push(++pageNum);
    doc.addPage();
    y = 18;
  };

  const ensureSpace = (needed) => {
    if (y + needed > contentBottom) newPage();
  };

  // ─── Render blocks ────────────────────────────────────────────────────────
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const prev = blocks[i - 1];

    switch (block.type) {

      case "h1": {
        if (prev && prev.type !== "spacer") y += 5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        const lines = doc.splitTextToSize(block.text, CW);
        ensureSpace(lines.length * lh(15) + 8);
        doc.setTextColor(...C.indigo900);
        doc.text(lines, ML, y);
        y += lines.length * lh(15);
        // Underline accent
        doc.setDrawColor(...C.indigo500);
        doc.setLineWidth(0.7);
        const uw = Math.min(doc.getTextWidth(block.text.slice(0, 40)), CW * 0.55);
        doc.line(ML, y + 1, ML + uw, y + 1);
        y += 5;
        break;
      }

      case "h2": {
        if (prev && prev.type !== "spacer") y += 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        const lines = doc.splitTextToSize(block.text, CW);
        ensureSpace(lines.length * lh(12) + 5);
        doc.setTextColor(...C.indigo700);
        doc.text(lines, ML, y);
        y += lines.length * lh(12) + 2;
        break;
      }

      case "h3": {
        if (prev && prev.type !== "spacer") y += 3;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        const lines = doc.splitTextToSize(block.text, CW);
        ensureSpace(lines.length * lh(10.5) + 3);
        doc.setTextColor(...C.indigo500);
        doc.text(lines, ML, y);
        y += lines.length * lh(10.5) + 1.5;
        break;
      }

      case "paragraph": {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(block.text, CW);
        ensureSpace(lines.length * lh(10));
        doc.setTextColor(...C.gray700);
        doc.text(lines, ML, y);
        y += lines.length * lh(10) + 1;
        break;
      }

      case "bullet": {
        const indent = 7;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(block.text, CW - indent);
        ensureSpace(lines.length * lh(10));
        // Bullet dot
        doc.setFillColor(...C.indigo500);
        doc.circle(ML + 2, y - 1.2, 0.9, "F");
        doc.setTextColor(...C.gray700);
        doc.text(lines, ML + indent, y);
        y += lines.length * lh(10) + 0.5;
        break;
      }

      case "numbered": {
        const indent = 9;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(block.text, CW - indent);
        ensureSpace(lines.length * lh(10));
        doc.setTextColor(...C.indigo500);
        doc.text(`${block.num}.`, ML, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.gray700);
        doc.text(lines, ML + indent, y);
        y += lines.length * lh(10) + 0.5;
        break;
      }

      case "spacer": {
        y += 2.5;
        break;
      }
    }
  }

  // ─── Draw footers on all pages ────────────────────────────────────────────
  const totalPages = pageNum;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages);
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  const typeSlug = { brief: "rapide", medium: "moyen", detailed: "détaillé" }[summaryType] || summaryType;
  const safeTitle = (documentTitle || "résumé")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "_")
    .slice(0, 30)
    .toLowerCase();
  doc.save(`boileau_résumé_${typeSlug}_${safeTitle}.pdf`);
}
