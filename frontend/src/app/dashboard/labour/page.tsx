"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { updateUser } from '../../../store/authSlice';
import { DashboardSidebar } from '../../../components/DashboardSidebar';
import { ChatBox } from '../../../components/ChatBox';
import { 
  Briefcase, CheckCircle2, Clock, Wallet, Star, Send, 
  MapPin, Award, AlertTriangle, ShieldCheck, FileText, CheckCircle, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LabourDashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: RootState) => state.auth);

  const [activeSection, setActiveSection] = useState('overview');
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<any[]>([]);
  const [selectedFeedJob, setSelectedFeedJob] = useState<any | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [applySuccess, setApplySuccess] = useState(false);
  const [wallet, setWallet] = useState<any>({ balance: 0, transactions: [] });

  // Attendance simulator states
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [activeAttendanceJob, setActiveAttendanceJob] = useState<any | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  // Form states for profile update
  const [expectedWage, setExpectedWage] = useState(user?.expectedWage || 500);
  const [experience, setExperience] = useState(user?.experience || 2);
  const [availability, setAvailability] = useState(user?.availability || 'available');
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [address, setAddress] = useState(user?.address || '');
  const [mobile, setMobile] = useState(user?.mobile || '');

  // Wallet withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const availableSkills = [
    'electrician', 'plumber', 'painter', 'carpenter', 'mason', 
    'welder', 'driver', 'mechanic', 'cleaner', 'technician'
  ];

  const fetchRecommendations = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/jobs/recommendations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRecommendedJobs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyApplications = async () => {
    if (!token) return;
    try {
      // Fetch all jobs, then filter where application exists for this user
      // In a real app, write an applications endpoint. Let's filter on the client or mock it cleanly.
      const res = await fetch('http://localhost:5000/api/jobs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const allJobs = await res.json();
      if (Array.isArray(allJobs)) {
        const matching: any[] = [];
        for (const j of allJobs) {
          const appRes = await fetch(`http://localhost:5000/api/jobs/${j._id}/applications`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const appList = await appRes.json();
          if (Array.isArray(appList)) {
            const myApp = appList.find((a: any) => a.labourId === user?._id);
            if (myApp) {
              matching.push({ ...j, applicationStatus: myApp.status });
            }
          }
        }
        setAppliedJobs(matching);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWallet = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/payments/wallet', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && !data.error) {
        setWallet(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const checkActiveAttendance = async () => {
    // Check if hired in any job that is currently 'in-progress'
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/jobs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const allJobs = await res.json();
      if (Array.isArray(allJobs)) {
        const activeJob = allJobs.find(j => j.status === 'in-progress' && j.workersHired?.includes(user?._id));
        setActiveAttendanceJob(activeJob || null);

        if (activeJob) {
          // Check if checked in today
          const attRes = await fetch(`http://localhost:5000/api/attendance/job/${activeJob._id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const list = await attRes.json();
          if (Array.isArray(list)) {
            setAttendanceLogs(list.filter(a => a.labourId === user?._id));
            const todayStr = new Date().toISOString().split('T')[0];
            const hasCheckedInToday = list.some(a => a.labourId === user?._id && a.date === todayStr);
            const hasCheckedOutToday = list.some(a => a.labourId === user?._id && a.date === todayStr && a.checkOut);
            setIsCheckedIn(hasCheckedInToday && !hasCheckedOutToday);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token || !user) {
      router.push('/auth');
      return;
    }
    if (user.role !== 'labour') {
      router.push(`/dashboard/${user.role}`);
      return;
    }

    fetchRecommendations();
    fetchMyApplications();
    fetchWallet();
    checkActiveAttendance();
  }, [token, user]);

  // Apply to Job Feed item
  const handleApplyJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedJob || !token) return;

    try {
      const res = await fetch(`http://localhost:5000/api/jobs/${selectedFeedJob._id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ coverLetter })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setApplySuccess(true);
      fetchMyApplications();
      fetchRecommendations();
      setTimeout(() => {
        setSelectedFeedJob(null);
        setApplySuccess(false);
        setCoverLetter('');
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Application failed.');
    }
  };

  // Perform QR Check-in clock simulation
  const handleCheckInToggle = async () => {
    if (!token || !activeAttendanceJob) return;

    try {
      if (!isCheckedIn) {
        const res = await fetch('http://localhost:5000/api/attendance/check-in', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ jobId: activeAttendanceJob._id })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setIsCheckedIn(true);
      } else {
        const res = await fetch('http://localhost:5000/api/attendance/check-out', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ jobId: activeAttendanceJob._id })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setIsCheckedIn(false);
      }
      checkActiveAttendance();
    } catch (err: any) {
      alert(err.message || 'Attendance update failed.');
    }
  };

  // Process Mock Withdrawal
  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(withdrawAmount);
    if (!amountNum || amountNum <= 0 || amountNum > wallet.balance) {
      alert('Invalid withdrawal amount.');
      return;
    }

    try {
      // Mock withdrawal API update
      await fetch('http://localhost:5000/api/users/profile', { // In real app, put a wallet transaction endpoint
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          $inc: { balance: -amountNum }
        })
      });

      setWithdrawSuccess(true);
      setWithdrawAmount('');
      fetchWallet();
      setTimeout(() => {
        setWithdrawSuccess(false);
      }, 1500);
    } catch (err) {
      console.error(err);
    }
  };

  // Update skills/profile info settings
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          expectedWage: Number(expectedWage),
          experience: Number(experience),
          availability,
          skills,
          address,
          mobile
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      dispatch(updateUser(data));
      alert('Profile details updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Profile update failed.');
    }
  };

  const handleSkillTagToggle = (skill: string) => {
    setSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-zinc-900">
      <DashboardSidebar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        walletBalance={wallet.balance}
      />

      <main className="flex-grow p-4 sm:p-8 overflow-y-auto max-w-7xl mx-auto w-full">

        {/* OVERVIEW SECTION */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Labourer Control Deck</h2>
              <p className="text-xs text-zinc-500 mt-1">Check daily job feeds, verify attendance logs, and cash-out earnings.</p>
            </div>

            {/* Profile Statistics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <div className="glass-card p-6 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Star size={20} fill="currentColor" />
                </div>
                <div>
                  <h4 className="text-[11px] text-zinc-500 font-semibold uppercase">Trust Score</h4>
                  <p className="text-xl font-bold text-zinc-100 mt-1">{user?.trustScore || 80}%</p>
                </div>
              </div>
              <div className="glass-card p-6 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h4 className="text-[11px] text-zinc-500 font-semibold uppercase">Applications</h4>
                  <p className="text-xl font-bold text-zinc-100 mt-1">{appliedJobs.length}</p>
                </div>
              </div>
              <div className="glass-card p-6 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 className="text-[11px] text-zinc-500 font-semibold uppercase">Jobs Completed</h4>
                  <p className="text-xl font-bold text-zinc-100 mt-1">{user?.completedJobsCount || 0}</p>
                </div>
              </div>
              <div className="glass-card p-6 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Wallet size={20} />
                </div>
                <div>
                  <h4 className="text-[11px] text-zinc-500 font-semibold uppercase">Earnings balance</h4>
                  <p className="text-xl font-bold text-zinc-100 mt-1">Rs. {wallet.balance}</p>
                </div>
              </div>
            </div>

            {/* Quick action grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Active project card */}
              <div className="glass-card p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-sm text-zinc-200">Active Job Assignment</h3>
                {activeAttendanceJob ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs">
                      <h4 className="font-bold text-sm text-zinc-100">{activeAttendanceJob.title}</h4>
                      <p className="text-zinc-400 mt-1.5 leading-relaxed">{activeAttendanceJob.description?.substring(0, 100)}...</p>
                      <div className="flex items-center gap-4 mt-3 text-zinc-500 font-medium">
                        <span className="flex items-center gap-1"><MapPin size={11} /> {activeAttendanceJob.location?.address}</span>
                        <span>Wage: Rs.{activeAttendanceJob.budget}/{activeAttendanceJob.wageType}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveSection('attendance')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      Open QR Code clock in page <ArrowRight size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12 text-zinc-500 text-xs">No active hires recorded yet. Apply for jobs to get hired.</div>
                )}
              </div>

              {/* Earnings overview */}
              <div className="glass-card p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-sm text-zinc-200">Earnings Ledger</h3>
                <div className="max-h-[180px] overflow-y-auto space-y-3 pr-1 text-xs">
                  {wallet.transactions?.length === 0 ? (
                    <div className="text-center text-zinc-500 py-10">No payouts received yet</div>
                  ) : (
                    wallet.transactions?.slice().reverse().map((txn: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center border-b border-zinc-800/40 pb-2 last:border-b-0">
                        <div>
                          <h5 className="font-semibold text-zinc-200">{txn.description}</h5>
                          <span className="text-[9px] text-zinc-500">{new Date(txn.date).toLocaleDateString()}</span>
                        </div>
                        <span className="font-bold text-emerald-400">+ Rs. {txn.amount}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* JOB FEED SECTION */}
        {activeSection === 'job-feed' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Recommended Job Openings</h2>
              <p className="text-xs text-zinc-500 mt-1">Smart recommendations based on your selected skills: <strong className="text-indigo-400 capitalize">{skills.join(', ')}</strong></p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendedJobs.length === 0 ? (
                <div className="text-center py-20 text-zinc-500 text-xs col-span-2">No matching job listings found. Modify your skills in Settings.</div>
              ) : (
                recommendedJobs.map((j) => {
                  const alreadyApplied = appliedJobs.some(a => a._id === j._id);
                  return (
                    <div key={j._id} className="glass-card p-6 rounded-2xl flex flex-col justify-between gap-4">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-md uppercase tracking-wider">{j.category}</span>
                          <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                            {j.matchScore}% Match
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-zinc-200 leading-snug">{j.title}</h4>
                        <p className="text-zinc-400 text-xs leading-relaxed">{j.description?.substring(0, 120)}...</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-zinc-500 font-medium">
                          <span className="flex items-center gap-1"><MapPin size={11} /> {j.location?.address?.substring(0, 15)}...</span>
                          <span>Wage: Rs.{j.budget}/{j.wageType}</span>
                          <span>Duration: {j.duration}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedFeedJob(j)}
                        disabled={alreadyApplied}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer ${alreadyApplied ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/15'}`}
                      >
                        {alreadyApplied ? 'Applied' : 'Apply For Job'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* MY APPLICATIONS */}
        {activeSection === 'applications' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Application Progress Logs</h2>
              <p className="text-xs text-zinc-500 mt-1">Audit statuses and response logs from hiring contractors.</p>
            </div>

            <div className="glass-card rounded-2xl p-4 divide-y divide-zinc-800/40 space-y-1">
              {appliedJobs.length === 0 ? (
                <div className="text-center py-20 text-zinc-500 text-xs">No applications submitted yet. Browse jobs in the Feed.</div>
              ) : (
                appliedJobs.map((j) => (
                  <div key={j._id} className="py-4 px-2 flex justify-between items-center text-xs gap-4">
                    <div>
                      <h4 className="font-bold text-zinc-200 text-sm">{j.title}</h4>
                      <p className="text-[10px] text-zinc-500 mt-1.5">Category: {j.category} &bull; Wage: Rs.{j.budget} &bull; Duration: {j.duration}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full font-bold uppercase text-[9px] tracking-wider ${j.applicationStatus === 'accepted' ? 'bg-emerald-500/10 text-emerald-400' : j.applicationStatus === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}>
                      {j.applicationStatus}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* QR ATTENDANCE SECTION */}
        {activeSection === 'attendance' && (
          <div className="max-w-md mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">QR Attendance Terminal</h2>
              <p className="text-xs text-zinc-500 mt-1">Generate dynamic clock QR code check-ins for active construction sites.</p>
            </div>

            {activeAttendanceJob ? (
              <div className="glass-card p-8 rounded-2xl text-center space-y-6">
                <div>
                  <h4 className="font-bold text-sm text-zinc-200">{activeAttendanceJob.title}</h4>
                  <p className="text-[10px] text-zinc-500 mt-1.5">Site: {activeAttendanceJob.location?.address}</p>
                </div>

                {/* Stylized QR simulation */}
                <div className="w-48 h-48 mx-auto p-3.5 bg-white rounded-xl flex items-center justify-center relative shadow-xl">
                  {/* Mock QR lines */}
                  <div className="w-full h-full border-4 border-zinc-950 flex flex-col justify-between p-2 relative overflow-hidden bg-white">
                    <div className="flex justify-between">
                      <div className="w-8 h-8 bg-zinc-950"></div>
                      <div className="w-8 h-8 bg-zinc-950"></div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="w-8 h-8 bg-zinc-950"></div>
                      <div className="w-12 h-12 flex flex-wrap gap-1.5 p-1">
                        <div className="w-2.5 h-2.5 bg-zinc-950"></div>
                        <div className="w-2.5 h-2.5 bg-zinc-950"></div>
                        <div className="w-2.5 h-2.5 bg-zinc-950"></div>
                        <div className="w-2.5 h-2.5 bg-zinc-950"></div>
                      </div>
                    </div>
                    {/* Pulsing overlay badge */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-indigo-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-lg shadow-indigo-500/30">
                        {isCheckedIn ? 'ACTIVE CHECK-IN' : 'SCAN CODE'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="text-xs text-zinc-400">
                    {isCheckedIn 
                      ? 'You are currently clocked IN today. Click check-out to clock hours.' 
                      : 'Scan this code using the contractor app, or trigger simulated check-in directly below.'}
                  </div>

                  <button
                    onClick={handleCheckInToggle}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-md ${isCheckedIn ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                  >
                    {isCheckedIn ? 'Trigger Check-Out (Simulated)' : 'Trigger Check-In (Simulated)'}
                  </button>
                </div>

                {/* Clock logs list */}
                <div className="border-t border-zinc-800/80 pt-5 text-left space-y-3">
                  <h5 className="font-bold text-xs text-zinc-300">Daily Clock History</h5>
                  {attendanceLogs.length === 0 ? (
                    <p className="text-[10px] text-zinc-500">No logs recorded for this contract</p>
                  ) : (
                    <div className="space-y-2 text-[10px] max-h-[120px] overflow-y-auto">
                      {attendanceLogs.map((a) => (
                        <div key={a._id} className="flex justify-between items-center bg-zinc-950/20 p-2.5 rounded-lg border border-zinc-900">
                          <div>
                            <span className="font-semibold text-zinc-300">Date: {a.date}</span>
                            <span className="text-zinc-500 block mt-0.5">In: {a.checkIn} &bull; Out: {a.checkOut || 'Active'}</span>
                          </div>
                          <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md">{a.hoursWorked} hrs worked</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="glass-card p-10 text-center text-zinc-500 rounded-2xl flex flex-col items-center justify-center min-h-[300px]">
                <Clock size={32} className="text-zinc-700 animate-pulse mb-3" />
                <h4 className="font-semibold text-zinc-400 text-sm">No Active Assignment</h4>
                <p className="text-[10px] text-zinc-500 max-w-xs mt-1">QR attendance requires your contractor to accept your application and transition the job status to 'in-progress'.</p>
              </div>
            )}
          </div>
        )}

        {/* CHAT SECTION */}
        {activeSection === 'chat' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Live Communication channels</h2>
              <p className="text-xs text-zinc-500 mt-1">Direct message exchange with employers and citizens.</p>
            </div>
            <ChatBox />
          </div>
        )}

        {/* WALLET SECTION */}
        {activeSection === 'wallet' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Earnings Wallet Terminal</h2>
              <p className="text-xs text-zinc-500 mt-1">Inspect daily payouts history, check cash-out ledgers, and trigger withdrawals.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              {/* Wallet core */}
              <div className="glass-card p-6 rounded-2xl flex flex-col justify-between h-[160px] sm:col-span-1">
                <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Withdrawable Balance</h4>
                <p className="text-3xl font-extrabold text-indigo-400">Rs. {wallet.balance}</p>
                <div className="text-[9px] text-zinc-500">Includes 0% cash-out fee cuts.</div>
              </div>

              {/* Withdraw Form */}
              <div className="glass-card p-6 rounded-2xl sm:col-span-2 space-y-4">
                <h3 className="font-bold text-sm text-zinc-200">Withdraw to UPI / Bank Account</h3>
                <form onSubmit={handleWithdrawalSubmit} className="space-y-3.5">
                  {withdrawSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg">
                      Withdrawal completed! Funds will transfer within 24 hours.
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="number"
                      placeholder="Amount (Rs)"
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                      className="w-full col-span-2 bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white"
                    />
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs cursor-pointer shadow-md"
                    >
                      Withdraw
                    </button>
                  </div>
                  <span className="text-[9px] text-zinc-500 block">Instant transfers to verified UPI IDs linked to your account mobile number.</span>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS SECTION */}
        {activeSection === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Labourer Profile Settings</h2>
              <p className="text-xs text-zinc-500 mt-1">Add skill offerings, configure expected wage rates, and update availability status.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="glass-card p-6 rounded-2xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Daily Wage Expectation (Rs.)</label>
                  <input
                    type="number"
                    value={expectedWage}
                    onChange={e => setExpectedWage(Number(e.target.value))}
                    className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Work Experience (Years)</label>
                  <input
                    type="number"
                    value={experience}
                    onChange={e => setExperience(Number(e.target.value))}
                    className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Availability Status</label>
                  <select
                    value={availability}
                    onChange={e => setAvailability(e.target.value as any)}
                    className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white capitalize"
                  >
                    <option value="available">Available / Open</option>
                    <option value="busy">Busy / Engaged</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Mobile Contact</label>
                  <input
                    type="text"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Residential City Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-400">Select Skilled Offerings (Checklists)</label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-950/40 rounded-xl border border-zinc-800 max-h-[140px] overflow-y-auto">
                  {availableSkills.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSkillTagToggle(s)}
                      className={`py-1.5 px-3 rounded-lg border text-[10px] font-bold text-left cursor-pointer transition ${skills.includes(s) ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-zinc-900 text-zinc-400 hover:text-zinc-300'}`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-md transition"
              >
                Save Settings
              </button>
            </form>
          </div>
        )}

      </main>

      {/* JOB APPLICATION MODAL OVERLAY */}
      <AnimatePresence>
        {selectedFeedJob && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#18181b] border border-zinc-800 p-6 rounded-2xl text-left shadow-2xl space-y-4"
            >
              {!applySuccess ? (
                <>
                  <div>
                    <h3 className="font-bold text-base text-zinc-100">Apply for Job Requisition</h3>
                    <p className="text-[10px] text-zinc-500 mt-1 capitalize">Posting: {selectedFeedJob.title} &bull; Budget: Rs.{selectedFeedJob.budget}</p>
                  </div>

                  <form onSubmit={handleApplyJob} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-400">Cover Note (Introduce your skills)</label>
                      <textarea
                        required
                        placeholder="Write your cover letter or introduction of your skills here..."
                        value={coverLetter}
                        onChange={e => setCoverLetter(e.target.value)}
                        rows={4}
                        className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2.5 px-3.5 text-xs text-zinc-50 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedFeedJob(null)}
                        className="py-2.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-400 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        Submit Application
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                    <CheckCircle size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Application Submitted!</h3>
                    <p className="text-xs text-zinc-500 mt-1">Your cover letter has been sent to the employer for review.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
