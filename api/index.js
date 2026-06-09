// Vercel serverless entry point.
//
// Vercel auto-detects files under /api as serverless functions and
// exposes this file at /api/* on the deployed domain. We re-export
// the Express app as the default request handler so the deployed
// frontend (served from the same domain) can call
// /api/auth/login, /api/products, /api/sales without cross-origin
// issues — it's same-origin.
//
// The Express app's routes are mounted at /auth, /products, /sales
// (see backend/src/app.js). Combined with this file being served at
// /api, the final URLs are /api/auth/login, /api/products, etc.
import app from '../backend/src/app.js';

export default app;
