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
    if (!/\/users\/[a-zA-Z0-9_-]+\/(?:logo|profile)\//.test(new URL(url).pathname)) {
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

export interface PdfVersion { revision: number; currentUrl?: string }

async function createElementPdf(element: HTMLElement, version?: PdfVersion): Promise<jsPDF> {
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
  const footerHeight = version ? 46 : 24;

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

    // Canvas slicing does not honor CSS break-inside. Measure protected blocks
    // in the preview and map their boundaries into the rendered canvas.
    const pageBounds = pageElement.getBoundingClientRect();
    const canvasScale = canvas.width / pageBounds.width;
    const protectedBlocks = Array.from(pageElement.querySelectorAll<HTMLElement>(
      '[data-pdf-totals], .break-inside-avoid'
    )).map((block) => {
      const bounds = block.getBoundingClientRect();
      return {
        top: (bounds.top - pageBounds.top) * canvasScale,
        bottom: (bounds.bottom - pageBounds.top) * canvasScale,
        totals: block.hasAttribute('data-pdf-totals'),
      };
    });

    let renderedHeight = 0;
    while (renderedHeight < canvas.height) {
      let sliceHeight = Math.min(pageHeightInCanvasPx, canvas.height - renderedHeight);
      let totalsOnNextPage = false;
      const boundary = renderedHeight + sliceHeight;
      const crossing = protectedBlocks.filter((block) =>
        block.top > renderedHeight && block.top < boundary && block.bottom > boundary &&
        block.bottom - block.top <= pageHeightInCanvasPx
      ).sort((a, b) => a.top - b.top)[0];
      if (crossing) {
        sliceHeight = Math.floor(crossing.top - renderedHeight);
        totalsOnNextPage = crossing.totals;
      }

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
      const pageImgHeight = Math.min(
        (sliceHeight * imgWidth) / canvas.width,
        pageHeight - footerHeight - (totalsOnNextPage ? 28 : 0)
      );

      if (pdfPageCount > 0) pdf.addPage();
      pdf.addImage(pageImgData, 'JPEG', 0, 0, imgWidth, pageImgHeight);
      if (totalsOnNextPage) {
        pdf.setFontSize(10);
        pdf.setTextColor(107, 114, 128);
        pdf.text('Totals on Next page', pageWidth - 36, pageImgHeight + 16, { align: 'right' });
      }

      renderedHeight += sliceHeight;
      pdfPageCount += 1;
    }
  }

  // Number after rendering so explicit picture pages and overflow pages share
  // one continuous count. The image height above reserves a clear footer.
  for (let page = 1; page <= pdfPageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128);
    if (version) {
      pdf.setFontSize(8);
      pdf.text(`Revision ${version.revision}. Newer invoice/estimate may be available; verify the current copy in EzBoss.`, pageWidth / 2, pageHeight - 28, { align: 'center' });
      if (version.currentUrl) pdf.textWithLink('Check current copy', pageWidth / 2 - 32, pageHeight - 18, { url: version.currentUrl });
      pdf.setFontSize(9);
    }
    pdf.text(`Page ${page} of ${pdfPageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  return pdf;
}

export async function downloadElementAsPdf(element: HTMLElement, fileName: string, version?: PdfVersion): Promise<void> {
  const pdf = await createElementPdf(element, version);
  pdf.setProperties({ title: fileName.replace(/\.pdf$/i, '') });
  pdf.save(fileName);
}

export function openPdfPreviewWindow(): Window {
  const pdfWindow = window.open('', '_blank');
  if (!pdfWindow) {
    throw new Error('The browser blocked the PDF tab. Please allow popups and try again.');
  }
  return pdfWindow;
}

export async function openElementAsPdfInNewTab(
  element: HTMLElement,
  title: string,
  version?: PdfVersion,
  pdfWindow = openPdfPreviewWindow(),
): Promise<void> {
  try {
    const pdf = await createElementPdf(element, version);
    pdf.setProperties({ title: title.replace(/\.pdf$/i, '') });
    const pdfUrl = URL.createObjectURL(pdf.output('blob'));
    const previewDocument = pdfWindow.document;
    previewDocument.title = title;
    previewDocument.body.style.cssText = 'margin:0;display:flex;flex-direction:column;height:100vh;background:#f3f4f6';
    const download = previewDocument.createElement('a');
    download.href = pdfUrl;
    download.download = title;
    download.textContent = `Download ${title}`;
    download.style.cssText = 'padding:12px 20px;font:14px system-ui;color:#1d4ed8';
    const preview = previewDocument.createElement('iframe');
    preview.src = `${pdfUrl}#toolbar=0`;
    preview.title = title;
    preview.style.cssText = 'flex:1;width:100%;border:0';
    previewDocument.body.replaceChildren(download, preview);
    pdfWindow.addEventListener('pagehide', () => URL.revokeObjectURL(pdfUrl), { once: true });
  } catch (error) {
    pdfWindow.close();
    throw error;
  }
}
