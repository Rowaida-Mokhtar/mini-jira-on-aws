"use client";

import { AuthSession, clearStoredSession } from "./auth";
import { UserProfile } from "./types";

export async function apiRequest<T>(
  session: AuthSession,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("Authorization", `Bearer ${session.idToken}`);

  const response = await fetch(`/api/backend${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearStoredSession();
    window.location.href = "/login";
    throw new Error("Your session expired. Please sign in again.");
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(readApiError(body, response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function syncUserProfile(session: AuthSession) {
  return apiRequest<UserProfile>(session, "/users/me", {
    method: "POST",
  });
}

function readApiError(body: string, response: Response) {
  if (!body) {
    return `${response.status} ${response.statusText}`;
  }

  try {
    const parsed = JSON.parse(body) as { message?: unknown };

    if (Array.isArray(parsed.message)) {
      return parsed.message.join(" ");
    }

    if (typeof parsed.message === "string") {
      return parsed.message;
    }
  } catch {
    return body;
  }

  return body;
}
