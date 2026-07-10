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
      label.bkm_red ? `BLUE:${label.bkm_red}` : "",
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
    const districtName = (label.district || "N/A").toUpperCase();
    const itemType = (label.item || "").toUpperCase();
    const isBkmSplit = itemType === "BKM";
    const containerNum = label.container_number || "?";
    const totalContainers = label.total_containers || "?";

    if (isBkmSplit) {
      // ---- BKM style: Stacked row system without the top header banner ----
      const regionFontSize = regionName === "DAR ES SALAAM" ? "60px" : "68px";
      const blueQty = label.bkm_red || 0;
      const pinkQty = label.bkm_pink || 0;

      return `
        <div class="label-card card-district">
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

          <div class="stationery-grid">
            <div class="stationery-item stacked-item">
              <div class="item-info">
                <span class="item-label">BLUE</span>
              </div>
              <div class="item-value">${blueQty}</div>
            </div>
            <div class="stationery-item stacked-item">
              <div class="item-info">
                <span class="item-label">PINK</span>
              </div>
              <div class="item-value">${pinkQty}</div>
            </div>
          </div>

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
    }

    // ---- Classic card for TR / TWM ----
    const regionFontSize = "50px";
    const qty = label.quantity || 0;

    return `
      <div class="label-card card-classic">
        <div class="corner-tl"></div>
        <div class="corner-tr"></div>
        <div class="corner-bl"></div>
        <div class="corner-br"></div>
        <div class="watermark">${examCode}</div>

        <div class="top-row">
          <div class="exam-badge-left">
            <span>FTNA-${examYear}</span>
          </div>
        </div>

        <div class="region" style="font-size: ${regionFontSize};">${regionName}</div>
        <div class="district">${districtName}</div>

        <div class="stationery-grid">
          <div class="stationery-item">
            <div class="item-info">
              <span class="item-label">${itemType || "N/A"}</span>
            </div>
            <div class="item-value">${qty}</div>
          </div>
        </div>

        <div class="bottom-row">
          <div class="box-number-container">
            <div class="box-value">${containerNum}/${totalContainers}</div>
          </div>
          <div class="qr-wrapper">
            <img src="${qrUrl}" alt="QR Code" />
          </div>
        </div>
      </div>
    `;
  };

  // ---- Pagination ----
  const getGroup = (item: any): "BKM" | "OTHER" =>
    (item || "").toUpperCase() === "BKM" ? "BKM" : "OTHER";

  const pages: string[] = [];
  let i = 0;
  while (i < labels.length) {
    const group = getGroup(labels[i].item);

    if (group === "BKM") {
      const labelHtml = singleLabel(labels[i]);
      pages.push(`
        <div class="page-container">
          ${labelHtml}
          <div class="cut-line"><span></span></div>
          ${labelHtml}
        </div>
      `);
      i += 1;
    } else {
      const first = labels[i];
      const hasNextInSameGroup =
        i + 1 < labels.length && getGroup(labels[i + 1].item) === "OTHER";

      if (hasNextInSameGroup) {
        const second = labels[i + 1];
        pages.push(`
          <div class="page-container">
            ${singleLabel(first)}
            <div class="cut-line"><span></span></div>
            ${singleLabel(second)}
          </div>
        `);
        i += 2;
      } else {
        pages.push(`
          <div class="page-container single-page">
            ${singleLabel(first)}
          </div>
        `);
        i += 1;
      }
    }
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
          .page-container.single-page {
            justify-content: flex-start;
          }
          .label-card {
            height: 122mm;
            display: flex;
            flex-direction: column;
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
          }

          /* ============ Shared corner accents & watermark ============ */
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

          /* ============ STATIONERY ROW SYSTEM ============ */
          .stationery-grid {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
            margin-bottom: 10px;
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
          }
          .stationery-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 5px;
            background: #000000;
          }
          .item-info {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .item-label {
            font-size: 26px;
            font-weight: 800;
            color: #000000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .item-value {
            font-size: 28px;
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

          /* ============ CLASSIC style — TR / TWM ============ */
          .card-classic {
            border: 3px double #000;
            border-radius: 24px;
            background: #ffffff;
            padding: 18px 24px;
          }
          .card-classic .top-row {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 8px;
            z-index: 2;
          }
          .card-classic .exam-badge-left {
            border: 1.5px solid #000;
            border-radius: 60px;
            padding: 4px 14px;
            background: white;
          }
          .card-classic .exam-badge-left span {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #000;
          }
          .card-classic .region {
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
          .card-classic .district {
            font-size: 35px;
            font-weight: 900;
            text-transform: uppercase;
            color: #000;
            text-align: center;
            margin-bottom: 12px;
            line-height: 1.2;
            word-break: break-word;
            letter-spacing: 0.5px;
            z-index: 2;
          }
          .card-classic .bottom-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-top: auto;
            z-index: 2;
          }
          .card-classic .box-number-container {
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
          .card-classic .box-value {
            font-size: 44px;
            font-weight: 900;
            color: #000;
            line-height: 1;
            font-family: 'arial', 'Georgia', serif;
          }
          .card-classic .qr-wrapper {
            background: white;
            border: 2px solid #000;
            padding: 6px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .card-classic .qr-wrapper img {
            width: 68px;
            height: 68px;
            display: block;
          }

          /* ============ DISTRICT style — BKM ============ */
          .card-district {
            border: 2px solid #000;
            border-radius: 24px;
            background: white;
            padding: 18px 24px 22px 24px;
          }
          .card-district .exam-badge {
            display: flex;
            gap: 14px;
            align-self: center;
            margin-bottom: 12px;
          }
          .card-district .exam-badge span {
            padding: 6px 14px;
            border-radius: 999px;
            background: transparent;
            border: 1.5px solid #000;
            font-size: 26px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #000;
          }
          .card-district .region {
            font-family: 'Elephant', 'Impact', 'Georgia', serif;
            font-weight: 900;
            text-transform: uppercase;
            color: #000;
            text-align: center;
            letter-spacing: -0.5px;
            margin-bottom: 5px;
            line-height: 1.1;
            z-index: 1;
          }
          .card-district .district {
            font-size: 50px;
            font-weight: 900;
            text-transform: uppercase;
            color: #000;
            text-align: center;
            margin-bottom: 10px;
            line-height: 1.2;
            word-break: break-word;
            letter-spacing: 0.5px;
            z-index: 1;
          }
          .card-district .bottom-row {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-top: auto;
            z-index: 1;
          }
          .card-district .box-number {
            flex: 1;
            background: transparent;
            border: 1.5px solid #000;
            border-radius: 18px;
            padding: 10px 14px;
            text-align: center;
          }
          .card-district .box-value {
            font-size: 60px;
            font-weight: 900;
            letter-spacing: -2px;
            line-height: 0.95;
            color: #000;
            font-variant-numeric: tabular-nums;
          }
          .card-district .qr-wrapper {
            background: white;
            border: 1.5px solid #000;
            padding: 10px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .card-district .qr-wrapper img {
            width: 68px;
            height: 68px;
            display: block;
          }

          /* ============ Shared cut-line ============ */
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