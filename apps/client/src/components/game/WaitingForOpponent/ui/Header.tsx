import { isOnline, useGameState } from "../../../../app-store";
import { Subtitle } from "../../../ui/typography/Subtitle";
import { Title } from "../../../ui/typography/Title";

export function Header() {
  const state = useGameState();

  if (!isOnline(state)) {
    return null;
  }

  const session = state.session;
  const playerName = session.player.username;
  const opponentName = session.opponent?.username ?? null;

  return (
    <>
      {opponentName ? (
        <Title>
          {playerName} vs. {opponentName}
        </Title>
      ) : (
        <>
          <Title>Battleships</Title>
          <Subtitle>Share this with your friend:</Subtitle>
        </>
      )}
    </>
  );
}
