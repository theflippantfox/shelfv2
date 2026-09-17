import app from "../src/index";

export default function handler(req: Request) {
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api")) {
    url.pathname = url.pathname.slice(4) || "/";
    return app.fetch(new Request(url.toString(), req));
  }
  return app.fetch(req);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
