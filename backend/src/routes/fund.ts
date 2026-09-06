import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// GET /api/fund/:state
router.get('/:state', async (req: Request, res: Response) => {
  try {
    const { state } = req.params;

    // Calculate fund status for the state
    const result = await pool.query(
      `SELECT 
        SUM(allocated_funds) as total_allocated,
        SUM(utilized_funds) as total_utilized,
        COUNT(*) as partner_count
       FROM channel_partners 
       WHERE state_i18n->>'en' = $1`,
      [state]
    );

    const data = result.rows[0];
    const totalAllocated = parseFloat(data.total_allocated) || 0;
    const totalUtilized = parseFloat(data.total_utilized) || 0;
    const utilizationRate = totalAllocated > 0 ? (totalUtilized / totalAllocated) * 100 : 0;

    let status = 'available';
    if (utilizationRate > 90) status = 'exhausted';
    else if (utilizationRate > 70) status = 'low';

    res.json({
      state,
      totalAllocated,
      totalUtilized,
      utilizationRate,
      status,
      partnerCount: parseInt(data.partner_count)
    });
  } catch (error) {
    console.error('Error fetching fund status:', error);
    res.status(500).json({ error: 'Failed to fetch fund status' });
  }
});

export default router;
