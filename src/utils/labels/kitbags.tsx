import { abbreviateSchoolName } from "./abbreviate";

export const renderKitbagsLabels = (labels: any[], examCode: string, examYear: string): string => {
  return labels
    .map((label) => {
      return `
        <div class="label-card">
          <div class="label-header">
            <h1>National Examinations Council of Tanzania</h1>
            <h2>${examCode} ${examYear} — KITBAG LABEL</h2>
          </div>
          <div class="label-body">
            <div class="center-info" style="background-color: #e0f2fe; border-color: #0284c7;">
              <div class="center-code" style="color: #0369a1;">KITBAG ALLOCATION</div>
              <div class="center-name" style="font-size: 12px;">${label.region || "N/A"}</div>
            </div>
            <div class="meta-grid" style="grid-template-columns: 1fr;">
              <div class="meta-item">
                <div class="meta-label">Destination</div>
                <div class="meta-value">Regional Office</div>
              </div>
            </div>
            <div class="items-box" style="border-color: #0284c7;">
              <div class="items-title">Kitbag Contents</div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
                <span style="font-size: 11px; font-weight: bold;">Supervisor Kitbags</span>
                <span style="font-size: 16px; font-weight: 900; color: #0369a1;">${label.quantity || 0}</span>
              </div>
            </div>
          </div>
          <div class="label-footer">
            <span class="category-badge" style="border-color: #0284c7; color: #0369a1;">Kitbags</span>
            <div class="box-indicator" style="background-color: #0284c7;">BOX ${label.container_number} / ${label.total_containers}</div>
          </div>
        </div>
      `;
    })
    .join("");
};