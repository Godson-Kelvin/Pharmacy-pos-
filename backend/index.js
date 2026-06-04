import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import app from './src/app.js';

const api = express();
api.use('/', app);

export const api = onRequest(api);
