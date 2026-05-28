import type {
  AgentChatContext,
  SelectedElementDescriptor,
  SourceExcerpt,
  ThemeSummary,
} from './agent-chat-types.ts';
import type { DeckId, FolderId, SlideId } from './sdk.ts';
import { slideSourceState } from './slides.ts';
import { themes } from './themes.ts';

export function isSecretFile(filePath: string): boolean {
  const filename = filePath.split(/[/\\]/).pop() || '';
  // Hidden files (starting with .)
  if (filename.startsWith('.')) {
    return true;
  }
  // Common credential file patterns
  const secretPatterns = [
    /id_rsa/i,
    /id_dsa/i,
    /id_ecdsa/i,
    /id_ed25519/i,
    /\.pem$/i,
    /\.key$/i,
    /\.pkcs12$/i,
    /\.pfx$/i,
    /\.p12$/i,
    /credentials/i,
    /passwd/i,
  ];
  return secretPatterns.some((pattern) => pattern.test(filename));
}

export function isSecretContent(content: string): boolean {
  const secretKeywords = [/api[-_]?key/i, /password/i, /private[-_]?key/i, /secret/i, /token/i];
  return secretKeywords.some((pattern) => pattern.test(content));
}

export function redactSecrets(content: string): string {
  let redacted = content;
  // Redact basic assign statements like KEY = "value"
  redacted = redacted.replace(
    /(api[-_]?key|token|auth|password|secret|key|bearer)\s*[:=]\s*["']?[a-zA-Z0-9_\-./~+\\*=]{8,}["']?/gi,
    '$1 = "<redacted>"',
  );
  return redacted;
}

export interface BuildContextOptions {
  project: { name?: string; rootLabel?: string };
  slide?: {
    id: SlideId;
    title?: string;
    pageIndex?: number;
    pageCount?: number;
    status?: string;
    sourceState?: string;
  };
  selection?: SelectedElementDescriptor[];
  collection?: { folderId?: FolderId; deckId?: DeckId; slideIds?: SlideId[] };
  theme?: { activeThemeId?: string; availableThemeIds: string[]; summaries: ThemeSummary[] };
  notes?: { included: boolean; currentPage?: string; deckSummary?: string };
  source?: { excerpts: SourceExcerpt[] };
  limits?: { maxBytes?: number };
}

export async function buildAgentChatContext(
  options: BuildContextOptions,
): Promise<AgentChatContext> {
  const maxBytes = options.limits?.maxBytes || 128 * 1024; // Default 128KB
  const now = new Date().toISOString();

  // Process source excerpts: filter hidden files, filter secret files, redact secret contents
  const filteredExcerpts: SourceExcerpt[] = [];
  if (options.source?.excerpts) {
    for (const excerpt of options.source.excerpts) {
      if (isSecretFile(excerpt.filePath)) {
        continue;
      }
      let content = excerpt.content;
      if (isSecretContent(content)) {
        content = redactSecrets(content);
      }
      filteredExcerpts.push({
        ...excerpt,
        content,
      });
    }
  }

  let totalBytes = filteredExcerpts.reduce((sum, e) => sum + e.content.length, 0);
  let truncated = false;

  const themeList = themes || [];
  const themeSummaries: ThemeSummary[] = themeList.map((theme) => {
    const bgMatch = theme.body?.match(/--background:\s*([^;]+)/);
    const fgMatch = theme.body?.match(/--foreground:\s*([^;]+)/);
    const primaryMatch = theme.body?.match(/--primary:\s*([^;]+)/);
    return {
      themeId: theme.id,
      name: theme.name,
      colors: {
        background: bgMatch ? bgMatch[1].trim() : '#ffffff',
        foreground: fgMatch ? fgMatch[1].trim() : '#000000',
        primary: primaryMatch ? primaryMatch[1].trim() : '#3b82f6',
      },
    };
  });

  const activeThemeId = options.theme?.activeThemeId || 'default';
  const availableThemeIds = options.theme?.availableThemeIds || themeList.map((t) => t.id);
  const themeContext = {
    activeThemeId,
    availableThemeIds,
    summaries: options.theme?.summaries || themeSummaries,
  };

  const context: AgentChatContext = {
    project: options.project,
    slide: options.slide
      ? {
          ...options.slide,
          sourceState:
            options.slide.sourceState || slideSourceState[options.slide.id] || 'supported',
        }
      : undefined,
    selection: options.selection,
    collection: options.collection,
    theme: themeContext,
    notes: options.notes,
    source: { excerpts: filteredExcerpts, totalBytes, truncated },
    limits: { maxBytes, generatedAt: now },
  };

  let serialized = JSON.stringify(context);

  // Truncate if serialized size is over maxBytes
  while (serialized.length > maxBytes && context.source && context.source.excerpts.length > 0) {
    truncated = true;
    context.source.excerpts.pop();
    totalBytes = context.source.excerpts.reduce((sum, e) => sum + e.content.length, 0);
    context.source = {
      excerpts: context.source.excerpts,
      totalBytes,
      truncated,
    };
    serialized = JSON.stringify(context);
  }

  return context;
}
