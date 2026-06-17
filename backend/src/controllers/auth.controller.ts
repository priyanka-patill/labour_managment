import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforlabourmanagement';

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, role, mobile, address, companyName, businessDetails } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Please fill all required fields' });
    }

    const existingUser = await db.users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Set standard profile values depending on role
    const profileData: any = {
      name,
      email,
      password: hashedPassword,
      role,
      mobile: mobile || '',
      address: address || '',
      isVerified: false,
      trustScore: 80,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
    };

    if (role === 'employer') {
      profileData.companyName = companyName || '';
      profileData.businessDetails = businessDetails || '';
      profileData.projectsCompleted = 0;
    } else if (role === 'labour') {
      profileData.skills = req.body.skills || [];
      profileData.expectedWage = req.body.expectedWage || 500;
      profileData.experience = req.body.experience || 0;
      profileData.languages = req.body.languages || ['English'];
      profileData.availability = 'available';
      profileData.completedJobsCount = 0;
      profileData.certificates = [];
      profileData.portfolioImages = [];
    }

    const newUser = await db.users.create(profileData);

    // Initialize wallet
    await db.wallets.create({
      userId: newUser._id,
      balance: role === 'employer' ? 10000 : 0, // Employers start with 10,000 for mock payments
      transactions: [
        {
          amount: role === 'employer' ? 10000 : 0,
          type: 'deposit',
          description: 'Initial balance'
        }
      ]
    });

    const token = jwt.sign({ id: newUser._id, role: newUser.role, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

    // Remove password
    const { password: _, ...userWithoutPassword } = newUser;
    return res.status(201).json({ token, user: userWithoutPassword });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const user = await db.users.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({ token, user: userWithoutPassword });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const user = await db.users.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json(userWithoutPassword);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    
    const updates = req.body;
    // Don't allow password updates through this endpoint
    delete updates.password;
    delete updates.email;
    delete updates.role;
    delete updates._id;

    const updatedUser = await db.users.findByIdAndUpdate(req.user.id, updates);
    if (!updatedUser) return res.status(404).json({ error: 'User not found' });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return res.status(200).json(userWithoutPassword);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getWorkers(req: Request, res: Response) {
  try {
    const { category, language, experience, rating, availability, search } = req.query;

    const query: any = { role: 'labour' };

    if (category) {
      query.skills = { $regex: String(category), $options: 'i' };
    }
    if (availability) {
      query.availability = String(availability);
    }
    if (language) {
      query.languages = { $regex: String(language), $options: 'i' };
    }
    if (rating) {
      // Scale based on rating (e.g. rating * 20 = trustScore)
      query.trustScore = { $gte: Number(rating) * 20 };
    }
    if (experience) {
      query.experience = { $gte: Number(experience) };
    }
    if (search) {
      query.name = { $regex: String(search), $options: 'i' };
    }

    const workers = await db.users.find(query);
    
    // Clean passwords from workers list
    const safeWorkers = workers.map((w: any) => {
      const { password: _, ...rest } = w;
      return rest;
    });

    return res.status(200).json(safeWorkers);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

const activeOtps = new Map<string, { code: string; expires: number }>();

function normalizePhoneNumber(mobile: string): string {
  let clean = mobile.replace(/\D/g, '');
  if (clean.length === 10) {
    return `+91${clean}`;
  }
  if (clean.length > 10 && !mobile.startsWith('+')) {
    return `+${clean}`;
  }
  return mobile.startsWith('+') ? mobile : `+${mobile}`;
}

async function sendSms(to: string, message: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNum = process.env.TWILIO_FROM_NUMBER;
  const formattedTo = normalizePhoneNumber(to);

  if (accountSid && authToken && fromNum) {
    try {
      const twilio = require('twilio');
      const client = twilio(accountSid, authToken);
      await client.messages.create({
        body: message,
        from: fromNum,
        to: formattedTo
      });
      console.log(`[SMS TWILIO] Successfully sent message to ${formattedTo}`);
      return true;
    } catch (error) {
      console.error('[SMS TWILIO ERROR] Failed to send Twilio SMS:', error);
    }
  }

  // Fallback to Textbelt for actual sending when Twilio is not configured or fails
  console.log(`[SMS FALLBACK] Attempting to send SMS via Textbelt to ${formattedTo}...`);
  try {
    const response = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        phone: formattedTo,
        message: message,
        key: 'textbelt'
      })
    });
    const data: any = await response.json();
    if (data && data.success) {
      console.log(`[SMS TEXTBELT] Successfully sent message to ${formattedTo}. Quota remaining: ${data.quotaRemaining}`);
      return true;
    } else {
      console.error('[SMS TEXTBELT ERROR] Failed to send Textbelt SMS:', data);
    }
  } catch (error) {
    console.error('[SMS TEXTBELT ERROR] Error calling Textbelt API:', error);
  }

  console.log(`[SMS MOCK] Twilio and Textbelt failed/not configured. Message to ${formattedTo}: ${message}`);
  return false;
}

export async function sendOtp(req: Request, res: Response) {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ error: 'Mobile number is required' });
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    activeOtps.set(mobile, { code, expires: Date.now() + 5 * 60 * 1000 });

    const message = `Your Shramik verification code is: ${code}. Please do not share it with anyone.`;
    const sentViaTwilio = await sendSms(mobile, message);

    console.log('\n=========================================');
    console.log(`[SMS GATEWAY] Verification Code for ${mobile}: ${code} (Twilio Sent: ${sentViaTwilio})`);
    console.log('=========================================\n');

    return res.status(200).json({
      message: 'Verification code sent successfully.',
      otp: code,
      devMode: !sentViaTwilio
    });
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ error: error.message || 'Failed to send OTP' });
  }
}

export async function verifyOtp(req: Request, res: Response) {
  try {
    const { mobile, code } = req.body;
    if (!mobile || !code) {
      return res.status(400).json({ error: 'Mobile number and verification code are required' });
    }

    const savedOtp = activeOtps.get(mobile);
    if (!savedOtp) {
      return res.status(400).json({ error: 'Verification code expired or not requested' });
    }

    if (savedOtp.expires < Date.now()) {
      activeOtps.delete(mobile);
      return res.status(400).json({ error: 'Verification code expired' });
    }

    if (savedOtp.code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    activeOtps.delete(mobile);
    return res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Verification failed' });
  }
}

export async function resendOtp(req: Request, res: Response) {
  return sendOtp(req, res);
}
