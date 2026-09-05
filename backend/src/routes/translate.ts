import { Router, Request, Response } from 'express';
import bhashiniService from '../services/bhashini';

const router = Router();

// POST /api/translate
// Request body: { text: string, targetLanguage: string, sourceLanguage?: string }
router.post('/', async (req: Request, res: Response) => {
  try {
    const { text, targetLanguage, sourceLanguage = 'en' } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Text and targetLanguage are required' });
    }

    const translatedText = await bhashiniService.translateText(text, targetLanguage, sourceLanguage);

    res.json({
      originalText: text,
      translatedText,
      sourceLanguage,
      targetLanguage
    });
  } catch (error) {
    console.error('Error translating text:', error);
    res.status(500).json({ error: 'Failed to translate text' });
  }
});

// POST /api/translate/batch
// Request body: { texts: string[], targetLanguage: string, sourceLanguage?: string }
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { texts, targetLanguage, sourceLanguage = 'en' } = req.body;

    if (!texts || !Array.isArray(texts) || !targetLanguage) {
      return res.status(400).json({ error: 'texts array and targetLanguage are required' });
    }

    const translatedTexts = await bhashiniService.translateBatch(texts, targetLanguage, sourceLanguage);

    res.json({
      originalTexts: texts,
      translatedTexts,
      sourceLanguage,
      targetLanguage
    });
  } catch (error) {
    console.error('Error translating texts:', error);
    res.status(500).json({ error: 'Failed to translate texts' });
  }
});

export default router;
