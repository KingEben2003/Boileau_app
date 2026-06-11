let pdfjsLibPromise;

async function getPdfJsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist").then((mod) => {
      const lib = mod.default || mod;
      // Use HTTPS + .mjs worker for pdfjs v5 module workers.
      lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version}/pdf.worker.min.mjs`;
      return lib;
    });
  }

  return pdfjsLibPromise;
}

export async function extractTextFromPdf(file) {
  const pdfjsLib = await getPdfJsLib();
  const arrayBuffer = await file.arrayBuffer();
  let pdf;

  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch (error) {
    const message = String(error?.message || error || "");
    const workerImportFailed =
      message.includes("Failed to fetch dynamically imported module") ||
      message.toLowerCase().includes("worker");

    if (!workerImportFailed) {
      throw error;
    }

    // Fallback for environments where worker module loading is blocked.
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
  }

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => item.str || "")
      .join(" ")
      .trim();
    fullText += `${pageText}\n`;
  }

  return fullText.trim();
}
