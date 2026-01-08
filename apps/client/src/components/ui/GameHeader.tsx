interface GameHeaderProps {
  playerName: string;
  opponentName: string;
}

export function GameHeader({ playerName, opponentName }: GameHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-small px-large pb-medium pt-medium">
      <h3 className="player m-0 text-large">{playerName}</h3>
      <h3 className="m-0 text-large">{opponentName}</h3>
    </header>
  );
}
