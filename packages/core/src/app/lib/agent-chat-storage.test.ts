import { beforeEach, describe, expect, it } from 'vitest';
import {
  capSession,
  loadSession,
  recoverInterruptedRun,
  saveSession,
} from './agent-chat-storage.ts';
import type { AgentChatMessage, AgentChatSession } from './agent-chat-types.ts';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

const mockStorage = new MemoryStorage();

describe('Agent Chat Storage & Retention', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('caps the session messages to 50', () => {
    const messages: AgentChatMessage[] = [];
    for (let i = 0; i < 60; i++) {
      messages.push({
        id: `msg_${i}`,
        sessionId: 'session_1',
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: [{ type: 'text', text: `Message ${i}` }],
        state: 'completed',
        createdAt: new Date().toISOString(),
      });
    }

    const session: AgentChatSession = {
      id: 'session_1',
      projectKey: 'proj_abc',
      origin: 'slide-workspace',
      messages,
      contextPreferences: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const capped = capSession(session);
    expect(capped.messages).toHaveLength(50);
    // Should keep the latest 50 messages (index 10 to 59)
    expect(capped.messages[0].id).toBe('msg_10');
    expect(capped.messages[49].id).toBe('msg_59');
  });

  it('caps the session serialized size to under 256KB', () => {
    // Create messages with large payload to exceed 256KB
    const messages: AgentChatMessage[] = [];
    // 256KB is 262144 characters approximately.
    const largeText = 'a'.repeat(20000); // ~20KB per message
    for (let i = 0; i < 20; i++) {
      messages.push({
        id: `msg_${i}`,
        sessionId: 'session_1',
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: [{ type: 'text', text: largeText }],
        state: 'completed',
        createdAt: new Date().toISOString(),
      });
    }

    const session: AgentChatSession = {
      id: 'session_1',
      projectKey: 'proj_abc',
      origin: 'slide-workspace',
      messages,
      contextPreferences: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const capped = capSession(session);
    const size = JSON.stringify(capped).length;
    expect(size).toBeLessThan(256 * 1024);
    // Should have dropped old messages
    expect(capped.messages.length).toBeLessThan(20);
    // But should keep the last ones
    expect(capped.messages[capped.messages.length - 1].id).toBe('msg_19');
  });

  it('saves and loads session properly', () => {
    const session: AgentChatSession = {
      id: 'session_1',
      projectKey: 'proj_abc',
      origin: 'slide-workspace',
      messages: [
        {
          id: 'msg_1',
          sessionId: 'session_1',
          role: 'user',
          content: [{ type: 'text', text: 'Hi' }],
          state: 'completed',
          createdAt: new Date().toISOString(),
        },
      ],
      contextPreferences: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveSession(session, mockStorage);
    const loaded = loadSession('session_1', 'proj_abc', mockStorage);
    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe('session_1');
    expect(loaded?.messages).toHaveLength(1);
    expect(loaded?.messages[0].content[0].text).toBe('Hi');
  });

  it('recovers interrupted active runs when loading persisted sessions', () => {
    const session: AgentChatSession = {
      id: 'session_1',
      projectKey: 'proj_abc',
      origin: 'slide-workspace',
      currentRunId: 'run_1',
      messages: [
        {
          id: 'msg_u',
          sessionId: 'session_1',
          role: 'user',
          content: [{ type: 'text', text: 'Improve this slide' }],
          runId: 'run_1',
          state: 'completed',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'msg_a',
          sessionId: 'session_1',
          role: 'assistant',
          content: [{ type: 'progress', text: 'Analyzing slide layout...' }],
          runId: 'run_1',
          state: 'loading',
          createdAt: new Date().toISOString(),
        },
      ],
      contextPreferences: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const recovered = recoverInterruptedRun(session);

    expect(recovered.currentRunId).toBeUndefined();
    expect(recovered.messages[1].state).toBe('failed');
    expect(recovered.messages[1].error?.category).toBe('timeout');
  });
});
