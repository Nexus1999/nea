"use client";

export const generateLabelsHtml = (contentHtml: string): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Labels Print Preview</title>
      <style>
        /* Reset & Page Setup */
        @page {
          size: A4 portrait;
          margin: 0;
        }
        
        body {
          margin: 0;
          padding: 0;
          background-color: #f3f4f6;
          font-family: Arial, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* A4 Page Container */
        .a4-page {
          width: 210mm;
          height: 297mm;
          background-color: #ffffff;
          box-sizing: border-box;
          padding: 10mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          page-break-after: always;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          margin: 10px auto;
        }

        /* Label Card Styling */
        .label-card {
          height: 125mm;
          border: 4px solid #000000;
          border-radius: 12px;
          padding: 8mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background-color: #ffffff;
        }

        /* Dashed Cut Line */
        .cut-line {
          height: 10mm;
          display: flex;
          align-items: center;
          justify-content: center;
          border-top: 2px dashed #9ca3af;
          position: relative;
          margin: 5mm 0;
        }

        .cut-line span {
          background-color: #ffffff;
          padding: 0 15px;
          color: #6b7280;
          font-size: 12pt;
          font-weight: bold;
          font-family: Arial, sans-serif;
        }

        /* Header Row: Exam Code & Year */
        .header-row {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 4mm;
        }

        .exam-badge {
          font-family: Arial, sans-serif;
          font-size: 28pt;
          font-weight: bold;
          text-transform: uppercase;
          border: 3px solid #000000;
          padding: 6px 24px;
          border-radius: 8px;
          letter-spacing: 1px;
        }

        /* Location Section: Region & District */
        .location-section {
          text-align: center;
          margin-bottom: 4mm;
        }

        .region-text {
          font-family: 'Elephant', 'Impact', 'Georgia', serif;
          font-size: 55pt;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 2mm;
          line-height: 1.1;
        }

        .district-text {
          font-family: Arial, sans-serif;
          font-size: 55pt;
          font-weight: bold;
          text-transform: uppercase;
          line-height: 1.1;
        }

        /* Content Section: Item, Qty & QR Code */
        .content-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex: 1;
          margin: 4mm 0;
          padding: 0 4mm;
        }

        .item-details {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 4mm;
          flex: 1;
        }

        .item-name {
          font-family: Arial, sans-serif;
          font-size: 60pt;
          font-weight: bold;
          text-transform: uppercase;
          line-height: 1.1;
        }

        .item-qty {
          font-family: Arial, sans-serif;
          font-size: 60pt;
          font-weight: bold;
          text-transform: uppercase;
          line-height: 1.1;
        }

        /* QR Code Container */
        .qr-container {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 8mm;
        }

        .qr-image {
          width: 220px;
          height: 220px;
          border: 2px solid #000000;
          padding: 4px;
          background-color: #ffffff;
        }

        /* Footer Row: Box Number */
        .footer-row {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 4mm;
        }

        .box-number {
          font-family: Arial, sans-serif;
          font-size: 58pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* Print Specific Styles */
        @media print {
          body {
            background-color: #ffffff;
          }
          .a4-page {
            margin: 0;
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      ${contentHtml}
    </body>
    </html>
  `;
};