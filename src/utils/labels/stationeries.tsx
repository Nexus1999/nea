import { abbreviateSchoolName } from "./abbreviate";

export const renderStationeriesLabels = (labels: any[], examCode: string, examYear: string): string => {
  return labels
    .map((label) => {
      const schoolName = abbreviateSchoolName(label.center_name || "");
      return `
        <div class="label-card">
          <div class="label-header">
            <h1>National Examinations Council of Tanzania</h1>
            <h2>${examCode} ${examYear} — STATIONERY LABEL</h2>
          </div>
          <div class="label-body">
            <div class="center-info">
              <div class="center-code">${label.center_number || "N/A"}</div>
              <div class="center-name">${schoolName}</div>
            </div>
            <div class="meta-grid">
              <div class="meta-item">
                <div class="meta-label">Region</div>
                <div class="meta-value">${label.region || "N/A"}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">District</div>
                <div class="meta-value">${label.district || "N/A"}</div>
              </div>
            </div>
            <div class="items-box">
              <div class="items-title">Box Contents</div>
              <div class="items-grid">
                <div class="item-row">
                  <span class="item-name">Normal Booklets</span>
                  <span class="item-qty">${label.normal_booklets || 0}</span>
                </div>
                <div class="item-row">
                  <span class="item-name">Graph Booklets</span>
                  <span class="item-qty">${label.graph_booklets || 0}</span>
                </div>
                <div class="item-row">
                  <span class="item-name">Normal Loose Sheets</span>
                  <span class="item-qty">${label.normal_loosesheets || 0}</span>
                </div>
                <div class="item-row">
                  <span class="item-name">Graph Loose Sheets</span>
                  <span class="item-qty">${label.graph_loosesheets || 0}</span>
                </div>
                <div class="item-row" style="grid-column: span 2; border-top: 1px solid #000; margin-top: 2px; padding-top: 2px;">
                  <span class="item-name">BKM</span>
                  <span class="item-qty">${label.bkm || 0}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="label-footer">
            <span class="category-badge">Stationeries</span>
            <div class="box-indicator">BOX ${label.container_number} / ${label.total_containers}</div>
          </div>
        </div>
      `;
    })
    .join("");
};