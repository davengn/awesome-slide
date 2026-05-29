import config from 'virtual:awesome-slide/config';
import {
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  Download,
  FileCode2,
  FileText,
  Link2,
  Loader2,
  Maximize,
  MonitorSpeaker,
  Pencil,
  Play,
} from 'lucide-react';
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AssetView } from '@/components/asset-view';
import { HistoryProvider } from '@/components/history-provider';
import { CommentWidget } from '@/components/inspector/comment-widget';
import { InspectOverlay } from '@/components/inspector/inspect-overlay';
import { InspectorPanel } from '@/components/inspector/inspector-panel';
import {
  InspectorProvider,
  InspectToggleButton,
  useInspector,
} from '@/components/inspector/inspector-provider';
import { SaveBar } from '@/components/inspector/save-bar';
import { DesignProvider } from '@/components/style-panel/design-provider';
import { DesignPanel, DesignToggleButton } from '@/components/style-panel/style-panel';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFolders } from '@/lib/folders';
import { useAgentSocketConnected } from '@/lib/use-agent-socket';
import { format, useLocale } from '@/lib/use-locale';
import { useWheelPageNavigation } from '@/lib/use-wheel-page-navigation';
import { cn } from '@/lib/utils';
import { AgentChatDrawer, AgentChatPanel } from '../components/agent-chat/index.ts';
import { ClickNavZones } from '../components/click-nav-zones';
import { NotesDrawer } from '../components/notes-drawer';
import { PdfProgressToast } from '../components/pdf-progress-toast';
import { openPresenterWindow, Player } from '../components/player';
import type { ActiveConnectionSnapshot } from '../components/settings';
import {
  agentConnectionReducer,
  cancelAgentConnectionScan,
  createConnectionStatus,
  createInitialAgentConnectionUiState,
  getAgentConnectionBootstrap,
  QuickConnectionSwitcher,
  SettingsModal,
  setActiveAgentConnection,
  startAgentConnectionScan,
  streamAgentConnectionScanEvents,
} from '../components/settings';
import { SlideCanvas } from '../components/slide-canvas';
import { SlideTransitionLayer } from '../components/slide-transition-layer';
import { type ThumbnailActions, ThumbnailRail } from '../components/thumbnail-rail';
import type { SelectedElementDescriptor } from '../lib/agent-chat-types.ts';
import { readStorageWithLegacy, writeStorageWithLegacy } from '../lib/compat-storage';
import { exportSlideAsHtml } from '../lib/export-html';
import { exportSlideAsPdf, isSafari } from '../lib/export-pdf';
import { remapNotesSessionCacheAfterReorder } from '../lib/inspector/use-notes';
import type { SlideModule } from '../lib/sdk';
import { usePrefersReducedMotion } from '../lib/use-prefers-reduced-motion';
import { useSlideModule } from '../lib/use-slide-module';

const { showSlideUi, showSlideBrowser, allowHtmlDownload } = config.build;

export function Slide() {
  const { slideId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { slide, error } = useSlideModule(slideId);
  const [playMode, setPlayMode] = useState<'window' | 'fullscreen' | null>(null);

  const seedPrompt =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('prompt') || undefined
      : undefined;

  useEffect(() => {
    const promptParam = searchParams.get('prompt');
    if (promptParam) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('prompt');
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  const t = useLocale();
  const prefersReducedMotion = usePrefersReducedMotion();

  const modulePages = useMemo(() => slide?.default ?? [], [slide]);
  const [pages, setPages] = useState<typeof modulePages>(modulePages);
  useEffect(() => {
    setPages(modulePages);
  }, [modulePages]);
  const pageCount = pages.length;
  const rawIndex = Number(searchParams.get('p') ?? '1') - 1;
  const index = Number.isFinite(rawIndex) ? Math.max(0, Math.min(pageCount - 1, rawIndex)) : 0;
  const view = searchParams.get('view') === 'assets' ? 'assets' : 'slides';

  useEffect(() => {
    if (!import.meta.hot) return;
    if (!slideId || !slide || pageCount === 0) return;
    import.meta.hot.send('awesome-slide:current', {
      slideId,
      pageIndex: index,
      totalPages: pageCount,
      slideTitle: slide.meta?.title ?? slideId,
      view,
    });
    import.meta.hot.send('open-slide:current', {
      slideId,
      pageIndex: index,
      totalPages: pageCount,
      slideTitle: slide.meta?.title ?? slideId,
      view,
    });
  }, [slideId, index, pageCount, slide, view]);

  const goTo = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(pageCount - 1, i));
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('p', String(clamped + 1));
          return next;
        },
        { replace: true },
      );
    },
    [pageCount, setSearchParams],
  );

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-16 text-muted-foreground">
        {showSlideBrowser && (
          <Link to="/" className="text-[12px] font-medium text-foreground/70 hover:text-foreground">
            ← {t.common.home}
          </Link>
        )}
        <span className="mt-6 block eyebrow text-destructive/80">{t.common.loadFailed}</span>
        <h2 className="mt-2 font-heading text-xl font-semibold tracking-tight text-foreground">
          {t.common.failedToLoadSlide}
        </h2>
        <pre className="mt-4 overflow-auto rounded-[6px] border border-border bg-card p-4 text-[11.5px] leading-relaxed whitespace-pre-wrap shadow-edge">
          {error}
        </pre>
      </div>
    );
  }

  if (!slide) {
    return (
      <div className="grid min-h-dvh place-items-center px-8 text-muted-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-px w-56 overflow-hidden bg-hairline">
            <span
              aria-hidden
              className="line-loader-bar absolute inset-y-[-0.5px] left-0 w-1/4 bg-foreground"
            />
          </div>
          <div className="flex flex-wrap items-baseline justify-center gap-x-2 text-[11.5px]">
            <span className="eyebrow">{t.slide.loadingEyebrow}</span>
            <span className="font-mono">{slideId}</span>
          </div>
        </div>
      </div>
    );
  }

  if (pageCount === 0) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-16 text-muted-foreground">
        {showSlideBrowser && (
          <Link to="/" className="text-[12px] font-medium text-foreground/70 hover:text-foreground">
            ← {t.common.home}
          </Link>
        )}
        <span className="mt-6 block eyebrow">{t.slide.emptyEyebrow}</span>
        <h2 className="mt-2 font-heading text-xl font-semibold tracking-tight text-foreground">
          {t.slide.nothingToShow}
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed">
          <code className="rounded-[4px] bg-muted px-1.5 py-0.5 font-mono text-[11.5px]">
            slides/{slideId}/index.tsx
          </code>
          {t.slide.emptyHintMust}
          <code className="rounded-[4px] bg-muted px-1.5 py-0.5 font-mono text-[11.5px]">
            export default
          </code>
          {t.slide.emptyHintSuffix}
        </p>
      </div>
    );
  }

  if (!showSlideUi) {
    return (
      <Player
        pages={pages}
        design={slide.design}
        index={index}
        onIndexChange={goTo}
        onExit={() => {}}
        allowExit={false}
      />
    );
  }

  if (playMode) {
    return (
      <Player
        pages={pages}
        design={slide.design}
        transition={slide.transition}
        index={index}
        onIndexChange={goTo}
        onExit={() => setPlayMode(null)}
        controls
        slideId={slideId}
        fullscreen={playMode === 'fullscreen'}
      />
    );
  }

  return (
    <HistoryProvider>
      <InspectorProvider slideId={slideId} pageIndex={index}>
        <SlideWorkspace
          slideId={slideId}
          slide={slide}
          pages={pages}
          setPages={setPages}
          index={index}
          pageCount={pageCount}
          goTo={goTo}
          view={view}
          setSearchParams={setSearchParams}
          seedPrompt={seedPrompt}
          playMode={playMode}
          setPlayMode={setPlayMode}
          t={t}
          prefersReducedMotion={prefersReducedMotion}
        />
      </InspectorProvider>
    </HistoryProvider>
  );
}

interface SlideWorkspaceProps {
  slideId: string;
  slide: SlideModule;
  pages: SlideModule['default'];
  setPages: React.Dispatch<React.SetStateAction<SlideModule['default']>>;
  index: number;
  pageCount: number;
  goTo: (i: number) => void;
  view: 'slides' | 'assets';
  setSearchParams: ReturnType<typeof useSearchParams>[1];
  seedPrompt?: string | null;
  playMode: 'window' | 'fullscreen' | null;
  setPlayMode: React.Dispatch<React.SetStateAction<'window' | 'fullscreen' | null>>;
  t: ReturnType<typeof useLocale>;
  prefersReducedMotion: boolean;
}

function SlideWorkspace({
  slideId,
  slide,
  pages,
  setPages,
  index,
  pageCount,
  goTo,
  view,
  setSearchParams,
  seedPrompt,
  playMode,
  setPlayMode,
  t,
  prefersReducedMotion,
}: SlideWorkspaceProps) {
  const [exporting, setExporting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const linkCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [designOpen, setDesignOpen] = useState(false);
  const [agentChatOpen, setAgentChatOpen] = useState(true);

  const navigate = useNavigate();
  const [activeConnection, setActiveConnection] = useState<ActiveConnectionSnapshot | null>(null);
  const [connections, setConnections] = useState<ActiveConnectionSnapshot[]>([]);
  const [agentConnectionState, dispatchAgentConnection] = useReducer(
    agentConnectionReducer,
    undefined,
    createInitialAgentConnectionUiState,
  );
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const scanStreamRef = useRef<{ abort: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAgentConnectionBootstrap()
      .then((bootstrap) => {
        if (!cancelled) {
          setActiveConnection(bootstrap.activeConnection);
          setConnections(bootstrap.connections);
        }
      })
      .catch((err) => {
        console.error('Failed to load agent connection bootstrap', err);
      });
    return () => {
      cancelled = true;
      scanStreamRef.current?.abort();
    };
  }, []);

  const handleSetActiveConnection = async (
    id: string,
    modelId?: string,
    reasoningEffort?: string,
  ) => {
    try {
      await setActiveAgentConnection({ connectionId: id, modelId, reasoningEffort });
      const bootstrap = await getAgentConnectionBootstrap();
      setActiveConnection(bootstrap.activeConnection);
      setConnections(bootstrap.connections);
      toast.success('Agent connection updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update agent connection');
    }
  };

  const handleRescan = useCallback(async () => {
    dispatchAgentConnection({ type: 'START_SCAN' });
    try {
      const res = await startAgentConnectionScan();
      setActiveScanId(res.scanId);
      scanStreamRef.current = streamAgentConnectionScanEvents(
        res.scanId,
        (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'completed') {
            dispatchAgentConnection({ type: 'COMPLETE_SCAN' });
            setActiveScanId(null);
            getAgentConnectionBootstrap().then((bootstrap) => {
              setActiveConnection(bootstrap.activeConnection);
              setConnections(bootstrap.connections);
            });
          } else if (data.type === 'failed') {
            dispatchAgentConnection({
              type: 'FAIL_SCAN',
              payload: createConnectionStatus('failed', { message: data.error }),
            });
            setActiveScanId(null);
          }
        },
        (err) => {
          dispatchAgentConnection({
            type: 'FAIL_SCAN',
            payload: createConnectionStatus('failed', { message: err.message }),
          });
          setActiveScanId(null);
        },
      );
    } catch (err) {
      dispatchAgentConnection({
        type: 'SET_VALIDATION_ERROR',
        payload: { field: 'scan', message: err instanceof Error ? err.message : String(err) },
      });
    }
  }, []);

  const handleCancelScan = useCallback(() => {
    if (!activeScanId) return;
    cancelAgentConnectionScan(activeScanId)
      .then(() => {
        dispatchAgentConnection({ type: 'CANCEL_SCAN' });
        setActiveScanId(null);
      })
      .catch((err) => {
        dispatchAgentConnection({
          type: 'SET_VALIDATION_ERROR',
          payload: { field: 'scan', message: err.message },
        });
      });
  }, [activeScanId]);

  const handleOpenFullSettings = useCallback(() => {
    dispatchAgentConnection({
      type: 'OPEN_SETTINGS_MODAL',
      payload: { section: 'execution-model' },
    });
  }, []);

  const handleBackToProjects = useCallback(() => {
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (linkCopiedTimerRef.current) clearTimeout(linkCopiedTimerRef.current);
    };
  }, []);

  const { renameSlide } = useFolders();
  const slideViewportRef = useRef<HTMLElement>(null);
  const { selected } = useInspector();

  const selectedElements = useMemo<SelectedElementDescriptor[]>(() => {
    if (!selected) return [];
    try {
      const rect = selected.anchor.getBoundingClientRect();
      return [
        {
          slideId: slideId || '',
          pageIndex: index,
          tagName: selected.anchor.tagName.toLowerCase(),
          textPreview: selected.anchor.textContent?.trim().slice(0, 100) || '',
          sourceLocation: { line: selected.line, column: selected.column },
          bounds: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
          editableProperties: ['text', 'style'],
        },
      ];
    } catch {
      return [];
    }
  }, [selected, slideId, index]);

  const currentSlideContext = useMemo(() => {
    if (!slideId) return undefined;
    return {
      id: slideId,
      title: slide?.meta?.title || slideId,
      pageIndex: index,
      pageCount: pageCount,
    };
  }, [slideId, slide, index, pageCount]);

  const reorderPage = useCallback(
    async (from: number, to: number) => {
      if (from === to) return;
      const before = pages;
      const nextPages = [...before];
      const [moved] = nextPages.splice(from, 1);
      nextPages.splice(to, 0, moved);
      setPages(nextPages);

      const order = before.map((_, i) => i);
      const [movedIdx] = order.splice(from, 1);
      order.splice(to, 0, movedIdx);

      remapNotesSessionCacheAfterReorder(slideId, order);

      // Keep the user looking at the same page they were on before the drag.
      let nextIndex = index;
      if (index === from) nextIndex = to;
      else if (from < index && to >= index) nextIndex = index - 1;
      else if (from > index && to <= index) nextIndex = index + 1;
      if (nextIndex !== index) goTo(nextIndex);

      try {
        const res = await fetch(`/__slides/${encodeURIComponent(slideId)}/reorder`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ order }),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(detail.error ?? `HTTP ${res.status}`);
        }
      } catch (err) {
        setPages(before);
        const inverse = order.map((_, i) => order.indexOf(i));
        remapNotesSessionCacheAfterReorder(slideId, inverse);
        toast.error(`Reorder failed: ${String((err as Error).message ?? err)}`);
      }
    },
    [pages, index, slideId, goTo, setPages],
  );

  const duplicatePage = useCallback(
    async (i: number) => {
      const before = pages;
      if (i < 0 || i >= before.length) return;
      const nextPages = [...before];
      nextPages.splice(i + 1, 0, before[i]);
      setPages(nextPages);
      if (index > i) goTo(index + 1);

      try {
        const res = await fetch(`/__slides/${encodeURIComponent(slideId)}/pages/${i}/duplicate`, {
          method: 'POST',
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(detail.error ?? `HTTP ${res.status}`);
        }
        toast.success(format(t.thumbnailRail.toastDuplicated, { n: i + 1 }));
      } catch (err) {
        setPages(before);
        toast.error(
          `${t.thumbnailRail.toastDuplicateFailed}: ${String((err as Error).message ?? err)}`,
        );
      }
    },
    [pages, index, slideId, goTo, t.thumbnailRail, setPages],
  );

  const deletePage = useCallback(
    async (i: number) => {
      const before = pages;
      if (i < 0 || i >= before.length || before.length <= 1) return;
      const nextPages = before.slice(0, i).concat(before.slice(i + 1));
      setPages(nextPages);
      if (index >= i && index > 0) {
        const target = index === i ? Math.min(index, nextPages.length - 1) : index - 1;
        goTo(target);
      }

      try {
        const res = await fetch(`/__slides/${encodeURIComponent(slideId)}/pages/${i}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(detail.error ?? `HTTP ${res.status}`);
        }
        toast.success(format(t.thumbnailRail.toastDeleted, { n: i + 1 }));
      } catch (err) {
        setPages(before);
        toast.error(
          `${t.thumbnailRail.toastDeleteFailed}: ${String((err as Error).message ?? err)}`,
        );
      }
    },
    [pages, index, slideId, goTo, t.thumbnailRail, setPages],
  );

  const thumbnailActions = useMemo<ThumbnailActions | undefined>(
    () =>
      import.meta.env.DEV
        ? {
            onDuplicate: duplicatePage,
            onDelete: deletePage,
          }
        : undefined,
    [duplicatePage, deletePage],
  );

  useEffect(() => {
    if (playMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.matches('input, textarea')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goTo(index - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        setPlayMode('fullscreen');
      } else if (import.meta.env.DEV && (e.key === 'd' || e.key === 'D')) {
        setDesignOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, goTo, playMode, setPlayMode]);

  const title = slide.meta?.title ?? slideId;

  return (
    <>
      <SelectionReporter />
      <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        {/* Editorial toolbar — three zones, hairline separators, mono-folio center */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline bg-background/90 px-2 backdrop-blur-md md:px-3">
          <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
            {showSlideBrowser && (
              <Button asChild variant="ghost" size="icon-sm" title={t.slide.home}>
                <Link to="/" aria-label={t.slide.backToHome}>
                  <ChevronLeft className="size-4" />
                </Link>
              </Button>
            )}
            <span aria-hidden className="mx-0.5 hidden h-5 w-px bg-hairline md:block" />
            {import.meta.env.DEV && (
              <Tabs
                value={view}
                onValueChange={(next) => {
                  setSearchParams(
                    (prev) => {
                      const params = new URLSearchParams(prev);
                      if (next === 'assets') params.set('view', 'assets');
                      else params.delete('view');
                      return params;
                    },
                    { replace: true },
                  );
                }}
              >
                <TabsList>
                  <TabsTrigger value="slides">{t.slide.slidesTab}</TabsTrigger>
                  <TabsTrigger value="assets">{t.slide.assetsTab}</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            {import.meta.env.DEV && <AgentConnectedBadge />}
          </div>

          {/* Centered title — the rail and mobile pill carry the page count. */}
          <div className="flex min-w-0 flex-1 justify-center px-2">
            <div className="min-w-0 max-w-[34rem]">
              <InlineTitleEditor title={title} onSubmit={(next) => renameSlide(slideId, next)} />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {view === 'slides' && (
              <button
                type="button"
                aria-label={t.slide.copyLink}
                title={t.slide.copyLink}
                className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    toast.success(t.slide.toastCopyLinkSuccess);
                    setLinkCopied(true);
                    if (linkCopiedTimerRef.current) clearTimeout(linkCopiedTimerRef.current);
                    linkCopiedTimerRef.current = setTimeout(() => setLinkCopied(false), 1200);
                  } catch (err) {
                    console.error('[awesome-slide] copy link failed', err);
                    toast.error(t.slide.toastCopyLinkFailed);
                  }
                }}
              >
                <span className="relative grid size-4 place-items-center">
                  <Link2
                    className={cn(
                      'col-start-1 row-start-1 size-4 transition-opacity duration-200',
                      linkCopied ? 'opacity-0' : 'opacity-100',
                    )}
                  />
                  <Check
                    className={cn(
                      'col-start-1 row-start-1 size-4 transition-opacity duration-200',
                      linkCopied ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </span>
              </button>
            )}
            {view === 'slides' && allowHtmlDownload && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  type="button"
                  disabled={exporting}
                  aria-label={t.slide.download}
                  title={t.slide.download}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                >
                  {exporting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[200px]">
                  <DropdownMenuItem
                    disabled={exporting}
                    onSelect={async () => {
                      if (!slide || exporting) return;
                      setExporting(true);
                      try {
                        await exportSlideAsHtml(slide, slideId);
                      } catch (err) {
                        console.error('[awesome-slide] export failed', err);
                      } finally {
                        setExporting(false);
                      }
                    }}
                  >
                    <FileCode2 />
                    {t.slide.exportAsHtml}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={exporting}
                    onSelect={async () => {
                      if (!slide || exporting) return;
                      if (isSafari()) {
                        toast.error(t.slide.pdfExportSafariUnsupported, { duration: 5000 });
                        return;
                      }
                      setExporting(true);
                      const toastId = `pdf-export-${slideId}`;
                      toast.custom(
                        () => (
                          <PdfProgressToast
                            progress={{
                              phase: 'processing',
                              current: 0,
                              total: pages.length,
                              percent: 0,
                            }}
                          />
                        ),
                        { id: toastId, duration: Infinity },
                      );
                      try {
                        await exportSlideAsPdf(slide, slideId, (p) => {
                          toast.custom(() => <PdfProgressToast progress={p} />, {
                            id: toastId,
                            duration: Infinity,
                          });
                        });
                      } catch (err) {
                        console.error('[awesome-slide] pdf export failed', err);
                        toast.error(t.slide.pdfExportFailed, { id: toastId, duration: 4000 });
                      } finally {
                        setExporting(false);
                        toast.dismiss(toastId);
                      }
                    }}
                  >
                    <FileText />
                    {t.slide.exportAsPdf}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {view === 'slides' && (
              <DesignToggleButton active={designOpen} onToggle={() => setDesignOpen((v) => !v)} />
            )}
            {view === 'slides' && <InspectToggleButton />}
            {import.meta.env.DEV && (
              <QuickConnectionSwitcher
                activeConnection={activeConnection}
                connections={connections}
                onSetActiveConnection={handleSetActiveConnection}
                onRescan={handleRescan}
                onOpenFullSettings={handleOpenFullSettings}
                onBackToProjects={handleBackToProjects}
              />
            )}

            <span aria-hidden className="mx-0.5 hidden h-5 w-px bg-hairline md:block" />
            {view === 'slides' && (
              <div className="inline-flex items-stretch">
                <Button
                  size="sm"
                  variant="brand"
                  onClick={() => setPlayMode('fullscreen')}
                  className="rounded-r-none px-2.5 md:px-3"
                >
                  <Play className="size-3.5 fill-current" />
                  <span className="hidden md:inline">{t.slide.present}</span>
                  <kbd className="ml-1 hidden rounded-[3px] bg-brand-foreground/15 px-1 font-mono text-[9.5px] tracking-[0.04em] md:inline">
                    F
                  </kbd>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    type="button"
                    aria-label={t.slide.presentMenuAria}
                    title={t.slide.presentMenuAria}
                    className={cn(
                      buttonVariants({ variant: 'brand', size: 'sm' }),
                      'rounded-l-none px-1.5 shadow-[inset_1px_0_0_oklch(0_0_0/0.12),inset_0_1px_0_oklch(1_0_0/0.18),0_1px_0_oklch(0_0_0/0.16)]',
                    )}
                  >
                    <ChevronDown className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[200px]">
                    <DropdownMenuItem onSelect={() => setPlayMode('window')}>
                      <Play />
                      {t.slide.presentInWindow}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setPlayMode('fullscreen')}>
                      <Maximize />
                      {t.slide.presentFullscreen}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        if (slideId) openPresenterWindow(slideId);
                        setPlayMode('window');
                      }}
                    >
                      <MonitorSpeaker />
                      {t.slide.presentPresenter}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </header>

        {view === 'assets' ? (
          <div className="min-h-0 flex-1">
            <AssetView slideId={slideId} />
          </div>
        ) : (
          <DesignProvider slideId={slideId}>
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
                {/* Expand Agent Chat Sidebar Handle */}
                {!agentChatOpen && (
                  <button
                    type="button"
                    onClick={() => setAgentChatOpen(true)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-white hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 border-r border-y border-neutral-200 rounded-r-xl py-3 px-1.5 shadow-md flex flex-col items-center gap-1.5 cursor-pointer transition-all duration-200 group hover:pl-2.5 border-l-0"
                    title="Expand Agent Chat"
                    aria-label="Expand Agent Chat"
                  >
                    <Bot className="h-4 w-4 text-neutral-500 group-hover:scale-110 transition-transform duration-200" />
                    <span className="text-[9px] font-bold tracking-wider text-neutral-400 uppercase [writing-mode:vertical-lr] select-none">
                      Agent
                    </span>
                  </button>
                )}
                {agentChatOpen && (
                  <div className="hidden md:block shrink-0 h-full">
                    <AgentChatPanel
                      onClose={() => setAgentChatOpen(false)}
                      slideId={slideId}
                      slideContext={currentSlideContext}
                      selectedElements={selectedElements}
                      notes={slide.notes?.[index]}
                      seedPrompt={seedPrompt ?? undefined}
                      onOpenSettings={handleOpenFullSettings}
                    />
                  </div>
                )}
                <ResizableRail
                  pages={pages}
                  design={slide.design}
                  current={index}
                  onSelect={goTo}
                  onReorder={import.meta.env.DEV ? reorderPage : undefined}
                  actions={thumbnailActions}
                />
                <main
                  ref={slideViewportRef}
                  data-inspector-root
                  data-slide-id={slideId}
                  className="paper relative min-h-0 min-w-0 flex-1 bg-canvas p-2 md:p-10"
                >
                  <SlideWheelNavigation
                    targetRef={slideViewportRef}
                    onPrev={() => goTo(index - 1)}
                    onNext={() => goTo(index + 1)}
                    canPrev={index > 0}
                    canNext={index < pageCount - 1}
                  />
                  <SlideCanvas design={slide.design}>
                    <SlideTransitionLayer
                      pages={pages}
                      index={index}
                      total={pageCount}
                      moduleTransition={slide.transition}
                      disabled={prefersReducedMotion}
                    />
                  </SlideCanvas>
                  <ClickNavZones
                    onPrev={() => goTo(index - 1)}
                    onNext={() => goTo(index + 1)}
                    canPrev={index > 0}
                    canNext={index < pageCount - 1}
                  />
                  <InspectOverlay />
                  <SaveBar />
                  {import.meta.env.DEV && <CommentWidget />}
                </main>
                {/* Mobile-only horizontal rail. Sits below the canvas and
                  pads its bottom for the iOS home indicator / Safari URL bar. */}
                <div
                  className="shrink-0 border-t border-hairline md:hidden"
                  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
                  <ThumbnailRail
                    pages={pages}
                    design={slide.design}
                    current={index}
                    onSelect={goTo}
                    orientation="horizontal"
                    actions={thumbnailActions}
                  />
                </div>
                <InspectorPanel />
                <DesignPanel open={designOpen} onClose={() => setDesignOpen(false)} />

                <div className="md:hidden">
                  <AgentChatDrawer
                    isOpen={agentChatOpen}
                    onClose={() => setAgentChatOpen(false)}
                    slideId={slideId}
                    slideContext={currentSlideContext}
                    selectedElements={selectedElements}
                    notes={slide.notes?.[index]}
                    seedPrompt={seedPrompt ?? undefined}
                    onOpenSettings={handleOpenFullSettings}
                  />
                </div>
              </div>
              {import.meta.env.DEV && (
                <NotesDrawer
                  slideId={slideId}
                  index={index}
                  total={pageCount}
                  initial={slide.notes?.[index]}
                />
              )}
            </div>
          </DesignProvider>
        )}
        {import.meta.env.DEV && (
          <SettingsModal
            open={agentConnectionState.settingsModal.open}
            activeSection={agentConnectionState.settingsModal.activeSection}
            executionTab={agentConnectionState.settingsModal.executionTab}
            scanState={agentConnectionState.settingsModal.scanState}
            validationErrors={agentConnectionState.settingsModal.validationErrors}
            returnFocusTo={agentConnectionState.settingsModal.returnFocusTo}
            onOpenChange={(open, reason) => {
              dispatchAgentConnection(
                open
                  ? {
                      type: 'OPEN_SETTINGS_MODAL',
                      payload: { section: 'execution-model' },
                    }
                  : {
                      type: 'CLOSE_SETTINGS_MODAL',
                      payload: { reason },
                    },
              );
            }}
            onSectionChange={(section) => {
              dispatchAgentConnection({ type: 'SET_SETTINGS_SECTION', payload: section });
            }}
            onExecutionTabChange={(tab) => {
              dispatchAgentConnection({ type: 'SET_EXECUTION_TAB', payload: tab });
            }}
            onViewportWidthChange={(width) => {
              dispatchAgentConnection({ type: 'SET_MODAL_VIEWPORT', payload: { width } });
            }}
            onRequestRescan={handleRescan}
            onRequestCancelScan={handleCancelScan}
          />
        )}
      </div>
    </>
  );
}

const RAIL_WIDTH_STORAGE_KEY = 'awesome-slide:thumbnail-rail-width';
const LEGACY_RAIL_WIDTH_STORAGE_KEY = 'open-slide:thumbnail-rail-width';
const DEFAULT_RAIL_WIDTH = 264;
const MIN_RAIL_WIDTH = 200;
const MAX_RAIL_WIDTH = 480;

function readStoredRailWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_RAIL_WIDTH;
  const raw = readStorageWithLegacy(
    window.localStorage,
    RAIL_WIDTH_STORAGE_KEY,
    LEGACY_RAIL_WIDTH_STORAGE_KEY,
  );
  const parsed = raw == null ? Number.NaN : Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_RAIL_WIDTH;
  return Math.min(MAX_RAIL_WIDTH, Math.max(MIN_RAIL_WIDTH, parsed));
}

function ResizableRail(props: {
  pages: SlideModule['default'];
  design?: SlideModule['design'];
  current: number;
  onSelect: (i: number) => void;
  onReorder?: (from: number, to: number) => void;
  actions?: ThumbnailActions;
}) {
  const t = useLocale();
  const [width, setWidth] = useState<number>(readStoredRailWidth);
  const [resizing, setResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    writeStorageWithLegacy(
      window.localStorage,
      RAIL_WIDTH_STORAGE_KEY,
      LEGACY_RAIL_WIDTH_STORAGE_KEY,
      String(width),
    );
  }, [width]);

  useEffect(() => {
    if (!resizing) return;
    const prev = {
      cursor: document.body.style.cursor,
      userSelect: document.body.style.userSelect,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = prev.cursor;
      document.body.style.userSelect = prev.userSelect;
    };
  }, [resizing]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startWidth: width };
    setResizing(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const delta = e.clientX - dragRef.current.startX;
    const next = Math.min(
      MAX_RAIL_WIDTH,
      Math.max(MIN_RAIL_WIDTH, dragRef.current.startWidth + delta),
    );
    setWidth(next);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setResizing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 32 : 8;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      setWidth((w) => Math.max(MIN_RAIL_WIDTH, w - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      setWidth((w) => Math.min(MAX_RAIL_WIDTH, w + step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      e.stopPropagation();
      setWidth(DEFAULT_RAIL_WIDTH);
    }
  };

  return (
    <div className="relative hidden shrink-0 md:block" style={{ width }}>
      <ThumbnailRail width={width} {...props} />
      {/* biome-ignore lint/a11y/useSemanticElements: focusable resize handle (splitter pattern), not a static <hr> */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t.thumbnailRail.resizeRail}
        aria-valuenow={width}
        aria-valuemin={MIN_RAIL_WIDTH}
        aria-valuemax={MAX_RAIL_WIDTH}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onDoubleClick={() => setWidth(DEFAULT_RAIL_WIDTH)}
        className={cn(
          'group/resize absolute inset-y-0 right-0 z-20 w-1.5 translate-x-1/2 cursor-col-resize touch-none outline-none',
          'focus-visible:bg-brand/20',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-brand opacity-0 transition-opacity',
            'group-hover/resize:opacity-100 group-focus-visible/resize:opacity-100',
            resizing && 'opacity-100',
          )}
        />
      </div>
    </div>
  );
}

function AgentConnectedBadge() {
  const t = useLocale();
  const connected = useAgentSocketConnected();
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="ml-1 flex shrink-0 cursor-help items-center gap-1.5 rounded-[3px] border border-hairline bg-card px-1.5 py-0.5 text-[10.5px] text-foreground/85 outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <span aria-hidden className="relative flex size-1.5 items-center justify-center">
              {connected ? (
                <>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[color:var(--semantic-success)] opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-[color:var(--semantic-success)]" />
                </>
              ) : (
                <span className="relative inline-flex size-1.5 rounded-full bg-destructive" />
              )}
            </span>
            {connected ? t.slide.agentConnected : t.slide.agentDisconnected}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-[280px] leading-relaxed">
          {connected ? t.slide.agentConnectedTooltip : t.slide.agentDisconnectedTooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SelectionReporter() {
  const { selected } = useInspector();
  useEffect(() => {
    if (!import.meta.hot) return;
    const selection = selected
      ? {
          line: selected.line,
          column: selected.column,
          tagName: selected.anchor.tagName.toLowerCase(),
          text: (selected.anchor.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
        }
      : null;
    import.meta.hot.send('awesome-slide:current', { selection });
    import.meta.hot.send('open-slide:current', { selection });
  }, [selected]);
  return null;
}

function SlideWheelNavigation({
  targetRef,
  onPrev,
  onNext,
  canPrev,
  canNext,
}: {
  targetRef: RefObject<HTMLElement>;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  const { active } = useInspector();

  useWheelPageNavigation({
    ref: targetRef,
    enabled: !active,
    canPrev,
    canNext,
    onPrev,
    onNext,
  });

  return null;
}

function InlineTitleEditor({
  title,
  onSubmit,
}: {
  title: string;
  onSubmit: (name: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const t = useLocale();

  useEffect(() => {
    if (!editing) setValue(title);
  }, [title, editing]);

  useEffect(() => {
    if (editing) {
      queueMicrotask(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing]);

  const commit = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === title) {
      setValue(title);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setValue(title);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <input
          ref={inputRef}
          value={value}
          disabled={saving}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (!saving) commit();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          maxLength={80}
          className="min-w-0 max-w-[min(34rem,90%)] rounded-[5px] border border-foreground/30 bg-card px-2 py-0.5 text-center font-heading text-[13px] font-medium tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </div>
    );
  }

  return (
    <div className="group/title flex min-w-0 items-baseline justify-center gap-1.5">
      <h1 className="truncate font-heading text-[13.5px] font-semibold tracking-[-0.01em]">
        {title}
      </h1>
      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={t.slide.renameSlide}
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground',
            'opacity-0 group-hover/title:opacity-100 focus-visible:opacity-100',
          )}
        >
          <Pencil className="size-3" />
        </button>
      )}
    </div>
  );
}
