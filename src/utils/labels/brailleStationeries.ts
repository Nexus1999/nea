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
      `SHEETS:${label.quantity || 0}`,
      `BKM:${label.bkm || 0}`,
      `ENVELOPE:${label.container_number}/${label.total_containers}`,
    ].join(" | ");
    return `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=120&margin=2&ecLevel=M`;
  };

  const singleLabel = (label: any) => {
    const qrUrl = generateQRData(label);
    const regionName = (label.region || "N/A").toUpperCase();
    const regionFontSize = regionName === "DAR ES SALAAM" ? "44px" : "50px";

    return `
      <div class="label-card">
        <!-- Corner Marks -->
        <div class="corner-tl"></div>
        <div class="corner-tr"></div>
        <div class="corner-bl"></div>
        <div class="corner-br"></div>

        <!-- Watermark -->
        <div class="watermark">${examCode}</div>

        <!-- Top Header Badge -->
        <div class="exam-badge">
           <span class="badge-exam">${examCode}</span>
           <span class="badge-year">${examYear}</span>
        </div>

        <!-- Region & District -->
        <div class="region" style="font-size: ${regionFontSize};">${regionName}</div>
        <div class="district">${(label.district || "N/A").toUpperCase()}</div>

        <!-- Center Info & Item Details -->
        <div class="center-info">
          <div class="center-number">${label.center_number || "N/A"}</div>
          <div class="center-name">${(label.center_name || "N/A").toUpperCase()}</div>
          
          <table class="contents-table">
            <tbody>
              <tr>
                <td class="item-name">BRAILLE SHEETS</td>
                <td class="item-qty">${label.quantity || 0}</td>
              </tr>
              <tr>
                <td class="item-name">BRAILLE BKM</td>
                <td class="item-qty">${label.bkm || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Bottom row: envelope number + QR -->
        <div class="bottom-row">
          <div class="envelope-badge">
            <div class="envelope-title">ENVELOPE</div>
            <div class="envelope-value">${label.container_number}/${label.total_containers}</div>
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
            background: #f8fafc;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
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
            padding: 12mm 14mm;
            box-sizing: border-box;
          }

          .page-container:last-child {
            page-break-after: avoid;
          }

          .label-card {
            border: 2px solid #0f172a;
            border-radius: 20px;
            background: white;
            padding: 20px 24px;
            height: 120mm;
            display: flex;
            flex-direction: column;
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
          }

          /* Left accent bar for a modern look */
          .label-card::before {
            content: '';
            position: absolute;
            top: 20px;
            bottom: 20px;
            left: 0;
            width: 6px;
            background: #0f172a;
            border-radius: 0 4px 4px 0;
          }

          .corner-tl { top: 10px; left: 10px; border-top: 3px solid #0f172a; border-left: 3px solid #0f172a; position: absolute; width: 14px; height: 14px; }
          .corner-tr { top: 10px; right: 10px; border-top: 3px solid #0f172a; border-right: 3px solid #0f172a; position: absolute; width: 14px; height: 14px; }
          .corner-bl { bottom: 10px; left: 10px; border-bottom: 3px solid #0f172a; border-left: 3px solid #0f172a; position: absolute; width: 14px; height: 14px; }
          .corner-br { bottom: 10px; right: 10px; border-bottom: 3px solid #0f172a; border-right: 3px solid #0f172a; position: absolute; width: 14px; height: 14px; }

          .watermark {
            position: absolute;
            right: 24px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 130px;
            font-weight: 900;
            color: rgba(15, 23, 42, 0.03);
            pointer-events: none;
            z-index: 0;
            user-select: none;
          }

          .exam-badge {
            display: flex;
            gap: 8px;
            align-self: center;
            margin-bottom: 10px;
            z-index: 1;
          }

          .exam-badge span {
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .badge-exam {
            background: #0f172a;
            color: white;
          }

          .badge-year {
            border: 1.5px solid #0f172a;
            color: #0f172a;
          }

          .region {
            font-family: 'Inter', system-ui, sans-serif;
            font-weight: 900;
            text-transform: uppercase;
            color: #0f172a;
            text-align: center;
            letter-spacing: -0.5px;
            margin-bottom: 2px;
            line-height: 1.1;
            z-index: 1;
          }

          .district {
            font-size: 30px;
            font-weight: 700;
            text-transform: uppercase;
            color: #475569;
            text-align: center;
            margin-bottom: 10px;
            line-height: 1.2;
            word-break: break-word;
            letter-spacing: 0.5px;
            z-index: 1;
          }

          .center-info {
            display: flex;
            flex-direction: column;
            align-items: center;
            border-radius: 16px;
            border: 1.5px solid #e2e8f0;
            padding: 12px 18px;
            margin-bottom: 12px;
            z-index: 1;
            background: #f8fafc;
          }

          .center-number {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 2px;
            letter-spacing: 0.5px;
          }

          .center-name {
            font-size: 15px;
            font-weight: 700;
            color: #334155;
            text-transform: uppercase;
            text-align: center;
            margin-bottom: 10px;
            line-height: 1.3;
          }

          .contents-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
          }

          .contents-table td {
            padding: 6px 0;
            font-size: 14px;
            color: #0f172a;
            border-bottom: 1px dashed #cbd5e1;
          }

          .contents-table tr:last-child td {
            border-bottom: none;
          }

          .item-name {
            text-align: left;
            font-weight: 700;
            color: #475569;
            letter-spacing: 0.5px;
          }

          .item-qty {
            text-align: right;
            font-weight: 800;
            font-size: 16px;
            color: #0f172a;
          }

          .bottom-row {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-top: auto;
            z-index: 1;
          }

          .envelope-badge {
            flex: 1;
            background: #f8fafc;
            border: 1.5px solid #0f172a;
            border-radius: 14px;
            padding: 8px 12px;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }

          .envelope-title {
            font-size: 11px;
            font-weight: 800;
            color: #475569;
            letter-spacing: 1.5px;
            margin-bottom: 2px;
          }

          .envelope-value {
            font-size: 44px;
            font-weight: 900;
            letter-spacing: -1px;
            line-height: 1;
            color: #0f172a;
          }

          .qr-wrapper {
            background: white;
            border: 1.5px solid #e2e8f0;
            padding: 8px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .qr-wrapper img {
            width: 72px;
            height: auto;
            display: block;
          }

          .cut-line {
            border-top: 2px dashed #cbd5e1;
            width: 100%;
            margin: 8px 0;
            position: relative;
            text-align: center;
          }

          .cut-line span {
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 0 16px;
            font-size: 9px;
            letter-spacing: 3px;
            font-weight: 700;
            text-transform: uppercase;
            color: #94a3b8;
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