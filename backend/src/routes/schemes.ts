import { Router, Request, Response } from 'express';
import pool from '../config/database';
import bhashiniService from '../services/bhashini';

const router = Router();

// GET /api/schemes
// Query params: category (optional filter), lang (default 'en')
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, lang = 'en' } = req.query;

    let query = 'SELECT * FROM schemes';
    const params: any[] = [];

    if (category && category !== 'ALL') {
      query += ' WHERE target_category = $1';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    const schemes = await Promise.all(result.rows.map(async (scheme) => {
      let title = scheme.title_i18n[lang as string] || scheme.title_i18n['en'];
      let description = scheme.description_i18n ? (scheme.description_i18n[lang as string] || scheme.description_i18n['en']) : null;

      // If translation doesn't exist and language is not English, translate on-the-fly
      if (lang !== 'en' && (!scheme.title_i18n[lang as string] || (scheme.description_i18n && !scheme.description_i18n[lang as string]))) {
        const englishTitle = scheme.title_i18n['en'];
        const englishDescription = scheme.description_i18n?.['en'];

        if (englishTitle && !scheme.title_i18n[lang as string]) {
          title = await bhashiniService.translateText(englishTitle, lang as string);
          // Update database with new translation
          const updatedTitleI18n = { ...scheme.title_i18n, [lang]: title };
          await pool.query('UPDATE schemes SET title_i18n = $1 WHERE id = $2', [updatedTitleI18n, scheme.id]);
        }

        if (englishDescription && !scheme.description_i18n[lang as string]) {
          description = await bhashiniService.translateText(englishDescription, lang as string);
          const updatedDescriptionI18n = { ...scheme.description_i18n, [lang]: description };
          await pool.query('UPDATE schemes SET description_i18n = $1 WHERE id = $2', [updatedDescriptionI18n, scheme.id]);
        }
      }

      return {
        id: scheme.id,
        title: title || scheme.title_i18n['en'],
        description: description,
        max_amount: parseFloat(scheme.max_amount),
        interest_rate_min: parseFloat(scheme.interest_rate_min),
        interest_rate_max: parseFloat(scheme.interest_rate_max),
        target_category: scheme.target_category,
        title_i18n: scheme.title_i18n,
        description_i18n: scheme.description_i18n
      };
    }));

    res.json({ schemes });
  } catch (error) {
    console.error('Error fetching schemes:', error);
    res.status(500).json({ error: 'Failed to fetch schemes' });
  }
});

// GET /api/schemes/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { lang = 'en' } = req.query;

    const result = await pool.query('SELECT * FROM schemes WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scheme not found' });
    }

    const scheme = result.rows[0];
    let title = scheme.title_i18n[lang as string] || scheme.title_i18n['en'];
    let description = scheme.description_i18n ? (scheme.description_i18n[lang as string] || scheme.description_i18n['en']) : null;

    // If translation doesn't exist and language is not English, translate on-the-fly
    if (lang !== 'en' && (!scheme.title_i18n[lang as string] || (scheme.description_i18n && !scheme.description_i18n[lang as string]))) {
      const englishTitle = scheme.title_i18n['en'];
      const englishDescription = scheme.description_i18n?.['en'];

      if (englishTitle && !scheme.title_i18n[lang as string]) {
        title = await bhashiniService.translateText(englishTitle, lang as string);
        const updatedTitleI18n = { ...scheme.title_i18n, [lang]: title };
        await pool.query('UPDATE schemes SET title_i18n = $1 WHERE id = $2', [updatedTitleI18n, scheme.id]);
      }

      if (englishDescription && !scheme.description_i18n[lang as string]) {
        description = await bhashiniService.translateText(englishDescription, lang as string);
        const updatedDescriptionI18n = { ...scheme.description_i18n, [lang]: description };
        await pool.query('UPDATE schemes SET description_i18n = $1 WHERE id = $2', [updatedDescriptionI18n, scheme.id]);
      }
    }

    res.json({
      id: scheme.id,
      title: title || scheme.title_i18n['en'],
      description: description,
      max_amount: parseFloat(scheme.max_amount),
      interest_rate_min: parseFloat(scheme.interest_rate_min),
      interest_rate_max: parseFloat(scheme.interest_rate_max),
      target_category: scheme.target_category,
      title_i18n: scheme.title_i18n,
      description_i18n: scheme.description_i18n
    });
  } catch (error) {
    console.error('Error fetching scheme:', error);
    res.status(500).json({ error: 'Failed to fetch scheme' });
  }
});

export default router;
