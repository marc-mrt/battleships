import { useEffect, useState } from "react";
import { reconnectToSession } from "@/app-store";

export function useInitializing(): boolean {
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    async function attemptReconnection() {
      try {
        await reconnectToSession();
      } finally {
        setInitializing(false);
      }
    }

    attemptReconnection();
  }, []);

  return initializing;
}
