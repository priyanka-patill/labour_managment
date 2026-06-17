import { Router, Response, Request } from 'express';
import { register, login, getMe, updateProfile, getWorkers, verifyOtp, resendOtp, sendOtp } from '../controllers/auth.controller';
import { createJob, getJobs, getJobDetails, applyJob, getJobApplications, updateApplicationStatus, getMatchedLabourers, getRecommendedJobs } from '../controllers/jobs.controller';
import { getChats, startChat, getMessages, sendMessage } from '../controllers/chat.controller';
import { getWallet, processCheckout, downloadInvoice } from '../controllers/payments.controller';
import { checkIn, checkOut, getAttendanceRecords } from '../controllers/attendance.controller';
import { getStats, getComplaints, resolveComplaint, toggleVerifyUser, banUser, submitComplaint } from '../controllers/admin.controller';
import { authMiddleware, adminMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { db } from '../config/db';

const router = Router();

// --- AUTHENTICATION ROUTES ---
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/send-otp', sendOtp);
router.post('/auth/verify-otp', verifyOtp);
router.post('/auth/resend-otp', resendOtp);
router.get('/auth/me', authMiddleware as any, getMe as any);

// --- USER / PROFILE ROUTES ---
router.put('/users/profile', authMiddleware as any, updateProfile as any);
router.get('/users/workers', getWorkers);

// --- JOB ROUTES ---
router.post('/jobs/create', authMiddleware as any, createJob as any);
router.get('/jobs', getJobs as any);
router.get('/jobs/recommendations', authMiddleware as any, getRecommendedJobs as any);
router.get('/jobs/:id', getJobDetails as any);
router.post('/jobs/:id/apply', authMiddleware as any, applyJob as any);
router.get('/jobs/:id/applications', authMiddleware as any, getJobApplications as any);
router.put('/jobs/applications/:appId', authMiddleware as any, updateApplicationStatus as any);
router.get('/jobs/:id/match', authMiddleware as any, getMatchedLabourers as any);

// --- CHAT ROUTES ---
router.get('/chats', authMiddleware as any, getChats as any);
router.post('/chats', authMiddleware as any, startChat as any);
router.get('/chats/:chatId/messages', authMiddleware as any, getMessages as any);
router.post('/chats/message', authMiddleware as any, sendMessage as any);

// --- PAYMENT ROUTES ---
router.get('/payments/wallet', authMiddleware as any, getWallet as any);
router.post('/payments/checkout', authMiddleware as any, processCheckout as any);
router.get('/payments/invoice/:paymentId', authMiddleware as any, downloadInvoice as any);

// --- ATTENDANCE ROUTES ---
router.post('/attendance/check-in', authMiddleware as any, checkIn as any);
router.post('/attendance/check-out', authMiddleware as any, checkOut as any);
router.get('/attendance/job/:jobId', authMiddleware as any, getAttendanceRecords as any);

// --- ADMIN ROUTES ---
router.get('/admin/stats', authMiddleware as any, adminMiddleware as any, getStats as any);
router.get('/admin/complaints', authMiddleware as any, adminMiddleware as any, getComplaints as any);
router.put('/admin/complaints/:id/resolve', authMiddleware as any, adminMiddleware as any, resolveComplaint as any);
router.put('/admin/users/:id/verify', authMiddleware as any, adminMiddleware as any, toggleVerifyUser as any);
router.delete('/admin/users/:id', authMiddleware as any, adminMiddleware as any, banUser as any);
router.post('/admin/complaints/submit', authMiddleware as any, submitComplaint as any);

// --- REVIEW ROUTES (INLINE HANDLERS) ---
router.post('/reviews', authMiddleware as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId, toId, rating, comment, skillsRating, behaviourRating, punctualityRating, qualityRating } = req.body;
    
    if (!toId || !rating) {
      return res.status(400).json({ error: 'Target User ID and Star Rating are required' });
    }

    const review = await db.reviews.create({
      jobId: jobId || '',
      fromId: req.user?.id,
      toId,
      rating: Number(rating),
      comment: comment || '',
      skillsRating: Number(skillsRating) || 5,
      behaviourRating: Number(behaviourRating) || 5,
      punctualityRating: Number(punctualityRating) || 5,
      qualityRating: Number(qualityRating) || 5,
    });
    
    // Recalculate target user's trust score
    const reviews = await db.reviews.find({ toId });
    if (reviews.length > 0) {
      const avgRating = reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / reviews.length;
      const trustScore = Math.min(100, Math.round((avgRating / 5) * 100));
      await db.users.findByIdAndUpdate(toId, { trustScore });
    }

    return res.status(201).json(review);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/reviews/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const reviews = await db.reviews.find({ toId: userId });
    
    const hydratedReviews = [];
    for (const r of reviews) {
      const fromUser = await db.users.findById(r.fromId);
      hydratedReviews.push({
        ...r,
        fromUser: fromUser ? { name: fromUser.name, avatar: fromUser.avatar, role: fromUser.role } : null
      });
    }
    return res.status(200).json(hydratedReviews);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
