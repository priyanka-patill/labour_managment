import { Response } from 'express';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { matchLabourersForJob } from '../services/matching-engine';

export async function createJob(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'employer') {
      return res.status(403).json({ error: 'Only employers can create jobs' });
    }

    const { title, description, category, budget, wageType, location, startDate, duration, workingHours, experienceRequired, workersNeeded, urgency, genderPreference } = req.body;

    if (!title || !description || !category || !budget) {
      return res.status(400).json({ error: 'Missing required job parameters' });
    }

    const job = await db.jobs.create({
      title,
      description,
      category,
      employerId: req.user.id,
      budget: Number(budget),
      wageType: wageType || 'daily',
      location: location || { address: 'Not Specified', lat: 19.076, lng: 72.877 }, // Default coordinates (Mumbai)
      startDate: startDate || new Date().toISOString().split('T')[0],
      duration: duration || '1 day',
      workingHours: Number(workingHours) || 8,
      experienceRequired: Number(experienceRequired) || 0,
      workersNeeded: Number(workersNeeded) || 1,
      workersHired: [],
      urgency: urgency || 'medium',
      status: 'open',
      images: req.body.images || [],
      genderPreference: genderPreference || 'any'
    });

    return res.status(201).json(job);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getJobs(req: Request | any, res: Response) {
  try {
    const { category, urgency, status, employerId } = req.query;
    const query: any = {};

    if (category) query.category = category;
    if (urgency) query.urgency = urgency;
    if (status) query.status = status;
    if (employerId) query.employerId = employerId;

    const jobs = await db.jobs.find(query);
    return res.status(200).json(jobs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getJobDetails(req: Request | any, res: Response) {
  try {
    const { id } = req.params;
    const job = await db.jobs.findById(id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Fetch employer details
    const employer = await db.users.findById(job.employerId);
    const { password: _, ...employerDetails } = employer || {};

    return res.status(200).json({ ...job, employer: employerDetails });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function applyJob(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'labour') {
      return res.status(403).json({ error: 'Only labourers can apply to jobs' });
    }

    const { id: jobId } = req.params;
    const { coverLetter } = req.body;

    const job = await db.jobs.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'open') return res.status(400).json({ error: 'This job is no longer accepting applications' });

    // Check if already applied
    const existingApp = await db.applications.findOne({ jobId, labourId: req.user.id });
    if (existingApp) {
      return res.status(400).json({ error: 'You have already applied for this job' });
    }

    const application = await db.applications.create({
      jobId,
      labourId: req.user.id,
      status: 'pending',
      coverLetter: coverLetter || ''
    });

    // Create a notification for the employer
    await db.notifications.create({
      userId: job.employerId,
      title: 'New Job Application',
      message: `A worker has applied for your job: ${job.title}`,
      type: 'job_application',
      seen: false
    });

    return res.status(201).json(application);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getJobApplications(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: jobId } = req.params;
    const applications = await db.applications.find({ jobId });

    // Hydrate applications with labourer profiles
    const hydratedApps = [];
    for (const app of applications) {
      const worker = await db.users.findById(app.labourId);
      if (worker) {
        const { password: _, ...workerDetails } = worker;
        hydratedApps.push({ ...app, labour: workerDetails });
      } else {
        hydratedApps.push(app);
      }
    }

    return res.status(200).json(hydratedApps);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateApplicationStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { appId } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid application status update' });
    }

    const app = await db.applications.findById(appId);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const job = await db.jobs.findById(app.jobId);
    if (!job) return res.status(404).json({ error: 'Associated job not found' });

    // Verify requesting user is the employer
    if (job.employerId !== req.user?.id) {
      return res.status(403).json({ error: 'Not authorized to manage this application' });
    }

    const updatedApp = await db.applications.findByIdAndUpdate(appId, { status });

    if (status === 'accepted') {
      // Add worker to hired list
      const hired = job.workersHired || [];
      if (!hired.includes(app.labourId)) {
        hired.push(app.labourId);
        let jobStatus = job.status;
        if (hired.length >= job.workersNeeded) {
          jobStatus = 'in-progress';
        }
        await db.jobs.findByIdAndUpdate(job._id, {
          workersHired: hired,
          status: jobStatus
        });
      }
    }

    // Notify labourer
    await db.notifications.create({
      userId: app.labourId,
      title: status === 'accepted' ? 'Application Accepted!' : 'Application Declined',
      message: status === 'accepted' 
        ? `Congratulations! Your application for "${job.title}" has been accepted.` 
        : `Your application for "${job.title}" was not selected.`,
      type: 'application_result',
      seen: false
    });

    return res.status(200).json(updatedApp);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getMatchedLabourers(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: jobId } = req.params;
    const matches = await matchLabourersForJob(jobId);
    return res.status(200).json(matches);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getRecommendedJobs(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'labour') {
      return res.status(403).json({ error: 'Only labourers can access job recommendations' });
    }

    const worker = await db.users.findById(req.user.id);
    if (!worker) return res.status(404).json({ error: 'Worker profile not found' });

    // Fetch all open jobs
    const openJobs = await db.jobs.find({ status: 'open' });
    
    // Simple recommendations: prioritize jobs in worker's skills/categories
    const recommended = openJobs.map((job: any) => {
      const skillMatch = worker.skills?.some((s: string) => 
        s.toLowerCase().trim() === job.category.toLowerCase().trim()
      );
      
      // Calculate matching factor
      let score = 0;
      if (skillMatch) score += 50;
      if (worker.expectedWage && job.budget >= worker.expectedWage) score += 30;
      if (worker.experience >= job.experienceRequired) score += 20;

      return { ...job, matchScore: score };
    }).filter((j: any) => j.matchScore > 0).sort((a: any, b: any) => b.matchScore - a.matchScore);

    return res.status(200).json(recommended.length > 0 ? recommended : openJobs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
