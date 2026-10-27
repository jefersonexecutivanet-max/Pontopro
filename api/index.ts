/**
 * PontoPro — Vercel Serverless Function Entry Point
 * Wraps the Express application from server.ts for deployment on Vercel.
 *
 * All existing Express routes (/api/*) are preserved.
 * The handler is exported as default for Vercel's Node.js runtime.
 */

import { startServer, getApp } from '../server';

// Initialize the Express app without calling app.listen()
// (Vercel handles the HTTP server; we only export the handler).
const app = getApp();

export default app;
