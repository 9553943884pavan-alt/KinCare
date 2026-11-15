import 'dotenv/config';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT || 8080);
const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ KinCare AI Server running at http://localhost:${PORT} (or http://127.0.0.1:${PORT}) — Cloud Run Ready`);
});
