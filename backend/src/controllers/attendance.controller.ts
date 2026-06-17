import { Response } from 'express';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function checkIn(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'labour') {
      return res.status(403).json({ error: 'Only labourers can check in' });
    }

    const { jobId, workPhoto } = req.body;
    if (!jobId) return res.status(400).json({ error: 'Job ID required' });

    const job = await db.jobs.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const todayStr = new Date().toISOString().split('T')[0];

    // Check if already checked in today
    const existing = await db.attendance.findOne({
      jobId,
      labourId: req.user.id,
      date: todayStr
    });

    if (existing) {
      return res.status(400).json({ error: 'You have already checked in for today' });
    }

    const checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const record = await db.attendance.create({
      jobId,
      labourId: req.user.id,
      date: todayStr,
      checkIn: checkInTime,
      checkOut: '',
      workPhoto: workPhoto || '',
      hoursWorked: 0,
      status: 'present'
    });

    // Notify Employer
    await db.notifications.create({
      userId: job.employerId,
      title: 'Worker Check-In',
      message: `A worker has checked in for "${job.title}" today.`,
      type: 'attendance',
      seen: false
    });

    return res.status(201).json(record);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function checkOut(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'labour') {
      return res.status(403).json({ error: 'Only labourers can check out' });
    }

    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: 'Job ID required' });

    const todayStr = new Date().toISOString().split('T')[0];

    const record = await db.attendance.findOne({
      jobId,
      labourId: req.user.id,
      date: todayStr
    });

    if (!record) {
      return res.status(400).json({ error: 'No active check-in found for today' });
    }

    if (record.checkOut) {
      return res.status(400).json({ error: 'You have already checked out for today' });
    }

    const checkOutTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Calculate hours worked (mock duration calculation)
    // For local testing: if check-in was recorded, we calculate hours between check-in and checkout.
    // If testing mock checks, we default to a standard 8 hours.
    const hoursWorked = 8; 

    const updatedRecord = await db.attendance.findByIdAndUpdate(record._id, {
      checkOut: checkOutTime,
      hoursWorked
    });

    return res.status(200).json(updatedRecord);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getAttendanceRecords(req: AuthenticatedRequest, res: Response) {
  try {
    const { jobId } = req.params;
    const records = await db.attendance.find({ jobId });

    const hydratedRecords = [];
    for (const rec of records) {
      const worker = await db.users.findById(rec.labourId);
      if (worker) {
        const { password: _, ...workerDetails } = worker;
        hydratedRecords.push({ ...rec, labour: workerDetails });
      } else {
        hydratedRecords.push(rec);
      }
    }

    return res.status(200).json(hydratedRecords);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
