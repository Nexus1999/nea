"use client";

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

export const renderDistrictStationeriesLabels = (
  labels: any[],
  examCode: string,
  examYear: string
): string => {
  return labels
    .map((label) => {
      const qrData = encodeURIComponent(
        JSON.stringify({
          id: label.id,
          mid: label.mid,
          region: label.region,
          district: label.district,
          item: label.item,
          qty: label.quantity,
          box: `${label.container_number}/${label.total_containers}`,
        })
      );

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}`;

      // Render a single label card HTML
      const renderLabelCard = () => `
        <div class="label-card">
          <!-- Top Header: Exam Code & Year -->
          <div class="header-row">
            <div class="exam-badge">${examCode} ${examYear}</div>
          </div>

          <!-- Region & District -->
          <div class="location-section">
            <div class="region-text">${label.region || ""}</div>
            <div class="district-text">${label.district || ""}</div>
          </div>

          <!-- Item & Quantity Section -->
          <div class="content-section">
            <div class="item-details">
              <div class="item-name">${label.item || ""}</div>
              <div class="item-qty">QTY: ${label.quantity || 0}</div>
            </div>
            <!-- QR Code -->
            <div class="qr-container">
              <img src="${qrUrl}" alt="QR Code" class="qr-image" />
            </div>
          </div>

          <!-- Bottom Box Number -->
          <div class="footer-row">
            <div class="box-number">BOX ${label.container_number || "1"}/${label.total_containers || "1"}</div>
          </div>
        </div>
      `;

      return `
        <div class="a4-page">
          <!-- Top Label -->
          ${renderLabelCard()}

          <!-- Dashed Cut Line -->
          <div class="cut-line">
            <span>✂️ CUT HERE ✂️</span>
          </div>

          <!-- Bottom Label (Identical Copy) -->
          ${renderLabelCard()}
        </div>
      `;
    })
    .join("\n");
};