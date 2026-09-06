import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// GET /api/caste/:caste
router.get('/:caste', async (req: Request, res: Response) => {
  try {
    const { caste } = req.params;

    // Get schemes applicable to the caste category
    const result = await pool.query(
      'SELECT * FROM schemes WHERE target_category = $1 ORDER BY created_at DESC',
      [caste.toUpperCase()]
    );

    const schemes = result.rows.map((scheme: any) => ({
      id: scheme.id,
      title: scheme.title_i18n['en'],
      description: scheme.description_i18n?.['en'],
      max_amount: parseFloat(scheme.max_amount),
      interest_rate_min: parseFloat(scheme.interest_rate_min),
      interest_rate_max: parseFloat(scheme.interest_rate_max),
      target_category: scheme.target_category
    }));

    res.json({ caste, schemes });
  } catch (error) {
    console.error('Error fetching caste schemes:', error);
    res.status(500).json({ error: 'Failed to fetch caste schemes' });
  }
});

export default router;
