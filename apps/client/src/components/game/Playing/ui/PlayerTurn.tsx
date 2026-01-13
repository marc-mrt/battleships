import type { GameInProgressState } from "game-messages";
import { GRID_SIZE } from "game-rules";
import * as R from "ramda";
import { fireShot } from "@/app-store";
import { GameCell, GameGrid } from "@/components/game/shared";
import { PageLayout, Subtitle, Title } from "@/components/ui";
import {
  buildOpponentGridData,
  getOpponentCellState,
  positionKey,
} from "../operations";

interface PlayerTurnProps {
  game: GameInProgressState;
}

export function PlayerTurn({ game }: PlayerTurnProps): JSX.Element {
  const opponentData = buildOpponentGridData(game);

  function handleCellClick(x: number, y: number): void {
    const key = positionKey(x, y);
    const alreadyShot =
      opponentData.hits.has(key) || opponentData.misses.has(key);
    if (!alreadyShot) {
      fireShot(x, y);
    }
  }

  return (
    <PageLayout
      header={
        <div className="text-center">
          <Title>Your Turn</Title>
          <Subtitle>Tap a cell to fire</Subtitle>
        </div>
      }
    >
      <div className="flex flex-col items-center">
        <GameGrid>
          {R.times(
            (y) =>
              R.times((x) => {
                const key = positionKey(x, y);
                const cellState = getOpponentCellState({
                  data: opponentData,
                  x,
                  y,
                  isPlayerTurn: true,
                });
                const isTargetable = cellState === "targetable";

                return (
                  <GameCell
                    key={key}
                    variant={cellState}
                    isButton={isTargetable}
                    onClick={
                      isTargetable ? () => handleCellClick(x, y) : undefined
                    }
                    ariaLabel={
                      isTargetable ? `Fire at ${x + 1}, ${y + 1}` : undefined
                    }
                  />
                );
              }, GRID_SIZE),
            GRID_SIZE,
          )}
        </GameGrid>
      </div>
    </PageLayout>
  );
}
