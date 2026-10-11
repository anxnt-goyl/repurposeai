import React, { useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { useToast } from '../../contexts/ToastContext';
import { episodeService } from '../../services/episodeService';
import { generateClientEpisodePdf } from '../../utils/pdfGenerator';
import { X, Download, FileText, Check, Archive, FileCode, CheckSquare, Square } from 'lucide-react';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportCategory = 'all' | 'show_notes' | 'transcript' | 'social' | 'blog' | 'newsletter';
type ExportFormat = 'pdf' | 'zip' | 'md' | 'txt' | 'json';

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { currentEpisode } = useProject();
  const { addToast } = useToast();

  const [category, setCategory] = useState<ExportCategory>('all');
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [approvedOnly, setApprovedOnly] = useState<boolean>(true);
  const [includeTranscript, setIncludeTranscript] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !currentEpisode) return null;

  const handleDownload = async () => {
    setIsExporting(true);

    try {
      const allAssets = Array.isArray(currentEpisode.assets) ? currentEpisode.assets : [];
      let transcript = Array.isArray(currentEpisode.transcript) ? currentEpisode.transcript : [];
      const keyTakeaways = Array.isArray(currentEpisode.keyTakeaways) ? currentEpisode.keyTakeaways : [];
      const chapters = Array.isArray(currentEpisode.chapters) ? currentEpisode.chapters : [];
      const moments = Array.isArray(currentEpisode.moments) ? currentEpisode.moments : [];
      const summary = currentEpisode.summary || '';

      // If exporting transcript or all content and transcript is not in state, attempt to fetch from API
      if ((category === 'all' || category === 'transcript') && transcript.length === 0 && includeTranscript) {
        try {
          const fetched = await episodeService.getTranscript(currentEpisode.id);
          if (Array.isArray(fetched) && fetched.length > 0) {
            transcript = fetched;
            currentEpisode.transcript = fetched;
          }
        } catch (fetchErr) {
          console.warn('[EXPORT] Failed to fetch transcript segments:', fetchErr);
        }
      }

      // Filter eligible assets based on approvedOnly setting
      const eligibleAssets = approvedOnly
        ? allAssets.filter((a) => a.status === 'approved')
        : allAssets.filter((a) => a.status !== 'rejected');

      // Filter assets by selected scope
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

      // Validate non-empty selection with informative user messages
      let isEmpty = false;
      let emptyMsg = '';

      if (category === 'transcript' && transcript.length === 0) {
        isEmpty = true;
        emptyMsg = 'No transcript segments available to export for this episode.';
      } else if (category === 'show_notes' && scopedAssets.length === 0) {
        isEmpty = true;
        emptyMsg = approvedOnly
          ? 'No approved show notes available to export. Uncheck "Approved assets only" to export drafts.'
          : 'No show notes available to export.';
      } else if (category === 'social' && scopedAssets.length === 0) {
        isEmpty = true;
        emptyMsg = approvedOnly
          ? 'No approved social posts available. Uncheck "Approved assets only" to export drafts.'
          : 'No social media posts available to export.';
      } else if (category === 'blog' && scopedAssets.length === 0) {
        isEmpty = true;
        emptyMsg = approvedOnly
          ? 'No approved blog article available to export.'
          : 'No blog article available to export.';
      } else if (category === 'newsletter' && scopedAssets.length === 0) {
        isEmpty = true;
        emptyMsg = approvedOnly
          ? 'No approved newsletter available to export.'
          : 'No newsletter available to export.';
      } else if (category === 'all' && scopedAssets.length === 0 && (!includeTranscript || transcript.length === 0) && !summary) {
        isEmpty = true;
        emptyMsg = 'No content available to export with the current filters.';
      }

      if (isEmpty) {
        addToast('Empty Selection', emptyMsg, 'warning');
        setIsExporting(false);
        return;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const sanitizedTitle = (currentEpisode.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const filename = `${sanitizedTitle}-${category}-${dateStr}.${format}`;

      // Helper for clean speaker label
      const getSpeakerLabel = (spk?: string) => (!spk || spk.toLowerCase() === 'speaker' ? 'Transcript' : spk);

      // 1. PDF Export
      if (format === 'pdf') {
        let pdfBlob: Blob;
        try {
          pdfBlob = await episodeService.exportPdf(currentEpisode.id, category, { approvedOnly, includeTranscript });
        } catch (apiErr) {
          console.warn('[EXPORT] Falling back to client-side PDF generation:', apiErr);
          pdfBlob = generateClientEpisodePdf(
            currentEpisode,
            scopedAssets,
            transcript,
            category,
            { approvedOnly, includeTranscript }
          );
        }

        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        try {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
        } catch {}

        addToast('Export Generated', `Successfully saved ${filename}`, 'success');
        setIsExporting(false);
        onClose();
        return;
      }

      // 2. ZIP Archive Export
      if (format === 'zip') {
        let zipBlob: Blob;
        try {
          zipBlob = await episodeService.exportZip(currentEpisode.id, category, { approvedOnly, includeTranscript });
        } catch (apiErr) {
          console.warn('[EXPORT] Falling back to client-side ZIP generation:', apiErr);
          const zip = new JSZip();

          const overviewLines: string[] = [
            `# ${currentEpisode.title}`,
            `**Duration:** ${currentEpisode.duration || 'N/A'} · **Exported:** ${new Date().toLocaleDateString()}`,
            currentEpisode.sourceUrl ? `**Source URL:** ${currentEpisode.sourceUrl}` : '',
            currentEpisode.sourceFilename ? `**Source File:** ${currentEpisode.sourceFilename}` : '',
            '',
            `## Executive Summary`,
            summary,
            '',
            `## Key Takeaways`,
            ...keyTakeaways.map((t) => `- ${t}`),
            '',
            `## Chapters`,
            ...chapters.map((c) => `- [${c.timestamp}] **${c.title}**: ${c.description || ''}`),
          ].filter(Boolean);
          zip.file('00_overview_and_summary.md', overviewLines.join('\n'));

          if (scopedAssets.length > 0) {
            const contentFolder = zip.folder('content');
            scopedAssets.forEach((ast, idx) => {
              const platformSlug = ast.platform.toLowerCase();
              const assetContent = [
                `# [${ast.platform.toUpperCase()}] ${ast.title}`,
                `*Status: ${ast.status} | Word Count: ${ast.wordCount}*`,
                '',
                ast.content,
              ].join('\n');
              contentFolder?.file(`${(idx + 1).toString().padStart(2, '0')}_${platformSlug}.md`, assetContent);
            });
          }

          if (includeTranscript && transcript.length > 0) {
            const transcriptLines = transcript.map((t) => `[${t.timestamp}] ${getSpeakerLabel(t.speaker)}:\n${t.text}\n`);
            zip.file('full_transcript.txt', transcriptLines.join('\n'));
          }

          zipBlob = await zip.generateAsync({ type: 'blob' });
        }

        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        try {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
        } catch {}

        addToast('Export Generated', `Successfully saved ${filename}`, 'success');
        setIsExporting(false);
        onClose();
        return;
      }

      // 3. Text/Markdown/JSON formats
      let contentToExport = '';

      if (format === 'json') {
        let exportObj: any;
        if (category === 'all') {
          exportObj = {
            title: currentEpisode.title,
            duration: currentEpisode.duration,
            sourceUrl: currentEpisode.sourceUrl,
            sourceFilename: currentEpisode.sourceFilename,
            exportedAt: new Date().toISOString(),
            summary,
            keyTakeaways,
            chapters,
            moments,
            assets: scopedAssets,
            transcript: includeTranscript && transcript.length > 0 ? transcript : undefined,
          };
        } else if (category === 'transcript') {
          exportObj = {
            title: currentEpisode.title,
            duration: currentEpisode.duration,
            exportedAt: new Date().toISOString(),
            transcript,
          };
        } else {
          exportObj = {
            title: currentEpisode.title,
            category,
            exportedAt: new Date().toISOString(),
            assets: scopedAssets,
          };
        }
        contentToExport = JSON.stringify(exportObj, null, 2);
      } else if (format === 'md') {
        const sections: string[] = [];
        if (category === 'all') {
          sections.push(`# ${currentEpisode.title}`);
          sections.push(`**Duration:** ${currentEpisode.duration || 'N/A'} · **Exported:** ${new Date().toLocaleDateString()}`);
          if (currentEpisode.sourceUrl) sections.push(`**Source Video:** [Watch on YouTube](${currentEpisode.sourceUrl})`);
          if (summary) {
            sections.push(`\n## Executive Summary\n${summary}`);
          }
          if (keyTakeaways.length > 0) {
            sections.push(`\n## Key Takeaways\n${keyTakeaways.map((t) => `- ${t}`).join('\n')}`);
          }
          if (chapters.length > 0) {
            sections.push(`\n## Chapters\n${chapters.map((c) => `- **${c.timestamp}** ${c.title}${c.description ? `: ${c.description}` : ''}`).join('\n')}`);
          }
          if (scopedAssets.length > 0) {
            sections.push(`\n---\n\n## Platform-Adapted Content Assets (${scopedAssets.length})`);
            scopedAssets.forEach((ast) => {
              sections.push(`\n### [${ast.platform.toUpperCase()}] ${ast.title}\n*Status: ${ast.status} · Word count: ${ast.wordCount}*\n\n${ast.content}\n`);
            });
          }
          if (includeTranscript && transcript.length > 0) {
            sections.push(`\n---\n\n## Full Transcript`);
            transcript.forEach((t) => {
              sections.push(`[${t.timestamp}] ${getSpeakerLabel(t.speaker)}:\n${t.text}\n`);
            });
          }
        } else if (category === 'transcript') {
          sections.push(`# ${currentEpisode.title} - Full Transcript`);
          sections.push(`**Duration:** ${currentEpisode.duration || 'N/A'} · **Exported:** ${new Date().toLocaleDateString()}\n`);
          transcript.forEach((t) => {
            sections.push(`[${t.timestamp}] ${getSpeakerLabel(t.speaker)}:\n${t.text}\n`);
          });
        } else {
          sections.push(`# ${currentEpisode.title} - ${category.toUpperCase().replace('_', ' ')}`);
          sections.push(`**Exported:** ${new Date().toLocaleDateString()}\n`);
          scopedAssets.forEach((ast) => {
            sections.push(`## [${ast.platform.toUpperCase()}] ${ast.title}\n*Status: ${ast.status} · Word count: ${ast.wordCount}*\n\n${ast.content}\n`);
          });
        }
        contentToExport = sections.join('\n');
      } else {
        // Plain Text format
        const sections: string[] = [];
        if (category === 'all') {
          sections.push(`${currentEpisode.title.toUpperCase()}`);
          sections.push(`Duration: ${currentEpisode.duration || 'N/A'} | Exported: ${new Date().toLocaleDateString()}\n`);
          if (summary) {
            sections.push(`EXECUTIVE SUMMARY\n${summary}\n`);
          }
          if (keyTakeaways.length > 0) {
            sections.push(`KEY TAKEAWAYS\n${keyTakeaways.map((t) => `• ${t}`).join('\n')}\n`);
          }
          if (chapters.length > 0) {
            sections.push(`CHAPTERS\n${chapters.map((c) => `[${c.timestamp}] ${c.title}${c.description ? ` - ${c.description}` : ''}`).join('\n')}\n`);
          }
          if (scopedAssets.length > 0) {
            sections.push(`========================================\nCONTENT ASSETS (${scopedAssets.length})\n========================================\n`);
            scopedAssets.forEach((ast) => {
              sections.push(`[${ast.platform.toUpperCase()}] ${ast.title}\nStatus: ${ast.status} | Word count: ${ast.wordCount}\n\n${ast.content}\n\n----------------------------------------\n`);
            });
          }
          if (includeTranscript && transcript.length > 0) {
            sections.push(`========================================\nFULL TRANSCRIPT\n========================================\n`);
            transcript.forEach((t) => {
              sections.push(`[${t.timestamp}] ${getSpeakerLabel(t.speaker)}:\n${t.text}\n`);
            });
          }
        } else if (category === 'transcript') {
          sections.push(`${currentEpisode.title.toUpperCase()} - FULL TRANSCRIPT`);
          sections.push(`Duration: ${currentEpisode.duration || 'N/A'} | Exported: ${new Date().toLocaleDateString()}\n`);
          transcript.forEach((t) => {
            sections.push(`[${t.timestamp}] ${getSpeakerLabel(t.speaker)}:\n${t.text}\n`);
          });
        } else {
          sections.push(`${currentEpisode.title.toUpperCase()} - ${category.toUpperCase().replace('_', ' ')}`);
          sections.push(`Exported: ${new Date().toLocaleDateString()}\n`);
          scopedAssets.forEach((ast) => {
            sections.push(`[${ast.platform.toUpperCase()}] ${ast.title}\nStatus: ${ast.status} | Word count: ${ast.wordCount}\n\n${ast.content}\n\n----------------------------------------\n`);
          });
        }
        contentToExport = sections.join('\n');
      }

      if (!contentToExport || !contentToExport.trim()) {
        addToast('Export Error', 'Export content is empty.', 'error');
        setIsExporting(false);
        return;
      }

      const mimeType =
        format === 'json'
          ? 'application/json;charset=utf-8'
          : format === 'md'
          ? 'text/markdown;charset=utf-8'
          : 'text/plain;charset=utf-8';

      const blob = new Blob([contentToExport], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
      } catch {}

      addToast('Export Generated', `Successfully saved ${filename}`, 'success');
      setIsExporting(false);
      onClose();
    } catch (err: any) {
      console.error('[EXPORT] Export error:', err);
      addToast('Export Failed', err.message || 'An error occurred during export.', 'error');
      setIsExporting(false);
    }
  };

  const approvedAssetsCount = (currentEpisode.assets || []).filter((a) => a.status === 'approved').length;
  const totalAssetsCount = (currentEpisode.assets || []).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-xl border p-5 sm:p-6 shadow-2xl transition-all"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      >
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <h2 className="text-base font-semibold">Export Assets</h2>
            <p className="text-xs mt-0.5 truncate max-w-sm sm:max-w-md" style={{ color: 'var(--text-secondary)' }}>
              {currentEpisode.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Close export modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-5 space-y-5">
          {/* Output Format selection */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-secondary)' }}>
              1. Output Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'pdf', label: 'PDF Dossier (.pdf)', desc: 'Executive publication format with styled layout' },
                { id: 'zip', label: 'ZIP Archive (.zip)', desc: 'Bundled folder with individual markdown files' },
                { id: 'md', label: 'Markdown (.md)', desc: 'Clean formatted markdown prose' },
                { id: 'txt', label: 'Plain Text (.txt)', desc: 'Raw unformatted text file' },
                { id: 'json', label: 'JSON Data (.json)', desc: 'Programmatic structured payload' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setFormat(fmt.id as ExportFormat)}
                  className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    format === fmt.id
                      ? 'border-neutral-900 dark:border-white font-medium bg-neutral-100 dark:bg-white/10'
                      : 'border-transparent bg-neutral-500/5 hover:bg-neutral-500/10'
                  }`}
                >
                  <span className="text-xs font-medium flex items-center justify-between">
                    {fmt.label}
                    {format === fmt.id && <Check className="w-3 h-3 ml-1 text-emerald-500" />}
                  </span>
                  <span className="text-[10px] mt-1 opacity-70 leading-tight">
                    {fmt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Scope selection */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-secondary)' }}>
              2. Content Scope
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'All Content' },
                { id: 'show_notes', label: 'Show Notes' },
                { id: 'transcript', label: 'Transcript' },
                { id: 'social', label: 'Social Posts' },
                { id: 'blog', label: 'Blog Article' },
                { id: 'newsletter', label: 'Newsletter' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setCategory(opt.id as ExportCategory)}
                  className={`text-xs px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                    category === opt.id
                      ? 'border-neutral-900 dark:border-white font-medium bg-neutral-100 dark:bg-white/10'
                      : 'border-transparent bg-neutral-500/5 hover:bg-neutral-500/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Export Settings & Filters */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-secondary)' }}>
              3. Filter & Options
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setApprovedOnly(!approvedOnly)}
                className="p-2.5 rounded-lg border flex items-center gap-2.5 text-left text-xs transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: approvedOnly ? 'var(--accent-primary)' : 'var(--border-subtle)',
                }}
              >
                {approvedOnly ? (
                  <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 opacity-50 shrink-0" />
                )}
                <div>
                  <p className="font-medium">Approved Assets Only</p>
                  <p className="text-[10px] opacity-70">
                    {approvedOnly
                      ? `Includes only ${approvedAssetsCount} approved asset(s)`
                      : `Includes all ${totalAssetsCount} drafts (excluding rejected)`}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIncludeTranscript(!includeTranscript)}
                className="p-2.5 rounded-lg border flex items-center gap-2.5 text-left text-xs transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: includeTranscript ? 'var(--accent-primary)' : 'var(--border-subtle)',
                }}
              >
                {includeTranscript ? (
                  <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 opacity-50 shrink-0" />
                )}
                <div>
                  <p className="font-medium">Include Full Transcript</p>
                  <p className="text-[10px] opacity-70">
                    {includeTranscript
                      ? 'Appends timestamped transcript segments'
                      : 'Excludes full transcript from document'}
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div
            className="p-3 rounded-lg text-xs flex items-center gap-2 border"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <FileText className="w-4 h-4 shrink-0 text-neutral-400" />
            <span>
              Real binary download. Filtered by your selections and compiled directly from persisted MongoDB assets.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg hover:bg-neutral-500/10 transition-colors cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-contrast)',
            }}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Preparing...' : `Download ${format.toUpperCase()}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
