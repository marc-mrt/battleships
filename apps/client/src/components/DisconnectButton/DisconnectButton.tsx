import { useState } from "react";
import { disconnectFromSession, isOnline, useGameState } from "@/app-store";
import { Button, ConfirmModal } from "@/components/ui";

export function DisconnectButton(): JSX.Element | null {
  const isConnected = useGameState((state) => isOnline(state));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  function handleDisconnectClick() {
    setIsModalOpen(true);
  }

  function handleCancel() {
    setIsModalOpen(false);
  }

  async function handleConfirm() {
    setIsDisconnecting(true);
    const result = await disconnectFromSession();
    setIsDisconnecting(false);
    setIsModalOpen(false);

    if (result.success) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  if (!isConnected) return null;

  return (
    <>
      <Button
        ariaLabel="Disconnect from session"
        variant="option"
        onClick={handleDisconnectClick}
        disabled={isDisconnecting}
      >
        Disconnect
      </Button>
      <ConfirmModal
        isOpen={isModalOpen}
        title="Disconnect?"
        message="All game progress will be lost and your opponent will be able to continue playing with a new player."
        confirmLabel="Yes, disconnect"
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
