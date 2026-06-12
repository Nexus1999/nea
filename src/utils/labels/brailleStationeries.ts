import { abbreviateSchoolName } from "./abbreviate";

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
      `BOX:${label.container_number}/${label.total_containers}`,
    ].join(" | ");
    return `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=120&margin=2&ecLevel=M`;
  };

  const singleLabel = (label: any) => {
    const qrUrl = generateQRData(label);
    const regionName = (label.region || "N/A").toUpperCase();
    const regionFontSize = regionName === "DAR ES SALAAM" ? "42px" : "48px";
    const districtName = (label.district || "N/A").toUpperCase();
    const centerNumberRaw = label.center_number || "N/A";
    const abbreviatedCenter = abbreviateSchoolName(label.center_name).toUpperCase();
    const sheetsQty = label.quantity || 0;
    const bkmQty = label.bkm || 0;
    const containerNum = label.container_number || "?";
    const totalContainers = label.total_containers || "?";

    return `
      <div class="label-card">
        <div class="corner-tl"></div>
        <div class="corner-tr"></div>
        <div class="corner-bl"></div>
        <div class="corner-br"></div>
        <div class="watermark">${examCode}</div>

        <div class="top-row">
          <div class="exam-badge-left"><span>${examCode}-${examYear}</span></div>
          <div class="center-badge-right"><span>${centerNumberRaw}</span></div>
        </div>

        <div class="region" style="font-size: ${regionFontSize};">${regionName}</div>
        <div class="district">${districtName}</div>
        <div class="center-abbr">${abbreviatedCenter}</div>

        <div class="stats-vertical">
          <div class="stat-item">
            <span class="stat-label">📄 BRAILLE SHEETS</span>
            <span class="stat-value">${sheetsQty}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">🔍 BRAILLE BKM</span>
            <span class="stat-value">${bkmQty}</span>
          </div>
        </div>

        <div class="bottom-row">
          <div class="box-number">
            <div class="box-value">${containerNum}/${totalContainers}</div>
          </div>
          <div class="qr-wrapper">
            <img src="${qrUrl}" alt="QR Code" />
          </div>
        </div>
      </div>
    `;
  };

  // Group labels into pages of 2
  const pages: string[] = [];
  for (let i = 0; i < labels.length; i += 2) {
    const firstLabel = singleLabel(labels[i]);
    const secondLabel = i + 1 < labels.length ? singleLabel(labels[i + 1]) : null;
    const cutLine = secondLabel ? `<div class="cut-line"><span>CUT HERE</span></div>` : '';
    pages.push(`
      <div class="page-container">
        ${firstLabel}
        ${cutLine}
        ${secondLabel || ''}
      </div>
    `);
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Braille Stationeries Labels (2 per page)</title>
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
              page-break-after: always;
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
            font-family: 'Inter', 'Segoe UI', system-ui, Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 0;
            margin: 0;
            font-variant-numeric: tabular-nums;
          }
          .page-container {
            width: 210mm;
            height: 297mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: white;
            padding: 10mm 12mm;
            box-sizing: border-box;
            overflow: hidden;
          }
          .label-card {
            border: 2px solid #0f172a;
            border-radius: 20px;
            background: white;
            padding: 14px 20px;
            height: 112mm;
            display: flex;
            flex-direction: column;
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
          }
          .label-card::before {
            content: '';
            position: absolute;
            top: 20px;
            bottom: 20px;
            left: 0;
            width: 5px;
            background: #0f172a;
            border-radius: 0 4px 4px 0;
          }
          .corner-tl { top: 10px; left: 10px; border-top: 3px solid #0f172a; border-left: 3px solid #0f172a; position: absolute; width: 14px; height: 14px; }
          .corner-tr { top: 10px; right: 10px; border-top: 3px solid #0f172a; border-right: 3px solid #0f172a; position: absolute; width: 14px; height: 14px; }
          .corner-bl { bottom: 10px; left: 10px; border-bottom: 3px solid #0f172a; border-left: 3px solid #0f172a; position: absolute; width: 14px; height: 14px; }
          .corner-br { bottom: 10px; right: 10px; border-bottom: 3px solid #0f172a; border-right: 3px solid #0f172a; position: absolute; width: 14px; height: 14px; }
          .watermark {
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 120px;
            font-weight: 900;
            color: rgba(15, 23, 42, 0.03);
            pointer-events: none;
            user-select: none;
          }
          .top-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            z-index: 2;
          }
          .exam-badge-left {
            border: 1.5px solid #cbd5e1;
            border-radius: 60px;
            padding: 3px 10px;
          }
          .exam-badge-left span {
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #0f172a;
          }
          .center-badge-right {
            background: #0f172a;
            border-radius: 48px;
            padding: 3px 14px;
          }
          .center-badge-right span {
            font-size: 14px;
            font-weight: 900;
            color: white;
            letter-spacing: 1px;
          }
          .region {
            font-family: 'Elephant', 'Impact', 'Georgia', serif;
            font-weight: 900;
            text-transform: uppercase;
            color: #0f172a;
            text-align: center;
            letter-spacing: -0.3px;
            margin-bottom: 2px;
            line-height: 1.1;
          }
          .district {
            font-size: 28px;
            font-weight: 900;
            text-transform: uppercase;
            color: #1e293b;
            text-align: center;
            margin-bottom: 6px;
            line-height: 1.2;
            word-break: break-word;
          }
          .center-abbr {
            text-align: center;
            font-size: 18px;
            font-weight: 800;
            text-transform: uppercase;
            background: #f1f5f9;
            display: inline-block;
            margin: 0 auto 8px auto;
            padding: 3px 12px;
            border-radius: 48px;
            color: #0c4a6e;
            letter-spacing: 1px;
            border: 1px solid #cbd5e1;
            max-width: 90%;
            word-break: break-word;
          }
          .stats-vertical {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 8px;
          }
          .stat-item {
            background: #fef9e3;
            border-radius: 14px;
            border-left: 4px solid #0f172a;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 12px;
          }
          .stat-label {
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            color: #1e293b;
          }
          .stat-value {
            font-size: 20px;
            font-weight: 900;
            font-family: monospace;
            color: #0f172a;
            background: white;
            padding: 2px 10px;
            border-radius: 44px;
            min-width: 60px;
            text-align: center;
            border: 1px solid #cbd5e1;
          }
          .bottom-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-top: auto;
          }
          .box-number {
            flex: 1;
            border: 1.5px solid #cbd5e1;
            border-radius: 14px;
            padding: 8px 10px;
            text-align: center;
            background: #ffffffcc;
          }
          .box-value {
            font-size: 60px;
            font-weight: 900;
            letter-spacing: -2px;
            line-height: 0.95;
            color: #0f172a;
          }
          .qr-wrapper {
            background: white;
            border: 1.5px solid #cbd5e1;
            padding: 6px;
            border-radius: 14px;
          }
          .qr-wrapper img {
            width: 70px;
            height: auto;
            display: block;
          }
          .cut-line {
            border-top: 2px dashed #475569;
            width: 100%;
            position: relative;
            text-align: center;
            margin: 2px 0;
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
        ${pages.join("")}
      </body>
    </html>
  `;
};