import { isOnline, useGameState } from "@/app-store";
import { LoadingState } from "@/components/ui";
import { GameOver } from "./ui/GameOver";
import { OpponentTurn } from "./ui/OpponentTurn";
import { PlayerTurn } from "./ui/PlayerTurn";

export function Playing(): JSX.Element {
  const state = useGameState();

  if (!isOnline(state)) {
    return <LoadingState />;
  }

  const { game, session } = state;

  if (!game) {
    return <LoadingState />;
  }

  const playerName = session.player.username;
  const opponentName = session.opponent?.username ?? "Opponent";

  if (game.status === "over") {
    return (
      <GameOver
        game={game}
        playerName={playerName}
        opponentName={opponentName}
        canPlayAgain={state.session.player.isOwner}
      />
    );
  }

  const isPlayerTurn = game.turn === "player";
  return isPlayerTurn ? (
    <PlayerTurn
      game={game}
      playerName={playerName}
      opponentName={opponentName}
    />
  ) : (
    <OpponentTurn
      game={game}
      playerName={playerName}
      opponentName={opponentName}
    />
  );
}
