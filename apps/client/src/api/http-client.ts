import * as R from "ramda";

export type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E };

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface RequestConfig {
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  credentials?: RequestCredentials;
}

const defaultHeaders: Record<string, string> = {
  "Content-Type": "application/json",
};

function mergeHeaders(
  customHeaders?: Record<string, string>,
): Record<string, string> {
  return R.mergeRight(defaultHeaders, customHeaders ?? {});
}

function serializeBody(body?: unknown): string | undefined {
  return body ? JSON.stringify(body) : undefined;
}

function createRequestOptions(config: RequestConfig): RequestInit {
  return {
    method: config.method,
    credentials: config.credentials ?? "include",
    headers: mergeHeaders(config.headers),
    body: serializeBody(config.body),
  };
}

function createErrorResult<T>(message: string): Result<T, string> {
  return { success: false, error: message };
}

function createSuccessResult<T>(value: T): Result<T, string> {
  return { success: true, value };
}

function buildHttpErrorMessage(response: Response): string {
  return `HTTP ${response.status} ${response.statusText}`;
}

function buildNetworkErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return null as T;
  }
  return response.json();
}

async function executeRequest<T>(
  url: string,
  options: RequestInit,
): Promise<Result<T, string>> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      return createErrorResult(buildHttpErrorMessage(response));
    }

    const value = await parseResponse<T>(response);
    return createSuccessResult(value);
  } catch (error) {
    const message = buildNetworkErrorMessage(error);
    return createErrorResult(message);
  }
}

interface RequestPayload {
  baseUrl: string;
  config: RequestConfig;
}

function request<T>(payload: RequestPayload): Promise<Result<T, string>> {
  const { baseUrl, config } = payload;
  const options = createRequestOptions(config);
  return executeRequest<T>(baseUrl, options);
}

export function get<T>(url: string): Promise<Result<T, string>> {
  return request<T>({ baseUrl: url, config: { method: "GET" } });
}

interface PostPayload<B> {
  url: string;
  body?: B;
}

export function post<T, B = unknown>(
  payload: PostPayload<B>,
): Promise<Result<T, string>> {
  return request<T>({
    baseUrl: payload.url,
    config: { method: "POST", body: payload.body },
  });
}
