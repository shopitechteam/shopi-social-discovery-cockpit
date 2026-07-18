"use client";

/**
 * Shared, deduped access-token refresh — a burst of expired requests triggers
 * exactly one refresh call. Mirrors the main web app's helper.
 */

import type { AuthPayload } from "@/graphql/types";
import { useAuthStore } from "@/stores/auth";

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          mutation RefreshToken($input: RefreshTokenInput!) {
            refreshToken(input: $input) {
              accessToken
              refreshToken
              user {
                id
                email
                username
                role
                roles
                isVerified
                isSuspended
                suspendedAt
                suspensionReason
                profileVisitCount
                authProviders {
                  local
                  google
                  facebook
                  apple
                  tiktok
                }
                profile {
                  firstName
                  lastName
                  avatar
                  bio
                }
                createdAt
              }
            }
          }
        `,
        variables: { input: { refreshToken } },
      }),
    });

    const json = (await res.json()) as {
      data?: { refreshToken?: AuthPayload };
      errors?: unknown[];
    };

    if (json.errors || !json.data?.refreshToken) return null;

    const refreshedAuth = json.data.refreshToken;
    const { accessToken } = refreshedAuth;
    useAuthStore.getState().setAuth(refreshedAuth);
    return accessToken;
  } catch {
    return null;
  }
}

/**
 * Refresh the access token and write the new pair into the auth store.
 * Resolves null when there is no refresh token or the refresh failed —
 * callers decide whether that clears the session.
 */
export function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return Promise.resolve(null);

  if (!refreshPromise) {
    refreshPromise = doRefresh(refreshToken).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
