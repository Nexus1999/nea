export const generateLabelsHtml = (htmlContent: string): string => {
  return `
    <html>
      <head>
        <title>Print Labels</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f1f5f9;
            padding: 20px;
            -webkit-print-color-adjust: exact;
          }
          .labels-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            max-width: 210mm;
            margin: 0 auto;
            box-sizing: border-box;
          }
          .label-card {
            border: 2px solid #000;
            border-radius: 12px;
            padding: 16px;
            box-sizing: border-box;
            height: 90mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
            position: relative;
            background-color: #fff;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .label-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .label-header h1 {
            font-size: 11px;
            margin: 0;
            text-transform: uppercase;
            font-weight: 800;
            letter-spacing: 0.5px;
          }
          .label-header h2 {
            font-size: 10px;
            margin: 4px 0 0 0;
            color: #111;
            font-weight: 700;
          }
          .label-body {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 6px;
          }
          .center-info {
            background-color: #f8fafc;
            padding: 8px;
            border-radius: 8px;
            border: 1.5px solid #000;
          }
          .center-code {
            font-size: 20px;
            font-weight: 900;
            text-align: center;
            letter-spacing: 1px;
          }
          .center-name {
            font-size: 11px;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            margin-top: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 11px;
          }
          .meta-item {
            border: 1px solid #cbd5e1;
            padding: 6px;
            border-radius: 6px;
          }
          .meta-label {
            font-size: 8px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: bold;
          }
          .meta-value {
            font-weight: bold;
            font-size: 11px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .items-box {
            border: 1.5px solid #000;
            border-radius: 8px;
            padding: 8px;
            background-color: #fafafa;
          }
          .items-title {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            padding-bottom: 4px;
            margin-bottom: 6px;
          }
          .items-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            font-size: 10px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px dashed #e2e8f0;
            padding-bottom: 2px;
          }
          .item-row:last-child {
            border-bottom: none;
          }
          .item-name {
            font-weight: 600;
          }
          .item-qty {
            font-weight: 800;
          }
          .label-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1.5px solid #000;
            padding-top: 8px;
            margin-top: 6px;
          }
          .box-indicator {
            background-color: #000;
            color: #fff;
            padding: 6px 12px;
            font-weight: 900;
            font-size: 14px;
            border-radius: 6px;
            text-align: center;
            min-width: 90px;
          }
          .category-badge {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            border: 1.5px solid #000;
            padding: 4px 10px;
            border-radius: 9999px;
            background-color: #fff;
          }
          @media print {
            body {
              background-color: white;
              padding: 0;
            }
            .labels-container {
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .label-card {
              page-break-inside: avoid;
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="labels-container">
          ${htmlContent}
        </div>
      </body>
    </html>
  `;
};

export const printLabels = (htmlContent: string) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print labels.");
    return;
  }

  printWindow.document.write(generateLabelsHtml(htmlContent));
  printWindow.document.close();
  
  // Trigger print once loaded
  printWindow.onload = function() {
    printWindow.print();
    setTimeout(function() { printWindow.close(); }, 500);
  };
};