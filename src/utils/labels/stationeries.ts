"use client";

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

/**
 * Renders high-fidelity stationery box labels exactly resembling the official NECTA PDF layout.
 * Formatted side-by-side (left and right) on an A4 Landscape sheet per record, stripping headers like "REGION:", "DISTRICT:", "CENTER:".
 */
export function renderStationeriesLabels(
  labels: LabelItem[],
  examCode: string,
  examYear: string
): string {
  
  const renderSingleCard = (label: LabelItem) => {
    const boxNum = label.container_number || "1";
    const totalBoxes = label.total_containers || 1;

    return `
      <div class="label-card">
        <div class="exam-header-row">
          <div class="exam-badge">${examCode} ${examYear}</div>
          <div class="exam-badge">${examCode} ${examYear}</div>
        </div>

        <div class="meta-stack">
          <div class="meta-line font-serif">${label.region.toUpperCase()}</div>
          <div class="meta-line font-serif">${label.district.toUpperCase()}</div>
          <div class="center-code-line">${label.center_number}</div>
          <div class="meta-line font-serif">${label.center_name.toUpperCase()}</div>
          <div class="meta-line font-serif">${label.center_name.toUpperCase()}</div>
        </div>

        <div class="contents-title">CONTENTS</div>
        <div class="contents-title">CONTENTS</div>

        <table class="contents-table">
          <tbody>
            <tr>
              <td class="item-name-cell">NORMAL BOOKLETS</td>
              <td class="qty-cell">${label.normal_booklets || 0}</td>
            </tr>
            <tr>
              <td class="item-name-cell">GRAPH BOOKLETS</td>
              <td class="qty-cell">${label.graph_booklets || 0}</td>
            </tr>
            <tr>
              <td class="item-name-cell">NORMAL L/SHEETS</td>
              <td class="qty-cell">${label.normal_loosesheets || 0}</td>
            </tr>
            <tr>
              <td class="item-name-cell">GRAPH L/SHEETS</td>
              <td class="qty-cell">${label.graph_loosesheets || 0}</td>
            </tr>
            <tr>
              <td class="item-name-cell">BKM RED</td>
              <td class="qty-cell">${label.bkm || 0}</td>
            </tr>
          </tbody>
        </table>

        <div class="label-footer">
          <div class="box-indicator">BOX ${boxNum}/${totalBoxes}</div>
          <div class="box-indicator">BOX ${boxNum}/${totalBoxes}</div>
        </div>
      </div>
    `;
  };

  const pagesHtml = labels
    .map((label) => {
      return `
        <div class="a4-page-container">
          ${renderSingleCard(label)}
          
          <div class="vertical-cut-line"></div>
          
          ${renderSingleCard(label)}
        </div>
      `;
    })
    .join("");

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

          @media print {
            @page {
              size: A4 landscape;
              margin: 0;
            }
            body {
              background: #ffffff;
              padding: 0;
              margin: 0;
            }
            .a4-page-container {
              box-shadow: none !important;
              page-break-after: always;
              page-break-inside: avoid;
            }
            .a4-page-container:last-child {
              page-break-after: avoid;
            }
            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }

          body {
            background: #f1f5f9;
            font-family: 'Arial', 'Helvetica', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 10px 0;
          }

          /* Exact physical A4 landscape layout constraints */
          .a4-page-container {
            width: 297mm;
            height: 210mm;
            background: #ffffff;
            padding: 12mm 14mm;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            position: relative;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            margin-bottom: 20px;
            overflow: hidden;
            page-break-inside: avoid;
          }

          /* Individual label bounding boxes fitting symmetrically onto the page */
          .label-card {
            width: 128mm;
            height: 186mm;
            background: #ffffff;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            padding: 4px 0;
          }

          /* Exact duplicated header string elements matching PDF snapshot */
          .exam-header-row {
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin-bottom: 12px;
          }

          .exam-badge {
            font-size: 19px;
            font-weight: 400;
            color: #000000;
            letter-spacing: -0.25px;
          }

          /* Clean vertical layout without structural string labels */
          .meta-stack {
            display: flex;
            flex-direction: column;
            gap: 2px;
            margin-bottom: 10px;
          }

          .meta-line {
            font-size: 19px;
            font-weight: 400;
            color: #000000;
            line-height: 1.1;
          }

          .font-serif {
            font-family: 'Times New Roman', Times, serif;
          }

          .center-code-line {
            font-size: 19px;
            font-weight: 400;
            color: #000000;
            margin-left: 1ch; /* Subtle left indent offset mimicking the snapshot margin structure */
            margin-top: 2px;
            margin-bottom: 2px;
          }

          /* Duplicated contents title text items */
          .contents-title {
            font-size: 19px;
            font-weight: 400;
            color: #000000;
            letter-spacing: 0.5px;
            margin-bottom: 1px;
          }

          /* Perfect high-fidelity reconstruction of native programmatic table rendering outputs */
          .contents-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14px;
            margin-bottom: 24px;
          }

          .contents-table td {
            padding: 3px 0;
            font-size: 19px;
            font-weight: 400;
            color: #000000;
            border: none;
            vertical-align: top;
          }

          .item-name-cell {
            text-align: left;
            width: 70%;
          }

          .qty-cell {
            text-align: left;
            width: 30%;
            padding-left: 10px;
          }

          /* Footer indicators match bottom-left & bottom-right styling variables */
          .label-footer {
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin-top: auto;
            padding-bottom: 4px;
          }

          .box-indicator {
            font-size: 19px;
            font-weight: 400;
            color: #000000;
          }

          /* Center line separation axis */
          .vertical-cut-line {
            position: absolute;
            left: 50%;
            top: 5mm;
            bottom: 5mm;
            width: 0px;
            border-left: 1px dashed #7f8c8d;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
    </html>
  `;
}