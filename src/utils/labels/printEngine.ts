"use client";

/**
 * Generates the full HTML wrapper for printing labels.
 * Includes a beautiful, modern floating action bar with a download/print button
 * that is automatically hidden when printing.
 */
export function generateLabelsHtml(contentHtml: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Print Labels</title>
      <style>
        /* Global Styles */
        body {
          margin: 0;
          padding: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #f1f5f9;
          color: #1e293b;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* Floating Action Bar */
        .action-bar {
          position: fixed;
          top: 16px;
          right: 16px;
          display: flex;
          gap: 12px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          padding: 10px 16px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(226, 232, 240, 0.8);
          z-index: 99999;
          transition: all 0.2s ease;
        }

        .action-bar:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
        }

        .action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease;
        }

        .btn-primary {
          background-color: #0f172a;
          color: #ffffff;
        }

        .btn-primary:hover {
          background-color: #1e293b;
        }

        .btn-secondary {
          background-color: #ffffff;
          color: #334155;
          border: 1px solid #cbd5e1;
        }

        .btn-secondary:hover {
          background-color: #f8fafc;
          border-color: #94a3b8;
        }

        /* Label Container */
        .labels-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          padding: 60px 40px 40px 40px;
          max-width: 1000px;
          margin: 0 auto;
        }

        /* Print Specific Styles */
        @media print {
          body {
            background-color: #ffffff;
          }
          .no-print {
            display: none !important;
          }
          .labels-container {
            padding: 0 !important;
            margin: 0 !important;
            gap: 0 !important;
            display: block !important;
          }
          .label-card {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 20px;
          }
        }
      </style>
    </head>
    <body>
      <!-- Floating Action Bar (Hidden during print) -->
      <div class="action-bar no-print">
        <button class="action-btn btn-secondary" onclick="window.print()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Print Labels
        </button>
        <button class="action-btn btn-primary" onclick="downloadAsHtml()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Download HTML
        </button>
      </div>

      <div class="labels-container">
        ${contentHtml}
      </div>

      <script>
        function downloadAsHtml() {
          const htmlContent = document.documentElement.outerHTML;
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'NECTA_Labels_' + new Date().toISOString().slice(0,10) + '.html';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      </script>
    </body>
    </html>
  `;
}