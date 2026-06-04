import express from 'express';
import app from './app.js';

const server = express();
server.use('/api', app);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Pharmacy POS API running on http://localhost:${PORT}`);
});
