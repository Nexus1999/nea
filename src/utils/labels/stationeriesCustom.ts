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

export const renderStationeriesCustomLabels = (
  labels: LabelItem[],
  examCode: string,
  examYear: string,
  includedFields: string[] = ["normal_booklets", "graph_booklets", "normal_loosesheets", "graph_loosesheets", "bkm"]
): string => {
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
    const displayRegion = abbreviateRegionName(label.region);
    
    const regionUpper = (label.region || "").toUpperCase().trim();
    let regionFontSize = "62px";
    if (regionUpper === "DAR ES SALAAM") {
      regionFontSize = "47.5px";
    } else if (regionUpper === "KILIMANJARO" || regionUpper === "MJINI MAGHARIBI") {
      regionFontSize = "54px";
    }

    const centerNo = (label.center_number || "").trim().toUpperCase();
    let bkmLabel = "BKM";
    if (centerNo.startsWith("S")) {
      bkmLabel = "BKM RED";
    } else if (centerNo.startsWith("P")) {
      bkmLabel = "BKM PINK";
    }

    // Define all potential items
   const allItems = [
  { key: "normal_booklets", label: "NORMAL BOOKLETS", value: label.normal_booklets || 0 },
  { key: "graph_booklets", label: "GRAPH BOOKLETS", value: label.graph_booklets || 0 },
  { key: "normal_loosesheets", label: "NORMAL SHEETS", value: label.normal_loosesheets || 0 },
  { key: "graph_loosesheets", label: "GRAPH SHEETS", value: label.graph_loosesheets || 0 },
  {
    key: "bkm",
    label: bkmLabel,
    value: centerNo.startsWith("S") ? 0 : (label.bkm || 0),
  },
];

    const activeItems = allItems.filter(item => includedFields.includes(item.key));

    return `
      <div class="label-card opt-a">
        <div class="corner-tl"></div>
        <div class="corner-tr"></div>
        <div class="corner-bl"></div>
        <div class="corner-br"></div>
        <div class="watermark">${examCode}</div>

        <div class="exam-badge">
           <span>${examCode}-${examYear}</span>
        </div>

        <div class="region" style="font-size: ${regionFontSize};">${displayRegion}</div>
        <div class="district">${label.district?.toUpperCase() || "N/A"}</div>

        <div class="center-info">
          <div class="center-number">${label.center_number || "N/A"}</div>
          <div class="center-name">
            ${abbreviateSchoolName(label.center_name)?.toUpperCase() || "N/A"}
          </div>
        </div>

        <div class="contents-header">
          <div class="contents-title">CONTENTS</div>
        </div>

        <div class="stationery-grid">
          ${activeItems.map(item => `
            <div class="stationery-item">
              <div class="item-info">
                <span class="item-label">${item.label}</span>
              </div>
              <div class="item-value">${item.value}</div>
            </div>
          `).join('')}
        </div>

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
        <title>NECTA Custom Stationery Labels - A4 Landscape</title>
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
            text-rendering: geometricPrecision;
            font-variant-numeric: tabular-nums;
          }

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

          .label-card {
            flex: 1;
            border: 2px solid #0f172a;
            border-radius: 24px;
            background: #ffffff;
            padding: 16px 20px 20px 20px;
            height: 100%;
            display: flex;
            flex-direction: column;
            box-shadow: 0 8px 20px rgba(0,0,0,0.08);
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
            width: 6px;
            background: #000;
            border-radius: 0 4px 4px 0;
          }

          .corner-tl { top: 12px; left: 12px; border-top: 3px solid #0f172a; border-left: 3px solid #0f172a; position: absolute; width: 20px; height: 20px; }
          .corner-tr { top: 12px; right: 12px; border-top: 3px solid #0f172a; border-right: 3px solid #0f172a; position: absolute; width: 20px; height: 20px; }
          .corner-bl { bottom: 12px; left: 12px; border-bottom: 3px solid #0f172a; border-left: 3px solid #0f172a; position: absolute; width: 20px; height: 20px; }
          .corner-br { bottom: 12px; right: 12px; border-bottom: 3px solid #0f172a; border-right: 3px solid #0f172a; position: absolute; width: 20px; height: 20px; }

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
          }

          .exam-badge {
            display: flex;
            align-self: center;
            margin-bottom: 2px;
          }

          .exam-badge span {
            padding: 2px 10px;
            border-radius: 999px;
            border: 1.5px solid #000;
            font-size: 24px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #000;
          }

          .region {
            font-family: 'Elephant', 'Impact', 'Georgia', serif;
            font-weight: 900;
            text-transform: uppercase;
            color: #000;
            text-align: center;
            letter-spacing: -0.5px;
            margin-bottom: 2px;
            line-height: 1.1;
          }

          .district {
            font-size: 42px;
            font-weight: 900;
            text-transform: uppercase;
            color: #000;
            text-align: center;
            margin-bottom: 2px;
            line-height: 1.2;
          }

          .center-info {
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
            width: 100%;
          }

          .center-number {
            font-size: 30px;
            font-weight: 800;
            letter-spacing: 2.5px;
            background: #0f172a;
            color: #fff;
            padding: 2px 14px;
            border-radius: 999px;
            line-height: 1;
          }

          .center-name {
            font-size: 30px;
            font-weight: 800;
            color: #000;
            text-align: center;
            text-transform: uppercase;
            line-height: 1.2;
            white-space: nowrap;
          }

          .contents-header {
            text-align: center;
            margin-bottom: 3px;
          }

          .contents-title {
            font-size: 26px;
            font-weight: 900;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: #0f172a;
          }

          .stationery-grid {
            display: flex;
            flex-direction: column;
            gap: 8px;
            flex: 1; /* This makes the grid fill the available space */
            justify-content: center;
            margin-bottom: 5px;
          }

          .stationery-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 12px;
            background: #f8fafc;
            border-radius: 14px;
            border: 1px solid #e2e8f0;
            position: relative;
            overflow: hidden;
            flex: 1; /* This makes each row grow to fill the grid */
          }

          .stationery-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: #000;
          }

          .item-label {
            font-size: 30px;
            font-weight: 800;
            color: #000;
            text-transform: uppercase;
          }

          .item-value {
            font-size: 30px;
            font-weight: 900;
            color: #000;
            font-family: 'Courier New', monospace;
            background: #ffffff;
            padding: 4px 12px;
            border-radius: 12px;
            min-width: 60px;
            text-align: center;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
          }

          .bottom-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-top: 2px;
          }

          .box-number {
            flex: 1;
            border: 2px solid #334155;
            border-radius: 16px;
            padding: 8px 12px;
            text-align: center;
          }

          .box-value {
            font-size: 43px;
            font-weight: 900;
            line-height: 1;
            color: #000;
          }

          .qr-wrapper {
            background: white;
            border: 2px solid #cbd5e1;
            padding: 8px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .qr-wrapper img {
            width: 65px;
            height: auto;
            display: block;
          }

          .cut-line {
            width: 0;
            height: 70%;
            border-left: 2px dashed #475569;
          }
        </style>
      </head>
      <body>
        ${pages.join("")}
      </body>
    </html>
  `;
};