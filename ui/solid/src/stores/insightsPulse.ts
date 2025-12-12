import { createSignal } from 'solid-js';

/**
 * Tracks "attention" signals for the Insights section in the sidebar.
 *
 * This is intentionally lightweight and purely client-side:
 * - increments when WebSocket pushes `event` / `monitored_event`
 * - UI can reset when the user visits an Insights view
 */

const [unreadInsightsEvents, setUnreadInsightsEvents] = createSignal(0);
const [lastInsightEventAt, setLastInsightEventAt] = createSignal<number | null>(null);

function registerInsightEvent(count: number = 1) {
  setUnreadInsightsEvents((prev) => prev + Math.max(1, count));
  setLastInsightEventAt(Date.now());
}

function clearInsightsUnread() {
  setUnreadInsightsEvents(0);
}

export {
  unreadInsightsEvents,
  lastInsightEventAt,
  registerInsightEvent,
  clearInsightsUnread,
};
