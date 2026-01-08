import { isOnline, useGameState } from "@/app-store";
import { CreateOrJoinSession } from "@/components/game/CreateOrJoinSession";
import { SessionRenderer } from "@/components/game/SessionRenderer";
import { LoadingState } from "@/components/ui";
import { useInitializing } from "./hooks/useInitializing";

function GameSession() {
  const session = useGameState((state) =>
    isOnline(state) ? state.session : null,
  );

  if (session != null) {
    return <SessionRenderer {...session} />;
  } else {
    return <CreateOrJoinSession />;
  }
}

export function GameHome() {
  const isInitializing = useInitializing();

  if (isInitializing) {
    return <LoadingState />;
  } else {
    return <GameSession />;
  }
}
