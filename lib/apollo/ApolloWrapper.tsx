"use client";

import { ApolloLink, HttpLink, Observable } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
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

function createClient() {
  const httpLink = new HttpLink({
    uri: `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
  });

  // Attach Authorization header from the store on every request
  const authLink = new SetContextLink(({ headers }) => {
    const token = useAuthStore.getState().accessToken;
    return {
      headers: {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  // UNAUTHENTICATED → refresh once → retry the operation invisibly
  const refreshLink = new ErrorLink(({ error, operation, forward }) => {
    if (!CombinedGraphQLErrors.is(error)) return;

    const isAuthFailure = error.errors.some((e) => {
      const code = e.extensions?.["code"];
      const message = e.message?.toLowerCase() ?? "";

      return (
        code === "UNAUTHENTICATED" ||
        code === "FORBIDDEN" ||
        message.includes("unauthorized") ||
        message.includes("unauthenticated") ||
        message.includes("access denied") ||
        message.includes("permission for this action")
      );
    });

    if (!isAuthFailure) return;

    const { refreshToken, clearAuth } = useAuthStore.getState();
    if (!refreshToken) {
      clearAuth();
      return;
    }

    return new Observable((observer) => {
      refreshAccessToken()
        .then((newToken) => {
          if (!newToken) {
            useAuthStore.getState().clearAuth();
            observer.error(error);
            return;
          }

          operation.setContext(({ headers = {} }: Record<string, unknown>) => ({
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
