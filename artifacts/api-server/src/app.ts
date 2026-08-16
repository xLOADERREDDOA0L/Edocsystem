import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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
app.use(
  (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api/storage/local-upload/")) {
      next();
      return;
    }

    express.json()(req, res, next);
  },
);

app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
