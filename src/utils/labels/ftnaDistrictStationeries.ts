import { abbreviateSchoolName } from "./abbreviate";

export const renderFtnaDistrictStationeriesLabels = (
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
      label.bkm_red ? `RED:${label.bkm_red}` : "",
      label.bkm_pink ? `PINK:${label.bkm_pink}` : "",
      `ITEM:${label.item || ""}`,
      `QTY:${label.quantity || 0}`,
      `BOX:${label.container_number}/${label.total_containers}`,
    ].filter(Boolean).join(" | ");
    return `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=120&margin=2&ecLevel=M`;
  };

  const singleLabel = (label: any) => {
    const qrUrl = generateQRData(label);
    const regionName = (label.region || "N/A").toUpperCase();
    const regionFontSize = regionName === "DAR ES SALAAM" ? "60px" : "68px";
    const districtName = (label.district || "N/A").toUpperCase();
    const itemType = (label.item || "").toUpperCase();
    const isBkmSplit = itemType === "BKM";
    const containerNum = label.container_number || "?";
    const totalContainers = label.total_containers || "?";

    let panelHtml = "";

    if (isBkmSplit) {
      const redQty = label.bkm_red || 0;
      const pinkQty = label.bkm_pink || 0;
      panelHtml = `
        <div class="item-quantity-panel split-panel">
          <div class="item-box split-box red-split">
            <div class="split-label font-red">RED (SCHOOL)</div>
            <div class="item-value text-red">${redQty}</div>
          </div>
          <div class="qty-box split-box pink-split">
            <div class="split-label font-pink">PINK (PRIVATE)</div>
            <div class="qty-value text-pink">${pinkQty}</div>
          </div>
        </div>
      `;
    } else {
      panelHtml = `
        <div class="item-quantity-panel">
          <div class="item-box">
            <div class="item-value">${itemType || "N/A"}</div>
          </div>
          <div class="qty-box">
            <div class="qty-value">${label.quantity || 0}</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="label-card">
        <div class="corner-tl"></div>
        <div class="corner-tr"></div>
        <div class="corner-bl"></div>
        <div class="corner-br"></div>
        <div class="watermark">${examCode}</div>

        <div class="exam-badge">
          <span>FTNA-${examYear}</span>
        </div>

        <div class="region" style="font-size: ${regionFontSize};">${regionName}</div>
        <div class="district">${districtName}</div>

        ${panelHtml}

        <div class="bottom-row">
          <div class="box-number">
            <div class="box-value">BOX ${containerNum}/${totalContainers}</div>
          </div>
          <div class="qr-wrapper">
            <img src="${qrUrl}" alt="QR Code" />
          </div>
        </div>
      </div>
    `;
  };

  // Group labels into pages of 2 (unchanged FTNA pagination)
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
        <title>FTNA District Stationeries Labels</title>
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
            background: white;
            padding: 10mm 12mm;
            box-sizing: border-box;
            overflow: hidden;
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
            font-size: 26px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #0f172a;
          }
          .region {
            font-family: 'Elephant', 'Impact', 'Georgia', serif;
            font-weight: 900;
            text-transform: uppercase;
            color: #0f172a;
            text-align: center;
            letter-spacing: -0.5px;
            margin-bottom: 5px;
            line-height: 1.1;
            z-index: 1;
          }
          .district {
            font-size: 50px;
            font-weight: 900;
            text-transform: uppercase;
            color: #1e293b;
            text-align: center;
            margin-bottom: 10px;
            line-height: 1.2;
            word-break: break-word;
            letter-spacing: 0.5px;
            z-index: 1;
          }
          .item-quantity-panel {
            display: flex;
            flex-direction: row;
            border-radius: 18px;
            border: 2px solid #cbd5e1;
            background: transparent;
            margin-bottom: 06px;
            overflow: hidden;
            z-index: 1;
          }
          .item-box, .qty-box {
            flex: 1;
            padding: 08px 10px;
            text-align: center;
            background: transparent;
          }
          .item-box {
            border-right: 2px solid #cbd5e1;
          }
          .item-value, .qty-value {
            font-size: 55px;
            font-weight: 900;
            color: #0f172a;
            line-height: 1;
          }
          /* BKM split panel overrides */
          .split-panel .item-value,
          .split-panel .qty-value {
            font-size: 42px;
          }
          .split-label {
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 1px;
            margin-bottom: 4px;
            text-align: center;
          }
          .font-red { color: #ef4444 !important; }
          .font-pink { color: #ec4899 !important; }
          .text-red { color: #dc2626 !important; }
          .text-pink { color: #db2777 !important; }
          .red-split { border-top: 4px solid #dc2626; }
          .pink-split { border-top: 4px solid #ec4899; }
          .bottom-row {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-top: 3px;
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
            font-size: 60px;
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
            width: 68px;
            height: 68px;
            display: block;
          }
          .cut-line {
            border-top: 2px dashed #475569;
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