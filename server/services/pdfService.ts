import { jsPDF } from 'jspdf';
import { DBEpisode, DBContentAsset, DBTranscriptSegment } from '../db/types';

export interface PdfExportOptions {
  includeTranscript?: boolean;
  approvedOnly?: boolean;
}

export function generateEpisodePdf(
  episode: DBEpisode,
  assets: DBContentAsset[],
  transcript: DBTranscriptSegment[],
  category: string = 'all',
  options?: PdfExportOptions
): Uint8Array {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 44;
  const contentWidth = pageWidth - margin * 2;
  const bottomMargin = 55;

  let y = margin;

  // Helper for pagination
  function checkPageBreak(requiredHeight: number) {
    if (y + requiredHeight > pageHeight - bottomMargin) {
      doc.addPage();
      y = margin;
      drawRunningHeader();
    }
  }

  function drawRunningHeader() {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('REPURPOSEAI · ASSET EXPORT DOSSIER', margin, 28);
    const shortTitle = (episode.title || '').length > 40 ? (episode.title || '').substring(0, 37) + '...' : (episode.title || '');
    doc.text(shortTitle, pageWidth - margin, 28, { align: 'right' });
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(margin, 34, pageWidth - margin, 34);
  }

  // Filter eligible assets
  const eligibleAssets = options?.approvedOnly
    ? assets.filter((a) => a.status === 'approved')
    : assets.filter((a) => a.status !== 'rejected');

  let scopedAssets = eligibleAssets;
  if (category === 'social') {
    scopedAssets = eligibleAssets.filter((a) => ['linkedin', 'x', 'instagram'].includes(a.platform));
  } else if (category === 'show_notes') {
    scopedAssets = eligibleAssets.filter((a) => a.platform === 'show_notes');
  } else if (category === 'blog') {
    scopedAssets = eligibleAssets.filter((a) => a.platform === 'blog');
  } else if (category === 'newsletter') {
    scopedAssets = eligibleAssets.filter((a) => a.platform === 'newsletter');
  } else if (category === 'transcript') {
    scopedAssets = [];
  }

  // --- Document Header ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text('REPURPOSEAI · PUBLICATION-READY DOSSIER', margin, y);
  y += 18;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(23, 23, 23); // neutral-900
  const titleLines = doc.splitTextToSize(episode.title || 'Untitled Project', contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 24 + 4;

  // Metadata line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(115, 115, 115); // neutral-500
  const metaParts = [
    `Duration: ${episode.duration || 'N/A'}`,
    `Source: ${(episode.sourceType || 'Video').toUpperCase()}`,
    `Processed: ${episode.dateProcessed || new Date().toLocaleDateString()}`,
    `Assets Included: ${scopedAssets.length}`,
  ];
  doc.text(metaParts.join('  ·  '), margin, y);
  y += 14;

  // YouTube source link if applicable
  if (episode.sourceUrl && episode.sourceUrl.includes('youtube')) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(220, 38, 38); // red-600
    doc.text(`Original Video: ${episode.sourceUrl}`, margin, y);
    doc.link(margin, y - 8, contentWidth, 12, { url: episode.sourceUrl });
    y += 16;
  } else if (episode.sourceFilename) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(115, 115, 115);
    doc.text(`Source File: ${episode.sourceFilename} (${episode.fileSize || 'Local Ingest'})`, margin, y);
    y += 16;
  }

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // --- Executive Summary (for 'all' scope) ---
  if ((category === 'all' || !scopedAssets.length) && episode.summary) {
    checkPageBreak(80);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('EXECUTIVE SUMMARY', margin, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const summaryLines = doc.splitTextToSize(episode.summary, contentWidth);
    checkPageBreak(summaryLines.length * 13 + 10);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 13 + 18;
  }

  // --- Key Takeaways ---
  if (category === 'all' && Array.isArray(episode.keyTakeaways) && episode.keyTakeaways.length > 0) {
    checkPageBreak(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('KEY STRATEGIC TAKEAWAYS', margin, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    episode.keyTakeaways.forEach((point, idx) => {
      const pointLines = doc.splitTextToSize(`• ${point}`, contentWidth - 10);
      checkPageBreak(pointLines.length * 12 + 6);
      doc.text(pointLines, margin + 6, y);
      y += pointLines.length * 12 + 4;
    });
    y += 14;
  }

  // --- Chapters ---
  if (category === 'all' && Array.isArray(episode.chapters) && episode.chapters.length > 0) {
    checkPageBreak(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('TIMESTAMPED CHAPTERS', margin, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    episode.chapters.forEach((chap) => {
      const text = `[${chap.timestamp}] ${chap.title}${chap.description ? ` — ${chap.description}` : ''}`;
      const chapLines = doc.splitTextToSize(text, contentWidth);
      checkPageBreak(chapLines.length * 11 + 4);
      doc.text(chapLines, margin, y);
      y += chapLines.length * 11 + 3;
    });
    y += 16;
  }

  // --- Content Assets Section ---
  if (scopedAssets.length > 0) {
    checkPageBreak(50);
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(23, 23, 23);
    const scopeLabel = category === 'all' ? 'PLATFORM-ADAPTED CONTENT ASSETS' : `${category.toUpperCase().replace('_', ' ')} ASSETS`;
    doc.text(`${scopeLabel} (${scopedAssets.length})`, margin, y);
    y += 18;

    scopedAssets.forEach((asset, idx) => {
      checkPageBreak(90);

      // Asset Container Header
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 36, 4, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const badgeText = `[${asset.platform.toUpperCase()}] ${asset.title}`;
      const cleanBadge = badgeText.length > 65 ? badgeText.substring(0, 62) + '...' : badgeText;
      doc.text(cleanBadge, margin + 10, y + 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const metaStr = `Status: ${asset.status.toUpperCase()} · ${asset.wordCount || 0} words · ~${asset.readingTimeMinutes || 1} min read`;
      doc.text(metaStr, margin + 10, y + 27);
      y += 46;

      // Asset body
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);

      const contentLines = doc.splitTextToSize(asset.content, contentWidth - 16);
      for (const line of contentLines) {
        checkPageBreak(13);
        doc.text(line, margin + 8, y);
        y += 12.5;
      }

      y += 16;
    });
  }

  // --- Full Transcript Section ---
  const shouldIncludeTranscript = options?.includeTranscript !== false && (category === 'all' || category === 'transcript');
  if (shouldIncludeTranscript && Array.isArray(transcript) && transcript.length > 0) {
    checkPageBreak(60);
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(23, 23, 23);
    doc.text(`FULL TRANSCRIPT (${transcript.length} segments)`, margin, y);
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    transcript.forEach((seg) => {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      const speakerLabel = (!seg.speaker || seg.speaker.toLowerCase() === 'speaker') ? 'Transcript' : seg.speaker;
      doc.text(`[${seg.timestamp}] ${speakerLabel}:`, margin, y);
      y += 11;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      const segLines = doc.splitTextToSize(seg.text, contentWidth - 10);
      for (const l of segLines) {
        checkPageBreak(11);
        doc.text(l, margin + 6, y);
        y += 10.5;
      }
      y += 5;
    });
  }

  // --- Add Page Numbers to All Pages ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`RepurposeAI · Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 24, {
      align: 'right',
    });
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, pageHeight - 24);
  }

  return new Uint8Array(doc.output('arraybuffer'));
}
