import { abbreviateSchoolName } from "./abbreviate";

export const renderDistrictStationeriesLabels = (labels: any[], examCode: string, examYear: string): string => {
  return labels
    .map((label) => {
      const singleLabelHtml = `
        <div class="label-card" style="height: 120mm; border: 3px solid #000; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: none; margin-bottom: 10mm;">
          <div class="label-header" style="border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
            <h1 style="font-size: 16px; font-weight: 900; letter-spacing: 1px;">National Examinations Council of Tanzania</h1>
            <h2 style="font-size: 14px; font-weight: 800; margin-top: 6px; text-transform: uppercase; color: #000;">${examCode} ${examYear} — DISTRICT STATIONERY</h2>
          </div>
          
          <div class="label-body" style="flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 15px;">
            <div class="center-info" style="background-color: #fffbeb; border: 2px solid #d97706; padding: 15px; border-radius: 10px; text-align: center;">
              <div class="center-code" style="font-size: 24px; font-weight: 900; color: #b45309; letter-spacing: 1.5px;">DISTRICT OFFICE</div>
              <div class="center-name" style="font-size: 18px; font-weight: 800; margin-top: 6px; text-transform: uppercase; color: #1e293b;">${label.district || "N/A"}</div>
            </div>
            
            <div class="meta-grid" style="grid-template-columns: 1fr; gap: 10px;">
              <div class="meta-item" style="border: 1.5px solid #cbd5e1; padding: 10px; border-radius: 8px; background-color: #f8fafc;">
                <div class="meta-label" style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Region Destination</div>
                <div class="meta-value" style="font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-top: 2px;">${label.region || "N/A"}</div>
              </div>
            </div>
            
            <div class="items-box" style="border: 2.5px solid #d97706; border-radius: 10px; padding: 15px; background-color: #fffdfa;">
              <div class="items-title" style="font-size: 11px; font-weight: 900; color: #b45309; border-bottom: 1.5px solid #d97706; padding-bottom: 6px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Allocated Item & Quantity</div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 16px; font-weight: 800; text-transform: uppercase; color: #1e293b;">${label.item || "N/A"}</span>
                <span style="font-size: 28px; font-weight: 900; color: #b45309; background-color: #fef3c7; padding: 4px 16px; border-radius: 8px; border: 1.5px solid #f59e0b;">QTY: ${label.quantity || 0}</span>
              </div>
            </div>
          </div>
          
          <div class="label-footer" style="border-top: 2.5px solid #000; padding-top: 12px; margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
            <span class="category-badge" style="border: 2px solid #d97706; color: #b45309; font-size: 12px; font-weight: 900; padding: 6px 16px; background-color: #fff;">DISTRICT ALLOCATION</span>
            <div class="box-indicator" style="background-color: #d97706; font-size: 18px; font-weight: 900; padding: 8px 20px; border-radius: 8px;">BOX ${label.container_number} / ${label.total_containers}</div>
          </div>
        </div>
      `;

      // Return a single page container containing two identical labels (top and bottom)
      return `
        <div class="district-page-container" style="grid-column: span 2; width: 100%; display: flex; flex-direction: column; justify-content: space-between; height: 270mm; page-break-after: always; box-sizing: border-box; padding: 5mm 0;">
          <!-- Top Label -->
          ${singleLabelHtml}
          
          <!-- Divider Line for Cutting -->
          <div style="border-top: 2px dashed #000; width: 100%; margin: 10px 0; position: relative; text-align: center;">
            <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background-color: #fff; padding: 0 10px; font-size: 10px; font-weight: bold; text-transform: uppercase; color: #666; letter-spacing: 1px;">Cut Here</span>
          </div>
          
          <!-- Bottom Label (Identical Copy) -->
          ${singleLabelHtml}
        </div>
      `;
    })
    .join("");
};