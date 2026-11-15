import 'dotenv/config';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT || 8080);
const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ KinCare AI Server listening on http://0.0.0.0:${PORT} (Cloud Run & Local Ready)`);
});
