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
 * Renders high-fidelity stationery box labels resembling the official NECTA PDF layout.
 */
export function renderStationeriesLabels(
  labels: LabelItem[],
  examCode: string,
  examYear: string
): string {
  return labels
    .map((label) => {
      const boxNum = label.container_number || "1";
      const totalBoxes = label.total_containers || 1;
      
      return `
        <div class="label-card">
          <div class="label-inner">
            <!-- Header -->
            <div class="label-header">
              <div class="necta-title">THE NATIONAL EXAMINATIONS COUNCIL OF TANZANIA</div>
              <div class="exam-badge">${examCode} ${examYear}</div>
              <div class="label-subject">STATIONERY BOX LABEL</div>
            </div>

            <!-- Metadata Grid -->
            <div class="meta-grid">
              <div class="meta-row">
                <span class="meta-label">REGION:</span>
                <span class="meta-value">${label.region.toUpperCase()}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">DISTRICT:</span>
                <span class="meta-value">${label.district.toUpperCase()}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">CENTER:</span>
                <span class="meta-value highlight-text">${label.center_number} - ${label.center_name.toUpperCase()}</span>
              </div>
            </div>

            <!-- Contents Table -->
            <table class="contents-table">
              <thead>
                <tr>
                  <th>STATIONERY ITEM</th>
                  <th class="text-center">QUANTITY</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>NORMAL BOOKLETS</td>
                  <td class="text-center qty-cell">${label.normal_booklets || 0}</td>
                </tr>
                <tr>
                  <td>GRAPH BOOKLETS</td>
                  <td class="text-center qty-cell">${label.graph_booklets || 0}</td>
                </tr>
                <tr>
                  <td>NORMAL LOOSE SHEETS</td>
                  <td class="text-center qty-cell">${label.normal_loosesheets || 0}</td>
                </tr>
                <tr>
                  <td>GRAPH LOOSE SHEETS</td>
                  <td class="text-center qty-cell">${label.graph_loosesheets || 0}</td>
                </tr>
                <tr class="bkm-row">
                  <td>BKM (BLACK KRAFT MANILA)</td>
                  <td class="text-center qty-cell font-bold">${label.bkm || 0}</td>
                </tr>
              </tbody>
            </table>

            <!-- Footer Box Info -->
            <div class="label-footer">
              <div class="box-indicator">
                BOX <span class="box-number">${boxNum}</span> OF <span class="box-total">${totalBoxes}</span>
              </div>
              <div class="security-seal">
                <div class="seal-text">NECTA SECURITY SEAL</div>
                <div class="seal-barcode">|||||||||||||||||||||||||||||||||</div>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("") + `
      <style>
        /* Label Card Styling */
        .label-card {
          background: #ffffff;
          border: 4px double #000000;
          padding: 24px;
          box-sizing: border-box;
          width: 100%;
          max-width: 460px;
          margin: 10px auto;
          position: relative;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          page-break-inside: avoid;
        }

        .label-inner {
          border: 1px solid #e2e8f0;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Header */
        .label-header {
          text-align: center;
          border-bottom: 2px solid #000000;
          padding-bottom: 12px;
        }

        .necta-title {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #0f172a;
          margin-bottom: 6px;
        }

        .exam-badge {
          display: inline-block;
          background-color: #000000;
          color: #ffffff;
          font-size: 14px;
          font-weight: 900;
          padding: 4px 16px;
          border-radius: 4px;
          margin-bottom: 6px;
          letter-spacing: 1px;
        }

        .label-subject {
          font-size: 16px;
          font-weight: 900;
          color: #000000;
          letter-spacing: 1px;
        }

        /* Metadata Grid */
        .meta-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background-color: #f8fafc;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .meta-row {
          display: flex;
          align-items: flex-start;
          font-size: 12px;
        }

        .meta-label {
          font-weight: 800;
          color: #475569;
          width: 80px;
          flex-shrink: 0;
        }

        .meta-value {
          font-weight: 700;
          color: #0f172a;
        }

        .highlight-text {
          color: #000000;
          font-size: 13px;
        }

        /* Contents Table */
        .contents-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
        }

        .contents-table th {
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 8px;
          font-size: 11px;
          font-weight: 800;
          text-align: left;
          color: #334155;
        }

        .contents-table td {
          border: 1px solid #cbd5e1;
          padding: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #0f172a;
        }

        .qty-cell {
          font-size: 14px;
          font-weight: 800;
        }

        .bkm-row {
          background-color: #f8fafc;
        }

        .text-center {
          text-align: center;
        }

        /* Footer Box Info */
        .label-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 2px solid #000000;
          padding-top: 12px;
          margin-top: 8px;
        }

        .box-indicator {
          font-size: 14px;
          font-weight: 900;
          color: #000000;
        }

        .box-number {
          font-size: 20px;
          text-decoration: underline;
        }

        .box-total {
          font-size: 20px;
        }

        .security-seal {
          text-align: right;
        }

        .seal-text {
          font-size: 9px;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.5px;
        }

        .seal-barcode {
          font-family: monospace;
          font-size: 12px;
          letter-spacing: -1px;
          color: #0f172a;
          margin-top: 2px;
        }

        /* Print Adjustments */
        @media print {
          .label-card {
            box-shadow: none;
            margin: 15px auto;
            page-break-inside: avoid;
          }
        }
      </style>
    `;
}