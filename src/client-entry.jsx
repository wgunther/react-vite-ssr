import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import {
  Hydrate,
  QueryClient,
  QueryClientProvider,
} from "react-query";

const queryClient = new QueryClient();
const dehydratedState = window.__REACT_QUERY_STATE__;

ReactDOM.hydrateRoot(
  document.getElementById("root"),
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Hydrate state={dehydratedState}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Hydrate>
    </QueryClientProvider>
  </React.StrictMode>
);

