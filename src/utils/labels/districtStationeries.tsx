import { abbreviateSchoolName } from "./abbreviate";

export const renderDistrictStationeriesLabels = (labels: any[], examCode: string, examYear: string): string => {
  return labels
    .map((label) => {
      return `
        <div class="label-card">
          <div class="label-header">
            <h1>National Examinations Council of Tanzania</h1>
            <h2>${examCode} ${examYear} — DISTRICT STATIONERY</h2>
          </div>
          <div class="label-body">
            <div class="center-info" style="background-color: #fffbeb; border-color: #d97706;">
              <div class="center-code" style="font-size: 16px; color: #b45309;">DISTRICT OFFICE</div>
              <div class="center-name" style="font-size: 12px;">${label.district || "N/A"}</div>
            </div>
            <div class="meta-grid" style="grid-template-columns: 1fr;">
              <div class="meta-item">
                <div class="meta-label">Region</div>
                <div class="meta-value">${label.region || "N/A"}</div>
              </div>
            </div>
            <div class="items-box" style="border-color: #d97706;">
              <div class="items-title">Allocated Item</div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
                <span style="font-size: 12px; font-weight: bold; text-transform: uppercase;">${label.item || "N/A"}</span>
                <span style="font-size: 16px; font-weight: 900; color: #b45309;">QTY: ${label.quantity || 0}</span>
              </div>
            </div>
          </div>
          <div class="label-footer">
            <span class="category-badge" style="border-color: #d97706; color: #b45309;">District Alloc</span>
            <div class="box-indicator" style="background-color: #d97706;">BOX ${label.container_number} / ${label.total_containers}</div>
          </div>
        </div>
      `;
    })
    .join("");
};