"use client";

export const renderBoxLabels = (
  labels: any[],
  examCode: string,
  examYear: string
): string => {
  const generateQRData = (label: any): string => {
    const payload = [
      `EXAM:${examCode}`,
      `YEAR:${examYear}`,
      `REGION:${label.region || ""}`,
      label.district ? `DISTRICT:${label.district}` : "",
      `ITEMS:${label.item || ""}`,
      `BOX:${label.container_number}/${label.total_containers}`,
    ].filter(Boolean).join(" | ");
    return `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=120&margin=2&ecLevel=M`;
  };

  const singleLabel = (label: any) => {
    const qrUrl = generateQRData(label);
    const regionName = (label.region || "N/A").toUpperCase();
    const regionFontSize = regionName === "DAR ES SALAAM" ? "42px" : "50px";
    const districtName = label.district ? (label.district || "N/A").toUpperCase() : null;
    const containerNum = label.container_number || "?";
    const totalContainers = label.total_containers || "?";

    // Parse items (stored as comma-separated string or JSON array)
    let itemsList: string[] = [];
    try {
      if (label.item.startsWith("[")) {
        itemsList = JSON.parse(label.item);
      } else {
        itemsList = label.item.split(",").map((i: string) => i.trim()).filter(Boolean);
      }
    } catch (e) {
      itemsList = label.item ? label.item.split(",").map((i: string) => i.trim()).filter(Boolean) : [];
    }

    // Generate adaptive items layout HTML
    let itemsHtml = "";
    if (itemsList.length === 1) {
      itemsHtml = `
        <div class="items-layout layout-1">
          <div class="item-box full-width">
            <div class="item-text">${itemsList[0].toUpperCase()}</div>
          </div>
        </div>
      `;
    } else if (itemsList.length === 2) {
      itemsHtml = `
        <div class="items-layout layout-2">
          <div class="item-box half-width">
            <div class="item-text">${itemsList[0].toUpperCase()}</div>
          </div>
          <div class="item-box half-width">
            <div class="item-text">${itemsList[1].toUpperCase()}</div>
          </div>
        </div>
      `;
    } else if (itemsList.length === 3) {
      itemsHtml = `
        <div class="items-layout layout-3">
          <div class="row">
            <div class="item-box half-width">
              <div class="item-text">${itemsList[0].toUpperCase()}</div>
            </div>
            <div class="item-box half-width">
              <div class="item-text">${itemsList[1].toUpperCase()}</div>
            </div>
          </div>
          <div class="row">
            <div class="item-box full-width">
              <div class="item-text">${itemsList[2].toUpperCase()}</div>
            </div>
          </div>
        </div>
      `;
    } else if (itemsList.length === 4) {
      itemsHtml = `
        <div class="items-layout layout-4">
          <div class="row">
            <div class="item-box half-width">
              <div class="item-text">${itemsList[0].toUpperCase()}</div>
            </div>
            <div class="item-box half-width">
              <div class="item-text">${itemsList[1].toUpperCase()}</div>
            </div>
          </div>
          <div class="row">
            <div class="item-box half-width">
              <div class="item-text">${itemsList[2].toUpperCase()}</div>
            </div>
            <div class="item-box half-width">
              <div class="item-text">${itemsList[3].toUpperCase()}</div>
            </div>
          </div>
        </div>
      `;
    }

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
          <div class="category-badge">
            <span>BOX LABEL</span>
          </div>
        </div>

        <!-- Region & District -->
        <div class="region" style="font-size: ${regionFontSize};">${regionName}</div>
        ${districtName ? `<div class="district">${districtName}</div>` : '<div class="district-placeholder"></div>'}

        <!-- Adaptive Items Layout -->
        <div class="items-container">
          ${itemsHtml}
        </div>

        <!-- Bottom Row: Box Number & QR Code -->
        <div class="bottom-row">
          <div class="box-number-container">
            <div class="box-label">BOX</div>
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
        <title>Box Labels (2 per page)</title>
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
            border: 3px double #0f172a;
            border-radius: 24px;
            background: #fffdf9; /* Classic warm cream background */
            padding: 18px 24px;
            height: 122mm;
            display: flex;
            flex-direction: column;
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
            box-shadow: inset 0 0 40px rgba(15, 23, 42, 0.02);
          }
          
          /* Classic Corner Accents */
          .corner-tl { top: 10px; left: 10px; border-top: 3px solid #0f172a; border-left: 3px solid #0f172a; position: absolute; width: 16px; height: 16px; }
          .corner-tr { top: 10px; right: 10px; border-top: 3px solid #0f172a; border-right: 3px solid #0f172a; position: absolute; width: 16px; height: 16px; }
          .corner-bl { bottom: 10px; left: 10px; border-bottom: 3px solid #0f172a; border-left: 3px solid #0f172a; position: absolute; width: 16px; height: 16px; }
          .corner-br { bottom: 10px; right: 10px; border-bottom: 3px solid #0f172a; border-right: 3px solid #0f172a; position: absolute; width: 16px; height: 16px; }
          
          .watermark {
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 130px;
            font-weight: 900;
            color: rgba(15, 23, 42, 0.02);
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
            border: 1.5px solid #0f172a;
            border-radius: 60px;
            padding: 4px 14px;
            background: white;
          }
          .exam-badge-left span {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #0f172a;
          }
          .category-badge {
            background: #0f172a;
            border-radius: 48px;
            padding: 5px 20px;
          }
          .category-badge span {
            font-size: 18px;
            font-weight: 900;
            color: white;
            letter-spacing: 1.5px;
          }
          .region {
            font-family: 'Elephant', 'Impact', 'Georgia', serif;
            font-weight: 900;
            text-transform: uppercase;
            color: #0f172a;
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
            color: #1e293b;
            text-align: center;
            margin-bottom: 8px;
            line-height: 1.2;
            word-break: break-word;
            letter-spacing: 0.5px;
            z-index: 2;
          }
          .district-placeholder {
            height: 12px;
            margin-bottom: 8px;
          }
          
          /* Adaptive Items Layout Styles */
          .items-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            margin-bottom: 10px;
            z-index: 2;
          }
          .items-layout {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
          }
          .row {
            display: flex;
            gap: 8px;
            width: 100%;
          }
          .item-box {
            background: white;
            border: 2px solid #0f172a;
            border-radius: 12px;
            padding: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
            text-align: center;
          }
          .full-width {
            width: 100%;
          }
          .half-width {
            width: 50%;
          }
          .item-text {
            font-size: 22px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 1px;
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
            border: 2px solid #0f172a;
            border-radius: 16px;
            padding: 8px 12px;
            text-align: center;
            background: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .box-label {
            font-size: 14px;
            font-weight: 800;
            color: #64748b;
            letter-spacing: 2px;
            margin-bottom: 2px;
          }
          .box-value {
            font-size: 46px;
            font-weight: 900;
            color: #0f172a;
            line-height: 1;
            font-family: 'Georgia', serif;
          }
          .qr-wrapper {
            background: white;
            border: 2px solid #0f172a;
            padding: 6px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
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