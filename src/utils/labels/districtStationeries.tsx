// No external dependencies required.
// The QR code uses quickchart.io – a free, reliable HTTPS service.

export const renderDistrictStationeriesLabels = (
  labels: any[],
  examCode: string,
  examYear: string
): string => {
  // Helper: generate QR code URL (encodes all relevant fields)
  const generateQRData = (label: any): string => {
    const payload = [
      `EXAM:${examCode}`,
      `YEAR:${examYear}`,
      `REGION:${label.region || ""}`,
      `DISTRICT:${label.district || ""}`,
      `ITEM:${label.item || ""}`,
      `QTY:${label.quantity || 0}`,
      `BOX:${label.container_number}/${label.total_containers}`,
    ].join(" | ");
    return `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=120&margin=2&ecLevel=M`;
  };

  const singleLabel = (label: any) => {
    const qrUrl = generateQRData(label);

    return `
      <div class="label-card">
        <!-- Top badge: exam code + year -->
        <div class="exam-badge">${examCode} • ${examYear}</div>

        <!-- Region (prominent with Elephant font) -->
        <div class="region">${label.region || "N/A"}</div>

        <!-- District -->
        <div class="district">${label.district || "N/A"}</div>

        <!-- Item code + quantity (side by side) -->
        <div class="item-quantity-panel">
          <div class="item-box">
            <div class="label-small">ITEM CODE</div>
            <div class="item-value">${label.item || "N/A"}</div>
          </div>
          <div class="qty-box">
            <div class="label-small">QUANTITY</div>
            <div class="qty-value">${label.quantity || 0}</div>
          </div>
        </div>

        <!-- Bottom row: box number + QR (no text under QR) -->
        <div class="bottom-row">
          <div class="box-number">
            <div class="label-small">BOX NUMBER</div>
            <div class="box-value">${label.container_number}/${label.total_containers}</div>
          </div>
          <div class="qr-wrapper">
            <img src="${qrUrl}" alt="QR Code" />
          </div>
        </div>
      </div>
    `;
  };

  // Build the full HTML document with print‑optimised CSS
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>District Stationery Labels</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          /* Hide browser print headers/footers (URL, date, page numbers) */
          @media print {
            @page {
              margin: 0;
              size: A4 portrait;
            }
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
            .no-print {
              display: none;
            }
            /* Ensure background colours print (for high contrast) */
            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }

          body {
            background: #e5e7eb;
            font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 0;
            margin: 0;
          }

          /* Each page container holds exactly two labels and a cut line, sized to standard A4 */
          .page-container {
            width: 210mm;
            height: 297mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
            background: white;
            padding: 10mm 12mm;
            box-sizing: border-box;
          }

          /* Single label card – sized perfectly to fit two on A4 with margins */
          .label-card {
            border: 2px solid #0f172a;
            border-radius: 24px;
            background: white;
            padding: 18px 24px 22px 24px;
            height: 122mm;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            transition: none;
            position: relative;
            box-sizing: border-box;
          }

          /* Top decorative line (black & white friendly) */
          .label-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 24px;
            right: 24px;
            height: 5px;
            background: #0f172a;
            border-radius: 4px 4px 0 0;
          }

          .exam-badge {
            background: #f1f5f9;
            border: 1.5px solid #cbd5e1;
            border-radius: 40px;
            padding: 8px 22px;
            font-size: 16px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #0f172a;
            text-align: center;
            margin-bottom: 12px;
            align-self: center;
          }

          .region {
            font-family: 'Elephant', 'Impact', 'Georgia', serif;
            font-size: 56px;
            font-weight: 900;
            text-transform: uppercase;
            color: #0f172a;
            text-align: center;
            letter-spacing: -0.5px;
            margin-bottom: 6px;
            line-height: 1.1;
          }

          .district {
            font-size: 38px;
            font-weight: 900;
            text-transform: uppercase;
            color: #1e293b;
            text-align: center;
            margin-bottom: 16px;
            line-height: 1.2;
            word-break: break-word;
          }

          .item-quantity-panel {
            display: flex;
            flex-direction: row;
            border-radius: 18px;
            border: 2px solid #cbd5e1;
            background: #f8fafc;
            margin-bottom: 16px;
            overflow: hidden;
          }

          .item-box, .qty-box {
            flex: 1;
            padding: 14px 10px;
            text-align: center;
            background: white;
          }

          .item-box {
            border-right: 2px solid #cbd5e1;
          }

          .label-small {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #334155;
            margin-bottom: 8px;
          }

          .item-value, .qty-value {
            font-size: 44px;
            font-weight: 900;
            color: #0f172a;
            line-height: 1;
          }

          .bottom-row {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-top: auto;
          }

          .box-number {
            flex: 1;
            background: #f1f5f9;
            border: 1.5px solid #cbd5e1;
            border-radius: 18px;
            padding: 10px 14px;
            text-align: center;
          }

          .box-value {
            font-size: 36px;
            font-weight: 900;
            font-family: monospace;
            color: #0f172a;
            line-height: 1;
          }

          .qr-wrapper {
            background: white;
            border: 1.5px solid #cbd5e1;
            border-radius: 18px;
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .qr-wrapper img {
            width: 80px;
            height: auto;
            display: block;
          }

          /* Cut line between labels */
          .cut-line {
            border-top: 2px dashed #475569;
            width: 100%;
            margin: 10px 0;
            position: relative;
            text-align: center;
          }

          .cut-line span {
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 0 20px;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #1e293b;
            font-family: monospace;
          }

          /* Ensure no extra text anywhere */
          body, div, span, p {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        </style>
      </head>
      <body>
        ${labels
          .map((label) => {
            return `
              <div class="page-container">
                ${singleLabel(label)}
                <div class="cut-line"><span>✂️ CUT HERE — SEPARATE LABELS ✂️</span></div>
                ${singleLabel(label)}
              </div>
            `;
          })
          .join("")}
      </body>
    </html>
  `;
};