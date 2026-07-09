import { describe, it, expect, vi } from 'vitest';
import { MissionPlanner } from '../Planner';
import { EventBus } from '../EventBus';

// Mock DB and ModelGateway to test logic isolation
vi.mock('@vedix/database', () => ({
  db: {
    mission: { create: vi.fn().mockResolvedValue({ id: 'test-mission-1' }), update: vi.fn() },
    message: { create: vi.fn() }
  }
}));

vi.mock('@vedix/model-gateway', () => ({
  ModelGateway: class {
    generate = vi.fn().mockResolvedValue('Done');
  }
}));

describe('MissionPlanner Sandbox & Approval', () => {
  it('should initialize with strictly sandboxed tools', () => {
    const eventBus = new EventBus();
    const planner = new MissionPlanner(eventBus);
    
    // Tools should be explicitly registered
    expect(planner['tools'].length).toBeGreaterThan(0);
    expect(planner['tools'].find(t => t.name === 'run_command')).toBeDefined();
    
    // Validate that dangerous tools require approval
    const terminalTool = planner['tools'].find(t => t.name === 'run_command');
    expect(terminalTool?.requiresApproval).toBe(true);
  });
});
