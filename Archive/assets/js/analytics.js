/**
 * Boba Bear — GA4 Analytics Helper
 *
 * Safe wrapper around window.gtag. Silently no-ops if GA4 is blocked
 * (ad blockers, network failure, SSR) so it never throws.
 *
 * Usage: bbTrack('event_name', { param: 'value' });
 */

function bbTrack(eventName, params) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params || {});
}

window.bbTrack = bbTrack;
