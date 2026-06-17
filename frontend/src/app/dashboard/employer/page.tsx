"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { updateUser } from '../../../store/authSlice';
import { DashboardSidebar } from '../../../components/DashboardSidebar';
import { ChatBox } from '../../../components/ChatBox';
import dynamic from 'next/dynamic';
import { 
  Briefcase, PlusCircle, Users, Wallet, CheckCircle2, XCircle, 
  MapPin, Clock, Star, Send, AlertTriangle, ArrowRight, ShieldCheck,
  FileText, TrendingUp, Calendar, Trash2, CheckCircle, ExternalLink, RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// Load Leaflet Map dynamically (client-side only)
const MapComponent = dynamic(() => import('../../../components/MapComponent'), { ssr: false });

export default function EmployerDashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: RootState) => state.auth);

  const [activeSection, setActiveSection] = useState('overview');
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>({ balance: 0, transactions: [] });
  const [notifications, setNotifications] = useState<any[]>([]);

  // Sub-sections or tabs for Job details view
  const [jobViewTab, setJobViewTab] = useState<'applicants' | 'matches' | 'attendance' | 'payment'>('applicants');

  // Checkout modal states
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{ job: any; labour: any; amount: number } | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [lastPayment, setLastPayment] = useState<any | null>(null);

  // Form states for posting job
  const [postTitle, setPostTitle] = useState('');
  const [postDesc, setPostDesc] = useState('');
  const [postCategory, setPostCategory] = useState('electrician');
  const [postBudget, setPostBudget] = useState('');
  const [postWageType, setPostWageType] = useState<'daily' | 'weekly' | 'fixed'>('daily');
  const [postAddress, setPostAddress] = useState('');
  const [postDuration, setPostDuration] = useState('5 days');
  const [postHours, setPostHours] = useState(8);
  const [postExp, setPostExp] = useState(0);
  const [postWorkers, setPostWorkers] = useState(1);
  const [postUrgency, setPostUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Profile fields state
  const [profileCompanyName, setProfileCompanyName] = useState(user?.companyName || '');
  const [profileDetails, setProfileDetails] = useState(user?.businessDetails || '');
  const [profileAddress, setProfileAddress] = useState(user?.address || '');
  const [profileMobile, setProfileMobile] = useState(user?.mobile || '');

  // Fetch employer stats and jobs
  const fetchJobs = async () => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/jobs?employerId=${user?._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setJobs(data);
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

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/admin/stats', { // Or notifications endpoint
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Just mock notifications list if backend endpoint is generic
      const mockNotifs = [
        { id: '1', title: 'Payment Confirmed', message: 'Rs. 2500 has been sent successfully.', type: 'payment', time: '1 hour ago' },
        { id: '2', title: 'New Application', message: 'A Plumber applied for your residential renovation.', type: 'apply', time: '2 hours ago' },
        { id: '3', title: 'Attendance Marked', message: 'Worker check-in recorded for metro construction project.', type: 'attendance', time: '4 hours ago' }
      ];
      setNotifications(mockNotifs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token || !user) {
      router.push('/auth');
      return;
    }
    if (user.role !== 'employer') {
      router.push(`/dashboard/${user.role}`);
      return;
    }

    fetchJobs();
    fetchWallet();
    fetchNotifications();
  }, [token, user]);

  // Handle job selection details
  const handleSelectJob = async (job: any) => {
    setSelectedJob(job);
    fetchJobDetailsData(job._id);
  };

  const fetchJobDetailsData = async (jobId: string) => {
    if (!token) return;
    try {
      // 1. Fetch applications
      const appRes = await fetch(`http://localhost:5000/api/jobs/${jobId}/applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const appData = await appRes.json();
      setApplications(Array.isArray(appData) ? appData : []);

      // 2. Fetch matched workers
      const matchRes = await fetch(`http://localhost:5000/api/jobs/${jobId}/match`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const matchData = await matchRes.json();
      setMatches(Array.isArray(matchData) ? matchData : []);

      // 3. Fetch attendance
      const attRes = await fetch(`http://localhost:5000/api/attendance/job/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const attData = await attRes.json();
      setAttendance(Array.isArray(attData) ? attData : []);
    } catch (err) {
      console.error(err);
    }
  };

  // Manage Application (Accept / Reject)
  const handleUpdateApplication = async (appId: string, status: 'accepted' | 'rejected') => {
    if (!token || !selectedJob) return;
    try {
      const res = await fetch(`http://localhost:5000/api/jobs/applications/${appId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!data.error) {
        // Refresh details
        fetchJobDetailsData(selectedJob._id);
        fetchJobs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Job Posting
  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!postTitle || !postDesc || !postBudget || !postAddress) {
      setFormError('Please fill in all required job fields.');
      return;
    }

    setLoading(true);

    try {
      // Setup mock lat/lng coordinates based on address hash
      const lat = 19.076 + (Math.random() * 0.1 - 0.05);
      const lng = 72.877 + (Math.random() * 0.1 - 0.05);

      const res = await fetch('http://localhost:5000/api/jobs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: postTitle,
          description: postDesc,
          category: postCategory,
          budget: Number(postBudget),
          wageType: postWageType,
          location: { address: postAddress, lat, lng },
          startDate: new Date().toISOString().split('T')[0],
          duration: postDuration,
          workingHours: Number(postHours),
          experienceRequired: Number(postExp),
          workersNeeded: Number(postWorkers),
          urgency: postUrgency
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setFormSuccess('Job Posted Successfully!');
      setPostTitle('');
      setPostDesc('');
      setPostBudget('');
      setPostAddress('');
      
      // Refresh jobs list
      fetchJobs();
      setTimeout(() => {
        setActiveSection('jobs-manager');
        setFormSuccess('');
      }, 1000);

    } catch (err: any) {
      setFormError(err.message || 'Job posting failed.');
    } finally {
      setLoading(false);
    }
  };

  // Start Direct checkout
  const handleTriggerPayment = (labour: any) => {
    if (!selectedJob) return;
    setCheckoutData({
      job: selectedJob,
      labour,
      amount: selectedJob.budget
    });
    setCheckoutSuccess(false);
    setLastPayment(null);
    setCheckoutModalOpen(true);
  };

  const handleProcessCheckout = async () => {
    if (!token || !checkoutData) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jobId: checkoutData.job._id,
          labourId: checkoutData.labour._id,
          amount: checkoutData.amount,
          paymentMethod: 'wallet'
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setLastPayment(data);
      setCheckoutSuccess(true);
      fetchWallet();
      fetchJobs();
      if (selectedJob) {
        fetchJobDetailsData(selectedJob._id);
      }
    } catch (err: any) {
      alert(err.message || 'Payment transfer failed.');
    } finally {
      setLoading(false);
    }
  };

  // Download Invoice PDF
  const handleDownloadInvoice = async (paymentId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/payments/invoice/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // Update company profile settings
  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyName: profileCompanyName,
          businessDetails: profileDetails,
          address: profileAddress,
          mobile: profileMobile
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      dispatch(updateUser(data));
      alert('Profile Settings Saved!');
    } catch (err: any) {
      alert(err.message || 'Profile update failed.');
    } finally {
      setLoading(false);
    }
  };

  // Recharts analytic data
  const chartData = [
    { name: 'Mon', spend: 4500 },
    { name: 'Tue', spend: 8000 },
    { name: 'Wed', spend: 2000 },
    { name: 'Thu', spend: 12000 },
    { name: 'Fri', spend: 5000 },
    { name: 'Sat', spend: 15000 },
    { name: 'Sun', spend: 4000 }
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-zinc-900">
      <DashboardSidebar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        walletBalance={wallet.balance}
        notificationsCount={notifications.length}
      />

      {/* Main Panel */}
      <main className="flex-grow p-4 sm:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* OVERVIEW SECTION */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Contractor Control Deck</h2>
              <p className="text-xs text-zinc-500 mt-1">Review active sites, manage crew matches, and pay wages.</p>
            </div>

            {/* Quick Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <div className="glass-card p-6 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h4 className="text-[11px] text-zinc-500 font-semibold uppercase">Open Requirements</h4>
                  <p className="text-xl font-bold text-zinc-100 mt-1">{jobs.filter(j => j.status === 'open').length}</p>
                </div>
              </div>
              <div className="glass-card p-6 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h4 className="text-[11px] text-zinc-500 font-semibold uppercase">Active Hires</h4>
                  <p className="text-xl font-bold text-zinc-100 mt-1">
                    {jobs.reduce((acc, curr) => acc + (curr.workersHired?.length || 0), 0)}
                  </p>
                </div>
              </div>
              <div className="glass-card p-6 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 className="text-[11px] text-zinc-500 font-semibold uppercase">Projects Completed</h4>
                  <p className="text-xl font-bold text-zinc-100 mt-1">{user?.projectsCompleted || 0}</p>
                </div>
              </div>
              <div className="glass-card p-6 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Wallet size={20} />
                </div>
                <div>
                  <h4 className="text-[11px] text-zinc-500 font-semibold uppercase">Wallet Funds</h4>
                  <p className="text-xl font-bold text-zinc-100 mt-1">Rs. {wallet.balance}</p>
                </div>
              </div>
            </div>

            {/* Expenditure analytics chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="glass-card p-6 rounded-2xl lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-200">Wage Spending Pattern</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Track daily payouts distributed to labourers.</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-1 rounded-md">
                    <TrendingUp size={12} /> +12.4% weekly
                  </span>
                </div>
                <div className="h-[200px] w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
                      <YAxis stroke="#71717a" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ background: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                        labelStyle={{ fontSize: '11px', color: '#fafafa' }}
                        itemStyle={{ fontSize: '11px', color: '#6366f1' }}
                      />
                      <Line type="monotone" dataKey="spend" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent activity timeline */}
              <div className="glass-card p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-sm text-zinc-200">Recent Notifications</h3>
                <div className="space-y-4 max-h-[200px] overflow-y-auto pr-1">
                  {notifications.map((n) => (
                    <div key={n.id} className="flex gap-3 text-xs border-b border-zinc-800/40 pb-3 last:border-b-0 last:pb-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1 shrink-0"></div>
                      <div className="space-y-0.5 min-w-0">
                        <h5 className="font-semibold text-zinc-200 truncate">{n.title}</h5>
                        <p className="text-zinc-400 text-[10px] leading-normal">{n.message}</p>
                        <span className="text-[9px] text-zinc-600 block">{n.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* POST A JOB SECTION */}
        {activeSection === 'post-job' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Create Crew Requirement</h2>
              <p className="text-xs text-zinc-500 mt-1">Publish job requisites to auto-trigger matched recommendation notifications to nearby labourers.</p>
            </div>

            {/* Form */}
            <form onSubmit={handlePostJob} className="glass-card p-6 rounded-2xl space-y-4">
              {formError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle size={15} /> <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={15} /> <span>{formSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Job Title</label>
                  <input
                    type="text"
                    placeholder="Enter job title"
                    value={postTitle}
                    onChange={e => setPostTitle(e.target.value)}
                    className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Job Category</label>
                  <select
                    value={postCategory}
                    onChange={e => setPostCategory(e.target.value)}
                    className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-50 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="electrician">Electrician</option>
                    <option value="plumber">Plumber</option>
                    <option value="painter">Painter</option>
                    <option value="carpenter">Carpenter</option>
                    <option value="mason">Mason / Construction</option>
                    <option value="welder">Welder</option>
                    <option value="driver">Driver</option>
                    <option value="mechanic">Mechanic</option>
                    <option value="cleaner">Cleaner</option>
                    <option value="technician">Technician / AC repair</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-semibold text-zinc-400">Wage Budget Amount (Rs)</label>
                  <input
                    type="number"
                    placeholder="Enter budget wage amount"
                    value={postBudget}
                    onChange={e => setPostBudget(e.target.value)}
                    className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Wage Frequency</label>
                  <select
                    value={postWageType}
                    onChange={e => setPostWageType(e.target.value as any)}
                    className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-50 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="daily">Daily Wage</option>
                    <option value="weekly">Weekly Wage</option>
                    <option value="fixed">Fixed Cost</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Duration</label>
                  <input
                    type="text"
                    placeholder="Enter project duration"
                    value={postDuration}
                    onChange={e => setPostDuration(e.target.value)}
                    className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-50 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Hours / Day</label>
                  <input
                    type="number"
                    value={postHours}
                    onChange={e => setPostHours(Number(e.target.value))}
                    className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-50 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Workers Needed</label>
                  <input
                    type="number"
                    value={postWorkers}
                    onChange={e => setPostWorkers(Number(e.target.value))}
                    className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-50 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Experience Needed (Years)</label>
                  <input
                    type="number"
                    value={postExp}
                    onChange={e => setPostExp(Number(e.target.value))}
                    className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-50 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Urgency Level</label>
                  <select
                    value={postUrgency}
                    onChange={e => setPostUrgency(e.target.value as any)}
                    className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-50 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low Urgency</option>
                    <option value="medium">Medium Urgency</option>
                    <option value="high">High / Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Project Location (Site Address)</label>
                <input
                  type="text"
                  placeholder="Enter work location address"
                  value={postAddress}
                  onChange={e => setPostAddress(e.target.value)}
                  className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Job Description & Details</label>
                <textarea
                  placeholder="Mention daily tasks, tools needed, or safety measures..."
                  value={postDesc}
                  onChange={e => setPostDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading ? <span className="w-3.5 h-3.5 border border-t-white border-indigo-400 rounded-full animate-spin"></span> : 'Publish Requirement'}
              </button>
            </form>
          </div>
        )}

        {/* JOBS MANAGER SECTION */}
        {activeSection === 'jobs-manager' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Job Listings & Crew Manager</h2>
              <p className="text-xs text-zinc-500 mt-1">Review applicant profiles, check matched candidates, audit QR attendance, and process payments.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Jobs list selector */}
              <div className="glass-card rounded-2xl p-4 divide-y divide-zinc-800/40 space-y-1">
                <h3 className="font-bold text-xs text-zinc-300 pb-3 px-1">Posted Requirements</h3>
                {jobs.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500 text-xs">No active requirements found</div>
                ) : (
                  jobs.map((j) => (
                    <button
                      key={j._id}
                      onClick={() => handleSelectJob(j)}
                      className={`w-full text-left p-3.5 rounded-xl transition duration-150 border cursor-pointer ${selectedJob?._id === j._id ? 'bg-indigo-600/10 border-indigo-500/20' : 'border-transparent hover:bg-zinc-900/40'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md capitalize">{j.category}</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${j.status === 'open' ? 'bg-emerald-500' : j.status === 'in-progress' ? 'bg-amber-500' : 'bg-zinc-500'}`} title={`Status: ${j.status}`}></span>
                      </div>
                      <h4 className="font-bold text-xs text-zinc-200 mt-2 truncate">{j.title}</h4>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-500 mt-2 font-medium">
                        <span className="flex items-center gap-1"><MapPin size={10} /> {j.location?.address?.substring(0, 15)}...</span>
                        <span>Rs. {j.budget}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Selected Job management workspace */}
              <div className="lg:col-span-2">
                {selectedJob ? (
                  <div className="space-y-6">
                    {/* Header info */}
                    <div className="glass-card p-6 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                        <div>
                          <h3 className="font-bold text-base text-zinc-100">{selectedJob.title}</h3>
                          <p className="text-[10px] text-zinc-500 mt-1 capitalize">Category: {selectedJob.category} &bull; Wage Type: {selectedJob.wageType}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${selectedJob.status === 'open' ? 'bg-emerald-500/10 text-emerald-400' : selectedJob.status === 'in-progress' ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
                          {selectedJob.status}
                        </span>
                      </div>
                      
                      {/* Sub-tabs workspace selection */}
                      <div className="flex gap-2 p-1 bg-zinc-950/40 border border-zinc-800/60 rounded-xl">
                        {(['applicants', 'matches', 'attendance', 'payment'] as const).map(tab => (
                          <button
                            key={tab}
                            onClick={() => setJobViewTab(tab)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition cursor-pointer ${jobViewTab === tab ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                          >
                            {tab === 'applicants' ? `Applicants (${applications.length})` : tab === 'matches' ? `Smart Matches (${matches.length})` : tab === 'attendance' ? 'Attendance' : 'Settle Wage Payouts'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Content display based on tab selection */}
                    <div className="glass-card p-6 rounded-2xl min-h-[300px]">
                      
                      {/* Applicants Tab */}
                      {jobViewTab === 'applicants' && (
                        <div className="space-y-4">
                          <h4 className="font-bold text-xs text-zinc-300">Candidates Applications</h4>
                          {applications.length === 0 ? (
                            <div className="text-center py-12 text-zinc-500 text-xs">No pending applications found</div>
                          ) : (
                            <div className="space-y-4">
                              {applications.map((app) => (
                                <div key={app._id} className="p-4 rounded-xl bg-zinc-950/30 border border-zinc-800/80 flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <img 
                                      src={app.labour?.avatar} 
                                      alt="avatar" 
                                      className="w-10 h-10 rounded-full border border-zinc-800 object-cover"
                                    />
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <h5 className="font-bold text-xs text-zinc-200">{app.labour?.name}</h5>
                                        {app.labour?.isVerified && <span className="w-3 h-3 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[7px]">✓</span>}
                                      </div>
                                      <p className="text-[10px] text-zinc-500 mt-1">Exp: {app.labour?.experience} yrs &bull; Expected Wage: Rs.{app.labour?.expectedWage}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {app.status === 'pending' ? (
                                      <>
                                        <button
                                          onClick={() => handleUpdateApplication(app._id, 'rejected')}
                                          className="p-1.5 rounded-lg border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/10 cursor-pointer transition text-xs"
                                        >
                                          Decline
                                        </button>
                                        <button
                                          onClick={() => handleUpdateApplication(app._id, 'accepted')}
                                          className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer transition"
                                        >
                                          Accept / Hire
                                        </button>
                                      </>
                                    ) : (
                                      <span className={`text-[10px] font-bold uppercase ${app.status === 'accepted' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {app.status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Matching Tab */}
                      {jobViewTab === 'matches' && (
                        <div className="space-y-4">
                          <h4 className="font-bold text-xs text-zinc-300">Intelligent Matching Recommendations</h4>
                          {matches.length === 0 ? (
                            <div className="text-center py-12 text-zinc-500 text-xs">No matching labourers found</div>
                          ) : (
                            <div className="space-y-4">
                              {matches.map((m) => (
                                <div key={m.labour?._id} className="p-4 rounded-xl bg-zinc-950/30 border border-zinc-800/80 flex flex-col sm:flex-row justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <img 
                                      src={m.labour?.avatar} 
                                      alt="avatar" 
                                      className="w-10 h-10 rounded-full border border-zinc-800 object-cover"
                                    />
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <h5 className="font-bold text-xs text-zinc-200">{m.labour?.name}</h5>
                                        {m.labour?.isVerified && <span className="w-3 h-3 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[7px]">✓</span>}
                                      </div>
                                      <p className="text-[10px] text-zinc-500 mt-1">Exp: {m.labour?.experience} yrs &bull; Rate: Rs.{m.labour?.expectedWage}/day &bull; Dist: {m.distanceKm} km</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-zinc-800/40 sm:border-0 pt-2.5 sm:pt-0">
                                    <div className="text-right">
                                      <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider block">AI Match Score</span>
                                      <span className="text-xs font-extrabold text-indigo-400 block">{m.score}% Match</span>
                                    </div>
                                    <button
                                      onClick={() => handleTriggerPayment(m.labour)}
                                      className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer transition"
                                    >
                                      Direct Hire / Pay
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Attendance Tab */}
                      {jobViewTab === 'attendance' && (
                        <div className="space-y-4">
                          <h4 className="font-bold text-xs text-zinc-300">Site Attendance logs</h4>
                          {attendance.length === 0 ? (
                            <div className="text-center py-12 text-zinc-500 text-xs">No check-in logs submitted for today</div>
                          ) : (
                            <div className="space-y-3">
                              {attendance.map((rec) => (
                                <div key={rec._id} className="p-3.5 rounded-xl bg-zinc-950/30 border border-zinc-800/80 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                    <div>
                                      <h5 className="font-semibold text-zinc-200">{rec.labour?.name}</h5>
                                      <p className="text-[9px] text-zinc-500 mt-0.5">Date: {rec.date} &bull; Check-in: {rec.checkIn} &bull; Hours: {rec.hoursWorked} hrs</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {rec.workPhoto && (
                                      <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">Photo uploaded</span>
                                    )}
                                    <span className="text-[10px] text-emerald-400 font-bold uppercase bg-emerald-500/10 px-2.5 py-0.5 rounded-md">Present</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Payouts settlement */}
                      {jobViewTab === 'payment' && (
                        <div className="space-y-4">
                          <h4 className="font-bold text-xs text-zinc-300">Settle Wages Ledger</h4>
                          <p className="text-[10px] text-zinc-500 max-w-sm">Pay hired workers instantly from your wallet balance. Generated receipts include verification stamps.</p>

                          {selectedJob.workersHired?.length === 0 ? (
                            <div className="text-center py-12 text-zinc-500 text-xs">No workers hired yet to settle payouts</div>
                          ) : (
                            <div className="space-y-3.5">
                              {selectedJob.workersHired?.map((wid: string) => (
                                <WorkerPayRow key={wid} workerId={wid} onPay={handleTriggerPayment} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                ) : (
                  <div className="glass-card p-10 text-center text-zinc-500 rounded-2xl flex flex-col items-center justify-center min-h-[400px]">
                    <Briefcase size={32} className="text-zinc-700 animate-pulse mb-3" />
                    <h4 className="font-semibold text-zinc-400 text-sm">No Project Selected</h4>
                    <p className="text-[10px] text-zinc-500 max-w-xs mt-1">Select a requirement from the posted list on the left to review applicants, audit QR codes, and pay wages.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* CHAT SECTION */}
        {activeSection === 'chat' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Live Communication channels</h2>
              <p className="text-xs text-zinc-500 mt-1">Chat directly with daily labourers and common citizens.</p>
            </div>
            <ChatBox />
          </div>
        )}

        {/* WALLET SECTION */}
        {activeSection === 'wallet' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Wallet & Payments Ledger</h2>
              <p className="text-xs text-zinc-500 mt-1">Check balances, deposit mock funds, and inspect invoice histories.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="glass-card p-6 rounded-2xl sm:col-span-1 flex flex-col justify-between h-[150px]">
                <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Available Funds</h4>
                <p className="text-3xl font-extrabold text-indigo-400">Rs. {wallet.balance}</p>
                <button
                  onClick={async () => {
                    if (token) {
                      // Add mock funds
                      await fetch('http://localhost:5000/api/users/profile', {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          $inc: { balance: 5000 } // Or custom wallet trigger
                        })
                      });
                      // Directly trigger mock increase in backend wallet controller
                      alert('Rs. 5000 mock funds deposited!');
                      fetchWallet();
                    }
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-xs cursor-pointer"
                >
                  Deposit Rs. 5000 (Mock)
                </button>
              </div>

              {/* Transactions Ledger */}
              <div className="glass-card p-6 rounded-2xl sm:col-span-2 space-y-4">
                <h3 className="font-bold text-sm text-zinc-200">Transactions Ledger</h3>
                <div className="max-h-[200px] overflow-y-auto space-y-3 pr-1 text-xs">
                  {wallet.transactions?.length === 0 ? (
                    <div className="text-center text-zinc-500 py-10">No transactions recorded yet</div>
                  ) : (
                    wallet.transactions?.slice().reverse().map((txn: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center border-b border-zinc-800/40 pb-2 last:border-b-0">
                        <div>
                          <h5 className="font-semibold text-zinc-200">{txn.description}</h5>
                          <span className="text-[9px] text-zinc-500">{new Date(txn.date).toLocaleDateString()}</span>
                        </div>
                        <span className={`font-bold ${txn.type === 'deposit' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {txn.type === 'deposit' ? '+' : '-'} Rs. {txn.amount}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS SECTION */}
        {activeSection === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Profile Settings</h2>
              <p className="text-xs text-zinc-500 mt-1">Configure company profiles, location points, and contact numbers.</p>
            </div>

            <form onSubmit={handleUpdateProfileSubmit} className="glass-card p-6 rounded-2xl space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Company Name</label>
                <input
                  type="text"
                  value={profileCompanyName}
                  onChange={e => setProfileCompanyName(e.target.value)}
                  className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Mobile Number</label>
                <input
                  type="text"
                  value={profileMobile}
                  onChange={e => setProfileMobile(e.target.value)}
                  className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Office Address</label>
                <input
                  type="text"
                  value={profileAddress}
                  onChange={e => setProfileAddress(e.target.value)}
                  className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Business Portfolio Details</label>
                <textarea
                  value={profileDetails}
                  onChange={e => setProfileDetails(e.target.value)}
                  rows={4}
                  className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white"
                />
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

      {/* PAYMENTS MOCK CHECKOUT MODAL OVERLAY */}
      <AnimatePresence>
        {checkoutModalOpen && checkoutData && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#18181b] border border-zinc-800 p-6 rounded-2xl text-left shadow-2xl space-y-5"
            >
              {!checkoutSuccess ? (
                <>
                  <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
                    <ShieldCheck className="text-indigo-400" size={24} />
                    <h3 className="font-bold text-base text-zinc-100">Wage Settlement Checkout</h3>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Worker Hired:</span>
                      <strong className="text-zinc-200">{checkoutData.labour.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Task Title:</span>
                      <strong className="text-zinc-200">{checkoutData.job.title}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Category:</span>
                      <strong className="text-zinc-200 capitalize">{checkoutData.job.category}</strong>
                    </div>
                    <div className="flex justify-between border-t border-zinc-900 pt-2 text-sm">
                      <span className="font-semibold text-zinc-400">Total Payout due:</span>
                      <strong className="text-indigo-400 font-extrabold">Rs. {checkoutData.amount}</strong>
                    </div>
                  </div>

                  <div className="text-[10px] text-zinc-500 leading-normal flex items-start gap-1.5">
                    <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>Clicking Pay processes a simulated Razorpay transfer. Funds will be instantly debited from your wallet and credited to the worker.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setCheckoutModalOpen(false)}
                      className="py-2.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-400 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleProcessCheckout}
                      disabled={loading}
                      className="py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer flex items-center justify-center gap-1"
                    >
                      {loading ? <span className="w-3.5 h-3.5 border border-t-white border-indigo-400 rounded-full animate-spin"></span> : 'Confirm & Pay'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Wage Paid Successfully!</h3>
                    <p className="text-xs text-zinc-500 mt-1">Simulated Razorpay transaction completed successfully.</p>
                  </div>

                  <div className="bg-zinc-950/50 border border-zinc-900 p-3.5 rounded-xl text-[11px] text-left space-y-1.5 text-zinc-400">
                    <div>Txn ID: <strong className="text-zinc-200 font-mono">{lastPayment?.transactionId}</strong></div>
                    <div>Paid To: <strong className="text-zinc-200">{checkoutData.labour.name}</strong></div>
                    <div>Amount: <strong className="text-zinc-200">Rs. {checkoutData.amount}</strong></div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    {lastPayment && (
                      <button
                        onClick={() => handleDownloadInvoice(lastPayment._id)}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <FileText size={14} /> Download PDF Receipt
                      </button>
                    )}
                    <button
                      onClick={() => setCheckoutModalOpen(false)}
                      className="w-full py-2 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs cursor-pointer"
                    >
                      Close Window
                    </button>
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

// Sub-component helper for payout row
function WorkerPayRow({ workerId, onPay }: { workerId: string; onPay: (worker: any) => void }) {
  const [worker, setWorker] = useState<any | null>(null);

  useEffect(() => {
    // Fetch profile details
    fetch(`http://localhost:5000/api/users/workers?search=`) // Simply get details of this worker
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const match = data.find((w: any) => w._id === workerId);
          setWorker(match || null);
        }
      });
  }, [workerId]);

  if (!worker) return null;

  return (
    <div className="p-3.5 bg-zinc-950/30 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs">
      <div className="flex items-center gap-3">
        <img src={worker.avatar} alt="avatar" className="w-8 h-8 rounded-full bg-zinc-800" />
        <div>
          <h5 className="font-semibold text-zinc-200">{worker.name}</h5>
          <p className="text-[9px] text-zinc-500 mt-0.5">Rate: Rs.{worker.expectedWage}/day &bull; Experience: {worker.experience} yrs</p>
        </div>
      </div>
      <button
        onClick={() => onPay(worker)}
        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[10px] cursor-pointer"
      >
        Pay Wages
      </button>
    </div>
  );
}
