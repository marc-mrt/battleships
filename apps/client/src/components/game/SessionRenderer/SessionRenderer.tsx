import { Playing } from "@/components/game/Playing";
import { WaitingForBoatPlacements } from "@/components/game/WaitingForBoatPlacements";
import { WaitingForOpponent } from "@/components/game/WaitingForOpponent";
import type { SessionStatus } from "@/models/session";
import type { SessionRendererProps } from "../prop-types";

const SESSION_COMPONENT_BY_STATUS: Record<
  SessionStatus,
  React.FC<SessionRendererProps>
> = {
  waiting_for_opponent: WaitingForOpponent,
  waiting_for_boat_placements: WaitingForBoatPlacements,
  playing: Playing,
};

export function SessionRenderer(props: SessionRendererProps) {
  const { status } = props;
  const Component = SESSION_COMPONENT_BY_STATUS[status];
  return <Component {...props} />;
}
