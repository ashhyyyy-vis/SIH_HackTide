import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/partners/nearby
// Query params: lat, lng, radius_km (default 25), max_npa (default 10.0)
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius_km = '25', max_npa = '10.0' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radius = parseFloat(radius_km as string);
    const maxNpa = parseFloat(max_npa as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // PostGIS query to find nearby partners within radius
    const query = `
      SELECT 
        id,
        name,
        partner_type,
        npa_percentage,
        allocated_funds,
        utilized_funds,
        address,
        district,
        state,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        CASE 
          WHEN npa_percentage > $4 OR (utilized_funds >= allocated_funds) THEN false
          ELSE true
        END as is_eligible,
        ST_Distance(
          location,
          ST_MakePoint($2, $1)::geography
        ) / 1000 as distance_km
      FROM channel_partners
      WHERE ST_DWithin(
        location,
        ST_MakePoint($2, $1)::geography,
        $3 * 1000
      )
      ORDER BY distance_km
    `;

    const result = await pool.query(query, [latitude, longitude, radius, maxNpa]);

    const partners = result.rows.map(partner => ({
      id: partner.id,
      name: partner.name,
      partner_type: partner.partner_type,
      npa_percentage: parseFloat(partner.npa_percentage),
      allocated_funds: parseFloat(partner.allocated_funds),
      utilized_funds: parseFloat(partner.utilized_funds),
      address: partner.address,
      district: partner.district,
      state: partner.state,
      latitude: parseFloat(partner.latitude),
      longitude: parseFloat(partner.longitude),
      is_eligible: partner.is_eligible,
      distance_km: parseFloat(partner.distance_km)
    }));

    res.json({ partners });
  } catch (error) {
    console.error('Error fetching nearby partners:', error);
    res.status(500).json({ error: 'Failed to fetch nearby partners' });
  }
});

// GET /api/partners/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        id,
        name,
        partner_type,
        npa_percentage,
        allocated_funds,
        utilized_funds,
        address,
        district,
        state,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude
      FROM channel_partners
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const partner = result.rows[0];
    res.json({
      id: partner.id,
      name: partner.name,
      partner_type: partner.partner_type,
      npa_percentage: parseFloat(partner.npa_percentage),
      allocated_funds: parseFloat(partner.allocated_funds),
      utilized_funds: parseFloat(partner.utilized_funds),
      address: partner.address,
      district: partner.district,
      state: partner.state,
      latitude: parseFloat(partner.latitude),
      longitude: parseFloat(partner.longitude)
    });
  } catch (error) {
    console.error('Error fetching partner:', error);
    res.status(500).json({ error: 'Failed to fetch partner' });
  }
});

export default router;
