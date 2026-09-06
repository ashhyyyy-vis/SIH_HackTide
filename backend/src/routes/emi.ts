import { Router, Request, Response } from 'express';

const router = Router();

interface EMIRequest {
  amount: number;
  rate: number;
  tenureYears: number;
  moratoriumMonths: number;
}

interface ScheduleRow {
  quarter: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

// POST /api/emi
router.post('/', async (req: Request, res: Response) => {
  try {
    const { amount, rate, tenureYears, moratoriumMonths = 0 }: EMIRequest = req.body;

    if (!amount || !rate || !tenureYears) {
      return res.status(400).json({ error: 'Amount, rate, and tenureYears are required' });
    }

    const principal = Number(amount);
    const annualRate = Number(rate) / 100;
    const totalMonths = Number(tenureYears) * 12;
    const moratorium = Number(moratoriumMonths);

    // Calculate EMI
    let monthlyEMI: number;
    if (annualRate === 0) {
      monthlyEMI = principal / totalMonths;
    } else {
      const monthlyRate = annualRate / 12;
      monthlyEMI = principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    }

    const quarterlyInstallment = monthlyEMI * 3;
    const totalPayment = monthlyEMI * totalMonths;
    const totalInterest = totalPayment - principal;

    // Generate quarterly schedule
    const schedule: ScheduleRow[] = [];
    let balance = principal;
    let quarter = 1;

    for (let month = 1; month <= totalMonths; month++) {
      const isMoratorium = month <= moratorium;
      
      let interest = 0;
      let principalPayment = 0;
      let payment = 0;

      if (isMoratorium) {
        // During moratorium, interest accrues but no payment
        interest = balance * (annualRate / 12);
        balance += interest;
        payment = 0;
      } else {
        // During repayment
        interest = balance * (annualRate / 12);
        principalPayment = monthlyEMI - interest;
        balance -= principalPayment;
        payment = monthlyEMI;
      }

      // Add to schedule at end of each quarter
      if (month % 3 === 0 || month === totalMonths) {
        schedule.push({
          quarter,
          payment: payment * 3,
          principal: principalPayment * 3,
          interest: interest * 3,
          balance: Math.max(0, balance)
        });
        quarter++;
      }
    }

    res.json({
      principal,
      totalInterest,
      monthlyEMI,
      quarterlyInstallment,
      schedule
    });
  } catch (error) {
    console.error('Error calculating EMI:', error);
    res.status(500).json({ error: 'Failed to calculate EMI' });
  }
});

export default router;
