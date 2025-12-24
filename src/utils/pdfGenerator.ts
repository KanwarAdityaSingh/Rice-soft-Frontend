// Utility to generate PDF from HTML content
export async function generatePDFFromHTML(htmlContent: string, title: string): Promise<File> {
  // Create a temporary iframe to render the HTML
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '-9999px';
  iframe.style.width = '800px';
  iframe.style.height = '600px';
  document.body.appendChild(iframe);

  return new Promise((resolve, reject) => {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      reject(new Error('Failed to access iframe document'));
      return;
    }

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              font-size: 12px;
              color: #000;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    iframeDoc.close();

    // Wait for content to load
    setTimeout(() => {
      try {
        // Use window.print() approach - create a blob from the HTML
        const blob = new Blob([iframeDoc.documentElement.outerHTML], { type: 'text/html' });
        const file = new File([blob], `${title}.html`, { type: 'text/html' });
        
        // For actual PDF, we'll use html2pdf.js if available, otherwise return HTML
        // For now, return HTML blob that can be converted server-side
        document.body.removeChild(iframe);
        resolve(file);
      } catch (error) {
        document.body.removeChild(iframe);
        reject(error);
      }
    }, 500);
  });
}

// Alternative: Generate PDF using html2pdf.js (requires library)
export async function generatePDFWithHtml2Pdf(htmlContent: string, title: string): Promise<File | null> {
  try {
    // Dynamic import of html2pdf.js
    const html2pdf = (await import('html2pdf.js')).default;
    
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    element.style.width = '800px';
    element.style.padding = '20px';
    
    const opt = {
      margin: 1,
      filename: `${title}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
    return new File([pdfBlob], `${title}.pdf`, { type: 'application/pdf' });
  } catch (error) {
    console.error('html2pdf.js not available, using fallback:', error);
    return null;
  }
}

// Simple approach: Convert HTML to blob for server-side PDF conversion
export function htmlToBlob(htmlContent: string): Blob {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `;
  return new Blob([html], { type: 'text/html' });
}

