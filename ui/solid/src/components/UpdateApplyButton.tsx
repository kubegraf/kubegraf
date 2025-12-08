import { Component, Show, createSignal } from 'solid-js';
import { api } from '../services/api';
import { UpdateInfo } from '../stores/globalStore';
import { applyUpdate, canApplyUpdate } from '../utils/updateHelpers';
import { addNotification } from '../stores/ui';

interface UpdateApplyButtonProps {
  updateInfo: UpdateInfo;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  variant?: 'primary' | 'secondary';
}

type UpdateStage = 'idle' | 'downloading' | 'installing' | 'success' | 'error';

const UpdateApplyButton: Component<UpdateApplyButtonProps> = (props) => {
  const [isInstalling, setIsInstalling] = createSignal(false);
  const [updateStage, setUpdateStage] = createSignal<UpdateStage>('idle');
  const [installMessage, setInstallMessage] = createSignal<string | null>(null);
  const [progress, setProgress] = createSignal(0);

  const handleApplyUpdate = async () => {
    if (!canApplyUpdate(props.updateInfo)) {
      props.onError?.('Update cannot be applied - download URL is missing');
      return;
    }

    setIsInstalling(true);
    setUpdateStage('downloading');
    setInstallMessage('Preparing update...');
    setProgress(0);

    // Simulate realistic progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < 90) {
          return prev + Math.random() * 15;
        }
        return prev;
      });
    }, 500);

    try {
      // Stage 1: Downloading (0-40%)
      setUpdateStage('downloading');
      setInstallMessage('Downloading update...');
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress(40);

      // Stage 2: Installing (40-90%)
      setUpdateStage('installing');
      setInstallMessage('Installing update...');
      setProgress(50);
      await new Promise(resolve => setTimeout(resolve, 800));
      setProgress(80);

      // Actually call the update API
      const result = await applyUpdate(props.updateInfo);
      clearInterval(progressInterval);

      if (result.success) {
        setProgress(100);
        setUpdateStage('success');
        setInstallMessage('✓ Update installed successfully! Restarting application...');
        
        // Show global success notification
        addNotification(
          `🎉 Update completed successfully! KubeGraf v${props.updateInfo.latestVersion} is now installed. The application will restart automatically.`,
          'success'
        );
        
        props.onSuccess?.();
        
        // Wait a bit before showing restart message
        setTimeout(() => {
          setInstallMessage('Application will restart in a moment...');
        }, 2000);
      } else {
        clearInterval(progressInterval);
        setUpdateStage('error');
        const errorMsg = result.error || 'Failed to apply update';
        setInstallMessage(`✗ ${errorMsg}`);
        props.onError?.(errorMsg);
        setIsInstalling(false);
        setProgress(0);
      }
    } catch (error) {
      clearInterval(progressInterval);
      setUpdateStage('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setInstallMessage(`✗ ${errorMsg}`);
      props.onError?.(errorMsg);
      setIsInstalling(false);
      setProgress(0);
    }
  };

  const isDisabled = () => isInstalling() || !canApplyUpdate(props.updateInfo);
  const isSuccess = () => updateStage() === 'success';
  const isError = () => updateStage() === 'error';

  return (
    <div class="flex flex-col gap-2 w-full">
      {/* Only show button when not in progress or success */}
      <Show when={!isInstalling() && !isSuccess()}>
        <button
          onClick={handleApplyUpdate}
          disabled={isDisabled()}
          class={`w-full px-6 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            props.variant === 'secondary'
              ? 'bg-gray-600 hover:bg-gray-700 text-white'
              : 'text-white'
          } ${
            isDisabled()
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:opacity-90'
          }`}
          style={
            props.variant !== 'secondary'
              ? {
                  background: 'var(--accent-primary)',
                }
              : {}
          }
        >
          Apply Update
        </button>
      </Show>

      {/* Show progress section when installing */}
      <Show when={isInstalling()}>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--accent-primary)' }}>
            <div class="spinner" style={{ width: '16px', height: '16px' }} />
            <span>
              {updateStage() === 'downloading' ? 'Downloading update...' : updateStage() === 'installing' ? 'Installing update...' : 'Applying update...'}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              class="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${progress()}%`,
                background: 'var(--accent-primary)',
              }}
            />
          </div>
        </div>
      </Show>

      {/* Show success state */}
      <Show when={isSuccess()}>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-white bg-green-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Update Successful!</span>
          </div>
        </div>
      </Show>

      {/* Show error state */}
      <Show when={isError()}>
        <div class="flex flex-col gap-2">
          <button
            onClick={handleApplyUpdate}
            class="w-full px-6 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 text-white bg-red-600 hover:opacity-90"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Update Failed - Try Again</span>
          </button>
        </div>
      </Show>

      {/* Status Message */}
      <Show when={installMessage()}>
        <div
          class={`text-xs px-3 py-2 rounded ${
            isSuccess() ? 'bg-green-900/30 border border-green-700/50' :
            isError() ? 'bg-red-900/30 border border-red-700/50' :
            ''
          }`}
          style={{
            background: isSuccess() ? 'rgba(34, 197, 94, 0.1)' : isError() ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary)',
            color: isSuccess() ? '#86efac' : isError() ? '#fca5a5' : 'var(--text-secondary)',
            border: isSuccess() ? '1px solid rgba(34, 197, 94, 0.3)' : isError() ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
          }}
        >
          {installMessage()}
        </div>
      </Show>
    </div>
  );
};

export default UpdateApplyButton;

