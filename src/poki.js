// Poki SDK wrapper.
// The real SDK is injected by Poki's <script> tag (window.PokiSDK). During local
// development that script isn't present, so every call gracefully no-ops and
// resolves, letting the game run identically with or without Poki.

const sdk = () => (typeof window !== 'undefined' ? window.PokiSDK : undefined);

let ready = false;

export const Poki = {
  // Call once on boot. Resolves when the SDK is initialised (or immediately if absent).
  async init() {
    const s = sdk();
    if (!s) {
      console.info('[Poki] SDK not found — running in standalone mode.');
      ready = false;
      return;
    }
    try {
      await s.init();
      ready = true;
      // Disable Poki's own debug logging noise in production builds.
      if (s.setDebug) s.setDebug(false);
      console.info('[Poki] SDK initialised.');
    } catch (e) {
      console.warn('[Poki] init failed, continuing without SDK.', e);
      ready = false;
    }
  },

  // Mark the start/end of the loading phase (asset creation, first frame).
  loadingFinished() {
    if (ready) try { sdk().gameLoadingFinished(); } catch (_) {}
  },

  // Call the moment real gameplay begins (mutes ads audio etc.).
  gameplayStart() {
    if (ready) try { sdk().gameplayStart(); } catch (_) {}
  },

  // Call whenever gameplay pauses (round over, game over, tab hidden).
  gameplayStop() {
    if (ready) try { sdk().gameplayStop(); } catch (_) {}
  },

  // Interstitial shown between rounds. Always resolves so the game flow continues.
  async commercialBreak() {
    const s = sdk();
    if (!ready || !s) return;
    try { await s.commercialBreak(); } catch (_) {}
  },

  // Rewarded ad. Resolves true if the player watched it through to the reward.
  async rewardedBreak() {
    const s = sdk();
    if (!ready || !s) return false;
    try { return await s.rewardedBreak(); } catch (_) { return false; }
  },

  // Whether a rewarded ad is even worth offering.
  get available() {
    return ready;
  },
};
