import 'dotenv/config';
import { createApp } from './app.js';
import { initDatabase } from './data/store.js';
import { validateProductionSecret } from './security/passcodeAuth.js';

const PORT = Number(process.env.PORT || 8080);

if (String(process.env.ENFORCE_SESSION_SECRET || '').toLowerCase() === 'true') {
  validateProductionSecret();
}

const dbStatus = await initDatabase();
const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `✅ KinCare AI Server running at http://localhost:${PORT} (DB: ${dbStatus.engine} @ ${dbStatus.location})`
  );
});
