import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

interface RecommendationRequest {
  state: string;
  projectCost: number;
  annualIncome: number;
  category?: string;
  projectType?: string;
}

// POST /api/recommend
router.post('/', async (req: Request, res: Response) => {
  try {
    const { state, projectCost, annualIncome, category, projectType }: RecommendationRequest = req.body;

    if (!state || !projectCost || !annualIncome) {
      return res.status(400).json({ error: 'State, projectCost, and annualIncome are required' });
    }

    // Get schemes that match the criteria
    let query = `
      SELECT * FROM schemes 
      WHERE max_amount >= $1 
      AND ($2::text IS NULL OR target_category = $2)
    `;
    const params: any[] = [projectCost, category || null];

    if (state) {
      query += ` AND ($3::text IS NULL OR applicable_states IS NULL OR $3 = ANY(applicable_states))`;
      params.push(state);
    }

    query += ' ORDER BY (interest_rate_min + interest_rate_max) / 2 ASC LIMIT 5';

    const result = await pool.query(query, params);

    const schemes = result.rows.map((scheme: any) => {
      const maxLoan = Math.min(parseFloat(scheme.max_amount), projectCost);
      const rate = (parseFloat(scheme.interest_rate_min) + parseFloat(scheme.interest_rate_max)) / 2;
      const tenureYears = 5; // Default tenure
      const monthlyEMI = calculateEMI(projectCost, rate / 100, tenureYears * 12);
      const quarterly = monthlyEMI * 3;
      const totalInterest = (monthlyEMI * tenureYears * 12) - projectCost;
      const principal = projectCost;

      return {
        code: scheme.id,
        name: scheme.title_i18n['en'],
        type: scheme.target_category,
        state: state,
        rate: rate,
        maxLoan: maxLoan,
        financing: maxLoan,
        monthlyEMI: monthlyEMI,
        quarterly: quarterly,
        coverage: (maxLoan / projectCost) * 100,
        tenureYears: tenureYears,
        moratoriumMonths: 0,
        score: calculateScore(scheme, projectCost, annualIncome),
        incomeLimit: scheme.income_limit || null,
        principal,
        totalInterest,
      };
    });

    // Sort by score and return top recommendation
    schemes.sort((a: any, b: any) => b.score - a.score);

    res.json({ 
      recommendations: schemes,
      total: schemes.length 
    });
  } catch (error) {
    console.error('Error generating recommendation:', error);
    res.status(500).json({ error: 'Failed to generate recommendation' });
  }
});

function calculateEMI(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months;
  const monthlyRate = annualRate / 12;
  const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
  return emi;
}

function calculateScore(scheme: any, projectCost: number, annualIncome: number): number {
  let score = 50;
  
  // Higher coverage = better score
  const coverage = Math.min(parseFloat(scheme.max_amount), projectCost) / projectCost;
  score += coverage * 30;
  
  // Lower interest rate = better score
  const avgRate = (parseFloat(scheme.interest_rate_min) + parseFloat(scheme.interest_rate_max)) / 2;
  score += (10 - avgRate) * 2;
  
  // Income limit check
  if (scheme.income_limit && annualIncome <= parseFloat(scheme.income_limit)) {
    score += 20;
  }
  
  return Math.min(100, Math.max(0, score));
}

export default router;
