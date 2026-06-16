import { jsPDF } from 'jspdf';
import { Invitation } from '../types';

export function downloadInvitationPDF(invite: Invitation) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const { title, theme, content } = invite;
  const primaryColor = theme.colors.primary || '#800020';
  const headingFont = theme.fonts.heading;
  const isSerif = headingFont === 'Playfair Display' || headingFont === 'Cinzel';
  const docFont = isSerif ? 'times' : 'helvetica';

  // Draw background border frame
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(1.5);
  doc.rect(10, 10, 190, 277); // A4 dimensions: 210 x 297 mm
  
  doc.setLineWidth(0.5);
  doc.rect(12, 12, 186, 273);

  // Subtitle / Welcome tag
  doc.setFont(docFont, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text("YOU ARE CORDIALLY INVITED TO CELEBRATE", 105, 30, { align: 'center' });

  // Event Title
  doc.setFont(docFont, 'bold');
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  
  // Wrap event title text
  const wrappedTitle = doc.splitTextToSize(content.eventTitle || title, 160);
  let currentY = 45;
  doc.text(wrappedTitle, 105, currentY, { align: 'center' });
  currentY += wrappedTitle.length * 10;

  // Divider lines
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(0.3);
  doc.line(85, currentY, 125, currentY);
  currentY += 12;

  // Description / Warm invite message
  doc.setFont(docFont, 'italic');
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  const wrappedDesc = doc.splitTextToSize(content.eventDescription || '', 150);
  doc.text(wrappedDesc, 105, currentY, { align: 'center' });
  currentY += Math.max(wrappedDesc.length * 6, 12);

  // Big Date & Time
  doc.setFont(docFont, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor);
  doc.text(content.dateText || 'Saturday, September 26, 2026', 105, currentY, { align: 'center' });
  currentY += 15;

  // Locations / Schedule Section
  doc.setFont(docFont, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("EVENT DETAILS", 105, currentY, { align: 'center' });
  currentY += 8;
  doc.setLineWidth(0.2);
  doc.line(90, currentY, 120, currentY);
  currentY += 10;

  if (content.schedule && content.schedule.length > 0) {
    content.schedule.forEach((sc) => {
      if (currentY > 230) {
        doc.addPage();
        // Redraw inner borders for subsequent page
        doc.setDrawColor(primaryColor);
        doc.setLineWidth(1.5);
        doc.rect(10, 10, 190, 277);
        doc.setLineWidth(0.5);
        doc.rect(12, 12, 186, 273);
        currentY = 25;
      }

      doc.setFont(docFont, 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor);
      doc.text(sc.title, 105, currentY, { align: 'center' });
      currentY += 5;

      doc.setFont(docFont, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`${sc.time} - ${sc.venue}`, 105, currentY, { align: 'center' });
      currentY += 5;

      doc.setFont(docFont, 'italic');
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      doc.text(sc.address, 105, currentY, { align: 'center' });
      currentY += 12;
    });
  }

  // Dress Code & Registries
  if (content.dressCode || content.giftInfo) {
    if (currentY > 220) {
      doc.addPage();
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(1.5);
      doc.rect(10, 10, 190, 277);
      doc.setLineWidth(0.5);
      doc.rect(12, 12, 186, 273);
      currentY = 25;
    }

    if (content.dressCode) {
      doc.setFont(docFont, 'bold');
      doc.setFontSize(10);
      doc.setTextColor(110, 80, 20); // Warm gold accent label
      doc.text("DRESS CODE", 105, currentY, { align: 'center' });
      currentY += 5;

      doc.setFont(docFont, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);
      const wrappedDress = doc.splitTextToSize(content.dressCode, 150);
      doc.text(wrappedDress, 105, currentY, { align: 'center' });
      currentY += wrappedDress.length * 5 + 10;
    }

    if (content.giftInfo) {
      doc.setFont(docFont, 'bold');
      doc.setFontSize(10);
      doc.setTextColor(20, 100, 50); // Emerald color register
      doc.text("GIFT REGISTRY / WISHES", 105, currentY, { align: 'center' });
      currentY += 5;

      doc.setFont(docFont, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);
      const wrappedGift = doc.splitTextToSize(content.giftInfo, 150);
      doc.text(wrappedGift, 105, currentY, { align: 'center' });
      currentY += wrappedGift.length * 5 + 10;
    }
  }

  // Footer note
  doc.setFont(docFont, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("GENERATED VIA INVITEFRAME PLATFORM", 105, 270, { align: 'center' });

  doc.save(`invitation-${invite.slug || 'details'}.pdf`);
}
