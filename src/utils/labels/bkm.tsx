import { abbreviateSchoolName } from "./abbreviate";

export const renderBkmLabels = (labels: any[], examCode: string, examYear: string): string => {
  return labels
    .map((label) => {
      const schoolName = abbreviateSchoolName(label.center_name || "");
      return `
        <div class="label-card">
          <div class="label-header">
            <h1>National Examinations Council of Tanzania</h1>
            <h2>${examCode} ${examYear} — BKM ENVELOPE</h2>
          </div>
          <div class="label-body">
            <div class="center-info" style="background-color: #f0fdfa; border-color: #0d9488;">
              <div class="center-code" style="color: #0f766e;">${label.center_number || "N/A"}</div>
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
            <div class="items-box" style="border-color: #0d9488;">
              <div class="items-title">Envelope Contents</div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
                <span style="font-size: 11px; font-weight: bold;">BKM (Blackboard Marker)</span>
                <span style="font-size: 16px; font-weight: 900; color: #0f766e;">${label.bkm || 0}</span>
              </div>
            </div>
          </div>
          <div class="label-footer">
            <span class="category-badge" style="border-color: #0d9488; color: #0f766e;">BKM</span>
            <div class="box-indicator" style="background-color: #0d9488;">ENV ${label.container_number} / ${label.total_containers}</div>
          </div>
        </div>
      `;
    })
    .join("");
};