import express from "express";
import path from 'path';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };
import aiRoutes from './src/server/aiRoutes';

dotenv.config();

import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId || '(default)');

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Raised limit: photo/docket analysis routes send base64-encoded images.
  app.use(express.json({ limit: '15mb' }));

  app.get('/healthz', (_req, res) => res.status(200).send('ok'));

  // Gemini calls stay server-side only — GEMINI_API_KEY must never reach
  // the client bundle. See src/server/aiRoutes.ts.
  app.use('/api/ai', aiRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static files
    const htmlPath = path.join(process.cwd(), 'dist');
    app.use(express.static(htmlPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(htmlPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  // Cloud Run sends SIGTERM on scale-down/redeploy — without this, Node's
  // default behavior drops in-flight requests immediately instead of
  // finishing them.
  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
