import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// GET /api/states
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT state_i18n FROM channel_partners'
    );

    const states = result.rows
      .map((row: any) => {
        const stateI18n = row.state_i18n;
        return {
          name: stateI18n['en'] || Object.values(stateI18n)[0],
          i18n: stateI18n
        };
      })
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    res.json({ states });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});

export default router;
