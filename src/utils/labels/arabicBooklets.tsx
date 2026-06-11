import { abbreviateSchoolName } from "./abbreviate";

export const renderArabicBookletsLabels = (labels: any[], examCode: string, examYear: string): string => {
  return labels
    .map((label) => {
      const schoolName = abbreviateSchoolName(label.center_name || "");
      return `
        <div class="label-card">
          <div class="label-header">
            <h1>National Examinations Council of Tanzania</h1>
            <h2>${examCode} ${examYear} — ARABIC BOOKLETS</h2>
          </div>
          <div class="label-body">
            <div class="center-info" style="background-color: #ecfdf5; border-color: #059669;">
              <div class="center-code" style="color: #047857;">${label.center_number || "N/A"}</div>
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
            <div class="items-box" style="border-color: #059669;">
              <div class="items-title">Envelope Contents</div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
                <span style="font-size: 11px; font-weight: bold;">Arabic Language Booklets</span>
                <span style="font-size: 16px; font-weight: 900; color: #047857;">${label.quantity || 0}</span>
              </div>
            </div>
          </div>
          <div class="label-footer">
            <span class="category-badge" style="border-color: #059669; color: #047857;">Arabic</span>
            <div class="box-indicator" style="background-color: #059669;">ENV ${label.container_number} / ${label.total_containers}</div>
          </div>
        </div>
      `;
    })
    .join("");
};