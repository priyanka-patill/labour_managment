"use client";

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../../store/authSlice';
import { RootState } from '../../store';
import { Shield, Sparkles, AlertCircle, ArrowLeft, CheckCircle2, Languages, Sun, Moon } from 'lucide-react';
import { getTranslation } from '../../utils/translations';
import { motion, AnimatePresence } from 'framer-motion';

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const { theme, language } = useSelector((state: RootState) => state.auth);

  const initialMode = searchParams.get('register') === 'true' ? 'register' : 'login';
  const initialCategory = searchParams.get('category') || '';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [role, setRole] = useState<'employer' | 'labour' | 'common'>('common');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Verification modal state
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(30);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  
  // Employer Fields
  const [companyName, setCompanyName] = useState('');
  const [businessDetails, setBusinessDetails] = useState('');

  // Labour Fields
  const [skills, setSkills] = useState<string[]>(initialCategory ? [initialCategory] : []);
  const [expectedWage, setExpectedWage] = useState(500);
  const [experience, setExperience] = useState(2);
  const [languagesList, setLanguagesList] = useState<string[]>(['English']);

  const t = (key: any) => getTranslation(key, language);

  const availableSkills = [
    'electrician', 'plumber', 'painter', 'carpenter', 'mason', 
    'welder', 'driver', 'mechanic', 'cleaner', 'technician'
  ];

  const handleSkillToggle = (skill: string) => {
    setSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleLanguageToggle = (lang: string) => {
    setLanguagesList(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const startOtpCountdown = () => {
    setOtpCountdown(30);
    const timer = setInterval(() => {
      setOtpCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleGoogleLoginMock = () => {
    setLoading(true);
    setError('');
    setTimeout(async () => {
      try {
        // Send a request to register/login a mock Google user
        const res = await fetch('http://localhost:5000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Google User',
            email: 'googleuser@gmail.com',
            password: 'googleSecurePassword123',
            role: role,
            mobile: '9876543210',
            address: 'Mumbai, Maharashtra'
          })
        });
        const data = await res.json();
        if (data.error) {
          // If already registered, perform login instead
          const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'googleuser@gmail.com',
              password: 'googleSecurePassword123'
            })
          });
          const loginData = await loginRes.json();
          if (loginData.error) throw new Error(loginData.error);
          dispatch(setCredentials(loginData));
          router.push(`/dashboard/${loginData.user.role}`);
        } else {
          dispatch(setCredentials(data));
          router.push(`/dashboard/${data.user.role}`);
        }
      } catch (err: any) {
        setError(err.message || 'Google OAuth simulation failed.');
      } finally {
        setLoading(false);
      }
    }, 1000);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email || !password || (mode === 'register' && !name)) {
      setError('Please fill in all basic credentials.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        dispatch(setCredentials(data));
        setSuccessMsg('Login successful!');
        setTimeout(() => {
          router.push(`/dashboard/${data.user.role}`);
        }, 800);
      } else {
        // Registration mode requires OTP verification first
        if (!mobileNumber) {
          setError('Mobile number is required for verification.');
          setLoading(false);
          return;
        }
        setOtpModalOpen(true);
        startOtpCountdown();
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async () => {
    if (!otpCode || otpCode.length < 4) {
      setError('Please enter a valid OTP code.');
      return;
    }
    setLoading(true);
    setOtpModalOpen(false);

    try {
      const payload: any = {
        name,
        email,
        password,
        role,
        mobile: mobileNumber,
        address
      };

      if (role === 'employer') {
        payload.companyName = companyName;
        payload.businessDetails = businessDetails;
      } else if (role === 'labour') {
        payload.skills = skills;
        payload.expectedWage = Number(expectedWage);
        payload.experience = Number(experience);
        payload.languages = languagesList;
      }

      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      dispatch(setCredentials(data));
      setSuccessMsg('Registration completed successfully!');
      setTimeout(() => {
        router.push(`/dashboard/${data.user.role}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-center items-center p-4 relative bg-zinc-900`}>
      {/* Background radial effects */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header toolbar */}
      <div className="absolute top-4 left-4 flex gap-4 items-center">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 cursor-pointer"
        >
          <ArrowLeft size={12} /> Back
        </button>
      </div>

      <div className="w-full max-w-lg glass-panel p-8 rounded-2xl border border-zinc-800 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 mx-auto mb-3">
            S
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {mode === 'login' ? 'Sign In to Shramik' : 'Create Your Account'}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Access matching workers, jobs, and instant daily ledger tracking
          </p>
        </div>

        {/* Tab selector */}
        <div className="grid grid-cols-2 p-1 bg-zinc-950/40 rounded-xl mb-6 border border-zinc-800/40">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`py-2 text-xs font-semibold rounded-lg transition duration-200 cursor-pointer ${mode === 'login' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-50'}`}
          >
            {t('login')}
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className={`py-2 text-xs font-semibold rounded-lg transition duration-200 cursor-pointer ${mode === 'register' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-50'}`}
          >
            {t('register')}
          </button>
        </div>

        {/* Error / Success message */}
        {error && (
          <div className="flex items-center gap-2 p-3.5 mb-5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-normal">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 p-3.5 mb-5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs leading-normal">
            <CheckCircle2 size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Register Mode Role Selector */}
          {mode === 'register' && (
            <div className="space-y-2 mb-4">
              <label className="text-xs font-semibold text-zinc-400">{t('roleSelectTitle')}</label>
              <div className="grid grid-cols-3 gap-2">
                {(['common', 'labour', 'employer'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-1 rounded-lg border text-[10px] font-bold transition cursor-pointer capitalize ${role === r ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600' : 'border-zinc-800 text-zinc-500 bg-zinc-900/20 hover:text-zinc-300'}`}
                  >
                    {r === 'employer' ? 'Employer' : r === 'labour' ? 'Labourer' : 'Citizen User'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Standard Fields */}
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2.5 px-3.5 text-xs text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400">Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2.5 px-3.5 text-xs text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Mobile Number (For Verification)</label>
              <input
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={mobileNumber}
                onChange={e => setMobileNumber(e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2.5 px-3.5 text-xs text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400">Secure Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2.5 px-3.5 text-xs text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">City / Address</label>
              <input
                type="text"
                placeholder="Enter city or address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2.5 px-3.5 text-xs text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Employer Specific Registration Fields */}
          {mode === 'register' && role === 'employer' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Company / Business Name</label>
                <input
                  type="text"
                  placeholder="Enter company or business name"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2.5 px-3.5 text-xs text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Business Details (Industry)</label>
                <textarea
                  placeholder="Describe your business or industry (e.g. services offered, specialization)"
                  value={businessDetails}
                  onChange={e => setBusinessDetails(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2.5 px-3.5 text-xs text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </motion.div>
          )}

          {/* Labour Specific Registration Fields */}
          {mode === 'register' && role === 'labour' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-400">Select Skill Offerings (Categories)</label>
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto p-1.5 border border-zinc-800 bg-zinc-950/40 rounded-lg">
                  {availableSkills.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSkillToggle(s)}
                      className={`py-1.5 px-2.5 text-[10px] font-semibold rounded-md border text-left cursor-pointer transition ${skills.includes(s) ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700' : 'border-zinc-800/80 text-zinc-400 hover:text-zinc-50'}`}
                    >
                      {t(s as any)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Expected Daily Wage (Rs)</label>
                  <input
                    type="number"
                    value={expectedWage}
                    onChange={e => setExpectedWage(Number(e.target.value))}
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2.5 px-3.5 text-xs text-zinc-50 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Work Experience (Years)</label>
                  <input
                    type="number"
                    value={experience}
                    onChange={e => setExperience(Number(e.target.value))}
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2.5 px-3.5 text-xs text-zinc-50 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-400">Languages Known</label>
                <div className="flex gap-2">
                  {['English', 'Hindi', 'Marathi'].map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleLanguageToggle(lang)}
                      className={`py-1.5 px-3 text-[10px] font-bold rounded-lg border cursor-pointer transition ${languagesList.includes(lang) ? 'border-purple-500 bg-purple-500/10 text-purple-700' : 'border-zinc-800 text-zinc-400'}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg text-xs tracking-wider uppercase transition shadow-lg shadow-indigo-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-t-white border-indigo-400 rounded-full animate-spin"></div>
            ) : mode === 'login' ? (
              'Sign In'
            ) : (
              'Request OTP Code'
            )}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800/80"></div></div>
          <span className="relative bg-[#18181b] px-3 text-[10px] text-zinc-500 uppercase tracking-widest">Or Continue With</span>
        </div>

        {/* Google sign-in mock button */}
        <button
          onClick={handleGoogleLoginMock}
          className="w-full py-2.5 px-4 rounded-lg border border-zinc-800 text-zinc-300 hover:text-zinc-50 bg-zinc-900/20 hover:border-zinc-700 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
        >
          <Sparkles size={14} className="text-indigo-400 animate-pulse" />
          <span>Quick Google Login (Simulated)</span>
        </button>
      </div>

      {/* OTP verification dialog modal overlay */}
      <AnimatePresence>
        {otpModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm glass-panel p-6 rounded-2xl border border-zinc-800 text-center"
            >
              <Shield className="text-indigo-400 mx-auto mb-4" size={36} />
              <h3 className="text-lg font-bold text-zinc-50 mb-2">Verification Code Required</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                We sent a 4-digit verification code to <strong className="text-zinc-50">{mobileNumber}</strong>.
              </p>

              <div className="space-y-4">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Enter 4-digit verification code"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  className="w-full text-center bg-zinc-950/60 border border-zinc-800 rounded-lg py-3 text-lg font-mono text-zinc-50 placeholder-zinc-700 tracking-[10px] focus:outline-none focus:border-indigo-500"
                />

                <div className="flex justify-between items-center text-[10px]">
                  {otpCountdown > 0 ? (
                    <span className="text-zinc-500">Resend code in {otpCountdown}s</span>
                  ) : (
                    <button 
                      type="button" 
                      onClick={startOtpCountdown}
                      className="text-indigo-400 hover:underline cursor-pointer"
                    >
                      Resend Code
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setOtpModalOpen(false)}
                    className="w-full py-2.5 rounded-lg border border-zinc-800 text-zinc-400 text-xs font-semibold hover:bg-zinc-900/40 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyOtpSubmit}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Verify & Sign Up
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-900 flex flex-col justify-center items-center text-zinc-450 gap-3">
        <div className="w-6 h-6 border-2 border-t-indigo-500 border-zinc-800 rounded-full animate-spin"></div>
        <span>Loading Form...</span>
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
