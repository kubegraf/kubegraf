import { Component } from 'solid-js';
import Modal from './Modal';

interface HelmReleaseErrorModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const HelmReleaseErrorModal: Component<HelmReleaseErrorModalProps> = (props) => {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.title}
      size="md"
    >
      <div class="space-y-4">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--error-color)' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="flex-1">
            <p class="text-sm" style={{ color: 'var(--text-primary)' }}>
              {props.message}
            </p>
          </div>
        </div>
        <div class="flex justify-end pt-4 border-t" style={{ 'border-color': 'var(--border-color)' }}>
          <button
            onClick={props.onClose}
            class="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              background: 'var(--accent-primary)',
              color: 'white',
            }}
          >
            OK
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default HelmReleaseErrorModal;


