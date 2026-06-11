import { abbreviateSchoolName } from "./abbreviate";

export const renderDistrictStationeriesLabels = (labels: any[], examCode: string, examYear: string): string => {
  return labels
    .map((label) => {
      const singleLabelHtml = `
        <div class="label-card" style="
          border: 4px double #000000;
          padding: 24px;
          box-sizing: border-box;
          height: 122mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background-color: #ffffff;
          position: relative;
        ">
          <!-- Header Section -->
          <div style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 12px; margin-bottom: 12px;">
            <div style="font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin: 0; color: #000000;">
              THE NATIONAL EXAMINATIONS COUNCIL OF TANZANIA
            </div>
            <div style="font-size: 18px; font-weight: 900; text-transform: uppercase; margin-top: 6px; color: #000000; letter-spacing: 0.5px;">
              ${examCode} ${examYear}
            </div>
            <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; margin-top: 4px; color: #000000; letter-spacing: 1px;">
              DISTRICT STATIONERY DISTRIBUTION LABEL
            </div>
          </div>

          <!-- Main Content Grid -->
          <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 12px;">
            
            <!-- Destination Info Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
              <tr>
                <td style="width: 25%; border: 2px solid #000000; padding: 10px; font-size: 11px; font-weight: 900; text-transform: uppercase; background-color: #f1f5f9;">
                  REGION:
                </td>
                <td style="border: 2px solid #000000; padding: 10px; font-size: 18px; font-weight: 900; text-transform: uppercase; color: #000000; padding-left: 15px;">
                  ${label.region || "N/A"}
                </td>
              </tr>
              <tr>
                <td style="border: 2px solid #000000; padding: 10px; font-size: 11px; font-weight: 900; text-transform: uppercase; background-color: #f1f5f9;">
                  DISTRICT:
                </td>
                <td style="border: 2px solid #000000; padding: 10px; font-size: 18px; font-weight: 900; text-transform: uppercase; color: #000000; padding-left: 15px;">
                  ${label.district || "N/A"}
                </td>
              </tr>
            </table>

            <!-- Item & Quantity Box -->
            <div style="border: 3px solid #000000; padding: 16px; background-color: #ffffff; text-align: center;">
              <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1.5px solid #000000; padding-bottom: 6px; margin-bottom: 10px; color: #000000;">
                STATIONERY ITEM DESCRIPTION
              </div>
              <div style="font-size: 20px; font-weight: 900; text-transform: uppercase; color: #000000; margin-bottom: 8px;">
                ${label.item || "N/A"}
              </div>
              <div style="display: inline-block; font-size: 26px; font-weight: 900; color: #ffffff; background-color: #000000; padding: 6px 24px; border-radius: 4px; margin-top: 4px;">
                QTY: ${label.quantity || 0}
              </div>
            </div>

          </div>

          <!-- Footer Section -->
          <div style="border-top: 2px solid #000000; padding-top: 12px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; border: 2px solid #000000; padding: 6px 12px; background-color: #f1f5f9;">
              DISTRICT OFFICE COPY
            </div>
            <div style="font-size: 20px; font-weight: 900; color: #000000; border: 3px solid #000000; padding: 6px 16px; background-color: #ffffff; letter-spacing: 0.5px;">
              BOX ${label.container_number} OF ${label.total_containers}
            </div>
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