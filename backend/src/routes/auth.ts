import { Router, Request, Response } from 'express';
import pool from '../config/database';
import jwt from 'jsonwebtoken';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// In-memory OTP storage (for development/hackathon)
const otpStorage = new Map<string, { otp: string; expiresAt: number }>();

// Generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// POST /api/auth/send-otp
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStorage.set(phone_number, { otp, expiresAt });

    // In development mode, log OTP to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`OTP for ${phone_number}: ${otp}`);
    }

    res.json({ 
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phone_number, otp } = req.body;

    if (!phone_number || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    const storedData = otpStorage.get(phone_number);

    if (!storedData) {
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStorage.delete(phone_number);
      return res.status(400).json({ error: 'OTP expired' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Check if user exists
    const userResult = await pool.query(
      'SELECT * FROM users WHERE phone_number = $1',
      [phone_number]
    );

    let user;
    if (userResult.rows.length === 0) {
      // Register new user as BENEFICIARY by default
      const insertResult = await pool.query(
        'INSERT INTO users (phone_number, role) VALUES ($1, $2) RETURNING *',
        [phone_number, 'BENEFICIARY']
      );
      user = insertResult.rows[0];
    } else {
      user = userResult.rows[0];
    }

    // Clear OTP after successful verification
    otpStorage.delete(phone_number);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        phone: user.phone_number
      },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        role: user.role,
        family_income: user.family_income,
        category: user.category
      }
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    res.json({
      id: user.id,
      phone_number: user.phone_number,
      role: user.role,
      family_income: user.family_income,
      category: user.category
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

export default router;
