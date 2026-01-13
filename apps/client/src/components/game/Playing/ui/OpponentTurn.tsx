import type { GameInProgressState, LastShot } from "game-messages";
import { GRID_SIZE } from "game-rules";
import * as R from "ramda";
import { GameCell, GameGrid } from "@/components/game/shared";
import { PageLayout, Subtitle, Title } from "@/components/ui";
import {
  buildPlayerGridData,
  getPlayerCellState,
  positionKey,
} from "../operations";
import { ScoreFooter } from "./ScoreFooter";

function LastShotFeedback({ lastShot }: { lastShot: LastShot }): JSX.Element {
  const message = lastShot.hit
    ? lastShot.sunkBoat
      ? "You sunk their ship!"
      : "Hit!"
    : "Miss...";

  const colorClass = lastShot.hit ? "text-green-400" : "text-slate-400";

  return <p className={`text-lg font-semibold ${colorClass}`}>{message}</p>;
}

interface OpponentTurnProps {
  game: GameInProgressState;
  playerName: string;
  opponentName: string;
}

export function OpponentTurn({
  game,
  playerName,
  opponentName,
}: OpponentTurnProps): JSX.Element {
  const playerData = buildPlayerGridData(game);

  return (
    <PageLayout
      header={
        <div className="text-center">
          <Title>Enemy Turn</Title>
          <Subtitle>Waiting for opponent to fire...</Subtitle>
        </div>
      }
      footer={
        <div className="flex flex-col gap-4">
          {game.lastShot && <LastShotFeedback lastShot={game.lastShot} />}
          <ScoreFooter
            playerName={playerName}
            playerWins={game.player.wins}
            opponentName={opponentName}
            opponentWins={game.opponent.wins}
            turn="opponent"
          />
        </div>
      }
    >
      <div className="flex flex-col items-center">
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
    </PageLayout>
  );
}
