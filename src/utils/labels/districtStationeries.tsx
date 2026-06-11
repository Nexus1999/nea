// No external dependencies required.
// The QR code uses quickchart.io – a free, reliable HTTPS service.

export const renderDistrictStationeriesLabels = (
  labels: any[],
  examCode: string,
  examYear: string
): string => {
  // Helper: generate QR code URL (encodes all relevant fields)
  const generateQRData = (label: any): string => {
    const payload = [
      `EXAM:${examCode}`,
      `YEAR:${examYear}`,
      `REGION:${label.region || ""}`,
      `DISTRICT:${label.district || ""}`,
      `ITEM:${label.item || ""}`,
      `QTY:${label.quantity || 0}`,
      `BOX:${label.container_number}/${label.total_containers}`,
    ].join(" | ");
    return `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=120&margin=2&ecLevel=M`;
  };

  const singleLabel = (label: any) => {
    const qrUrl = generateQRData(label);

    return `
      <div class="label-card">
        <div class="gold-accent"></div>
        
        <div class="exam-badge">
          <span class="badge-icon">📋</span>
          ${examCode} • ${examYear}
        </div>

        <div class="region">${label.region || "N/A"}</div>

        <div class="district">${label.district || "N/A"}</div>

        <div class="item-quantity-panel">
          <div class="item-box">
            <div class="item-value">${label.item || "N/A"}</div>
          </div>
          <div class="divider-vertical"></div>
          <div class="qty-box">
            <div class="qty-value">${label.quantity || 0}</div>
          </div>
        </div>

        <div class="bottom-row">
          <div class="box-number">
            <div class="box-value"> BOX ${label.container_number}/${label.total_containers}</div>
          </div>
          <div class="qr-wrapper">
            <img src="${qrUrl}" alt="QR Code" />
          </div>
        </div>
      </div>
    `;
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>District Stationery Labels</title>
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
            .no-print {
              display: none;
            }
            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }

          body {
            background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
            font-family: 'Georgia', 'Times New Roman', 'Inter', 'Segoe UI', system-ui, -apple-system, serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 0;
            margin: 0;
          }

          /* Two labels per A4 page container */
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
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }

          /* Label card layout mixed with V1 styling gradients */
          .label-card {
            border: 1px solid #d4af37;
            border-radius: 28px;
            background: linear-gradient(135deg, #ffffff 0%, #fef9f0 100%);
            padding: 20px 26px 24px 26px;
            height: 122mm;
            display: flex;
            flex-direction: column;
            box-shadow: 0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8);
            position: relative;
            box-sizing: border-box;
          }

          /* Gold top bar accent from V1 */
          .gold-accent {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: linear-gradient(90deg, #d4af37 0%, #f5e6a3 50%, #d4af37 100%);
            border-radius: 28px 28px 0 0;
          }

          /* UPDATED: Exam Badge with Light Cream BG, Gold Border, and Pure Black Text */
          .exam-badge {
            background: #fff9f0;
            border: 2px solid #d4af37;
            border-radius: 50px;
            padding: 8px 24px;
            font-size: 18px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #000000;
            text-align: center;
            margin-bottom: 16px;
            align-self: center;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          }

          .badge-icon {
            font-size: 16px;
          }

          /* Region sizing and text gradients from V1 */
          .region {
            font-family: 'Georgia', 'Times New Roman', 'Elephant', serif;
            font-size: 68px;
            font-weight: 900;
            text-transform: uppercase;
            background: linear-gradient(135deg, #1a1a2e 0%, #2c3e50 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            text-align: center;
            letter-spacing: -1px;
            margin-bottom: 4px;
            line-height: 1.1;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.05);
          }

          /* District font scaling and dotted border line from V1 */
          .district {
            font-size: 46px;
            font-weight: 800;
            text-transform: uppercase;
            color: #2c3e50;
            text-align: center;
            margin-bottom: 20px;
            line-height: 1.2;
            word-break: break-word;
            letter-spacing: -0.5px;
            border-bottom: 2px dotted #d4af37;
            padding-bottom: 12px;
            display: inline-block;
            align-self: center;
          }

          .item-quantity-panel {
            display: flex;
            flex-direction: row;
            border-radius: 20px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            margin-bottom: 20px;
            overflow: hidden;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.05), 0 2px 6px rgba(0,0,0,0.05);
          }

          .item-box, .qty-box {
            flex: 1;
            padding: 16px 12px;
            text-align: center;
            background: white;
            position: relative;
          }

          .item-box {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          }

          .qty-box {
            background: linear-gradient(135deg, #fff9f0 0%, #ffffff 100%);
          }

          /* Vertical gold panel separator line from V1 */
          .divider-vertical {
            width: 2px;
            background: linear-gradient(180deg, #d4af37 0%, #f5e6a3 50%, #d4af37 100%);
          }

          /* Content panel sizes from V1 */
          .item-value, .qty-value {
            font-size: 48px;
            font-weight: 800;
            background: linear-gradient(135deg, #1a1a2e 0%, #2c3e50 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            line-height: 1;
            font-family: 'Georgia', 'Times New Roman', serif;
          }

          .bottom-row {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            margin-top: auto;
          }

          /* UPDATED: Box Number identical theme match to Exam Badge (Cream BG, Gold Border, Black Text) */
          .box-number {
            flex: 1;
            background: #fff9f0;
            border: 2px solid #d4af37;
            border-radius: 20px;
            padding: 12px 16px;
            text-align: center;
            position: relative;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          }

          /* Big blocky digital-font size for box quantities with pure black color */
          .box-value {
            font-size: 56px;
            font-weight: 900;
            font-family: 'Georgia', 'Times New Roman', monospace;
            color: #000000;
            line-height: 1;
          }

          /* Clean QR wrapping styling with gold border line */
          .qr-wrapper {
            background: white;
            border: 2px solid #d4af37;
            border-radius: 20px;
            padding: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }

          .qr-wrapper img {
            width: 72px;
            height: auto;
            display: block;
          }

          /* Elegant gold dashed cutting lane divider */
          .cut-line {
            border-top: 2px dashed #d4af37;
            width: 100%;
            margin: 12px 0;
            position: relative;
            text-align: center;
          }

          .cut-line span {
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #ffffff 0%, #fef9f0 100%);
            padding: 0 24px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #d4af37;
            font-family: 'Inter', sans-serif;
            white-space: nowrap;
          }

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
                <div class="cut-line"><span>✂️ CUT HERE — SEPARATE LABELS ✂️</span></div>
                ${singleLabel(label)}
              </div>
            `;
          })
          .join("")}
      </body>
    </html>
  `;
};