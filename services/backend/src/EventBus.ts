import { EventEmitter } from 'events';

/**
 * Per-connection in-memory Event Bus.
 *
 * Each WebSocket connection gets its own EventBus instance (instantiated in
 * server.ts), so there is no cross-connection state leakage.
 *
 * Node.js EventEmitter warns when more than 10 listeners are added to the same
 * event. Since each connection legitimately registers multiple listeners
 * (status, message, token, activity, debugData, sessionSwitched,
 * summarizeMission, evaluateMission), we raise the limit to suppress false
 * positives. setMaxListeners(0) would disable the warning entirely; 50 is a
 * safe cap that still warns on genuine listener leaks.
 *
 * NOTE: In a future production deployment this should be replaced with a
 * Redis pub/sub or BullMQ-based event system that provides persistence and
 * delivery guarantees across multiple Node.js instances.
 */
export class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }
}
