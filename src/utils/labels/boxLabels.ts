"use client";

function abbreviateRegionName(region: string): string {
  if (!region) return "";
  const upper = region.toUpperCase().trim();
  if (upper === "KASKAZINI PEMBA") return "KAS/PEMBA";
  if (upper === "KUSINI PEMBA") return "KUS/PEMBA";
  if (upper === "KASKAZINI UNGUJA") return "KAS/UNGUJA";
  if (upper === "KUSINI UNGUJA") return "KUS/UNGUJA";
  if (upper === "MJINI MAGHARIBI") return "M/MAGHARIBI";
  return upper;
}

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
    const rawRegion = (label.region || "N/A").toUpperCase().trim();
    const displayRegion = abbreviateRegionName(rawRegion);
    
    // Conditional font size for Dar es Salaam and other long region names
    const regionFontSize = rawRegion === "DAR ES SALAAM" ? "65px" : "76px";
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

    // Generate adaptive items layout HTML with conditional styling classes
    let itemsHtml = "";
    if (itemsList.length === 1) {
      itemsHtml = `
        <div class="items-layout layout-1">
          <div class="item-box full-width single-item">
            <div class="item-text">${itemsList[0].toUpperCase()}</div>
          </div>
        </div>
      `;
    } else if (itemsList.length === 2) {
      const specialItems = ["ICT COVERS", "ARABIC BOOKLETS", "FINEARTS BOOKLETS", "FINE ARTS BOOKLETS"];
      const isSpecialTwoItems = specialItems.includes(itemsList[0].toUpperCase()) && 
                                specialItems.includes(itemsList[1].toUpperCase());

      if (isSpecialTwoItems) {
        itemsHtml = `
          <div class="items-layout layout-2">
            <div class="row">
              <div class="item-box full-width double-item" style="padding: 12px 12px;">
                <div class="item-text" style="font-size: 38px;">${itemsList[0].toUpperCase()}</div>
              </div>
            </div>
            <div class="row">
              <div class="item-box full-width double-item" style="padding: 12px 12px;">
                <div class="item-text" style="font-size: 38px;">${itemsList[1].toUpperCase()}</div>
              </div>
            </div>
          </div>
        `;
      } else {
        itemsHtml = `
          <div class="items-layout layout-2">
            <div class="row">
              <div class="item-box half-width double-item">
                <div class="item-text">${itemsList[0].toUpperCase()}</div>
              </div>
              <div class="item-box half-width double-item">
                <div class="item-text">${itemsList[1].toUpperCase()}</div>
              </div>
            </div>
          </div>
        `;
      }
    } else if (itemsList.length === 3) {
      const item0 = itemsList[0].toUpperCase();
      const item1 = itemsList[1].toUpperCase();
      const item2 = itemsList[2].toUpperCase();

      const isSpecial0 = ["ICT COVERS", "ARABIC BOOKLETS", "FINEARTS BOOKLETS", "FINE ARTS BOOKLETS"].includes(item0);
      const isSpecial1 = ["ICT COVERS", "ARABIC BOOKLETS", "FINEARTS BOOKLETS", "FINE ARTS BOOKLETS"].includes(item1);
      const isSpecial2 = ["ICT COVERS", "ARABIC BOOKLETS", "FINEARTS BOOKLETS", "FINE ARTS BOOKLETS"].includes(item2);

      const style0 = isSpecial0 ? 'style="padding: 6px 4px; font-size: 26px;"' : '';
      const style1 = isSpecial1 ? 'style="padding: 6px 4px; font-size: 26px;"' : '';
      const style2 = isSpecial2 ? 'style="padding: 8px 6px; font-size: 32px;"' : '';

      itemsHtml = `
        <div class="items-layout layout-3">
          <div class="row">
            <div class="item-box half-width triple-item" ${style0}>
              <div class="item-text">${item0}</div>
            </div>
            <div class="item-box half-width triple-item" ${style1}>
              <div class="item-text">${item1}</div>
            </div>
          </div>
          <div class="row">
            <div class="item-box full-width triple-item-bottom" ${style2}>
              <div class="item-text">${item2}</div>
            </div>
          </div>
        </div>
      `;
    } else if (itemsList.length === 4) {
      itemsHtml = `
        <div class="items-layout layout-4">
          <div class="row">
            <div class="item-box half-width quad-item">
              <div class="item-text">${itemsList[0].toUpperCase()}</div>
            </div>
            <div class="item-box half-width quad-item">
              <div class="item-text">${itemsList[1].toUpperCase()}</div>
            </div>
          </div>
          <div class="row">
            <div class="item-box half-width quad-item">
              <div class="item-text">${itemsList[2].toUpperCase()}</div>
            </div>
            <div class="item-box half-width quad-item">
              <div class="item-text">${itemsList[3].toUpperCase()}</div>
            </div>
          </div>
        </div>
      `;
    }

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
           <span>${examCode}-${examYear}</span>
        </div>

        <!-- Region (prominent with Elephant font) - dynamic font size -->
        <div class="region" style="font-size: ${regionFontSize};">${displayRegion}</div>

        <!-- District (Only if districtName is present) -->
        ${districtName ? `<div class="district">${districtName}</div>` : ""}

        <!-- Adaptive Items Layout -->
        <div class="items-container">
          ${itemsHtml}
        </div>

        <!-- Bottom row: box number + QR (no text under QR) -->
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

  // Build the full HTML document with print‑optimised CSS
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Box Labels</title>
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
            text-rendering: geometricPrecision;
            font-variant-numeric: tabular-nums;
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
            overflow: hidden;
          }

          /* Left decorative line (black & white friendly) */
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

          /* Corner Marks */
          .corner-tl { top: 12px; left: 12px; border-top: 3px solid #0f172a; border-left: 3px solid #0f172a; position: absolute; width: 16px; height: 16px; }
          .corner-tr { top: 12px; right: 12px; border-top: 3px solid #0f172a; border-right: 3px solid #0f172a; position: absolute; width: 16px; height: 16px; }
          .corner-bl { bottom: 12px; left: 12px; border-bottom: 3px solid #0f172a; border-left: 3px solid #0f172a; position: absolute; width: 16px; height: 16px; }
          .corner-br { bottom: 12px; right: 12px; border-bottom: 3px solid #0f172a; border-right: 3px solid #0f172a; position: absolute; width: 16px; height: 16px; }

          /* Watermark */
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
            font-size: 30px;
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
            font-size: 60px;
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

          /* Adaptive Items Layout Styles */
          .items-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            margin-bottom: 10px;
            z-index: 1;
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
            background: transparent;
            border: 2px solid #cbd5e1;
            border-radius: 18px;
            padding: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          .full-width {
            width: 100%;
          }
          .half-width {
            width: 50%;
          }
          
          /* Conditional Layout Styling Scenarios */
          
          /* 1 Item Scenario */
          .single-item {
            border: 3px solid #0f172a;
            background: #f8fafc;
            padding: 24px 16px;
          }
          .single-item .item-text {
            font-size: 55px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 1px;
          }

          /* 2 Items Scenario */
          .double-item {
            border: 2.5px solid #0f172a;
            background: #ffffff;
            padding: 18px 12px;
          }
          .double-item .item-text {
            font-size: 46px;
            font-weight: 900;
            color: #0f172a;
          }

          /* 3 Items Scenario */
          .triple-item {
            border: 2px solid #cbd5e1;
            background: #ffffff;
            padding: 12px 8px;
          }
          .triple-item .item-text {
            font-size: 36px;
            font-weight: 900;
            color: #1e293b;
          }
          .triple-item-bottom {
            border: 2.5px solid #0f172a;
            background: #f8fafc;
            padding: 14px 10px;
          }
          .triple-item-bottom .item-text {
            font-size: 42px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 0.5px;
          }

          /* 4 Items Scenario */
          .quad-item {
            border: 2px solid #cbd5e1;
            background: #ffffff;
            padding: 10px 6px;
          }
          .quad-item .item-text {
            font-size: 32px;
            font-weight: 900;
            color: #334155;
          }

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
            font-size: 75px;
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
            font-size: 9px;
            letter-spacing: 4px;
            font-weight: 800;
            text-transform: uppercase;
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
                <div class="cut-line"><span></span></div>
                ${singleLabel(label)}
              </div>
            `;
          })
          .join("")}
      </body>
    </html>
  `;
};