import type { SuggestedAction } from './agent-chat-types.ts';

export const SUGGESTED_ACTIONS: SuggestedAction[] = [
  {
    id: 'improve-copy',
    label: 'Improve Copy',
    promptTemplate: 'Improve the copy on this slide for clarity and readability.',
    defaultContextKinds: ['current-slide', 'source-excerpt'],
    scope: 'slide',
    riskLevel: 'low',
  },
  {
    id: 'shorten-content',
    label: 'Shorten Content',
    promptTemplate: 'Shorten the content on this slide to make it more concise.',
    defaultContextKinds: ['current-slide', 'source-excerpt'],
    scope: 'slide',
    riskLevel: 'low',
  },
  {
    id: 'redesign-layout',
    label: 'Redesign Layout',
    promptTemplate:
      'Redesign the layout of this slide to improve visual hierarchy and organization.',
    defaultContextKinds: ['current-slide', 'source-excerpt'],
    scope: 'slide',
    riskLevel: 'medium',
  },
  {
    id: 'apply-theme',
    label: 'Apply Theme',
    promptTemplate: 'Apply the "{themeName}" theme to this slide.',
    defaultContextKinds: ['current-slide', 'theme'],
    scope: 'slide',
    riskLevel: 'medium',
  },
  {
    id: 'generate-speaker-notes',
    label: 'Generate Speaker Notes',
    promptTemplate: 'Generate speaker notes for this slide based on its content.',
    defaultContextKinds: ['current-slide', 'speaker-notes'],
    scope: 'slide',
    riskLevel: 'low',
  },
  {
    id: 'fix-alignment',
    label: 'Fix Alignment',
    promptTemplate: 'Fix the alignment of elements on this slide.',
    defaultContextKinds: ['current-slide', 'selected-elements'],
    scope: 'selection',
    riskLevel: 'low',
  },
  {
    id: 'create-related-slide',
    label: 'Create Related Slide',
    promptTemplate: 'Create a new slide related to this one that details {topic}.',
    defaultContextKinds: ['current-slide', 'deck'],
    scope: 'deck',
    riskLevel: 'medium',
  },
];
