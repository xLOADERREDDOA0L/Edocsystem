import express, { type Express } from "express";
import cors from "cors";
import * as pinoHttpModule from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// pino-http v10 is exposed as a CommonJS-style module.
// Resolve the callable export explicitly for TypeScript/ESM.
const pinoHttp =
  "default" in pinoHttpModule
    ? pinoHttpModule.default
    : pinoHttpModule;

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());

// Skip JSON parsing for the raw local-upload endpoint
// so express.raw() receives the untouched file body.
app.use((req, res, next) => {
  if (req.path.startsWith("/api/storage/local-upload/")) {
    next();
    return;
  }

  express.json()(req, res, next);
});

app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
