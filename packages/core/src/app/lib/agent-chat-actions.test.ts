import { describe, expect, it } from 'vitest';
import { SUGGESTED_ACTIONS } from './agent-chat-actions.ts';

describe('Suggested Actions Registry', () => {
  it('contains all required suggested actions', () => {
    const ids = SUGGESTED_ACTIONS.map((action) => action.id);
    expect(ids).toContain('improve-copy');
    expect(ids).toContain('shorten-content');
    expect(ids).toContain('redesign-layout');
    expect(ids).toContain('apply-theme');
    expect(ids).toContain('generate-speaker-notes');
    expect(ids).toContain('fix-alignment');
    expect(ids).toContain('create-related-slide');
    expect(ids).toContain('shorten-deck-content');
    expect(ids).toContain('generate-deck-notes');
  });

  it('sets appropriate risk levels for suggested actions', () => {
    const improveCopy = SUGGESTED_ACTIONS.find((a) => a.id === 'improve-copy');
    expect(improveCopy?.riskLevel).toBe('low');

    const redesignLayout = SUGGESTED_ACTIONS.find((a) => a.id === 'redesign-layout');
    expect(redesignLayout?.riskLevel).toBe('medium');

    const applyTheme = SUGGESTED_ACTIONS.find((a) => a.id === 'apply-theme');
    expect(applyTheme?.riskLevel).toBe('medium');

    const shortenDeckContent = SUGGESTED_ACTIONS.find((a) => a.id === 'shorten-deck-content');
    expect(shortenDeckContent?.riskLevel).toBe('medium');

    const generateDeckNotes = SUGGESTED_ACTIONS.find((a) => a.id === 'generate-deck-notes');
    expect(generateDeckNotes?.riskLevel).toBe('low');
  });
});
