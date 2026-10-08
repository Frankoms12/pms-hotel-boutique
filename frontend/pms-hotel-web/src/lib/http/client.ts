import { getPublicEnvironment } from "@/lib/env";

import {
  HttpStatusError,
  HttpUnauthorizedError,
  HttpForbiddenError,
  HttpNetworkError,
} from "./errors";
import {
  requestInterceptors,
  responseInterceptors,
  errorInterceptors,
  triggerUnauthorized,
} from "./interceptors";
import type { HttpRequestOptions } from "./types";

function resolveUrl(path: string, baseUrl: string | undefined): string {
  if (!path) return baseUrl || "";
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  if (!baseUrl) {
    return path;
  }

  return new URL(path, baseUrl).toString();
}

export async function httpRequest<ResponseDto>(
  initialOptions: HttpRequestOptions
): Promise<ResponseDto> {
  let options: HttpRequestOptions = {
    ...initialOptions,
    baseUrl: initialOptions.baseUrl || getPublicEnvironment().apiBaseUrl,
  };

  // 1. Run Request Interceptors
  for (const interceptor of requestInterceptors) {
    options = await interceptor(options);
  }

  let response: Response;
  const pathOrUrl = options.path || options.url || "";
  const url = resolveUrl(pathOrUrl, options.baseUrl);

  // 2. Perform Fetch
  try {
    response = await fetch(url, {
      method: options.method || "GET",
      headers: options.headers,
      body: options.body,
      signal: options.signal,
    });
  } catch (err: unknown) {
    let networkError: unknown = new HttpNetworkError(
      err instanceof Error ? err.message : "HTTP_NETWORK_ERROR"
    );
    for (const errorInterceptor of errorInterceptors) {
      networkError = await errorInterceptor(networkError, options);
    }
    throw networkError;
  }

  // 3. Handle Status Errors
  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = undefined;
    }

    let statusError: unknown;
    if (response.status === 401) {
      // Cookie BFF sessions handle their own context's 401; no global logout signal.
      if (options.withAuth !== false) triggerUnauthorized();
      statusError = new HttpUnauthorizedError(response.statusText, errorData);
    } else if (response.status === 403) {
      statusError = new HttpForbiddenError(response.statusText, errorData);
    } else {
      statusError = new HttpStatusError(response.status, response.statusText, errorData);
    }

    for (const errorInterceptor of errorInterceptors) {
      statusError = await errorInterceptor(statusError, options);
    }

    throw statusError;
  }

  // 4. Parse Response Data
  let data: ResponseDto;
  if (response.status === 204) {
    data = null as unknown as ResponseDto;
  } else {
    try {
      data = (await response.json()) as ResponseDto;
    } catch {
      data = (await response.text()) as unknown as ResponseDto;
    }
  }

  // 5. Run Response Interceptors
  for (const interceptor of responseInterceptors) {
    data = await interceptor(data, response, options);
  }

  return data;
}
