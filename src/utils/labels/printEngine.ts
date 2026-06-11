export const printLabels = (htmlContent: string) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print labels.");
    return;
  }

  printWindow.document.write(`
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
            background-color: white;
            -webkit-print-color-adjust: exact;
          }
          .labels-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            box-sizing: border-box;
          }
          .label-card {
            border: 2px solid #000;
            border-radius: 8px;
            padding: 12px;
            box-sizing: border-box;
            height: 85mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
            position: relative;
            background-color: #fff;
          }
          .label-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 4px;
            margin-bottom: 6px;
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
            margin: 2px 0 0 0;
            color: #111;
            font-weight: 700;
          }
          .label-body {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 4px;
          }
          .center-info {
            background-color: #f3f4f6;
            padding: 6px;
            border-radius: 6px;
            border: 1px solid #000;
          }
          .center-code {
            font-size: 18px;
            font-weight: 900;
            text-align: center;
            letter-spacing: 1px;
          }
          .center-name {
            font-size: 10px;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            margin-top: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            font-size: 10px;
          }
          .meta-item {
            border: 1px solid #ccc;
            padding: 4px;
            border-radius: 4px;
          }
          .meta-label {
            font-size: 8px;
            text-transform: uppercase;
            color: #666;
            font-weight: bold;
          }
          .meta-value {
            font-weight: bold;
            font-size: 10px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .items-box {
            border: 1.5px solid #000;
            border-radius: 6px;
            padding: 6px;
            background-color: #fafafa;
          }
          .items-title {
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
            margin-bottom: 4px;
          }
          .items-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px;
            font-size: 9px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px dashed #ddd;
            padding-bottom: 1px;
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
            padding-top: 6px;
            margin-top: 4px;
          }
          .box-indicator {
            background-color: #000;
            color: #fff;
            padding: 4px 8px;
            font-weight: 900;
            font-size: 13px;
            border-radius: 4px;
            text-align: center;
            min-width: 80px;
          }
          .category-badge {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            border: 1.5px solid #000;
            padding: 3px 8px;
            border-radius: 9999px;
            background-color: #fff;
          }
          @media print {
            .labels-container {
              grid-template-columns: 1fr 1fr;
            }
            .label-card {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="labels-container">
          ${htmlContent}
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};