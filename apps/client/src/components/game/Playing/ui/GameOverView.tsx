import type { GameOverState } from "game-messages";
import { GRID_SIZE } from "game-rules";
import * as R from "ramda";
import { requestNewGame } from "@/app-store";
import { GameCell, GameGrid } from "@/components/game/shared/grid";
import { Button } from "@/components/ui";
import {
  buildPlayerGridData,
  getPlayerCellState,
  positionKey,
} from "../operations";

interface GameOverViewProps {
  game: GameOverState;
}

export function GameOverView({ game }: GameOverViewProps): JSX.Element {
  const isVictory = game.winner === "player";
  const playerData = buildPlayerGridData(game);

  function handleNewGame(): void {
    requestNewGame();
  }

  return (
    <div className="flex flex-col items-center gap-6">
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

      <Button ariaLabel="Request new game" onClick={handleNewGame}>
        Play Again
      </Button>
    </div>
  );
}
