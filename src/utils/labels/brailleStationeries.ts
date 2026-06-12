export const renderBrailleStationeriesLabels = (
  labels: any[],
  examCode: string,
  examYear: string
): string => {
  const generateQRData = (label: any): string => {
    const payload = [
      `EXAM:${examCode}`,
      `YEAR:${examYear}`,
      `REGION:${label.region || ""}`,
      `DISTRICT:${label.district || ""}`,
      `CENTER:${label.center_number || ""} - ${label.center_name || ""}`,
      `QTY:${label.quantity || 0}`,
      `BOX:${label.container_number}/${label.total_containers}`,
    ].join(" | ");
    return `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=120&margin=2&ecLevel=M`;
  };

  const singleLabel = (label: any) => {
    const qrUrl = generateQRData(label);

    return `
      <div class="label-card">
        <!-- Corner Marks -->
        <div class="corner-tl"></div>
        <div class="corner-tr"></div>
        <div class="corner-bl"></div>
        <div class="corner-br"></div>

        <!-- Watermark -->
        <div class="watermark">${examCode}</div>

        <!-- Top badge: exam code + year -->
        <div class="exam-badge">
           <span>${examCode}</span>
           <span>${examYear}</span>
        </div>

        <!-- Region & District -->
        <div class="region">${label.region || "N/A"}</div>
        <div class="district">${label.district || "N/A"}</div>

        <!-- Center Info & Item Details -->
        <div class="center-info">
          <div class="center-number">${label.center_number || "N/A"}</div>
          <div class="center-name">${label.center_name || "N/A"}</div>
          <div class="item-badge">BRAILLE SHEETS: ${label.quantity || 0}</div>
        </div>

        <!-- Bottom row: box number + QR -->
        <div class="bottom-row">
          <div class="box-number">
            <div class="box-value">BOX ${label.container_number}/${label.total_containers}</div>
          </div>
          <div class="qr-wrapper">
            <img src="${qrUrl}" alt="QR Code" />
          </div>
        </div>
      </div>
    `;
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Braille Stationeries Labels</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

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
            .page-container {
              page-break-inside: avoid;
            }
            .page-container:last-child {
              page-break-after: avoid;
            }
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
            text-rendering: geometricPrecision;
            font-variant-numeric: tabular-nums;
          }

          .page-container {
            width: 210mm;
            height: 297mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
            page-break-inside: avoid;
            background: white;
            padding: 10mm 12mm;
            box-sizing: border-box;
          }

          .page-container:last-child {
            page-break-after: avoid;
          }

          .label-card {
            border: 2px solid #0f172a;
            border-radius: 24px;
            background: white;
            padding: 18px 24px 22px 24px;
            height: 122mm;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
          }

          .label-card::before {
            content: '';
            position: absolute;
            top: 24px;
            bottom: 24px;
            left: 0;
            width: 5px;
            background: #0f172a;
            border-radius: 0 4px 4px 0;
          }

          .corner-tl { top: 12px; left: 12px; border-top: 3px solid #0f172a; border-left: 3px solid #0f172a; position: absolute; width: 16px; height: 16px; }
          .corner-tr { top: 12px; right: 12px; border-top: 3px solid #0f172a; border-right: 3px solid #0f172a; position: absolute; width: 16px; height: 16px; }
          .corner-bl { bottom: 12px; left: 12px; border-bottom: 3px solid #0f172a; border-left: 3px solid #0f172a; position: absolute; width: 16px; height: 16px; }
          .corner-br { bottom: 12px; right: 12px; border-bottom: 3px solid #0f172a; border-right: 3px solid #0f172a; position: absolute; width: 16px; height: 16px; }

          .watermark {
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 140px;
            font-weight: 900;
            color: rgba(15, 23, 42, 0.03);
            pointer-events: none;
            z-index: 0;
            user-select: none;
          }

          .exam-badge {
            display: flex;
            gap: 14px;
            align-self: center;
            margin-bottom: 12px;
          }

          .exam-badge span {
            padding: 6px 14px;
            border-radius: 999px;
            background: transparent;
            border: 1.5px solid #cbd5e1;
            font-size: 16px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #0f172a;
          }

          .region {
            font-family: 'Elephant', 'Impact', 'Georgia', serif;
            font-size: 56px;
            font-weight: 900;
            text-transform: uppercase;
            color: #0f172a;
            text-align: center;
            letter-spacing: -0.5px;
            margin-bottom: 4px;
            line-height: 1.1;
            z-index: 1;
          }

          .district {
            font-size: 36px;
            font-weight: 900;
            text-transform: uppercase;
            color: #1e293b;
            text-align: center;
            margin-bottom: 12px;
            line-height: 1.2;
            word-break: break-word;
            letter-spacing: 0.5px;
            z-index: 1;
          }

          .center-info {
            display: flex;
            flex-direction: column;
            align-items: center;
            border-radius: 18px;
            border: 2px solid #cbd5e1;
            padding: 12px;
            margin-bottom: 16px;
            z-index: 1;
          }

          .center-number {
            font-size: 32px;
            font-weight: 900;
            color: #0f172a;
            margin-bottom: 4px;
          }

          .center-name {
            font-size: 20px;
            font-weight: 800;
            color: #334155;
            text-transform: uppercase;
            text-align: center;
            margin-bottom: 8px;
          }

          .item-badge {
            font-size: 16px;
            font-weight: 900;
            color: #0f172a;
            background: #f1f5f9;
            padding: 4px 12px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
          }

          .bottom-row {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-top: auto;
            z-index: 1;
          }

          .box-number {
            flex: 1;
            background: transparent;
            border: 1.5px solid #cbd5e1;
            border-radius: 18px;
            padding: 10px 14px;
            text-align: center;
          }

          .box-value {
            font-size: 72px;
            font-weight: 900;
            letter-spacing: -2px;
            line-height: 0.95;
            color: #0f172a;
            font-variant-numeric: tabular-nums;
          }

          .qr-wrapper {
            background: white;
            border: 1.5px solid #cbd5e1;
            box-shadow:
              0 1px 3px rgba(0,0,0,.05),
              inset 0 1px 0 rgba(255,255,255,.8);
            padding: 10px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .qr-wrapper img {
            width: 80px;
            height: auto;
            display: block;
          }

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
            font-size: 9px;
            letter-spacing: 4px;
            font-weight: 800;
            text-transform: uppercase;
            color: #1e293b;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        ${labels
          .map((label) => {
            return `
              <div class="page-container">
                ${singleLabel(label)}
                <div class="cut-line"><span>CUT HERE</span></div>
                ${singleLabel(label)}
              </div>
            `;
          })
          .join("")}
      </body>
    </html>
  `;
};