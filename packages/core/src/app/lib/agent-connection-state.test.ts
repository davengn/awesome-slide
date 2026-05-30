import { describe, expect, it } from 'vitest';
import {
  agentConnectionReducer,
  createInitialAgentConnectionUiState,
  SETTINGS_MODAL_ACCESSIBILITY_CONTRACT,
  settingsModalLayoutForWidth,
} from './agent-connection-state.ts';
import { createConnectionStatus } from './agent-connections.ts';

describe('agent connection UI state', () => {
  it('opens settings modal to Execution & model and tracks the active tab', () => {
    const state = createInitialAgentConnectionUiState();
    const next = agentConnectionReducer(state, {
      type: 'OPEN_SETTINGS_MODAL',
      payload: { section: 'execution-model', tab: 'byok' },
    });

    expect(next.settingsModal.open).toBe(true);
    expect(next.settingsModal.activeSection).toBe('execution-model');
    expect(next.settingsModal.executionTab).toBe('byok');
  });

  it('opens quick switcher and tracks agent/model/reasoning changes', () => {
    let state = createInitialAgentConnectionUiState();
    state = agentConnectionReducer(state, { type: 'OPEN_QUICK_SWITCHER' });
    state = agentConnectionReducer(state, {
      type: 'SELECT_CONNECTION',
      payload: { connectionId: 'conn_codex', mode: 'local-cli' },
    });
    state = agentConnectionReducer(state, { type: 'SET_MODEL', payload: { modelId: 'gpt-5.5' } });
    state = agentConnectionReducer(state, {
      type: 'SET_REASONING',
      payload: { reasoningEffort: 'xhigh' },
    });

    expect(state.quickSwitcher.open).toBe(true);
    expect(state.quickSwitcher.selectedConnectionId).toBe('conn_codex');
    expect(state.quickSwitcher.selectedModelId).toBe('gpt-5.5');
    expect(state.quickSwitcher.selectedReasoningEffort).toBe('xhigh');
    expect(state.quickSwitcher.pendingAction).toBe('switch-reasoning');
  });

  it('tracks first-run prompt choices and scan failure state', () => {
    let state = createInitialAgentConnectionUiState();
    state = agentConnectionReducer(state, { type: 'SHOW_FIRST_RUN_PROMPT' });
    expect(state.firstRunPrompt.visible).toBe(true);

    state = agentConnectionReducer(state, {
      type: 'DISMISS_FIRST_RUN_PROMPT',
      payload: 'do-later',
    });
    expect(state.firstRunPrompt.visible).toBe(false);
    expect(state.firstRunPrompt.dismissed).toBe(true);

    state = agentConnectionReducer(state, { type: 'START_SCAN' });
    expect(state.settingsModal.scanState).toBe('scanning');
    state = agentConnectionReducer(state, {
      type: 'FAIL_SCAN',
      payload: createConnectionStatus('failed', { category: 'missing-executable' }),
    });
    expect(state.settingsModal.scanState).toBe('failed');
    expect(state.quickSwitcher.error?.category).toBe('missing-executable');
  });

  it('keeps first-run setup non-scanning while opening the requested modal target', () => {
    let state = createInitialAgentConnectionUiState();

    state = agentConnectionReducer(state, { type: 'SHOW_FIRST_RUN_PROMPT' });
    state = agentConnectionReducer(state, {
      type: 'OPEN_SETTINGS_MODAL',
      payload: {
        section: 'execution-model',
        tab: 'local-cli',
        triggerId: 'first-run-auto-scan',
        initialFocus: 'auto-scan',
      },
    });

    expect(state.firstRunPrompt.visible).toBe(true);
    expect(state.settingsModal.open).toBe(true);
    expect(state.settingsModal.activeSection).toBe('execution-model');
    expect(state.settingsModal.executionTab).toBe('local-cli');
    expect(state.settingsModal.scanState).toBe('idle');
    expect(state.settingsModal.triggerId).toBe('first-run-auto-scan');
    expect(state.settingsModal.returnFocusTo).toBe('first-run-auto-scan');
    expect(state.settingsModal.initialFocus).toBe('auto-scan');

    state = agentConnectionReducer(state, {
      type: 'DISMISS_FIRST_RUN_PROMPT',
      payload: 'do-later',
    });

    expect(state.firstRunPrompt.visible).toBe(false);
    expect(state.firstRunPrompt.dismissed).toBe(true);
    expect(state.firstRunPrompt.lastAction).toBe('do-later');
  });

  it('tracks project settings focus return, Escape close, labels, and responsive modal layout', () => {
    let state = createInitialAgentConnectionUiState();

    expect(SETTINGS_MODAL_ACCESSIBILITY_CONTRACT.titleId).toBe('agent-settings-title');
    expect(SETTINGS_MODAL_ACCESSIBILITY_CONTRACT.descriptionId).toBe('agent-settings-description');
    expect(SETTINGS_MODAL_ACCESSIBILITY_CONTRACT.liveRegionId).toBe('agent-settings-live-region');
    expect(SETTINGS_MODAL_ACCESSIBILITY_CONTRACT.closeLabel).toBe('Close settings');
    expect(SETTINGS_MODAL_ACCESSIBILITY_CONTRACT.navLabel).toBe('Settings sections');
    expect(SETTINGS_MODAL_ACCESSIBILITY_CONTRACT.executionTabLabel).toBe('Execution mode');

    state = agentConnectionReducer(state, {
      type: 'OPEN_SETTINGS_MODAL',
      payload: {
        section: 'execution-model',
        tab: 'byok',
        triggerId: 'project-settings-entry',
        initialFocus: 'section-nav',
      },
    });
    expect(state.settingsModal.returnFocusTo).toBe('project-settings-entry');
    expect(state.settingsModal.initialFocus).toBe('section-nav');

    state = agentConnectionReducer(state, {
      type: 'SET_MODAL_VIEWPORT',
      payload: { width: 375 },
    });
    expect(state.settingsModal.responsiveLayout).toBe('compact');
    state = agentConnectionReducer(state, {
      type: 'SET_MODAL_VIEWPORT',
      payload: { width: 768 },
    });
    expect(state.settingsModal.responsiveLayout).toBe('split');
    state = agentConnectionReducer(state, {
      type: 'SET_MODAL_VIEWPORT',
      payload: { width: 1024 },
    });
    expect(state.settingsModal.responsiveLayout).toBe('wide');
    expect(settingsModalLayoutForWidth(1440)).toBe('wide');

    state = agentConnectionReducer(state, {
      type: 'CLOSE_SETTINGS_MODAL',
      payload: { reason: 'escape' },
    });

    expect(state.settingsModal.open).toBe(false);
    expect(state.settingsModal.closeReason).toBe('escape');
    expect(state.settingsModal.returnFocusTo).toBe('project-settings-entry');
  });

  it('handles manual path validation and field-level errors', () => {
    let state = createInitialAgentConnectionUiState();
    state = agentConnectionReducer(state, {
      type: 'SET_MANUAL_PATH_INPUT',
      payload: 'codex',
    });
    state = agentConnectionReducer(state, {
      type: 'SET_MANUAL_PATH_VALIDATION',
      payload: { status: 'pass', message: 'Valid command.' },
    });
    state = agentConnectionReducer(state, {
      type: 'SET_VALIDATION_ERROR',
      payload: { field: 'apiKey', message: 'Required' },
    });

    expect(state.manualPath.input).toBe('codex');
    expect(state.manualPath.validation?.status).toBe('pass');
    expect(state.settingsModal.validationErrors.apiKey).toBe('Required');

    state = agentConnectionReducer(state, {
      type: 'CLEAR_VALIDATION_ERROR',
      payload: { field: 'apiKey' },
    });
    expect(state.settingsModal.validationErrors.apiKey).toBeUndefined();
  });

  it('handles scan state transitions (start, complete, cancel)', () => {
    let state = createInitialAgentConnectionUiState();
    state = agentConnectionReducer(state, { type: 'START_SCAN' });
    expect(state.settingsModal.scanState).toBe('scanning');
    expect(state.quickSwitcher.pendingAction).toBe('rescan-path');

    state = agentConnectionReducer(state, { type: 'COMPLETE_SCAN' });
    expect(state.settingsModal.scanState).toBe('completed');
    expect(state.quickSwitcher.pendingAction).toBeUndefined();

    state = agentConnectionReducer(state, { type: 'START_SCAN' });
    state = agentConnectionReducer(state, { type: 'CANCEL_SCAN' });
    expect(state.settingsModal.scanState).toBe('cancelled');
    expect(state.quickSwitcher.pendingAction).toBeUndefined();
  });

  it('handles BYOK form field changes', () => {
    let state = createInitialAgentConnectionUiState();

    state = agentConnectionReducer(state, {
      type: 'SET_BYOK_FIELD',
      payload: {
        providerId: 'anthropic',
        modelId: 'claude-sonnet-4',
        apiKey: 'sk-ant-key',
        showKey: true,
      },
    });

    expect(state.byokForm.providerId).toBe('anthropic');
    expect(state.byokForm.modelId).toBe('claude-sonnet-4');
    expect(state.byokForm.apiKey).toBe('sk-ant-key');
    expect(state.byokForm.showKey).toBe(true);
  });

  it('handles Local CLI candidate states, selected states, scan progress, cancel, and manual path transitions', () => {
    let state = createInitialAgentConnectionUiState();

    state = agentConnectionReducer(state, {
      type: 'SET_AVAILABLE_CONNECTIONS',
      payload: [
        {
          connectionId: 'conn_test',
          displayName: 'Test CLI',
          type: 'local-agent',
          provider: 'claude-code',
          modelOrAgent: 'claude',
          status: 'ready',
          capabilities: {
            streaming: true,
            cancellation: true,
            structuredProposals: true,
            toolCalls: true,
            localFileContext: true,
            writeCapable: true,
            supportedModalities: ['text'],
          },
          settingsTarget: 'execution-model',
        },
      ],
    });
    expect(state.quickSwitcher.availableConnections.length).toBe(1);
    expect(state.quickSwitcher.availableConnections[0].connectionId).toBe('conn_test');

    state = agentConnectionReducer(state, {
      type: 'SELECT_CONNECTION',
      payload: { connectionId: 'conn_test', mode: 'local-cli' },
    });
    expect(state.settingsModal.selectedConnectionId).toBe('conn_test');
    expect(state.quickSwitcher.selectedConnectionId).toBe('conn_test');
    expect(state.quickSwitcher.activeMode).toBe('local-cli');

    state = agentConnectionReducer(state, { type: 'START_SCAN' });
    expect(state.settingsModal.scanState).toBe('scanning');

    state = agentConnectionReducer(state, { type: 'CANCEL_SCAN' });
    expect(state.settingsModal.scanState).toBe('cancelled');

    state = agentConnectionReducer(state, { type: 'SET_MANUAL_PATH_KIND', payload: 'executable' });
    expect(state.manualPath.kind).toBe('executable');

    state = agentConnectionReducer(state, {
      type: 'SET_MANUAL_PATH_INPUT',
      payload: '/usr/local/bin/claude',
    });
    expect(state.manualPath.input).toBe('/usr/local/bin/claude');

    state = agentConnectionReducer(state, {
      type: 'SET_MANUAL_PATH_VALIDATION',
      payload: { status: 'pass', message: 'Ready to use.' },
    });
    expect(state.manualPath.validation?.status).toBe('pass');
    expect(state.manualPath.validation?.message).toBe('Ready to use.');
  });

  it('T051: handles BYOK form state transitions and edge cases', () => {
    let state = createInitialAgentConnectionUiState();

    state = agentConnectionReducer(state, {
      type: 'SET_BYOK_FIELD',
      payload: {
        providerId: 'google',
        modelId: 'gemini-2.5-pro',
        apiKey: 'sk-google-key',
        showKey: false,
        storageWarning: 'fallback warning active',
      },
    });
    expect(state.byokForm.providerId).toBe('google');
    expect(state.byokForm.modelId).toBe('gemini-2.5-pro');
    expect(state.byokForm.apiKey).toBe('sk-google-key');
    expect(state.byokForm.showKey).toBe(false);
    expect(state.byokForm.storageWarning).toBe('fallback warning active');

    state = agentConnectionReducer(state, {
      type: 'SET_VALIDATION_ERROR',
      payload: { field: 'apiKey', message: 'API key is required' },
    });
    expect(state.settingsModal.validationErrors.apiKey).toBe('API key is required');

    state = agentConnectionReducer(state, {
      type: 'CLEAR_VALIDATION_ERROR',
      payload: { field: 'apiKey' },
    });
    expect(state.settingsModal.validationErrors.apiKey).toBeUndefined();
  });
});
