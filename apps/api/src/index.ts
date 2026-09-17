import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { HTTPException } from "hono/http-exception";
// We'll import these later when we implement actual DB operations

import { shopRouter } from "./routes/shops";
import { categoryRouter } from "./routes/categories";
import { productRouter } from "./routes/products";
import { memberRouter } from "./routes/members";
import { transactionRouter } from "./routes/transactions";
import { returnsRouter } from "./routes/returns";
import { analyticsRouter } from "./routes/analytics";
import { customerRouter } from "./routes/customers";
import { suppliersRouter } from "./routes/suppliers";
import { purchaseOrdersRouter } from "./routes/purchaseOrders";
import { stockAdjustmentsRouter } from "./routes/stockAdjustments";
import { teamRouter } from "./routes/team";

// 1. Initialize OpenAPI Hono with a strict default hook for validation errors
const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          details:
            "error" in result &&
            result.error &&
            typeof result.error === "object" &&
            "errors" in result.error
              ? (result.error as any).errors
              : result.error,
        },
        422,
      );
    }
  },
});

// 2. Global Middlewares
app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"], // Allow Vite dev server
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  }),
);

// 3. Global Error Recovery
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  console.error("Unhandled API Error:", err);

  return c.json(
    {
      success: false,
      error: "Internal Server Error",
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred."
          : err.message,
    },
    500,
  );
});

// 4. Global 404 Handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Not Found",
      message: `Path ${c.req.path} does not exist`,
    },
    404,
  );
});

// 5. Mount API Routes
import { authMiddleware } from "./middleware/auth";
import { dashboardRouter } from "./routes/dashboard";

app.use("/dashboard/*", authMiddleware);
app.route("/dashboard", dashboardRouter);
app.route("/shops", shopRouter);
app.route("/categories", categoryRouter);
app.route("/products", productRouter);
app.route("/members", memberRouter);
app.route("/transactions", transactionRouter);
app.route("/returns", returnsRouter);
app.route("/analytics", analyticsRouter);
app.route("/customers", customerRouter);
app.route("/suppliers", suppliersRouter);
app.route("/purchase-orders", purchaseOrdersRouter);
app.route("/stock-adjustments", stockAdjustmentsRouter);
app.route("/team", teamRouter);

// OpenAPI Spec Generation
app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Shelf API",
  },
});

// Scalar API Reference UI
app.get(
  "/reference",
  apiReference({
    theme: "purple",
    spec: {
      url: "/doc",
    },
  }),
);

// Expose the AppType for End-to-End Type Safety in SvelteKit
export type AppType = typeof app;

export default {
  port: 3000,
  fetch: app.fetch,
};
