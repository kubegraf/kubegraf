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
      {/* Update banner temporarily disabled - will be reimplemented */}
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

