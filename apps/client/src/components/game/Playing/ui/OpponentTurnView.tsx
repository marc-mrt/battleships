import type { GameInProgressState, LastShot } from "game-messages";
import { GRID_SIZE } from "game-rules";
import * as R from "ramda";
import { GameCell, GameGrid } from "@/components/game/shared/grid";
import {
  buildPlayerGridData,
  getPlayerCellState,
  positionKey,
} from "../operations";

function LastShotFeedback({ lastShot }: { lastShot: LastShot }): JSX.Element {
  const message = lastShot.hit
    ? lastShot.sunkBoat
      ? "You sunk their ship!"
      : "Hit!"
    : "Miss...";

  const colorClass = lastShot.hit ? "text-green-400" : "text-slate-400";

  return <p className={`text-lg font-semibold ${colorClass}`}>{message}</p>;
}

interface OpponentTurnViewProps {
  game: GameInProgressState;
}

export function OpponentTurnView({ game }: OpponentTurnViewProps): JSX.Element {
  const playerData = buildPlayerGridData(game);

  return (
    <div className="flex flex-col items-center gap-4">
      {game.lastShot && <LastShotFeedback lastShot={game.lastShot} />}
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
    </div>
  );
}
