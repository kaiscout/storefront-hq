// Import before offline tests. Individual tests may install explicit mocks;
// restoring the original fetch restores this guard, never a real network path.
globalThis.fetch = async () => {
  throw new Error('Live network disabled for offline verification');
};
