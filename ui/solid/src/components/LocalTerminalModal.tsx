import { Component } from 'solid-js';
import Modal from './Modal';
import LocalTerminal from './LocalTerminal';

interface LocalTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LocalTerminalModal: Component<LocalTerminalModalProps> = (props) => {
  const handleClose = () => {
    props.onClose();
  };

  return (
    <Modal isOpen={props.isOpen} onClose={handleClose} title="Local Terminal" size="full">
      <div class="flex flex-col" style={{ height: '80vh', minHeight: '600px' }}>
        {/* Use the LocalTerminal component */}
        <LocalTerminal />
      </div>
    </Modal>
  );
};

export default LocalTerminalModal;
