import { db } from '../config/db';

export interface MatchScoreResult {
  labour: any;
  score: number;
  breakdown: {
    skillMatch: number;
    budgetMatch: number;
    experienceMatch: number;
    distanceMatch: number;
    availabilityMatch: number;
    ratingMatch: number;
  };
  distanceKm: number;
}

// Distance helper (Haversine Formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export async function matchLabourersForJob(jobId: string): Promise<MatchScoreResult[]> {
  const job = await db.jobs.findById(jobId);
  if (!job) return [];

  // Get all labourers
  const users = await db.users.find({ role: 'labour' });
  const results: MatchScoreResult[] = [];

  for (const worker of users) {
    let skillScore = 0;
    let budgetScore = 0;
    let expScore = 0;
    let distScore = 0;
    let availScore = 0;
    let ratingScore = 0;

    // 1. Skill Match (30%)
    // Check if job category matches worker's skills
    const hasSkill = worker.skills?.some((s: string) => 
      s.toLowerCase().trim() === job.category.toLowerCase().trim()
    );
    skillScore = hasSkill ? 30 : 0;

    // 2. Budget Match (20%)
    // If worker's expected wage is less than or equal to budget, full points.
    // Otherwise, scale it down. If budget is undefined, default match.
    if (job.budget && worker.expectedWage) {
      if (worker.expectedWage <= job.budget) {
        budgetScore = 20;
      } else {
        const excess = worker.expectedWage - job.budget;
        const ratio = excess / job.budget;
        budgetScore = Math.max(0, Math.round(20 * (1 - ratio)));
      }
    } else {
      budgetScore = 15; // default if not specified
    }

    // 3. Experience Match (15%)
    if (job.experienceRequired !== undefined && worker.experience !== undefined) {
      if (worker.experience >= job.experienceRequired) {
        expScore = 15;
      } else {
        const ratio = worker.experience / job.experienceRequired;
        expScore = Math.round(15 * ratio);
      }
    } else {
      expScore = 10;
    }

    // 4. Distance Match (15%)
    let distanceKm = 0;
    if (job.location?.lat && job.location?.lng && worker.address) {
      // In a real app we geocode the worker address. Let's mock worker lat/lng based on a hash of their id
      const wLat = job.location.lat + (parseInt(worker._id.substring(0, 4), 36) % 100) / 1000 - 0.05;
      const wLng = job.location.lng + (parseInt(worker._id.substring(4, 8), 36) % 100) / 1000 - 0.05;
      
      distanceKm = calculateDistance(job.location.lat, job.location.lng, wLat, wLng);
      
      if (distanceKm <= 5) {
        distScore = 15;
      } else if (distanceKm <= 15) {
        distScore = 10;
      } else if (distanceKm <= 30) {
        distScore = 5;
      } else {
        distScore = 1;
      }
    } else {
      distScore = 10; // default
    }

    // 5. Availability Match (10%)
    if (worker.availability === 'available') {
      availScore = 10;
    } else if (worker.availability === 'busy') {
      availScore = 5;
    } else {
      availScore = 0;
    }

    // 6. Rating Match (10%)
    // Star rating maps to score. If trustScore is present, use it.
    const trust = worker.trustScore || 80; // 0 to 100
    ratingScore = Math.round(10 * (trust / 100));

    const totalScore = skillScore + budgetScore + expScore + distScore + availScore + ratingScore;

    results.push({
      labour: {
        _id: worker._id,
        id: worker.id,
        name: worker.name,
        email: worker.email,
        mobile: worker.mobile,
        address: worker.address,
        avatar: worker.avatar,
        skills: worker.skills,
        expectedWage: worker.expectedWage,
        experience: worker.experience,
        languages: worker.languages,
        availability: worker.availability,
        trustScore: worker.trustScore,
        isVerified: worker.isVerified,
        completedJobsCount: worker.completedJobsCount
      },
      score: totalScore,
      breakdown: {
        skillMatch: Math.round((skillScore / 30) * 100),
        budgetMatch: Math.round((budgetScore / 20) * 100),
        experienceMatch: Math.round((expScore / 15) * 100),
        distanceMatch: Math.round((distScore / 15) * 100),
        availabilityMatch: Math.round((availScore / 10) * 100),
        ratingMatch: Math.round((ratingScore / 10) * 100),
      },
      distanceKm: Math.round(distanceKm * 10) / 10
    });
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}
