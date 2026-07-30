"use client";

import { ApolloLink, HttpLink, Observable } from "@apollo/client";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { ErrorLink } from "@apollo/client/link/error";
import { SetContextLink } from "@apollo/client/link/context";
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import { useAuthStore } from "@/stores/auth";
import { refreshAccessToken } from "@/lib/auth/refresh-token";

let clientSingleton: ReturnType<typeof createClient> | undefined;

function makeClient() {
  if (typeof window !== "undefined") {
    if (!clientSingleton) clientSingleton = createClient();
    return clientSingleton;
  }
  return createClient();
}

/**
 * Does this error mean "your access token is no longer good"?
 *
 * The API has two throw sites with two different shapes:
 *  - resolvers using AppError.unauthorized() → code UNAUTHORIZED
 *  - type-graphql's @Authorized([ADMIN]) → code UNAUTHENTICATED when the
 *    request carried no usable token, code UNAUTHORIZED when the caller is
 *    known but lacks the role
 * so both codes have to count. A role denial is indistinguishable from an
 * expired token here, which is why the retry below is capped at one attempt:
 * a permanent denial must not turn into an endless refresh loop.
 */
function isAuthFailure(error: unknown): boolean {
  // A non-200 with a plain body (e.g. a proxy rejecting the Bearer header)
  // never reaches the GraphQL layer, so it needs its own check.
  if (ServerError.is(error)) return error.statusCode === 401;

  if (!CombinedGraphQLErrors.is(error)) return false;

  return error.errors.some((e) => {
    const code = e.extensions?.["code"];
    const message = e.message?.toLowerCase() ?? "";

    return (
      code === "UNAUTHORIZED" ||
      code === "UNAUTHENTICATED" ||
      message.includes("unauthorized") ||
      message.includes("unauthenticated") ||
      message.includes("access denied")
    );
  });
}

function createClient() {
  const httpLink = new HttpLink({
    uri: `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
  });

  // Attach Authorization header from the store on every request. The token is
  // also recorded on the context so the error link below can tell whether a
  // failed request was sent with a token that has since been replaced.
  const authLink = new SetContextLink(({ headers }) => {
    const token = useAuthStore.getState().accessToken;
    return {
      tokenUsed: token,
      headers: {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  // Auth failure → refresh once → retry the operation invisibly
  const refreshLink = new ErrorLink(({ error, operation, forward }) => {
    if (!isAuthFailure(error)) return;

    const context = operation.getContext();
    // One retry per operation. Without this, an error that a refresh can't fix
    // (a genuine role denial, or an admin whose account was demoted) would
    // re-enter this link on every retry and spin: refresh → retry → same error
    // → refresh… Each rotation invalidates the previous refresh token
    // server-side, so the spin also trips the refresh rate limit and ends in a
    // forced sign-out.
    if (context["authRetried"]) return;

    const { refreshToken, clearAuth } = useAuthStore.getState();
    if (!refreshToken) {
      clearAuth();
      return;
    }

    return new Observable((observer) => {
      const tokenUsed = context["tokenUsed"] as string | null | undefined;
      const currentToken = useAuthStore.getState().accessToken;

      // The dashboard fires many queries at once, so a burst of them can fail
      // while a refresh triggered by the first one is already finishing. Those
      // stragglers were sent with the OLD token — the store already holds a
      // fresh one, so they just need a retry. Refreshing again here would send
      // the already-rotated refresh token, which the API deletes on use, and
      // that failure clears the session (the "logged out at random" symptom).
      const pending =
        currentToken && tokenUsed && currentToken !== tokenUsed
          ? Promise.resolve(currentToken)
          : refreshAccessToken();

      pending
        .then((newToken) => {
          if (!newToken) {
            useAuthStore.getState().clearAuth();
            observer.error(error);
            return;
          }

          operation.setContext(({ headers = {} }: Record<string, unknown>) => ({
            authRetried: true,
            headers: {
              ...(headers as Record<string, string>),
              Authorization: `Bearer ${newToken}`,
            },
          }));

          const sub = forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          });

          return () => sub.unsubscribe();
        })
        .catch((err) => observer.error(err));
    });
  });

  return new ApolloClient({
    link: ApolloLink.from([refreshLink, authLink, httpLink]),
    cache: new InMemoryCache({
      typePolicies: {
        Content: { keyFields: ["id"] },
        User: { keyFields: ["id"] },
        Category: { keyFields: ["id"] },
      },
    }),
    defaultOptions: {
      watchQuery: { fetchPolicy: "cache-and-network", errorPolicy: "all" },
      query: { errorPolicy: "all" },
      mutate: { errorPolicy: "none" },
    },
  });
}

export function ApolloWrapper({ children }: React.PropsWithChildren) {
  return <ApolloNextAppProvider makeClient={makeClient}>{children}</ApolloNextAppProvider>;
}
