"use client";
import { abbreviateSchoolName } from "./abbreviate";

interface LabelItem {
  id: number;
  mid: number;
  region: string;
  district: string;
  center_name: string;
  center_number: string;
  normal_booklets: number;
  graph_booklets: number;
  normal_loosesheets: number;
  graph_loosesheets: number;
  bkm: number;
  container_type: string;
  container_number: string;
  total_containers: number;
  item: string;
  quantity: number;
  category: string;
}

export const renderStationeriesLabels = (
  labels: LabelItem[],
  examCode: string,
  examYear: string
): string => {
  // Helper: generate QR code URL (encodes all relevant fields)
  const generateQRData = (label: LabelItem): string => {
    const payload = [
      `EXAM:${examCode}`,
      `YEAR:${examYear}`,
      `REGION:${label.region || ""}`,
      `DISTRICT:${label.district || ""}`,
      `CENTER:${label.center_number || ""} - ${label.center_name || ""}`,
      `NORMAL BK:${label.normal_booklets || 0}`,
      `GRAPH BK:${label.graph_booklets || 0}`,
      `NORMAL LS:${label.normal_loosesheets || 0}`,
      `GRAPH LS:${label.graph_loosesheets || 0}`,
      `BKM:${label.bkm || 0}`,
      `BOX:${label.container_number}/${label.total_containers}`,
    ].join(" | ");
    return `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=120&margin=2&ecLevel=M`;
  };

  const singleLabel = (label: LabelItem) => {
    const qrUrl = generateQRData(label);
    // Condition for region font size
    const regionFontSize = label.region?.toUpperCase() === "DAR ES SALAAM" ? "55px" : "62px";

    return `
      <div class="label-card opt-a">
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
        <div class="region" style="font-size: ${regionFontSize};">${label.region?.toUpperCase() || "N/A"}</div>

        <!-- District -->
        <div class="district">${label.district?.toUpperCase() || "N/A"}</div>

        <!-- Center Info - ENLARGED FONTS -->
        <div class="center-info">
          <div class="center-number">${label.center_number || "N/A"}</div>
          <div class="center-name" title="${abbreviateSchoolName(label.center_name)?.toUpperCase() || "N/A"}">
            ${abbreviateSchoolName(label.center_name)?.toUpperCase() || "N/A"}
          </div>
        </div>

        <!-- MODERN & CLASSIC CONTENTS SECTION -->
        <div class="contents-header">
          <div class="contents-title">CONTENTS</div>
        </div>

        <!-- Redesigned Stationery Items Grid - Modern & Classic -->
        <div class="stationery-grid">
          <div class="stationery-item">
            <div class="item-info">
              <span class="item-label">NORMAL BOOKLETS</span>
            </div>
            <div class="item-value">${label.normal_booklets || 0}</div>
          </div>
          
          <div class="stationery-item">
            <div class="item-info">
              <span class="item-label">GRAPH BOOKLETS</span>
            </div>
            <div class="item-value">${label.graph_booklets || 0}</div>
          </div>
          
          <div class="stationery-item">
            <div class="item-info">
              <span class="item-label">NORMAL SHEETS</span>
            </div>
            <div class="item-value">${label.normal_loosesheets || 0}</div>
          </div>
          
          <div class="stationery-item">
            <div class="item-info">
              <span class="item-label">GRAPH SHEETS</span>
            </div>
            <div class="item-value">${label.graph_loosesheets || 0}</div>
          </div>
          
          <div class="stationery-item highlight">       
            <div class="item-info">
              <span class="item-label">BKM</span>
            </div>
            <div class="item-value">${label.bkm || 0}</div>
          </div>
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

  // Group labels into pages of 2 (side by side) - DUPLICATING THE SAME STICKER
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

  // Build the full HTML document with print‑optimised CSS
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>NECTA Stationery Labels - A4 Landscape</title>
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
              size: A4 landscape;
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

          /* Each page container holds exactly two labels side by side on A4 landscape */
          .page-container {
            width: 297mm;
            height: 210mm;
            page-break-after: always;
            background: white;
            padding: 8mm 12mm;
            box-sizing: border-box;
            display: flex;
            align-items: center;
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

          /* Single label card – sized perfectly to fit two side by side on A4 landscape */
          .label-card {
            flex: 1;
            border: 2px solid #0f172a;
            border-radius: 24px;
            background: linear-gradient(135deg, #ffffff 0%, #fefefe 100%);
            padding: 16px 20px 20px 20px;
            height: 100%;
            display: flex;
            flex-direction: column;
            box-shadow: 0 8px 20px rgba(0,0,0,0.08);
            transition: none;
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
          }

          /* Left decorative gradient line */
          .label-card::before {
            content: '';
            position: absolute;
            top: 24px;
            bottom: 24px;
            left: 0;
            width: 6px;
            background: linear-gradient(180deg, #000000 0%, #000000 50%, #000000 100%);
            border-radius: 0 4px 4px 0;
          }

          /* Corner Marks - Enhanced */
          .corner-tl { top: 12px; left: 12px; border-top: 3px solid #0f172a; border-left: 3px solid #0f172a; position: absolute; width: 20px; height: 20px; }
          .corner-tr { top: 12px; right: 12px; border-top: 3px solid #0f172a; border-right: 3px solid #0f172a; position: absolute; width: 20px; height: 20px; }
          .corner-bl { bottom: 12px; left: 12px; border-bottom: 3px solid #0f172a; border-left: 3px solid #0f172a; position: absolute; width: 20px; height: 20px; }
          .corner-br { bottom: 12px; right: 12px; border-bottom: 3px solid #0f172a; border-right: 3px solid #0f172a; position: absolute; width: 20px; height: 20px; }

          /* Watermark */
          .watermark {
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 100px;
            font-weight: 900;
            color: rgba(15, 23, 42, 0.02);
            pointer-events: none;
            z-index: 0;
            user-select: none;
            font-family: 'Impact', sans-serif;
          }

          .exam-badge {
            display: flex;
            gap: 14px;
            align-self: center;
            margin-bottom: 2px;
          }

          .exam-badge span {
            padding: 2px 10px;
            border-radius: 999px;
            background: linear-gradient(135deg, #0b0b0c 0%, #060607 100%);
            border: 1.5px solid #cbd5e1;
            font-size: 24px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #ffffff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }

          .region {
            font-family: 'Elephant', 'Impact', 'Georgia', serif;
            font-weight: 900;
            text-transform: uppercase;
            color: #000000;
            text-align: center;
            letter-spacing: -0.5px;
            margin-bottom: 2px;
            line-height: 1.1;
            z-index: 1;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.05);
          }

          .district {
            font-size: 42px;
            font-weight: 900;
            text-transform: uppercase;
            color: #000000;
            text-align: center;
            margin-bottom: 2px;
            line-height: 1.2;
            word-break: break-word;
            letter-spacing: 0.5px;
            z-index: 1;
          }

          /* Center Info - ENLARGED FONTS */
          .opt-a .center-info {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
            padding: 8px 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #0f172a;
            border-radius: 12px;
            margin-bottom: 3px;
            z-index: 1;
            width: 100%;
            box-sizing: border-box;
          }

          .opt-a .center-number {
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 2.5px;
            background: #0f172a;
            color: #fff;
            padding: 2px 14px;
            border-radius: 999px;
            line-height: 1;
          }

          .opt-a .center-name {
            font-size: 16px;
            font-weight: 800;
            color: #000;
            text-align: center;
            text-transform: uppercase;
            line-height: 1.2;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          /* MODERN & CLASSIC CONTENTS HEADER */
          .contents-header {
            text-align: center;
            margin-bottom: 3px;
            z-index: 1;
            position: relative;
          }

          .contents-title {
            font-size: 26px;
            font-weight: 900;
            color: #000000;
            letter-spacing: 3px;
            text-transform: uppercase;
            font-family: 'Arial', 'Georgia', serif;
            background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          /* Redesigned Stationery Grid - Modern & Classic */
          .stationery-grid {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 5px;
            z-index: 1;
          }

          .stationery-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 12px;
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 14px;
            border: 1px solid #e2e8f0;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
          }

          .stationery-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: linear-gradient(180deg, #000000 0%, #000000 100%);
          }

          .stationery-item.highlight::before {
            background: linear-gradient(180deg, #000000 0%, #000000 100%);
          }

          .item-info {
            flex: 1;
            display: flex;
            flex-direction: column;
          }

          .item-label {
            font-size: 30px;
            font-weight: 800;
            color: #000000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .item-value {
            font-size: 30px;
            font-weight: 900;
            color: #000000;
            font-family: 'Courier New', monospace;
            background: #ffffff;
            padding: 4px 12px;
            border-radius: 12px;
            min-width: 60px;
            text-align: center;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.05);
          }

          .bottom-row {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-top: 2px;
            z-index: 1;
          }

          .box-number {
            flex: 1;
            background: transparent;
            border: 2px solid #334155;
            border-radius: 16px;
            padding: 8px 12px;
            text-align: center;
          }

          .box-value {
            font-size: 43px;
            font-weight: 900;
            letter-spacing: -1px;
            line-height: 1;
            color: #000000;
            font-variant-numeric: tabular-nums;
          }

          .qr-wrapper {
            background: white;
            border: 2px solid #cbd5e1;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            padding: 8px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s ease;
          }

          .qr-wrapper img {
            width: 65px;
            height: auto;
            display: block;
          }

          /* Cut line between labels (vertical line for landscape) */
          .cut-line {
            position: relative;
            width: 0;
            height: 70%;
            border-left: 2px dashed #475569;
            margin: 0;
          }
          
          .cut-line span {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-90deg);
            background: white;
            padding: 8px 16px;
            font-size: 11px;
            letter-spacing: 4px;
            font-weight: 800;
            text-transform: uppercase;
            color: #1e293b;
            font-family: monospace;
            white-space: nowrap;
            border: 1.5px dashed #475569;
            border-radius: 30px;
            background: #f8fafc;
          }

          /* Ensure no extra text anywhere */
          body, div, span, p {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        </style>
      </head>
      <body>
        ${pages.join("")}
      </body>
    </html>
  `;
};