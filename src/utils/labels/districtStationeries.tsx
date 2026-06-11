import { abbreviateSchoolName } from "./abbreviate";

export const renderDistrictStationeriesLabels = (labels: any[], examCode: string, examYear: string): string => {
  return labels
    .map((label) => {
      const singleLabelHtml = `
        <div class="label-card" style="
          border: 3px solid #000000;
          box-sizing: border-box;
          height: 122mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          background-color: #ffffff;
          padding: 10px 16px 8px 16px;
          font-family: 'Arial Black', 'Arial Bold', Arial, sans-serif;
        ">
          <!-- Exam Code + Year -->
          <div style="
            font-size: 20px;
            font-weight: 900;
            text-align: center;
            letter-spacing: 1px;
            color: #000000;
            font-family: Arial, sans-serif;
            margin-bottom: 0;
          ">
            ${examCode} ${examYear}
          </div>

          <!-- Region (very large, impact-style) -->
          <div style="
            font-size: 72px;
            font-weight: 900;
            text-align: center;
            text-transform: uppercase;
            color: #000000;
            font-family: 'Arial Black', Impact, Arial, sans-serif;
            line-height: 1;
            margin: 0;
          ">
            ${label.region || "N/A"}
          </div>

          <!-- District (large bold) -->
          <div style="
            font-size: 36px;
            font-weight: 900;
            text-align: center;
            text-transform: uppercase;
            color: #000000;
            font-family: 'Arial Black', Arial, sans-serif;
            line-height: 1;
            margin: 0;
          ">
            ${label.district || "N/A"}
          </div>

          <!-- Item + Quantity side by side in bordered box -->
          <div style="
            width: 100%;
            display: flex;
            flex-direction: row;
            border: 2.5px solid #000000;
            box-sizing: border-box;
          ">
            <!-- Item code (left) -->
            <div style="
              flex: 1;
              font-size: 48px;
              font-weight: 900;
              text-align: center;
              text-transform: uppercase;
              color: #000000;
              font-family: 'Arial Black', Arial, sans-serif;
              padding: 6px 0;
              border-right: 2.5px solid #000000;
              line-height: 1;
            ">
              ${label.item || "N/A"}
            </div>
            <!-- Quantity (right) -->
            <div style="
              width: 30%;
              font-size: 48px;
              font-weight: 900;
              text-align: center;
              color: #000000;
              font-family: 'Arial Black', Arial, sans-serif;
              padding: 6px 0;
              line-height: 1;
            ">
              ${label.quantity || 0}
            </div>
          </div>

          <!-- Box number (container_number / total_containers) -->
          <div style="
            font-size: 42px;
            font-weight: 900;
            text-align: center;
            color: #000000;
            font-family: 'Arial Black', Arial, sans-serif;
            line-height: 1;
          ">
            ${label.container_number}/${label.total_containers}
          </div>
        </div>
      `;

      // Return a single page container containing two identical labels (top and bottom)
      return `
        <div class="district-page-container" style="
          grid-column: span 2;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 272mm;
          page-break-after: always;
          box-sizing: border-box;
          padding: 4mm 0;
          background-color: #ffffff;
        ">
          <!-- Top Label -->
          ${singleLabelHtml}

          <!-- Divider Line for Cutting -->
          <div style="
            border-top: 2px dashed #000000;
            width: 100%;
            margin: 12px 0;
            position: relative;
            text-align: center;
          ">
            <span style="
              position: absolute;
              top: -10px;
              left: 50%;
              transform: translateX(-50%);
              background-color: #ffffff;
              padding: 0 15px;
              font-size: 10px;
              font-weight: 900;
              text-transform: uppercase;
              color: #000000;
              letter-spacing: 1.5px;
            ">
              ✂️ CUT HERE TO SEPARATE LABELS
            </span>
          </div>

          <!-- Bottom Label (Identical Copy) -->
          ${singleLabelHtml}
        </div>
      `;
    })
    .join("");
};