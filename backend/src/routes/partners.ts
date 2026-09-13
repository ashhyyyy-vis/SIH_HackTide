import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import bhashiniService from '../services/bhashini';

const router = Router();

// GET /api/partners/nearby
// Query params: lat, lng, radius_km (default 25), max_npa (default 10.0), lang (default 'en')
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius_km = '25', max_npa = '10.0', lang = 'en' } = req.query;

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
        name_i18n,
        partner_type,
        npa_percentage,
        allocated_funds,
        utilized_funds,
        address_i18n,
        district_i18n,
        state_i18n,
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

    const partners = await Promise.all(result.rows.map(async (partner: any) => {
      let name = partner.name_i18n[lang as string] || partner.name_i18n['en'];
      let address = partner.address_i18n ? (partner.address_i18n[lang as string] || partner.address_i18n['en']) : null;
      let district = partner.district_i18n ? (partner.district_i18n[lang as string] || partner.district_i18n['en']) : null;
      let state = partner.state_i18n ? (partner.state_i18n[lang as string] || partner.state_i18n['en']) : null;

      // If translation doesn't exist and language is not English, translate on-the-fly
      if (lang !== 'en' && (!partner.name_i18n[lang as string] || 
          (partner.address_i18n && !partner.address_i18n[lang as string]) ||
          (partner.district_i18n && !partner.district_i18n[lang as string]) ||
          (partner.state_i18n && !partner.state_i18n[lang as string]))) {
        
        const englishName = partner.name_i18n['en'];
        const englishAddress = partner.address_i18n?.['en'];
        const englishDistrict = partner.district_i18n?.['en'];
        const englishState = partner.state_i18n?.['en'];

        if (englishName && !partner.name_i18n[lang as string]) {
          name = await bhashiniService.translateText(englishName, lang as string);
          const updatedNameI18n = { ...partner.name_i18n, [lang]: name };
          await pool.query('UPDATE channel_partners SET name_i18n = $1 WHERE id = $2', [updatedNameI18n, partner.id]);
        }

        if (englishAddress && !partner.address_i18n[lang as string]) {
          address = await bhashiniService.translateText(englishAddress, lang as string);
          const updatedAddressI18n = { ...partner.address_i18n, [lang]: address };
          await pool.query('UPDATE channel_partners SET address_i18n = $1 WHERE id = $2', [updatedAddressI18n, partner.id]);
        }

        if (englishDistrict && !partner.district_i18n[lang as string]) {
          district = await bhashiniService.translateText(englishDistrict, lang as string);
          const updatedDistrictI18n = { ...partner.district_i18n, [lang]: district };
          await pool.query('UPDATE channel_partners SET district_i18n = $1 WHERE id = $2', [updatedDistrictI18n, partner.id]);
        }

        if (englishState && !partner.state_i18n[lang as string]) {
          state = await bhashiniService.translateText(englishState, lang as string);
          const updatedStateI18n = { ...partner.state_i18n, [lang]: state };
          await pool.query('UPDATE channel_partners SET state_i18n = $1 WHERE id = $2', [updatedStateI18n, partner.id]);
        }
      }

      return {
        id: partner.id,
        name: name || partner.name_i18n['en'],
        partner_type: partner.partner_type,
        npa_percentage: parseFloat(partner.npa_percentage),
        allocated_funds: parseFloat(partner.allocated_funds),
        utilized_funds: parseFloat(partner.utilized_funds),
        address: address,
        district: district,
        state: state,
        latitude: parseFloat(partner.latitude),
        longitude: parseFloat(partner.longitude),
        is_eligible: partner.is_eligible,
        distance_km: parseFloat(partner.distance_km)
      };
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
    const { lang = 'en' } = req.query;

    const query = `
      SELECT 
        id,
        name_i18n,
        partner_type,
        npa_percentage,
        allocated_funds,
        utilized_funds,
        address_i18n,
        district_i18n,
        state_i18n,
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
    let name = partner.name_i18n[lang as string] || partner.name_i18n['en'];
    let address = partner.address_i18n ? (partner.address_i18n[lang as string] || partner.address_i18n['en']) : null;
    let district = partner.district_i18n ? (partner.district_i18n[lang as string] || partner.district_i18n['en']) : null;
    let state = partner.state_i18n ? (partner.state_i18n[lang as string] || partner.state_i18n['en']) : null;

    // If translation doesn't exist and language is not English, translate on-the-fly
    if (lang !== 'en' && (!partner.name_i18n[lang as string] || 
        (partner.address_i18n && !partner.address_i18n[lang as string]) ||
        (partner.district_i18n && !partner.district_i18n[lang as string]) ||
        (partner.state_i18n && !partner.state_i18n[lang as string]))) {
      
      const englishName = partner.name_i18n['en'];
      const englishAddress = partner.address_i18n?.['en'];
      const englishDistrict = partner.district_i18n?.['en'];
      const englishState = partner.state_i18n?.['en'];

      if (englishName && !partner.name_i18n[lang as string]) {
        name = await bhashiniService.translateText(englishName, lang as string);
        const updatedNameI18n = { ...partner.name_i18n, [lang]: name };
        await pool.query('UPDATE channel_partners SET name_i18n = $1 WHERE id = $2', [updatedNameI18n, partner.id]);
      }

      if (englishAddress && !partner.address_i18n[lang as string]) {
        address = await bhashiniService.translateText(englishAddress, lang as string);
        const updatedAddressI18n = { ...partner.address_i18n, [lang]: address };
        await pool.query('UPDATE channel_partners SET address_i18n = $1 WHERE id = $2', [updatedAddressI18n, partner.id]);
      }

      if (englishDistrict && !partner.district_i18n[lang as string]) {
        district = await bhashiniService.translateText(englishDistrict, lang as string);
        const updatedDistrictI18n = { ...partner.district_i18n, [lang]: district };
        await pool.query('UPDATE channel_partners SET district_i18n = $1 WHERE id = $2', [updatedDistrictI18n, partner.id]);
      }

      if (englishState && !partner.state_i18n[lang as string]) {
        state = await bhashiniService.translateText(englishState, lang as string);
        const updatedStateI18n = { ...partner.state_i18n, [lang]: state };
        await pool.query('UPDATE channel_partners SET state_i18n = $1 WHERE id = $2', [updatedStateI18n, partner.id]);
      }
    }

    res.json({
      id: partner.id,
      name: name || partner.name_i18n['en'],
      partner_type: partner.partner_type,
      npa_percentage: parseFloat(partner.npa_percentage),
      allocated_funds: parseFloat(partner.allocated_funds),
      utilized_funds: parseFloat(partner.utilized_funds),
      address: address,
      district: district,
      state: state,
      latitude: parseFloat(partner.latitude),
      longitude: parseFloat(partner.longitude)
    });
  } catch (error) {
    console.error('Error fetching partner:', error);
    res.status(500).json({ error: 'Failed to fetch partner' });
  }
});

export default router;
