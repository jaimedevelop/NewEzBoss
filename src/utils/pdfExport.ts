import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

async function imageUrlToDataUrl(url: string): Promise<string> {
  try {
    // Avoid reusing an opaque response cached by the normal preview <img>.
    const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
    if (!response.ok) throw new Error('Image request failed');
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    if (!url.includes('/profile/')) {
      throw new Error('Unable to load an estimate picture for the PDF. Please try again.');
    }
    const apiUrl = (import.meta.env.VITE_API_URL as string).replace(/\/$/, '');
    const response = await fetch(`${apiUrl}/profile/logo-data?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error('Unable to load the company logo for the PDF. Please try again.');
    const { dataUrl } = await response.json();
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      throw new Error('Invalid company logo response');
    }
    return dataUrl;
  }
}

async function createElementPdf(element: HTMLElement): Promise<jsPDF> {
  const explicitPages = Array.from(element.querySelectorAll<HTMLElement>('[data-pdf-page]'));
  const pageElements = explicitPages.length > 0 ? explicitPages : [element];
  const sourcesByPage = await Promise.all(pageElements.map(async (pageElement) =>
    Promise.all(Array.from(pageElement.querySelectorAll('img')).map(async (img) => {
      const src = img.currentSrc || img.src;
      return !src || src.startsWith('data:') ? src : imageUrlToDataUrl(src);
    }))
  ));
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = 612; // 8.5in letter at 72dpi
  const pageHeight = 792; // 11in letter at 72dpi

  let pdfPageCount = 0;
  for (let pageIndex = 0; pageIndex < pageElements.length; pageIndex += 1) {
    const pageElement = pageElements[pageIndex];
    const sources = sourcesByPage[pageIndex];
    const canvas = await html2canvas(pageElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: async (_document, clonedElement) => {
        // Change only the export copy so React and the visible preview are untouched.
        await Promise.all(Array.from(clonedElement.querySelectorAll('img')).map(async (img, index) => {
          if (!sources[index]) return;
          img.removeAttribute('srcset');
          img.removeAttribute('sizes');
          img.loading = 'eager';
          img.src = sources[index];
          await img.decode();
        }));
      },
    });

    const imgWidth = pageWidth;

    const pxPerPdfPt = canvas.width / imgWidth;
    const pageHeightInCanvasPx = pageHeight * pxPerPdfPt;

    let renderedHeight = 0;
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

      if (pdfPageCount > 0) pdf.addPage();
      pdf.addImage(pageImgData, 'JPEG', 0, 0, imgWidth, pageImgHeight);

      renderedHeight += sliceHeight;
      pdfPageCount += 1;
    }
  }

  return pdf;
}

export async function downloadElementAsPdf(element: HTMLElement, fileName: string): Promise<void> {
  const pdf = await createElementPdf(element);
  pdf.save(fileName);
}

export async function openElementAsPdfInNewTab(element: HTMLElement, title: string): Promise<void> {
  // Open synchronously from the click handler so Safari and Chrome do not treat
  // the generated document as an unsolicited popup.
  const pdfWindow = window.open('', '_blank');
  if (!pdfWindow) {
    throw new Error('The browser blocked the PDF tab. Please allow popups and try again.');
  }

  pdfWindow.document.title = title;
  const pdf = await createElementPdf(element);
  const pdfUrl = URL.createObjectURL(pdf.output('blob'));
  pdfWindow.location.replace(pdfUrl);
  window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
}
