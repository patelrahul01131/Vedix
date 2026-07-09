import { EventEmitter } from 'events';

/**
 * A simple in-memory Event Bus for local development.
 * In production, this will be replaced by Redis / BullMQ.
 */
export class EventBus extends EventEmitter {
  constructor() {
    super();
  }

  // Define strictly typed emit methods here in the future
  // using packages/shared-types
}
