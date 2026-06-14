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
      `DISTRICT:${label.district || ""}`,
      `ITEMS:${label.item || ""}`,
      `BOX:${label.container_number}/${label.total_containers}`,
    ].join(" | ");
    return `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=120&margin=2&ecLevel=M`;
  };

  const singleLabel = (label: any) => {
    const qrUrl = generateQRData(label);
    const regionName = (label.region || "N/A").toUpperCase();
    const regionFontSize = regionName === "DAR ES SALAAM" ? "50px" : "62px";
    const districtName = label.district && label.district !== "None" && label.district !== "N/A" ? label.district.toUpperCase() : null;
    
    // Parse items (stored as comma-separated values)
    const itemsList = (label.item || "").split(",").map((i: string) => i.trim()).filter(Boolean);
    const itemsCount = itemsList.length;

    // Generate items HTML with dynamic grid classes
    const itemsHtml = itemsList.map((item: string, index: number) => {
      let gridClass = "";
      if (itemsCount === 1) {
        gridClass = "span-2";
      } else if (itemsCount === 3 && index === 2) {
        gridClass = "span-2";
      } else {
        gridClass = "span-1";
      }
      return `<div class="item-card ${gridClass}">${item.toUpperCase()}</div>`;
    }).join("");

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
        </div>

        <!-- Region & District (Conditional Layout) -->
        <div class="region" style="font-size: ${regionFontSize}; margin-top: ${districtName ? '0px' : '15px'};">
          ${regionName}
        </div>
        ${districtName ? `<div class="district">${districtName}</div>` : ""}

        <!-- Dynamic Items Grid -->
        <div class="items-grid-container" style="margin-top: ${districtName ? '10px' : '25px'};">
          ${itemsHtml}
        </div>

        <!-- Bottom Row: Box Number & QR Code -->
        <div class="bottom-row">
          <div class="box-number-container">
            <div class="box-value">BOX ${label.container_number}/${label.total_containers}</div>
          </div>
          <div class="qr-wrapper">
            <img src="${qrUrl}" alt="QR Code" />
          </div>
        </div>
      </div>
    `;
  };

  // Group labels into pages of 2 (side by side)
  const pages: string[] = [];
  for (let i = 0; i < labels.length; i++) {
    const currentLabel = labels[i];
    pages.push(`
      <div class="page-container">
        <div class="labels-row">
          ${singleLabel(currentLabel)}
          <div class="cut-line"></div>
          ${singleLabel(currentLabel)}
        </div>
      </div>
    `);
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Box Labels (A4 Landscape)</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          @media print {
            @page {
              margin: 0;
              size: A4 landscape;
            }
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
            .page-container {
              page-break-after: always;
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
            width: 297mm;
            height: 210mm;
            display: flex;
            align-items: center;
            background: white;
            padding: 8mm 12mm;
            box-sizing: border-box;
          }
          .labels-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            width: 100%;
            height: 100%;
          }
          .label-card {
            flex: 1;
            border: 3px double #0f172a;
            border-radius: 24px;
            background: #fffdf9; /* Classic warm cream background */
            padding: 20px 24px;
            height: 100%;
            display: flex;
            flex-direction: column;
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
            box-shadow: inset 0 0 40px rgba(15, 23, 42, 0.02);
          }
          
          /* Classic Corner Accents */
          .corner-tl { top: 12px; left: 12px; border-top: 3px solid #0f172a; border-left: 3px solid #0f172a; position: absolute; width: 20px; height: 20px; }
          .corner-tr { top: 12px; right: 12px; border-top: 3px solid #0f172a; border-right: 3px solid #0f172a; position: absolute; width: 20px; height: 20px; }
          .corner-bl { bottom: 12px; left: 12px; border-bottom: 3px solid #0f172a; border-left: 3px solid #0f172a; position: absolute; width: 20px; height: 20px; }
          .corner-br { bottom: 12px; right: 12px; border-bottom: 3px solid #0f172a; border-right: 3px solid #0f172a; position: absolute; width: 20px; height: 20px; }
          
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
            justify-content: center;
            align-items: center;
            margin-bottom: 4px;
            z-index: 2;
          }
          .exam-badge-left {
            border: 1.5px solid #0f172a;
            border-radius: 60px;
            padding: 4px 14px;
            background: white;
          }
          .exam-badge-left span {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #0f172a;
          }
          .region {
            font-family: 'Elephant', 'Impact', 'Georgia', serif;
            font-weight: 900;
            text-transform: uppercase;
            color: #0f172a;
            text-align: center;
            letter-spacing: -0.5px;
            line-height: 1.1;
            z-index: 2;
          }
          .district {
            font-size: 42px;
            font-weight: 900;
            text-transform: uppercase;
            color: #1e293b;
            text-align: center;
            line-height: 1.2;
            word-break: break-word;
            letter-spacing: 0.5px;
            z-index: 2;
          }
          
          /* Dynamic Items Grid Layout */
          .items-grid-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            z-index: 2;
            margin-bottom: 10px;
          }
          .item-card {
            background: white;
            border: 2px solid #0f172a;
            border-radius: 16px;
            padding: 14px;
            font-size: 26px;
            font-weight: 900;
            text-align: center;
            color: #0f172a;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            display: flex;
            align-items: center;
            justify-content: center;
            text-transform: uppercase;
          }
          .item-card.span-2 {
            grid-column: span 2;
          }
          .item-card.span-1 {
            grid-column: span 1;
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
            padding: 10px 12px;
            text-align: center;
            background: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .box-value {
            font-size: 43px;
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
            position: relative;
            width: 0;
            height: 70%;
            border-left: 2px dashed #475569;
            margin: 0;
          }
        </style>
      </head>
      <body>
        ${pages.join("")}
      </body>
    </html>
  `;
};