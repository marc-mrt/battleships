type Turn = "player" | "opponent" | null;

interface ScoreFooterProps {
  playerName: string;
  playerWins: number;
  opponentName: string;
  opponentWins: number;
  turn?: Turn;
}

export function ScoreFooter({
  playerName,
  playerWins,
  opponentName,
  opponentWins,
  turn = null,
}: ScoreFooterProps): JSX.Element {
  return (
    <div className="flex justify-between items-center px-4 py-2 bg-slate-800/50 rounded-lg mb-8">
      <PlayerScore
        name={playerName}
        wins={playerWins}
        isPlayer
        isActive={turn === "player"}
      />
      <span className="text-slate-500 text-sm">vs</span>
      <PlayerScore
        name={opponentName}
        wins={opponentWins}
        isPlayer={false}
        isActive={turn === "opponent"}
      />
    </div>
  );
}

interface PlayerScoreProps {
  name: string;
  wins: number;
  isPlayer: boolean;
  isActive: boolean;
}

function PlayerScore({
  name,
  wins,
  isPlayer,
  isActive,
}: PlayerScoreProps): JSX.Element {
  const winsColor = isPlayer ? "text-blue-400" : "text-orange-400";

  return (
    <div className={`flex flex-col ${isPlayer ? "items-start" : "items-end"}`}>
      <div
        className={`flex items-center gap-1 ${isPlayer ? "flex-row" : "flex-row-reverse"}`}
      >
        <span className="text-slate-300 text-sm font-medium truncate max-w-24">
          {name}
        </span>
        <TurnIndicator visible={isActive} />
      </div>
      <span className={`text-lg font-bold ${winsColor}`}>{wins}</span>
    </div>
  );
}

interface TurnIndicatorProps {
  visible: boolean;
}

function TurnIndicator({ visible }: TurnIndicatorProps): JSX.Element {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full bg-green-400 ${visible ? "animate-pulse" : "invisible"}`}
    />
  );
}
