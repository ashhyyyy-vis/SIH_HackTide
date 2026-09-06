import { Router, Request, Response } from 'express';

const router = Router();

// POST /api/ai/agent
router.post('/agent', async (req: Request, res: Response) => {
  try {
    const { goal } = req.body;

    if (!goal) {
      return res.status(400).json({ error: 'Goal is required' });
    }

    // Simple AI agent response - in production this would call an actual AI service
    const response = {
      goal,
      response: `Based on your goal: "${goal}", I recommend exploring the following options:\n\n1. Check your eligibility for government schemes\n2. Find nearby channel partners\n3. Use the EMI calculator to plan your repayments\n\nPlease use the navigation to access these features.`,
      suggestions: [
        'Use the "Find my scheme" wizard to get personalized recommendations',
        'Visit the Partner Locator to find eligible financial institutions near you',
        'Check the EMI Calculator to understand your repayment schedule'
      ]
    };

    res.json(response);
  } catch (error) {
    console.error('Error processing agent request:', error);
    res.status(500).json({ error: 'Failed to process agent request' });
  }
});

export default router;
