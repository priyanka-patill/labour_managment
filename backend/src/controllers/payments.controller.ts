import { Response } from 'express';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { generateInvoicePdf } from '../services/pdf-service';

export async function getWallet(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    
    let wallet = await db.wallets.findOne({ userId: req.user.id });
    if (!wallet) {
      // Lazy initialize wallet
      wallet = await db.wallets.create({
        userId: req.user.id,
        balance: req.user.role === 'employer' ? 10000 : 0,
        transactions: []
      });
    }

    return res.status(200).json(wallet);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function processCheckout(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'employer') {
      return res.status(403).json({ error: 'Only employers can process payments' });
    }

    const { jobId, labourId, amount, paymentMethod } = req.body;
    if (!jobId || !labourId || !amount) {
      return res.status(400).json({ error: 'Job ID, Labour ID and Amount are required' });
    }

    const numAmount = Number(amount);
    const employerWallet = await db.wallets.findOne({ userId: req.user.id });
    if (!employerWallet || employerWallet.balance < numAmount) {
      return res.status(400).json({ error: 'Insufficient wallet balance. Please add money to your wallet.' });
    }

    const job = await db.jobs.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const worker = await db.users.findById(labourId);
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    // Deduct from employer
    await db.wallets.findByIdAndUpdate(employerWallet._id, {
      $inc: { balance: -numAmount },
      $push: {
        transactions: {
          amount: numAmount,
          type: 'pay',
          description: `Payment for job: ${job.title}`,
          date: new Date()
        }
      }
    });

    // Deposit to worker
    let workerWallet = await db.wallets.findOne({ userId: labourId });
    if (!workerWallet) {
      workerWallet = await db.wallets.create({ userId: labourId, balance: 0, transactions: [] });
    }
    await db.wallets.findByIdAndUpdate(workerWallet._id, {
      $inc: { balance: numAmount },
      $push: {
        transactions: {
          amount: numAmount,
          type: 'earn',
          description: `Earning for job: ${job.title}`,
          date: new Date()
        }
      }
    });

    // Create payment entry
    const txnId = 'TXN-' + Math.random().toString(36).substring(2, 12).toUpperCase();
    const payment = await db.payments.create({
      jobId,
      employerId: req.user.id,
      labourId,
      amount: numAmount,
      paymentMethod: paymentMethod || 'wallet',
      status: 'completed',
      transactionId: txnId
    });

    // Update completions counter and job status
    await db.users.findByIdAndUpdate(req.user.id, { $inc: { projectsCompleted: 1 } });
    await db.users.findByIdAndUpdate(labourId, { $inc: { completedJobsCount: 1 } });
    await db.jobs.findByIdAndUpdate(jobId, { status: 'completed' });

    // Create notifications
    await db.notifications.create({
      userId: labourId,
      title: 'Payment Received',
      message: `You received Rs. ${numAmount} for job: ${job.title}`,
      type: 'payment',
      seen: false
    });

    return res.status(201).json(payment);
  } catch (error: any) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function downloadInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const { paymentId } = req.params;
    const payment = await db.payments.findById(paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });

    const employer = await db.users.findById(payment.employerId);
    const labour = await db.users.findById(payment.labourId);
    const job = await db.jobs.findById(payment.jobId);

    if (!employer || !labour || !job) {
      return res.status(404).json({ error: 'Associated transaction models not found' });
    }

    const pdfBuffer = await generateInvoicePdf(payment, employer, labour, job);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${paymentId}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return res.status(500).json({ error: error.message });
  }
}
