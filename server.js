import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import {
  dehydrate,
  Hydrate,
  QueryClient,
  QueryClientProvider,
} from "react-query";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwk = process.cwd();
const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.VITEST;

function resolvePath(p) {
  return path.resolve(__dirname, p);
}

// Read index file to be our template. Note that devel, we read the index
// file directly, but for prod we read it out of the dist directory.
function getIndexFilePath() {
  return isProd
    ? resolvePath("dist/client/index.html")
    : resolvePath("index.html");
}

let data = [
  { name: "Hank", age: 20 },
  { name: "Will", age: 35 },
  { name: "Peter", age: 27 },
  { name: "David", age: 18 },
];

function getSomeApiData() {
  return data;
}

setInterval(() => {
  data.forEach((person) => {
    ++person.age;
  });
}, 2000);

export async function createServer() {
  const resolvePath = (p) => path.resolve(__dirname, p);
  const app = express();

  let vite = undefined;
  if (isProd) {
    let compression = await import("compression");
    let serve_static = await import("serve-static");
    app.use(compression.default());
    app.use(
      serve_static.default(resolvePath("dist/client"), {
        index: false,
      })
    );
  } else {
    vite = await import("vite");
    vite = await vite.createServer({
      cwk,
      logLevel: isTest ? "error" : "info",
      server: {
        middlewareMode: true,
        watch: {
          usePolling: true,
          interval: 100,
        },
      },
      appType: "custom",
    });
    app.use(vite.middlewares);
  }

  // API endpoint for loading our data.
  app.get("/api/people", (req, res) => {
    res.json(getSomeApiData());
  });

  // Read index file to use as the template. For prod, this will be the only
  // time we read this, but for devel, we'll read it more often.
  let template = fs.readFileSync(getIndexFilePath(), "utf-8");

  // In prod, we'll load the our server entry. This is a function which
  // takes in a QueryClient and returns the app.
  let getServerRender;
  if (isProd) {
    getServerRender = (await import("./dist/server/server-entry.js"))
      .getServerRender;
  }

  app.use("*", async (req, res) => {
    try {
      // Set some initial data. Note, we need some staleTime, otherwise, when
      // the server actually renders this below, it'll already be stale and
      // revert to a loading state.
      const queryClient = new QueryClient();
      queryClient.setQueryData("data", getSomeApiData(), { staleTime: 5000 });

      const url = req.originalUrl;

      let requestTemplate = template;

      // Let's get the render function for our app.
      let render;
      if (isProd) {
        // In prod, we need only fetch the build server entry, and inject the
        // queryClient we have built.
        render = getServerRender(queryClient);
      } else {
        // Read file more frequently in devel. Also, we run the vite
        // transformations on it.
        requestTemplate = fs.readFileSync(getIndexFilePath(), "utf-8");
        requestTemplate = await vite.transformIndexHtml(url, requestTemplate);
        // We load our server entry rendered through ssrLoadModule, and get our
        // render function.
        render = (
          await vite.ssrLoadModule("/src/server-entry.jsx")
        ).getServerRender(queryClient);
      }

      const context = {};
      const appHtml = render(url, context);

      if (context.url) {
        // Somewhere a `<Redirect>` was rendered
        return res.redirect(301, context.url);
      }

      // Now, we get our final HTML to render. We have to replace two things:
      // 1) we replace our content placeholder with the appHtml we rendered.
      // 2) we need to dehydrate our queryClient, and replace our state
      //    placeholder.
      let html = requestTemplate.replace(`<!--app-html-->`, appHtml);
      html = html.replace(
        `<!--query-state-->`,
        JSON.stringify(dehydrate(queryClient))
      );

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      !isProd && vite.ssrFixStacktrace(e);
      console.log(e.stack);
      res.status(500).end(e.stack);
    }
  });

  return { app, vite };
}

if (!isTest) {
  createServer().then(({ app }) =>
    app.listen(5173, () => {
      console.log("http://localhost:5173");
    })
  );
}
