import { Component, Show, createSignal, onMount } from 'solid-js';
import { updateInfo, setUpdateInfo } from '../stores/globalStore';
import { api } from '../services/api';
import UpdateModal from './UpdateModal';

const UpdateBanner: Component = () => {
  const [showModal, setShowModal] = createSignal(false);
  const [dismissed, setDismissed] = createSignal(false);

  // Check localStorage for dismissed state
  onMount(() => {
    const dismissedUntil = localStorage.getItem('kubegraf:updateDismissedUntil');
    if (dismissedUntil) {
      const dismissedTime = parseInt(dismissedUntil, 10);
      if (Date.now() < dismissedTime) {
        setDismissed(true);
      } else {
        localStorage.removeItem('kubegraf:updateDismissedUntil');
      }
    }
  });

  const handleDismiss = () => {
    // Dismiss for 6 hours
    const dismissedUntil = Date.now() + 6 * 60 * 60 * 1000;
    localStorage.setItem('kubegraf:updateDismissedUntil', dismissedUntil.toString());
    setDismissed(true);
  };

  const handleClick = () => {
    setShowModal(true);
  };

  const info = updateInfo();

  return (
    <>
      <Show when={info && info.updateAvailable && !dismissed()}>
        <div
          class="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white py-3 px-6 cursor-pointer transition-all hover:opacity-90"
          onClick={handleClick}
          style={{
            'box-shadow': '0 2px 8px rgba(14, 165, 233, 0.3)',
          }}
        >
          <div class="flex items-center justify-between max-w-7xl mx-auto">
            <div class="flex items-center gap-3">
              <span class="text-xl">🚀</span>
              <div>
                <div class="font-semibold">
                  🎉 New version available: v{info?.latestVersion} — Click to view release notes and update
                </div>
                <div class="text-xs opacity-90 mt-0.5">
                  Your version: v{info?.currentVersion} • Update is safe and non-disruptive
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              class="ml-4 px-3 py-1 rounded hover:bg-white/20 transition-colors text-sm"
              title="Dismiss for 6 hours"
            >
              ×
            </button>
          </div>
        </div>
      </Show>
      <Show when={showModal()}>
        <UpdateModal
          isOpen={showModal()}
          onClose={() => setShowModal(false)}
          updateInfo={info!}
        />
      </Show>
    </>
  );
};

export default UpdateBanner;

