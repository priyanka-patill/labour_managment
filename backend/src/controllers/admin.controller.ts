import { Request, Response } from 'express';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getStats(req: AuthenticatedRequest, res: Response) {
  try {
    const totalUsers = await db.users.find();
    const employers = totalUsers.filter((u: any) => u.role === 'employer').length;
    const labourers = totalUsers.filter((u: any) => u.role === 'labour').length;
    const common = totalUsers.filter((u: any) => u.role === 'common').length;

    const totalJobs = await db.jobs.find();
    const payments = await db.payments.find();
    const complaints = await db.complaints.find();

    const totalEarning = payments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);

    return res.status(200).json({
      users: {
        total: totalUsers.length,
        employers,
        labourers,
        common
      },
      jobs: {
        total: totalJobs.length,
        open: totalJobs.filter((j: any) => j.status === 'open').length,
        inProgress: totalJobs.filter((j: any) => j.status === 'in-progress').length,
        completed: totalJobs.filter((j: any) => j.status === 'completed').length,
      },
      transactions: {
        count: payments.length,
        volume: totalEarning
      },
      complaints: {
        total: complaints.length,
        pending: complaints.filter((c: any) => c.status === 'pending').length
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getComplaints(req: AuthenticatedRequest, res: Response) {
  try {
    const complaints = await db.complaints.find();
    const hydratedComplaints = [];

    for (const comp of complaints) {
      const fromUser = await db.users.findById(comp.fromId);
      const reportedUser = await db.users.findById(comp.reportedUserId);
      hydratedComplaints.push({
        ...comp,
        fromUser: fromUser ? { name: fromUser.name, email: fromUser.email } : null,
        reportedUser: reportedUser ? { name: reportedUser.name, email: reportedUser.email } : null
      });
    }

    return res.status(200).json(hydratedComplaints);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function resolveComplaint(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    await db.complaints.findByIdAndUpdate(id, { status: 'resolved' });
    return res.status(200).json({ message: 'Complaint resolved' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function toggleVerifyUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const worker = await db.users.findById(id);
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const updated = await db.users.findByIdAndUpdate(id, { isVerified: !worker.isVerified });
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function banUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    await db.users.findByIdAndDelete(id);
    return res.status(200).json({ message: 'User banned and deleted from system' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function submitComplaint(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const { reportedUserId, jobId, subject, description } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description required' });
    }

    const complaint = await db.complaints.create({
      fromId: req.user.id,
      reportedUserId: reportedUserId || '',
      jobId: jobId || '',
      subject,
      description,
      status: 'pending'
    });

    return res.status(201).json(complaint);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
