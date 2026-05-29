import type {
  ActiveConnectionSnapshot,
  ConnectionStatus,
  ManualAgentPath,
  QuickConnectionSwitcherState,
  SettingsModalCloseReason,
  SettingsModalInitialFocus,
  SettingsModalResponsiveLayout,
  SettingsModalState,
  ValidationResult,
} from './agent-connection-types.ts';

export const SETTINGS_MODAL_ACCESSIBILITY_CONTRACT = {
  titleId: 'agent-settings-title',
  descriptionId: 'agent-settings-description',
  liveRegionId: 'agent-settings-live-region',
  closeLabel: 'Close settings',
  navLabel: 'Settings sections',
  executionTabLabel: 'Execution mode',
} as const;

export function settingsModalLayoutForWidth(width: number): SettingsModalResponsiveLayout {
  if (width < 768) return 'compact';
  if (width < 1024) return 'split';
  return 'wide';
}

export interface AgentConnectionUiState {
  settingsModal: SettingsModalState;
  quickSwitcher: QuickConnectionSwitcherState;
  firstRunPrompt: {
    visible: boolean;
    dismissed: boolean;
    lastAction?: 'auto-scan' | 'manual-path' | 'byok' | 'do-later';
  };
  manualPath: {
    input: string;
    kind: ManualAgentPath['kind'];
    validation?: ValidationResult;
  };
  byokForm: {
    providerId: string;
    modelId: string;
    apiKey: string;
    showKey: boolean;
    storageWarning?: string;
  };
}

export type AgentConnectionUiAction =
  | {
      type: 'OPEN_SETTINGS_MODAL';
      payload?: {
        section?: SettingsModalState['activeSection'];
        tab?: SettingsModalState['executionTab'];
        triggerId?: string;
        initialFocus?: SettingsModalInitialFocus;
      };
    }
  | { type: 'CLOSE_SETTINGS_MODAL'; payload?: { reason?: SettingsModalCloseReason } }
  | { type: 'SET_SETTINGS_SECTION'; payload: SettingsModalState['activeSection'] }
  | { type: 'SET_MODAL_VIEWPORT'; payload: { width: number } }
  | { type: 'OPEN_QUICK_SWITCHER'; payload?: Partial<QuickConnectionSwitcherState> }
  | { type: 'CLOSE_QUICK_SWITCHER' }
  | { type: 'SET_EXECUTION_TAB'; payload: SettingsModalState['executionTab'] }
  | { type: 'SELECT_CONNECTION'; payload: { connectionId?: string; mode?: 'local-cli' | 'byok' } }
  | { type: 'SET_MODEL'; payload: { modelId?: string } }
  | { type: 'SET_REASONING'; payload: { reasoningEffort?: string } }
  | { type: 'SET_AVAILABLE_CONNECTIONS'; payload: ActiveConnectionSnapshot[] }
  | { type: 'START_SCAN' }
  | { type: 'COMPLETE_SCAN' }
  | { type: 'FAIL_SCAN'; payload: ConnectionStatus }
  | { type: 'CANCEL_SCAN' }
  | { type: 'SET_MANUAL_PATH_INPUT'; payload: string }
  | { type: 'SET_MANUAL_PATH_KIND'; payload: ManualAgentPath['kind'] }
  | { type: 'SET_MANUAL_PATH_VALIDATION'; payload: ValidationResult | undefined }
  | { type: 'SET_BYOK_FIELD'; payload: Partial<AgentConnectionUiState['byokForm']> }
  | { type: 'SHOW_FIRST_RUN_PROMPT' }
  | {
      type: 'DISMISS_FIRST_RUN_PROMPT';
      payload?: AgentConnectionUiState['firstRunPrompt']['lastAction'];
    }
  | { type: 'SET_VALIDATION_ERROR'; payload: { field: string; message: string } }
  | { type: 'CLEAR_VALIDATION_ERROR'; payload: { field: string } };

export function createInitialAgentConnectionUiState(): AgentConnectionUiState {
  return {
    settingsModal: {
      open: false,
      activeSection: 'execution-model',
      executionTab: 'local-cli',
      scanState: 'idle',
      validationErrors: {},
      responsiveLayout: 'wide',
    },
    quickSwitcher: {
      open: false,
      activeMode: 'local-cli',
      availableConnections: [],
      availableModels: [],
      availableReasoningEfforts: [],
    },
    firstRunPrompt: {
      visible: false,
      dismissed: false,
    },
    manualPath: {
      input: '',
      kind: 'command',
    },
    byokForm: {
      providerId: 'openai',
      modelId: '',
      apiKey: '',
      showKey: false,
    },
  };
}

export function agentConnectionReducer(
  state: AgentConnectionUiState,
  action: AgentConnectionUiAction,
): AgentConnectionUiState {
  switch (action.type) {
    case 'OPEN_SETTINGS_MODAL':
      return {
        ...state,
        settingsModal: {
          ...state.settingsModal,
          open: true,
          activeSection: action.payload?.section ?? 'execution-model',
          executionTab: action.payload?.tab ?? state.settingsModal.executionTab,
          triggerId: action.payload?.triggerId,
          returnFocusTo: action.payload?.triggerId ?? state.settingsModal.returnFocusTo,
          initialFocus: action.payload?.initialFocus,
          closeReason: undefined,
        },
      };
    case 'CLOSE_SETTINGS_MODAL':
      return {
        ...state,
        settingsModal: {
          ...state.settingsModal,
          open: false,
          closeReason: action.payload?.reason ?? 'programmatic',
        },
      };
    case 'SET_SETTINGS_SECTION':
      return {
        ...state,
        settingsModal: { ...state.settingsModal, activeSection: action.payload },
      };
    case 'SET_MODAL_VIEWPORT':
      return {
        ...state,
        settingsModal: {
          ...state.settingsModal,
          viewportWidth: action.payload.width,
          responsiveLayout: settingsModalLayoutForWidth(action.payload.width),
        },
      };
    case 'OPEN_QUICK_SWITCHER':
      return {
        ...state,
        quickSwitcher: { ...state.quickSwitcher, ...action.payload, open: true },
      };
    case 'CLOSE_QUICK_SWITCHER':
      return {
        ...state,
        quickSwitcher: { ...state.quickSwitcher, open: false, pendingAction: undefined },
      };
    case 'SET_EXECUTION_TAB':
      return {
        ...state,
        settingsModal: { ...state.settingsModal, executionTab: action.payload },
        quickSwitcher: { ...state.quickSwitcher, activeMode: action.payload },
      };
    case 'SELECT_CONNECTION':
      return {
        ...state,
        settingsModal: {
          ...state.settingsModal,
          selectedConnectionId: action.payload.connectionId,
        },
        quickSwitcher: {
          ...state.quickSwitcher,
          selectedConnectionId: action.payload.connectionId,
          activeMode: action.payload.mode ?? state.quickSwitcher.activeMode,
          pendingAction: 'switch-connection',
        },
      };
    case 'SET_MODEL':
      return {
        ...state,
        quickSwitcher: {
          ...state.quickSwitcher,
          selectedModelId: action.payload.modelId,
          pendingAction: 'switch-model',
        },
      };
    case 'SET_REASONING':
      return {
        ...state,
        quickSwitcher: {
          ...state.quickSwitcher,
          selectedReasoningEffort: action.payload.reasoningEffort,
          pendingAction: 'switch-reasoning',
        },
      };
    case 'SET_AVAILABLE_CONNECTIONS':
      return {
        ...state,
        quickSwitcher: {
          ...state.quickSwitcher,
          availableConnections: action.payload,
        },
      };
    case 'START_SCAN':
      return {
        ...state,
        settingsModal: { ...state.settingsModal, scanState: 'scanning' },
        quickSwitcher: { ...state.quickSwitcher, pendingAction: 'rescan-path' },
      };
    case 'COMPLETE_SCAN':
      return {
        ...state,
        settingsModal: { ...state.settingsModal, scanState: 'completed' },
        quickSwitcher: { ...state.quickSwitcher, pendingAction: undefined },
      };
    case 'FAIL_SCAN':
      return {
        ...state,
        settingsModal: { ...state.settingsModal, scanState: 'failed' },
        quickSwitcher: { ...state.quickSwitcher, pendingAction: undefined, error: action.payload },
      };
    case 'CANCEL_SCAN':
      return {
        ...state,
        settingsModal: { ...state.settingsModal, scanState: 'cancelled' },
        quickSwitcher: { ...state.quickSwitcher, pendingAction: undefined },
      };
    case 'SET_MANUAL_PATH_INPUT':
      return {
        ...state,
        manualPath: { ...state.manualPath, input: action.payload, validation: undefined },
      };
    case 'SET_MANUAL_PATH_KIND':
      return {
        ...state,
        manualPath: { ...state.manualPath, kind: action.payload, validation: undefined },
      };
    case 'SET_MANUAL_PATH_VALIDATION':
      return {
        ...state,
        manualPath: { ...state.manualPath, validation: action.payload },
      };
    case 'SET_BYOK_FIELD':
      return {
        ...state,
        byokForm: { ...state.byokForm, ...action.payload },
      };
    case 'SHOW_FIRST_RUN_PROMPT':
      return {
        ...state,
        firstRunPrompt: { ...state.firstRunPrompt, visible: true },
      };
    case 'DISMISS_FIRST_RUN_PROMPT':
      return {
        ...state,
        firstRunPrompt: {
          visible: false,
          dismissed: true,
          lastAction: action.payload ?? 'do-later',
        },
      };
    case 'SET_VALIDATION_ERROR':
      return {
        ...state,
        settingsModal: {
          ...state.settingsModal,
          validationErrors: {
            ...state.settingsModal.validationErrors,
            [action.payload.field]: action.payload.message,
          },
        },
      };
    case 'CLEAR_VALIDATION_ERROR': {
      const { [action.payload.field]: _removed, ...validationErrors } =
        state.settingsModal.validationErrors;
      return {
        ...state,
        settingsModal: { ...state.settingsModal, validationErrors },
      };
    }
    default:
      return state;
  }
}
