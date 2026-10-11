import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useProject } from '../contexts/ProjectContext';
import {
  Upload,
  Youtube,
  FileVideo,
  FileAudio,
  ArrowRight,
  Check,
  Sparkles,
  Info,
  X,
  FileText,
} from 'lucide-react';

export const NewRepurposePage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { setCurrentEpisodeById } = useProject();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'youtube' | 'transcript'>('upload');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    duration: string;
    size: string;
    fileObj?: File;
  } | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customSpeakers, setCustomSpeakers] = useState('');
  const [customTranscriptText, setCustomTranscriptText] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const processRealFile = (file: File) => {
    // 1. File extension validation
    const allowedExts = ['.mp4', '.mov', '.webm', '.mp3', '.wav', '.m4a'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    const isMimeValid = file.type.startsWith('video/') || file.type.startsWith('audio/');
    if (!allowedExts.includes(ext) && !isMimeValid) {
      addToast(
        'Unsupported Format',
        `"${file.name}" is not supported. Please upload MP4, MOV, WEBM, MP3, WAV, or M4A.`,
        'error'
      );
      return;
    }

    // 2. Empty file validation
    if (file.size === 0) {
      addToast(
        'Empty File',
        `"${file.name}" has 0 bytes. Please select a valid recording file.`,
        'error'
      );
      return;
    }

    // 3. File size limit validation (500 MB)
    const MAX_SIZE_BYTES = 500 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      addToast(
        'File Too Large',
        `"${file.name}" exceeds the 500 MB upload limit. Please compress or select a smaller file.`,
        'error'
      );
      return;
    }

    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    const cleanSize = Number(sizeInMB) > 0 ? `${sizeInMB} MB` : `${Math.round(file.size / 1024)} KB`;

    let estimatedDuration = '34:20';
    try {
      const media = document.createElement(file.type.startsWith('video') ? 'video' : 'audio');
      media.preload = 'metadata';
      media.src = URL.createObjectURL(file);
      media.onloadedmetadata = () => {
        URL.revokeObjectURL(media.src);
        if (media.duration && !isNaN(media.duration)) {
          const mins = Math.floor(media.duration / 60);
          const secs = Math.floor(media.duration % 60);
          const formatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
          setSelectedFile((prev) => (prev ? { ...prev, duration: formatted } : null));
        }
      };
    } catch {
      // Fallback
    }

    const autoTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    if (!customTitle || customTitle === 'New Recording') {
      setCustomTitle(autoTitle);
    }

    setSelectedFile({
      name: file.name,
      duration: estimatedDuration,
      size: cleanSize,
      fileObj: file,
    });
    addToast('File Loaded', `${file.name} (${cleanSize}) ready for processing`, 'info');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processRealFile(e.target.files[0]);
    }
  };

  const handleAnalyze = () => {
    if (activeTab === 'upload' && !selectedFile) {
      addToast('File Required', 'Please drop or browse an audio or video file', 'warning');
      return;
    }
    if (activeTab === 'youtube') {
      if (!youtubeUrl.trim()) {
        addToast('URL Required', 'Please enter a valid YouTube video URL', 'warning');
        return;
      }
      const isYt =
        youtubeUrl.includes('youtube.com') ||
        youtubeUrl.includes('youtu.be') ||
        /^[A-Za-z0-9_-]{11}$/.test(youtubeUrl.trim());
      if (!isYt) {
        addToast(
          'Invalid YouTube URL',
          'Please provide a valid YouTube link (e.g. youtube.com/watch?v=, youtu.be/, or shorts)',
          'warning'
        );
        return;
      }
    }
    if (activeTab === 'transcript' && (!customTitle.trim() || !customTranscriptText.trim())) {
      addToast('Input Required', 'Please provide an episode title and script/transcript text', 'warning');
      return;
    }

    let title = '';
    let duration = '35:20';
    let fileSize = '115 MB';
    let filename = '';
    let sourceType: 'video' | 'audio' | 'youtube' = 'video';

    if (activeTab === 'upload' && selectedFile) {
      filename = selectedFile.name;
      title = customTitle.trim() || selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      duration = selectedFile.duration;
      fileSize = selectedFile.size;
      sourceType = selectedFile.name.match(/\.(mp3|wav|m4a|aac)$/i) ? 'audio' : 'video';
    } else if (activeTab === 'youtube') {
      title = customTitle.trim(); // Server will retrieve real YouTube metadata title if blank
      filename = youtubeUrl;
      duration = '38:40';
      fileSize = 'YouTube Stream';
      sourceType = 'youtube';
    } else if (activeTab === 'transcript') {
      title = customTitle.trim();
      filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
      duration = '28:15';
      fileSize = 'Raw Transcript Text';
      sourceType = 'audio';
    }

    navigate('/processing', {
      state: {
        title: title || undefined,
        sourceType,
        filename,
        duration,
        fileSize,
        mediaFile: selectedFile?.fileObj,
        youtubeUrl: activeTab === 'youtube' ? youtubeUrl.trim() : undefined,
        customTranscript: customTranscriptText || undefined,
        customSpeakers: customSpeakers || undefined,
        isNew: true,
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Hidden native file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/*,video/*"
        className="hidden"
      />

      {/* Title & Description */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Create a new repurpose
        </h1>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Ingest video, audio file, YouTube URL, or raw transcript into the multi-platform agent pipeline.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl border max-w-md overflow-x-auto"
        style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'upload'
              ? 'bg-white dark:bg-neutral-800 shadow-xs font-semibold'
              : 'opacity-60 hover:opacity-100'
          }`}
          style={{
            color: activeTab === 'upload' ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          Upload Media
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('youtube')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'youtube'
              ? 'bg-white dark:bg-neutral-800 shadow-xs font-semibold'
              : 'opacity-60 hover:opacity-100'
          }`}
          style={{
            color: activeTab === 'youtube' ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          YouTube URL
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transcript')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'transcript'
              ? 'bg-white dark:bg-neutral-800 shadow-xs font-semibold'
              : 'opacity-60 hover:opacity-100'
          }`}
          style={{
            color: activeTab === 'transcript' ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          Paste Transcript
        </button>
      </div>

      {/* Upload UI */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processRealFile(e.dataTransfer.files[0]);
              }
            }}
            className={`p-8 sm:p-12 rounded-2xl border-2 border-dashed text-center space-y-3 transition-colors ${
              isDragging
                ? 'border-amber-500 bg-amber-500/5'
                : 'hover:border-neutral-400'
            }`}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: isDragging ? '#f59e0b' : 'var(--border-subtle)',
            }}
          >
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-neutral-500/10 text-neutral-400">
              <Upload className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold">Drop your audio or video file here</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-amber-500 font-semibold hover:underline cursor-pointer"
                >
                  Browse files from computer
                </button>
              </p>
            </div>

            <p className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
              Supports MP4, MOV, WEBM, MP3, WAV, M4A · Max file size: 500 MB
            </p>
          </div>

          {/* Selected File Details Box */}
          {selectedFile ? (
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-neutral-500/10 text-neutral-400 shrink-0">
                    <FileVideo className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{selectedFile.name}</p>
                    <p className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {selectedFile.duration} · {selectedFile.size}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-1 rounded text-[11px] font-medium border hover:bg-neutral-500/10 cursor-pointer transition-colors"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 rounded hover:bg-neutral-500/10 text-neutral-400 hover:text-red-500 cursor-pointer transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Optional user-editable Project Title */}
              <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--border-subtle)' }}>
                <label className="text-[11px] font-medium block" style={{ color: 'var(--text-secondary)' }}>
                  Project Title (optional, defaults to filename)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border outline-none font-sans"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* YouTube Input UI */}
      {activeTab === 'youtube' && (
        <div
          className="p-6 rounded-2xl border space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold block">
              Paste YouTube Video URL
            </label>
            <div className="relative">
              <Youtube className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-red-500" />
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border outline-none font-mono"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div
            className="p-3 rounded-lg text-[11px] flex items-start gap-2 border"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
            <span>
              Public YouTube episodes will be transcribed, aligned with phonetic timestamps, and adapted across all platform surfaces.
            </span>
          </div>
        </div>
      )}

      {/* Raw Transcript Input UI */}
      {activeTab === 'transcript' && (
        <div
          className="p-6 rounded-2xl border space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold block">
              Episode / Presentation Title
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Scaling Autonomous Agent Pipelines in Production"
              className="w-full px-3 py-2 text-xs rounded-lg border outline-none font-sans"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold block">
              Speakers
            </label>
            <input
              type="text"
              value={customSpeakers}
              onChange={(e) => setCustomSpeakers(e.target.value)}
              placeholder="e.g. Alex Rivera (Host), Dr. Jordan Lee (Guest)"
              className="w-full px-3 py-2 text-xs rounded-lg border outline-none font-sans"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold block">
              Raw Transcript or Show Notes Text
            </label>
            <textarea
              rows={6}
              value={customTranscriptText}
              onChange={(e) => setCustomTranscriptText(e.target.value)}
              placeholder="Paste your conversation text, recording transcript, or episode notes here..."
              className="w-full px-3 py-2 text-xs rounded-lg border outline-none font-sans"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>
      )}

      {/* Primary Action Button */}
      {(() => {
        const isInputValid =
          (activeTab === 'upload' && !!selectedFile) ||
          (activeTab === 'youtube' && !!youtubeUrl.trim()) ||
          (activeTab === 'transcript' && !!customTitle.trim() && !!customTranscriptText.trim());

        return (
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!isInputValid}
              className={`w-full py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md ${
                isInputValid
                  ? 'cursor-pointer hover:opacity-90'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-contrast)',
              }}
            >
              <span>Analyze & Repurpose Episode</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {!isInputValid && (
              <p className="text-[11px] text-center" style={{ color: 'var(--text-tertiary)' }}>
                {activeTab === 'upload'
                  ? 'Please select or drop an audio or video file to proceed.'
                  : activeTab === 'youtube'
                  ? 'Please paste a YouTube video link to proceed.'
                  : 'Please enter a title and transcript text to proceed.'}
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
};
