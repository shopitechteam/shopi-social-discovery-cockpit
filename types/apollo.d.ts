import "@apollo/client";

// Apollo Client v4 requires declaring intended defaultOptions for type safety.
declare module "@apollo/client" {
  namespace ApolloClient {
    namespace DeclareDefaultOptions {
      interface WatchQuery {
        fetchPolicy: "cache-and-network";
        errorPolicy: "all";
      }
      interface Query {
        errorPolicy: "all";
      }
      interface Mutate {
        errorPolicy: "none";
      }
    }
  }
}
