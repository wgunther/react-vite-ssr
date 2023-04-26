import React from "react";
import ReactDOMServer from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import App from "./App";
import "./index.css";
import {
  dehydrate,
  Hydrate,
  QueryClient,
  QueryClientProvider,
} from "react-query";

export function getServerRender(queryClient = new QueryClient()) {
  return (url, context) => {
    // dehydrate the provided query client.
    let dehydratedState = dehydrate(queryClient);
    return ReactDOMServer.renderToString(
      <React.StrictMode>
        <StaticRouter location={url} context={context}>
          <QueryClientProvider client={queryClient}>
            <Hydrate state={dehydratedState}>
              <App />
            </Hydrate>
          </QueryClientProvider>
        </StaticRouter>
      </React.StrictMode>
    );
  };
}
