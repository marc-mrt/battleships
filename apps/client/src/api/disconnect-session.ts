import { getApiURL } from "./config";
import { post, type Result } from "./http-client";

export function disconnectSession(): Promise<Result<null, string>> {
  const url = getApiURL("/sessions/disconnect");
  return post<null>({ url });
}
