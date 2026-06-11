import { abbreviateSchoolName } from "./abbreviate";

export const renderFineArtsBookletsLabels = (labels: any[], examCode: string, examYear: string): string => {
  return labels
    .map((label) => {
      const schoolName = abbreviateSchoolName(label.center_name || "");
      return `
        <div class="label-card">
          <div class="label-header">
            <h1>National Examinations Council of Tanzania</h1>
            <h2>${examCode} ${examYear} — FINE ARTS</h2>
          </div>
          <div class="label-body">
            <div class="center-info" style="background-color: #fff7ed; border-color: #ea580c;">
              <div class="center-code" style="color: #c2410c;">${label.center_number || "N/A"}</div>
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
            <div class="items-box" style="border-color: #ea580c;">
              <div class="items-title">Envelope Contents</div>
              <div class="items-grid">
                <div class="item-row">
                  <span class="item-name">Fine Arts Booklets</span>
                  <span class="item-qty" style="color: #c2410c; font-size: 12px;">${label.quantity || 0}</span>
                </div>
                <div class="item-row">
                  <span class="item-name">BKM</span>
                  <span class="item-qty">${label.bkm || 0}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="label-footer">
            <span class="category-badge" style="border-color: #ea580c; color: #c2410c;">Fine Arts</span>
            <div class="box-indicator" style="background-color: #ea580c;">ENV ${label.container_number} / ${label.total_containers}</div>
          </div>
        </div>
      `;
    })
    .join("");
};