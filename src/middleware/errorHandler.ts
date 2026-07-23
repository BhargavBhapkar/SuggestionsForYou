import type { Request, Response, NextFunction } from "express";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `No route: ${req.method} ${req.path}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error("[error]", err);
  if (err?.code === 11000) {
    return res.status(409).json({ error: "That value is already in use." });
  }
  const status = err?.status ?? 500;
  res.status(status).json({ error: err?.message ?? "Internal server error" });
}
