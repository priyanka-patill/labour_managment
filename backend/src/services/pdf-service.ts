import PDFDocument from 'pdfkit';

export function generateInvoicePdf(payment: any, employer: any, labour: any, job: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header Brand
      doc
        .fillColor('#4f46e5')
        .font('Helvetica-Bold')
        .fontSize(20)
        .text('SHRAMIK PLATFORM', 50, 50)
        .fontSize(10)
        .fillColor('#6b7280')
        .font('Helvetica')
        .text('Workforce Hiring & Management', 50, 75);

      // Invoice metadata
      doc
        .fillColor('#1f2937')
        .font('Helvetica')
        .fontSize(12)
        .text('INVOICE / RECEIPT', 400, 50, { align: 'right' })
        .fontSize(9)
        .fillColor('#4b5563')
        .text(`Invoice No: INV-${payment._id?.substring(0, 8).toUpperCase()}`, 400, 65, { align: 'right' })
        .text(`Date: ${new Date(payment.createdAt || Date.now()).toLocaleDateString()}`, 400, 78, { align: 'right' })
        .text(`Txn ID: ${payment.transactionId || 'MOCK-TXN'}`, 400, 91, { align: 'right' });

      // Draw horizontal line
      doc.moveTo(50, 115).lineTo(550, 115).strokeColor('#e5e7eb').lineWidth(1).stroke();

      // Employer details (Billed By)
      doc
        .fontSize(10)
        .fillColor('#9ca3af')
        .text('BILLED TO:', 50, 135)
        .fillColor('#1f2937')
        .font('Helvetica-Bold')
        .text(employer.companyName || employer.name || 'Contractor', 50, 150)
        .font('Helvetica')
        .text(`Email: ${employer.email || 'N/A'}`, 50, 163)
        .text(`Mobile: ${employer.mobile || 'N/A'}`, 50, 176)
        .text(`Address: ${employer.address || 'N/A'}`, 50, 189);

      // Labour details (Billed To)
      doc
        .fontSize(10)
        .fillColor('#9ca3af')
        .text('RENDERED BY:', 300, 135)
        .fillColor('#1f2937')
        .font('Helvetica-Bold')
        .text(labour.name || 'Worker', 300, 150)
        .font('Helvetica')
        .text(`Skill Category: ${job.category || 'Labour'}`, 300, 163)
        .text(`Email: ${labour.email || 'N/A'}`, 300, 176)
        .text(`Mobile: ${labour.mobile || 'N/A'}`, 300, 189);

      // Job / Work details table
      const tableTop = 230;
      doc.moveTo(50, tableTop).lineTo(550, tableTop).strokeColor('#374151').lineWidth(1.5).stroke();

      doc
        .fontSize(10)
        .fillColor('#374151')
        .font('Helvetica-Bold')
        .text('Job Description / Item', 55, tableTop + 8)
        .text('Rate / Cost Type', 280, tableTop + 8)
        .text('Hired Qty', 420, tableTop + 8, { align: 'right' })
        .text('Total Price', 490, tableTop + 8, { align: 'right' });

      doc.moveTo(50, tableTop + 25).lineTo(550, tableTop + 25).strokeColor('#e5e7eb').lineWidth(1).stroke();

      // Item description
      const itemY = tableTop + 35;
      doc
        .fontSize(10)
        .fillColor('#1f2937')
        .font('Helvetica-Bold')
        .text(job.title || 'Workforce Labour Services', 55, itemY, { width: 210 })
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#4b5563')
        .text(job.description?.substring(0, 80) + '...', 55, itemY + 15, { width: 210 })
        .fontSize(10)
        .text(`${job.wageType === 'daily' ? 'Daily Wage' : job.wageType === 'weekly' ? 'Weekly Wage' : 'Fixed Cost'}`, 280, itemY)
        .text(`Rs. ${job.budget || payment.amount} / worker`, 280, itemY + 15)
        .text('1 Worker', 420, itemY, { align: 'right' })
        .font('Helvetica-Bold')
        .text(`Rs. ${payment.amount}`, 490, itemY, { align: 'right' })
        .font('Helvetica');

      // Total details
      const totalY = itemY + 70;
      doc.moveTo(50, totalY).lineTo(550, totalY).strokeColor('#e5e7eb').lineWidth(1).stroke();

      doc
        .fontSize(10)
        .fillColor('#4b5563')
        .text('Subtotal:', 380, totalY + 10)
        .text('Service Platform Fee (0%):', 380, totalY + 25)
        .fillColor('#1f2937')
        .font('Helvetica-Bold')
        .text('Total Paid:', 380, totalY + 45)
        .font('Helvetica')
        .fontSize(10)
        .text(`Rs. ${payment.amount}`, 490, totalY + 10, { align: 'right' })
        .text('Rs. 0.00', 490, totalY + 25, { align: 'right' })
        .fontSize(12)
        .fillColor('#4f46e5')
        .font('Helvetica-Bold')
        .text(`Rs. ${payment.amount}`, 490, totalY + 45, { align: 'right' })
        .font('Helvetica');

      // Verification stamp
      doc.moveTo(50, totalY + 90).lineTo(550, totalY + 90).strokeColor('#e5e7eb').lineWidth(1).stroke();
      doc
        .fillColor('#10b981')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('PAYMENT RECEIVED & VERIFIED', 50, totalY + 105)
        .font('Helvetica')
        .fillColor('#4b5563')
        .fontSize(8)
        .text('Thank you for choosing Shramik. This is an automatically generated receipt; no signature is required.', 50, totalY + 120);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
