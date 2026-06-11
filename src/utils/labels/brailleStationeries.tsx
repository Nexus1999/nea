import { abbreviateSchoolName } from "./abbreviate";

export const renderBrailleStationeriesLabels = (labels: any[], examCode: string, examYear: string): string => {
  return labels
    .map((label) => {
      const schoolName = abbreviateSchoolName(label.center_name || "");
      return `
        <div class="label-card">
          <div class="label-header">
            <h1>National Examinations Council of Tanzania</h1>
            <h2>${examCode} ${examYear} — BRAILLE SPECIAL NEEDS</h2>
          </div>
          <div class="label-body">
            <div class="center-info" style="background-color: #fdf2f8; border-color: #db2777;">
              <div class="center-code" style="color: #be185d;">${label.center_number || "N/A"}</div>
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
            <div class="items-box" style="border-color: #db2777;">
              <div class="items-title">Envelope Contents</div>
              <div class="items-grid">
                <div class="item-row">
                  <span class="item-name">Braille Sheets</span>
                  <span class="item-qty" style="color: #be185d; font-size: 12px;">${label.quantity || 0}</span>
                </div>
                <div class="item-row">
                  <span class="item-name">Braille BKM</span>
                  <span class="item-qty">${label.bkm || 0}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="label-footer">
            <span class="category-badge" style="border-color: #db2777; color: #be185d;">Braille</span>
            <div class="box-indicator" style="background-color: #db2777;">ENV ${label.container_number} / ${label.total_containers}</div>
          </div>
        </div>
      `;
    })
    .join("");
};