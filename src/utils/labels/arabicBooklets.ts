import { abbreviateSchoolName } from "./abbreviate";

export const renderArabicBookletsLabels = (
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
    const regionName = (label.region || "N/A").toUpperCase();
    const regionFontSize = regionName === "DAR ES SALAAM" ? "50px" : "50px";
    const districtName = (label.district || "N/A").toUpperCase();
    const centerNumberRaw = label.center_number || "N/A";
    const abbreviatedCenter = abbreviateSchoolName(label.center_name).toUpperCase();
    const qty = label.quantity || 0;
    const containerNum = label.container_number || "?";
    const totalContainers = label.total_containers || "?";

    return `
      <div class="label-card">
        <!-- Classic Corner Accents -->
        <div class="corner-tl"></div>
        <div class="corner-tr"></div>
        <div class="corner-bl"></div>
        <div class="corner-br"></div>
        <div class="watermark">${examCode}</div>

        <!-- Top Header Row -->
        <div class="top-row">
          <div class="exam-badge-left">
            <span>${examCode}-${examYear}</span>
          </div>
          <div class="center-badge-right">
            <span>${centerNumberRaw}</span>
          </div>
        </div>

        <!-- Region & District -->
        <div class="region" style="font-size: ${regionFontSize};">${regionName}</div>
        <div class="district">${districtName}</div>
        <div class="center-abbr">${abbreviatedCenter}</div>

        <!-- Enlarged & Beautiful Classic Stats Block (TR Design) -->
        <div class="stationery-grid">
          <div class="stationery-item arabic-item">
            <div class="item-info">
              <span class="item-label-tr">ARABIC BOOKLETS</span>
            </div>
            <div class="item-value-tr">${qty}</div>
          </div>
        </div>

        <!-- Bottom Row: Box Number & QR Code -->
        <div class="bottom-row">
          <div class="box-number-container">
            <div class="box-value-tr">${containerNum}/${totalContainers}</div>
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
    const cutLine = secondLabel ? `<div class="cut-line"><span></span></div>` : '';
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
        <title>Arabic Booklets Labels (2 per page)</title>
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
            background: #e2e8f0;
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
            border: 3px double #000;
            border-radius: 24px;
            background: #fffdf9;
            padding: 18px 24px;
            height: 122mm;
            display: flex;
            flex-direction: column;
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
          }
          
          /* Corner accents & watermark */
          .corner-tl { top: 10px; left: 10px; border-top: 3px solid #000; border-left: 3px solid #000; position: absolute; width: 16px; height: 16px; }
          .corner-tr { top: 10px; right: 10px; border-top: 3px solid #000; border-right: 3px solid #000; position: absolute; width: 16px; height: 16px; }
          .corner-bl { bottom: 10px; left: 10px; border-bottom: 3px solid #000; border-left: 3px solid #000; position: absolute; width: 16px; height: 16px; }
          .corner-br { bottom: 10px; right: 10px; border-bottom: 3px solid #000; border-right: 3px solid #000; position: absolute; width: 16px; height: 16px; }
          .watermark {
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 130px;
            font-weight: 900;
            color: rgba(0, 0, 0, 0.02);
            pointer-events: none;
            user-select: none;
            z-index: 0;
          }

          .top-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            z-index: 2;
          }
          .exam-badge-left {
            border: 1.5px solid #000;
            border-radius: 60px;
            padding: 4px 14px;
            background: white;
          }
          .exam-badge-left span {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #000;
          }
          .center-badge-right {
            background: #000;
            border-radius: 48px;
            padding: 5px 20px;
          }
          .center-badge-right span {
            font-size: 22px;
            font-weight: 900;
            color: white;
            letter-spacing: 1.5px;
          }

          .region {
            font-family: 'Elephant', 'Impact', 'Georgia', serif;
            font-weight: 900;
            text-transform: uppercase;
            color: #000;
            text-align: center;
            letter-spacing: -0.5px;
            margin-bottom: 4px;
            line-height: 1.1;
            z-index: 2;
          }
          .district {
            font-size: 35px;
            font-weight: 900;
            text-transform: uppercase;
            color: #000;
            text-align: center;
            margin-bottom: 8px;
            line-height: 1.2;
            word-break: break-word;
            letter-spacing: 0.5px;
            z-index: 2;
          }
          .center-abbr {
            text-align: center;
            font-size: 25px;
            font-weight: 800;
            text-transform: uppercase;
            background: #f1f5f9;
            display: inline-block;
            margin: 0 auto 12px auto;
            padding: 6px 16px;
            border-radius: 48px;
            color: #000;
            letter-spacing: 1px;
            border: 1.5px solid #000;
            max-width: 90%;
            word-break: break-word;
            z-index: 2;
          }

          /* STATIONERY ROW SYSTEM (TR Design) */
          .stationery-grid {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
            margin-bottom: 10px;
            margin-top: 10px;
            z-index: 2;
          }
          .stationery-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 14px;
            background: #ffffff;
            border-radius: 14px;
            border: 2px solid #000000;
            position: relative;
            overflow: hidden;
            flex: 1;
          }
          .arabic-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 6px;
            background: #059669; /* Emerald Green maintained */
          }
          .item-info {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .item-label-tr {
            font-size: 38px;
            font-weight: 800;
            color: #000000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .item-value-tr {
            font-size: 64px;
            font-weight: 900;
            color: #000000;
            font-family: 'Courier New', monospace;
            background: #ffffff;
            padding: 4px 14px;
            border: 1.5px solid #000;
            border-radius: 12px;
            min-width: 65px;
            text-align: center;
          }

          .bottom-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-top: auto;
            z-index: 2;
          }
          .box-number-container {
            flex: 1;
            border: 2px solid #000;
            border-radius: 16px;
            padding: 8px 12px;
            text-align: center;
            background: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .box-value-tr {
            font-size: 58px;
            font-weight: 900;
            letter-spacing: -2px;
            line-height: 0.95;
            color: #000;
            font-variant-numeric: tabular-nums;
            font-family: 'arial', 'Georgia', serif;
          }
          .qr-wrapper {
            background: white;
            border: 2px solid #000;
            padding: 6px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .qr-wrapper img {
            width: 68px;
            height: 68px;
            display: block;
          }

          .cut-line {
            border-top: 2px dashed #000;
            width: 100%;
            position: relative;
            text-align: center;
            margin: 4px 0;
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
            color: #000;
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