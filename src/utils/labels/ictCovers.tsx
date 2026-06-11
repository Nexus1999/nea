import { abbreviateSchoolName } from "./abbreviate";

export const renderIctCoversLabels = (labels: any[], examCode: string, examYear: string): string => {
  return labels
    .map((label) => {
      const schoolName = abbreviateSchoolName(label.center_name || "");
      return `
        <div class="label-card">
          <div class="label-header">
            <h1>National Examinations Council of Tanzania</h1>
            <h2>${examCode} ${examYear} — ICT COVERS</h2>
          </div>
          <div class="label-body">
            <div class="center-info" style="background-color: #f5f3ff; border-color: #7c3aed;">
              <div class="center-code" style="color: #6d28d9;">${label.center_number || "N/A"}</div>
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
            <div class="items-box" style="border-color: #7c3aed;">
              <div class="items-title">Envelope Contents</div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
                <span style="font-size: 11px; font-weight: bold;">ICT Answer Covers</span>
                <span style="font-size: 16px; font-weight: 900; color: #6d28d9;">${label.quantity || 0}</span>
              </div>
            </div>
          </div>
          <div class="label-footer">
            <span class="category-badge" style="border-color: #7c3aed; color: #6d28d9;">ICT</span>
            <div class="box-indicator" style="background-color: #7c3aed;">ENV ${label.container_number} / ${label.total_containers}</div>
          </div>
        </div>
      `;
    })
    .join("");
};