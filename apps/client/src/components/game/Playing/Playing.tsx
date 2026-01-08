import { useGameState } from "@/app-store";
import { PageLayout, Subtitle, Title } from "@/components/ui";
import { GameOverView } from "./ui/GameOverView";
import { OpponentTurnView } from "./ui/OpponentTurnView";
import { PlayerTurnView } from "./ui/PlayerTurnView";

export function Playing(): JSX.Element {
  const game = useGameState((state) =>
    state.status === "online" ? state.game : null,
  );

  if (!game) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-slate-400">Loading game...</p>
        </div>
      </PageLayout>
    );
  }

  if (game.status === "over") {
    const header = (
      <div className="text-center">
        <Title>Game Over</Title>
      </div>
    );

    return (
      <PageLayout header={header}>
        <div className="flex flex-col items-center">
          <GameOverView game={game} />
        </div>
      </PageLayout>
    );
  }

  const isPlayerTurn = game.turn === "player";

  const header = (
    <div className="text-center">
      <Title>{isPlayerTurn ? "Your Turn" : "Enemy Turn"}</Title>
      <Subtitle>
        {isPlayerTurn
          ? "Tap a cell to fire"
          : "Waiting for opponent to fire..."}
      </Subtitle>
    </div>
  );

  return (
    <PageLayout header={header}>
      <div className="flex flex-col items-center">
        {isPlayerTurn ? (
          <PlayerTurnView game={game} />
        ) : (
          <OpponentTurnView game={game} />
        )}
      </div>
    </PageLayout>
  );
}
