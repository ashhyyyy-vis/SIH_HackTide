import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import partnerRoutes from './routes/partners';
import schemeRoutes from './routes/schemes';
import translateRoutes from './routes/translate';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS is restricted to the frontend origin rather than "*", because this API
// issues JWTs and accepts them on the Authorization header. CORS_ORIGIN may be
// a comma-separated list; it falls back to the Vite dev server origin.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

/* Vite picks the next free port when 5173 is busy (5174, 5175 ...), and it
   forwards the browser's Origin through its proxy. Pinning the allowlist to a
   single port therefore breaks sign-in as soon as a second dev server is
   running — which is hard to diagnose, because the failure surfaces as a
   generic 500. Any localhost/127.0.0.1 port is accepted in development; in
   production only CORS_ORIGIN is honoured. */
const isDev = process.env.NODE_ENV !== 'production';
const localhostOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
  origin(origin, callback) {
    // non-browser clients (curl, Postman, the Vite proxy itself) send no Origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (isDev && localhostOrigin.test(origin)) return callback(null, true);
    /* Reject by refusing the CORS headers, not by throwing. Throwing here is
       surfaced by Express as a 500, which reads like a server fault rather
       than a policy decision. */
    console.warn(`CORS: refused origin ${origin}`);
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/translate', translateRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'SIH Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
