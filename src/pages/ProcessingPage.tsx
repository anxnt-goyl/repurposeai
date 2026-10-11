import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useToast } from '../contexts/ToastContext';
import { episodeService } from '../services/episodeService';
import {
  Check,
  Loader2,
  AlertCircle,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProcessingStage {
  id: string;
  name: string;
  description: string;
}

export const ProcessingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addNewEpisode } = useProject();
  const { addToast } = useToast();

  const stateData = (location.state as any) || {};
  const displayTitle =
    stateData.title ||
    (stateData.youtubeUrl ? 'YouTube Recording' : stateData.mediaFile?.name ? stateData.mediaFile.name : 'New Recording');
  const sourceType = stateData.sourceType || 'video';
  const duration = stateData.duration || '30:00';

  const stages: ProcessingStage[] = [
    {
      id: 'upload',
      name: 'Ingesting media source',
      description: 'Uploading recording and validating audio/video stream...',
    },
    {
      id: 'transcribe',
      name: 'Transcribing speech',
      description: 'Extracting timestamped phonetic transcript and speaker turns...',
    },
    {
      id: 'understand',
      name: 'Content analysis',
      description: 'Analyzing conversation themes, chapters, and key takeaways...',
    },
    {
      id: 'moments',
      name: 'Extracting high-value moments',
      description: 'Identifying viral hooks, quotable insights, and contrarian perspectives...',
    },
    {
      id: 'generate',
      name: 'Synthesizing platform assets',
      description: 'Drafting tailored content for LinkedIn, X, Instagram, Blog, Newsletter, and Show Notes...',
    },
    {
      id: 'finalize',
      name: 'Finalizing workspace',
      description: 'Persisting asset records and setting up editorial review queue...',
    },
  ];

  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isExecutingRef = useRef(false);

  useEffect(() => {
    if (!stateData.title && !stateData.mediaFile && !stateData.youtubeUrl && !stateData.customTranscript) {
      navigate('/new-repurpose', { replace: true });
      return;
    }

    if (isExecutingRef.current) return;
    isExecutingRef.current = true;

    let isMounted = true;
    let stageInterval: any = null;

    // Simulate progressive stage advancement while API executes in background
    stageInterval = setInterval(() => {
      setCurrentStageIdx((prev) => {
        if (prev < stages.length - 2) {
          return prev + 1;
        }
        return prev;
      });
    }, 2800);

    async function runPipeline() {
      try {
        setErrorMsg(null);
        console.log(`[PROCESSING] Initiating real backend pipeline for: "${displayTitle}"`);

        const newEpisode = await episodeService.createEpisode({
          title: stateData.title || undefined,
          sourceType,
          mediaFile: stateData.mediaFile,
          youtubeUrl: stateData.youtubeUrl,
          customTranscript: stateData.customTranscript,
          customSpeakers: stateData.customSpeakers,
          duration,
        });

        if (!isMounted) return;

        clearInterval(stageInterval);
        setCurrentStageIdx(stages.length - 1);

        addNewEpisode(newEpisode);

        try {
          confetti({
            particleCount: 30,
            spread: 55,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }

        addToast(
          'Repurposing Complete',
          `Workspace ready for "${newEpisode.title}"`,
          'success'
        );

        setTimeout(() => {
          if (isMounted) {
            navigate(`/workspace/${newEpisode.id}`, { replace: true });
          }
        }, 800);
      } catch (err: any) {
        clearInterval(stageInterval);
        if (!isMounted) return;
        console.error('[PROCESSING] Pipeline error:', err);
        setErrorMsg(err.message || 'Processing failed. Please verify your inputs and retry.');
        addToast('Processing error', err.message || 'Could not process recording', 'error');
      }
    }

    runPipeline();

    return () => {
      isMounted = false;
      if (stageInterval) clearInterval(stageInterval);
    };
  }, []);

  const progressPercent = errorMsg
    ? 0
    : Math.min(100, Math.round(((currentStageIdx + 1) / stages.length) * 100));

  return (
    <div className="max-w-xl mx-auto py-12 px-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="text-[11px] font-mono uppercase text-amber-500 font-semibold tracking-wider">
          Processing Pipeline
        </span>
        <h1 className="text-2xl font-bold tracking-tight">
          Processing "{displayTitle}"
        </h1>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Autonomous content pipeline is ingesting, analyzing, and generating multi-platform assets.
        </p>
      </div>

      {errorMsg ? (
        <div
          className="p-6 rounded-2xl border space-y-4 text-center"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
          }}
        >
          <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-red-500/10 text-red-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-red-500">Pipeline Failed</h3>
            <p className="text-xs leading-relaxed max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
              {errorMsg}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/new-repurpose')}
              className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:opacity-90"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-contrast)',
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
            <button
              onClick={() => navigate('/projects')}
              className="px-3.5 py-2 rounded-lg text-xs font-medium border hover:bg-neutral-500/5 transition-colors cursor-pointer flex items-center gap-1.5"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Projects</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div
              className="flex justify-between items-center text-xs font-mono"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span>Stage {currentStageIdx + 1} of {stages.length}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-500/10 overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Stages Progression List */}
          <div
            className="rounded-2xl border divide-y overflow-hidden shadow-sm"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {stages.map((stage, idx) => {
              const isComplete = idx < currentStageIdx;
              const isActive = idx === currentStageIdx;
              const isPending = idx > currentStageIdx;

              return (
                <div
                  key={stage.id}
                  className={`p-4 flex items-start gap-3.5 transition-colors ${
                    isActive ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isComplete && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                    {isActive && (
                      <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center animate-spin">
                        <Loader2 className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {isPending && (
                      <div className="w-5 h-5 rounded-full bg-neutral-500/10 text-neutral-400 flex items-center justify-center text-[10px] font-mono">
                        {idx + 1}
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-xs font-semibold ${
                          isActive ? 'text-amber-500' : isComplete ? '' : 'opacity-50'
                        }`}
                      >
                        {stage.name}
                      </p>
                      <span className="text-[10px] font-mono uppercase opacity-50">
                        {isComplete ? 'Done' : isActive ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                    <p
                      className="text-[11px] leading-relaxed"
                      style={{
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        opacity: isPending ? 0.4 : 0.8,
                      }}
                    >
                      {stage.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="text-center">
        <p className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
          RepurposeAI Autonomous Media Pipeline
        </p>
      </div>
    </div>
  );
};
