import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import partnerRoutes from './routes/partners';
import schemeRoutes from './routes/schemes';
import translateRoutes from './routes/translate';
import statesRoutes from './routes/states';
import recommendRoutes from './routes/recommend';
import emiRoutes from './routes/emi';
import fundRoutes from './routes/fund';
import casteRoutes from './routes/caste';
import agentRoutes from './routes/agent';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/states', statesRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/emi', emiRoutes);
app.use('/api/fund', fundRoutes);
app.use('/api/caste', casteRoutes);
app.use('/api/ai', agentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SIH Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
