import { useGameState } from "@/app-store";
import { LoadingState } from "@/components/ui";
import { GameOver } from "./ui/GameOver";
import { OpponentTurn } from "./ui/OpponentTurn";
import { PlayerTurn } from "./ui/PlayerTurn";

export function Playing(): JSX.Element {
  const game = useGameState((state) =>
    state.status === "online" ? state.game : null,
  );

  if (!game) {
    return <LoadingState />;
  }

  if (game.status === "over") {
    return <GameOver game={game} />;
  }

  const isPlayerTurn = game.turn === "player";
  return isPlayerTurn ? (
    <PlayerTurn game={game} />
  ) : (
    <OpponentTurn game={game} />
  );
}
