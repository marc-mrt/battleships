import type { GameOverState } from "game-messages";
import { GRID_SIZE } from "game-rules";
import * as R from "ramda";
import { requestNewGame } from "@/app-store";
import { GameCell, GameGrid } from "@/components/game/shared";
import { Button, PageLayout } from "@/components/ui";
import {
  buildPlayerGridData,
  getPlayerCellState,
  positionKey,
} from "../operations";

interface GameOverProps {
  game: GameOverState;
}

export function GameOver({ game }: GameOverProps): JSX.Element {
  const playerData = buildPlayerGridData(game);

  function handleNewGame(): void {
    requestNewGame();
  }

  return (
    <PageLayout
      header={<GameOverHeader isVictory={game.winner === "player"} />}
      footer={
        <Button ariaLabel="Request new game" onClick={handleNewGame}>
          Play Again
        </Button>
      }
    >
      <GameGrid>
        {R.times(
          (y) =>
            R.times((x) => {
              const key = positionKey(x, y);
              const cellState = getPlayerCellState(playerData, x, y);

              return <GameCell key={key} variant={cellState} />;
            }, GRID_SIZE),
          GRID_SIZE,
        )}
      </GameGrid>
    </PageLayout>
  );
}

function GameOverHeader({ isVictory }: { isVictory: boolean }): JSX.Element {
  return (
    <div className="text-center">
      <p
        className={`text-2xl font-bold ${isVictory ? "text-green-400" : "text-red-400"}`}
      >
        {isVictory ? "Victory!" : "Defeat"}
      </p>
      <p className="text-slate-400 mt-2">
        {isVictory
          ? "You sank all enemy ships!"
          : "Your fleet has been destroyed."}
      </p>
    </div>
  );
}
