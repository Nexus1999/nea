export interface LabelItem {
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

export function renderDistrictStationeriesLabels(
  labels: LabelItem[],
  examCode: string,
  examYear: string
): string {
  return `
    <style>
      .district-label-card {
        position: relative;
        border: 2px solid #0f172a;
        border-radius: 16px;
        padding: 24px;
        box-sizing: border-box;
        height: 105mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        page-break-inside: avoid;
        background-color: #fff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        overflow: hidden;
        text-rendering: geometricPrecision;
        font-variant-numeric: tabular-nums;
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

      .label-header {
        text-align: center;
        border-bottom: 2px dashed #e2e8f0;
        padding-bottom: 12px;
        margin-bottom: 12px;
        z-index: 1;
      }
      
      .label-header h1 {
        font-size: 13px;
        margin: 0;
        text-transform: uppercase;
        font-weight: 800;
        letter-spacing: 1px;
        color: #0f172a;
      }

      .exam-badge {
        display: flex;
        gap: 10px;
        justify-content: center;
        margin-top: 8px;
      }
      
      .exam-badge span {
        padding: 4px 12px;
        border-radius: 999px;
        background: #f8fafc;
        font-size: 10px;
        font-weight: 800;
        border: 1px solid #e2e8f0;
        color: #0f172a;
        text-transform: uppercase;
      }

      .label-body {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 12px;
        z-index: 1;
      }

      .location-info {
        background-color: #f8fafc;
        padding: 12px;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
      }

      .region-title {
        font-size: 10px;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .region-value {
        font-size: 18px;
        font-weight: 900;
        color: #0f172a;
        text-transform: uppercase;
        margin-bottom: 6px;
      }

      .district-title {
        font-size: 10px;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .district-value {
        font-size: 16px;
        font-weight: 800;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .item-details {
        border: 1.5px solid #0f172a;
        border-radius: 12px;
        padding: 12px;
        background-color: #fff;
      }

      .item-label {
        font-size: 9px;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }

      .item-name {
        font-size: 15px;
        font-weight: 800;
        color: #0f172a;
        text-transform: uppercase;
      }

      .item-qty-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px dashed #e2e8f0;
      }

      .qty-label {
        font-size: 10px;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
      }

      .qty-value {
        font-size: 18px;
        font-weight: 900;
        color: #0f172a;
      }

      .label-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 2px solid #0f172a;
        padding-top: 12px;
        margin-top: 8px;
        z-index: 1;
      }

      .box-hero {
        font-size: 72px;
        font-weight: 900;
        letter-spacing: -2px;
        line-height: 0.95;
        color: #0f172a;
        font-variant-numeric: tabular-nums;
      }

      .box-hero-label {
        font-size: 10px;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 2px;
      }

      .qr-container {
        border: 1.5px solid #cbd5e1;
        box-shadow:
          0 1px 3px rgba(0,0,0,.05),
          inset 0 1px 0 rgba(255,255,255,.8);
        padding: 10px;
        background: white;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .cut-line {
        grid-column: span 2;
        text-align: center;
        margin: 16px 0;
        position: relative;
        page-break-inside: avoid;
      }

      .cut-line::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        border-top: 1px dashed #94a3b8;
        z-index: 1;
      }

      .cut-line span {
        position: relative;
        z-index: 2;
        background-color: #f1f5f9;
        padding: 0 16px;
        color: #64748b;
        font-weight: 700;
        font-size: 9px;
        letter-spacing: 4px;
        text-transform: uppercase;
      }

      @media print {
        .cut-line span {
          background-color: #fff;
        }
      }
    </style>

    ${labels
      .map((label, index) => {
        const isEven = index % 2 === 1;
        const formattedBoxNum = String(label.container_number).padStart(2, '0');
        const formattedTotalBoxes = String(label.total_containers).padStart(2, '0');

        const cardHtml = `
          <div class="district-label-card">
            <!-- Corner Marks -->
            <div class="corner-tl"></div>
            <div class="corner-tr"></div>
            <div class="corner-bl"></div>
            <div class="corner-br"></div>

            <!-- Watermark -->
            <div class="watermark">${examCode}</div>

            <!-- Header -->
            <div class="label-header">
              <h1>National Examinations Council of Tanzania</h1>
              <div class="exam-badge">
                <span>${examCode}</span>
                <span>${examYear}</span>
              </div>
            </div>

            <!-- Body -->
            <div class="label-body">
              <div class="location-info">
                <div class="region-title">Region</div>
                <div class="region-value">${label.region}</div>
                <div class="district-title">District</div>
                <div class="district-value">${label.district}</div>
              </div>

              <div class="item-details">
                <div class="item-label">Stationery Item</div>
                <div class="item-name">${label.item || 'District Stationery Pack'}</div>
                <div class="item-qty-row">
                  <span class="qty-label">Quantity</span>
                  <span class="qty-value">${label.quantity}</span>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="label-footer">
              <div>
                <div class="box-hero-label">Box Number</div>
                <div class="box-hero">${formattedBoxNum}/${formattedTotalBoxes}</div>
              </div>
              <div class="qr-container">
                <!-- Placeholder QR Code using SVG for crisp printing -->
                <svg width="60" height="60" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 0H7V7H0V0ZM2 2V5H5V2H2Z" fill="#0F172A"/>
                  <path d="M22 0H29V7H22V0ZM24 2V5H27V2H24Z" fill="#0F172A"/>
                  <path d="M0 22H7V29H0V22ZM2 24V27H5V24H2Z" fill="#0F172A"/>
                  <path d="M9 0H11V2H9V0ZM13 0H15V4H13V0ZM17 0H20V2H17V0ZM9 4H11V6H9V4ZM17 4H20V6H17V4ZM9 8H11V11H9V8ZM13 8H15V10H13V8ZM17 8H20V11H17V8ZM22 9H24V11H22V9ZM26 9H29V11H26V9Z" fill="#0F172A"/>
                  <path d="M0 9H2V11H0V9ZM4 9H7V11H4V9ZM0 13H3V15H0V13ZM5 13H7V15H5V13ZM9 13H12V15H9V13ZM14 13H16V15H14V13ZM18 13H20V15H18V13ZM22 13H25V15H22V13ZM27 13H29V15H27V13Z" fill="#0F172A"/>
                  <path d="M9 17H11V20H9V17ZM13 17H16V19H13V17ZM18 17H20V20H18V17ZM22 17H24V19H22V17ZM26 17H29V20H26V17Z" fill="#0F172A"/>
                  <path d="M9 22H11V24H9V22ZM13 22H15V25H13V22ZM17 22H20V24H17V22ZM22 22H24V25H22V22ZM26 22H29V24H26V22Z" fill="#0F172A"/>
                  <path d="M9 26H12V29H9V26ZM14 26H16V29H14V26ZM18 26H20V29H18V26ZM22 26H25V29H22V26ZM27 26H29V29H27V26Z" fill="#0F172A"/>
                </svg>
              </div>
            </div>
          </div>
        `;

        const cutLineHtml = isEven ? `
          <div class="cut-line">
            <span>CUT HERE</span>
          </div>
        ` : '';

        return cardHtml + cutLineHtml;
      })
      .join('')}
  `;
}