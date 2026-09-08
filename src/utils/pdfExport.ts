import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

async function waitForImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    })
  );
}

async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Cross-origin images (e.g. Firebase Storage logo URLs) get tainted/dropped by
// html2canvas unless inlined as data URLs first, so swap sources temporarily.
async function inlineRemoteImages(element: HTMLElement): Promise<() => void> {
  const images = Array.from(element.querySelectorAll('img'));
  const restores: Array<() => void> = [];

  await Promise.all(
    images.map(async (img) => {
      const originalSrc = img.src;
      if (!originalSrc || originalSrc.startsWith('data:')) return;
      if (originalSrc.startsWith(window.location.origin)) return;

      const dataUrl = await imageUrlToDataUrl(originalSrc);
      if (!dataUrl) return;

      img.src = dataUrl;
      restores.push(() => { img.src = originalSrc; });

      await new Promise<void>((resolve) => {
        if (img.complete) return resolve();
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    })
  );

  return () => restores.forEach((restore) => restore());
}

export async function downloadElementAsPdf(element: HTMLElement, fileName: string): Promise<void> {
  await waitForImages(element);
  const restoreImages = await inlineRemoteImages(element);

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
  } finally {
    restoreImages();
  }

  const pageWidth = 612; // 8.5in letter at 72dpi
  const pageHeight = 792; // 11in letter at 72dpi

  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pxPerPdfPt = canvas.width / imgWidth;
  const pageHeightInCanvasPx = pageHeight * pxPerPdfPt;

  let renderedHeight = 0;
  let pageIndex = 0;

  while (renderedHeight < canvas.height) {
    const sliceHeight = Math.min(pageHeightInCanvasPx, canvas.height - renderedHeight);

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;

    const ctx = pageCanvas.getContext('2d');
    if (!ctx) break;
    ctx.drawImage(
      canvas,
      0, renderedHeight, canvas.width, sliceHeight,
      0, 0, canvas.width, sliceHeight
    );

    const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
    const pageImgHeight = (sliceHeight * imgWidth) / canvas.width;

    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(pageImgData, 'JPEG', 0, 0, imgWidth, pageImgHeight);

    renderedHeight += sliceHeight;
    pageIndex += 1;
  }

  pdf.save(fileName);
}
