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
  PlusCircle, Users, Search, MessageSquare, Wallet, MapPin, 
  Star, Briefcase, FileText, CheckCircle2, AlertCircle, Sparkles, CheckCircle, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Load Leaflet Map dynamically
const MapComponent = dynamic(() => import('../../../components/MapComponent'), { ssr: false });

export default function CommonUserDashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: RootState) => state.auth);

  const [activeSection, setActiveSection] = useState('overview');
  
  // Workers search list
  const [workers, setWorkers] = useState<any[]>([]);
  const [searchCategory, setSearchCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState('0');
  const [selectedMapCenter, setSelectedMapCenter] = useState<[number, number]>([19.076, 72.877]); // Mumbai Center

  // Service requests list
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [bids, setBids] = useState<any[]>([]);

  // Post service request form states
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqCategory, setReqCategory] = useState('electrician');
  const [reqBudget, setReqBudget] = useState('');
  const [reqAddress, setReqAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Profile update settings
  const [profileMobile, setProfileMobile] = useState(user?.mobile || '');
  const [profileAddress, setProfileAddress] = useState(user?.address || '');

  // Wallet and checkout modal states
  const [wallet, setWallet] = useState<any>({ balance: 0, transactions: [] });
  const [directHireModalOpen, setDirectHireModalOpen] = useState(false);
  const [hiringTarget, setHiringTarget] = useState<any | null>(null);
  const [hireTitle, setHireTitle] = useState('');
  const [hireDesc, setHireDesc] = useState('');
  const [hireBudget, setHireBudget] = useState('');
  const [hireSuccess, setHireSuccess] = useState(false);

  const fetchWorkers = async () => {
    try {
      const url = `http://localhost:5000/api/users/workers?category=${searchCategory}&rating=${filterRating}&search=${searchQuery}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setWorkers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequests = async () => {
    if (!token) return;
    try {
      // Common users check jobs created by them
      const res = await fetch(`http://localhost:5000/api/jobs?employerId=${user?._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRequests(data);
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

  useEffect(() => {
    if (!token || !user) {
      router.push('/auth');
      return;
    }
    if (user.role !== 'common') {
      router.push(`/dashboard/${user.role}`);
      return;
    }

    fetchWorkers();
    fetchRequests();
    fetchWallet();
  }, [token, user]);

  // Handle worker search inputs update
  useEffect(() => {
    fetchWorkers();
  }, [searchCategory, searchQuery, filterRating]);

  // Click on a posted request: load applicant bids
  const handleSelectRequest = async (req: any) => {
    setSelectedRequest(req);
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/jobs/${req._id}/applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setBids(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  // Manage applicant bids
  const handleUpdateBid = async (appId: string, status: 'accepted' | 'rejected') => {
    if (!token || !selectedRequest) return;
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
        handleSelectRequest(selectedRequest);
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Service Request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!reqTitle || !reqDesc || !reqBudget || !reqAddress) {
      setFormError('Please fill in all service request details.');
      return;
    }

    setLoading(true);

    try {
      const lat = 19.076 + (Math.random() * 0.1 - 0.05);
      const lng = 72.877 + (Math.random() * 0.1 - 0.05);

      const res = await fetch('http://localhost:5000/api/jobs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: reqTitle,
          description: reqDesc,
          category: reqCategory,
          budget: Number(reqBudget),
          wageType: 'fixed',
          location: { address: reqAddress, lat, lng },
          startDate: new Date().toISOString().split('T')[0],
          duration: '1 day',
          workingHours: 4,
          experienceRequired: 0,
          workersNeeded: 1,
          urgency: 'high'
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setFormSuccess('Home service request posted successfully!');
      setReqTitle('');
      setReqDesc('');
      setReqBudget('');
      setReqAddress('');
      fetchRequests();

      setTimeout(() => {
        setActiveSection('service-requests');
        setFormSuccess('');
      }, 1200);

    } catch (err: any) {
      setFormError(err.message || 'Posting request failed.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger direct chat with worker
  const handleContactWorker = async (workerId: string) => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ recipientId: workerId })
      });
      const data = await res.json();
      if (!data.error) {
        setActiveSection('chat');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger Direct Hire
  const handleTriggerDirectHire = (worker: any) => {
    setHiringTarget(worker);
    setHireTitle(`Direct hire: ${worker.skills?.[0] || 'Labour'} service`);
    setHireDesc(`Domestic repair/renovation by ${worker.name}`);
    setHireBudget(worker.expectedWage || 500);
    setHireSuccess(false);
    setDirectHireModalOpen(true);
  };

  const handleConfirmDirectHire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !hiringTarget) return;

    setLoading(true);

    try {
      // 1. Create a job automatically with status: open
      const lat = 19.076 + (Math.random() * 0.04 - 0.02);
      const lng = 72.877 + (Math.random() * 0.04 - 0.02);

      const jobRes = await fetch('http://localhost:5000/api/jobs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: hireTitle,
          description: hireDesc,
          category: hiringTarget.skills?.[0] || 'electrician',
          budget: Number(hireBudget),
          wageType: 'fixed',
          location: { address: user?.address || 'Mumbai', lat, lng },
          startDate: new Date().toISOString().split('T')[0],
          duration: '1 day',
          workingHours: 8,
          experienceRequired: 0,
          workersNeeded: 1,
          urgency: 'high'
        })
      });

      const newJob = await jobRes.json();
      if (newJob.error) throw new Error(newJob.error);

      // 2. Submit application on behalf of worker
      const applyRes = await fetch(`http://localhost:5000/api/jobs/${newJob._id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hiringTarget._id === 'googleuser' ? token : token}` // Mock apply as worker
        },
        body: JSON.stringify({ coverLetter: 'Direct Hire Request Accepted.' })
      });
      // In a mock demo, we just auto-accept:
      // Let's get the application created
      const appsRes = await fetch(`http://localhost:5000/api/jobs/${newJob._id}/applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const apps = await appsRes.json();
      if (Array.isArray(apps) && apps.length > 0) {
        // Auto hire
        await handleUpdateBid(apps[0]._id, 'accepted');
      }

      setHireSuccess(true);
      fetchRequests();
      setTimeout(() => {
        setDirectHireModalOpen(false);
        setHireSuccess(false);
      }, 1200);

    } catch (err: any) {
      alert(err.message || 'Direct hire creation failed.');
    } finally {
      setLoading(false);
    }
  };

  // Profile Settings Submit
  const handleSaveProfile = async (e: React.FormEvent) => {
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
          mobile: profileMobile,
          address: profileAddress
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      dispatch(updateUser(data));
      alert('Settings saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Profile settings update failed.');
    } finally {
      setLoading(false);
    }
  };

  // Compile worker markers for Leaflet mapping
  const mapMarkers = workers.map(w => {
    // Mock coordinates based on a hash of worker ID to show nearby locations
    const lat = 19.076 + (parseInt(w._id.substring(0, 4), 36) % 100) / 1000 - 0.05;
    const lng = 72.877 + (parseInt(w._id.substring(4, 8), 36) % 100) / 1000 - 0.05;
    return {
      id: w._id,
      lat,
      lng,
      title: w.name,
      subtitle: `Skill: ${w.skills?.join(', ') || 'General'} | Wage: Rs. ${w.expectedWage}/day`,
      type: 'worker' as const,
      onClick: () => handleTriggerDirectHire(w)
    };
  });

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
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Household Dashboard</h2>
              <p className="text-xs text-zinc-500 mt-1">Locate nearby electricians, plumber workers, and post repair requirements.</p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="glass-card p-6 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <PlusCircle size={20} />
                </div>
                <div>
                  <h4 className="text-[11px] text-zinc-500 font-semibold uppercase">Requests Posted</h4>
                  <p className="text-xl font-bold text-zinc-100 mt-1">{requests.length}</p>
                </div>
              </div>
              <div className="glass-card p-6 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h4 className="text-[11px] text-zinc-500 font-semibold uppercase">Contractors Connected</h4>
                  <p className="text-xl font-bold text-zinc-100 mt-1">
                    {requests.filter(r => r.status === 'in-progress' || r.status === 'completed').length}
                  </p>
                </div>
              </div>
              <div className="glass-card p-6 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Wallet size={20} />
                </div>
                <div>
                  <h4 className="text-[11px] text-zinc-500 font-semibold uppercase">Wallet balance</h4>
                  <p className="text-xl font-bold text-zinc-100 mt-1">Rs. {wallet.balance}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-6 rounded-2xl flex flex-col justify-between gap-4">
                <div>
                  <h3 className="font-bold text-sm text-zinc-200">Instant Worker Finder</h3>
                  <p className="text-xs text-zinc-500 mt-1">Filter, locate, and contact skilled crew markers on an interactive map coordinate screen.</p>
                </div>
                <button 
                  onClick={() => setActiveSection('search-workers')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl text-xs font-semibold w-fit cursor-pointer flex items-center gap-1.5"
                >
                  Locate Workers Nearby <ArrowRight size={12} />
                </button>
              </div>

              <div className="glass-card p-6 rounded-2xl flex flex-col justify-between gap-4">
                <div>
                  <h3 className="font-bold text-sm text-zinc-200">Post Home Repair Task</h3>
                  <p className="text-xs text-zinc-500 mt-1">Post Geyser leak, interior paint, or wiring needs. Skilled workers will bid directly.</p>
                </div>
                <button 
                  onClick={() => setActiveSection('service-requests')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl text-xs font-semibold w-fit cursor-pointer flex items-center gap-1.5"
                >
                  Post Task Request <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SEARCH WORKERS SECTION */}
        {activeSection === 'search-workers' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Find Workers & Contractors Nearby</h2>
              <p className="text-xs text-zinc-500 mt-1">Locate vended professionals mapped dynamically around your area.</p>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/40 rounded-xl border border-zinc-800">
                <Search size={14} className="text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none focus:outline-none focus:ring-0 text-xs text-white placeholder-zinc-500 w-full"
                />
              </div>

              <select
                value={searchCategory}
                onChange={e => setSearchCategory(e.target.value)}
                className="bg-zinc-900/40 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white"
              >
                <option value="">All Specialities</option>
                <option value="electrician">Electrician</option>
                <option value="plumber">Plumber</option>
                <option value="painter">Painter</option>
                <option value="carpenter">Carpenter</option>
                <option value="mason">Mason / Construction</option>
                <option value="welder">Welder</option>
                <option value="driver">Driver</option>
                <option value="mechanic">Mechanic</option>
                <option value="cleaner">Cleaner</option>
                <option value="technician">AC & Fridge Repair</option>
              </select>

              <select
                value={filterRating}
                onChange={e => setFilterRating(e.target.value)}
                className="bg-zinc-900/40 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white"
              >
                <option value="0">All Ratings</option>
                <option value="4">4+ Stars (Trust 80%+)</option>
                <option value="3">3+ Stars (Trust 60%+)</option>
              </select>

              <div className="text-right text-[10px] text-indigo-400 font-semibold bg-indigo-500/5 py-2 px-3 rounded-xl border border-indigo-500/10 flex items-center justify-center">
                Found {workers.length} Skilled Workers Nearby
              </div>
            </div>

            {/* Split layout: list + map */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              
              {/* Workers checklist */}
              <div className="glass-card p-4 rounded-2xl flex flex-col gap-3 max-h-[500px] overflow-y-auto shrink-0">
                <h3 className="font-bold text-xs text-zinc-300 px-1 border-b border-zinc-800 pb-2">Labourers Available</h3>
                
                {workers.length === 0 ? (
                  <div className="text-center py-20 text-zinc-500 text-xs">No workers match this query</div>
                ) : (
                  workers.map((w) => (
                    <div 
                      key={w._id}
                      className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/20 flex flex-col gap-3 transition hover:border-zinc-700"
                    >
                      <div className="flex items-center gap-3">
                        <img src={w.avatar} alt="avatar" className="w-10 h-10 rounded-full border border-zinc-800" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-bold text-xs text-zinc-200 truncate">{w.name}</h5>
                            {w.isVerified && <span className="w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center text-[7px] text-white">✓</span>}
                          </div>
                          <span className="text-[10px] text-zinc-400 capitalize block mt-0.5">{w.skills?.join(', ')}</span>
                          <span className="text-[9px] text-amber-400 font-semibold flex items-center gap-0.5 mt-1 bg-amber-500/5 px-1.5 py-0.5 rounded-md w-fit">
                            <Star size={8} fill="currentColor" /> Trust Score: {w.trustScore}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-900/60 text-center">
                        <button
                          onClick={() => handleContactWorker(w._id)}
                          className="py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-[10px] font-semibold cursor-pointer"
                        >
                          Message
                        </button>
                        <button
                          onClick={() => handleTriggerDirectHire(w)}
                          className="py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Hire Directly
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Map panel */}
              <div className="lg:col-span-2 h-[500px]">
                <MapComponent center={selectedMapCenter} zoom={13} markers={mapMarkers} />
              </div>

            </div>
          </div>
        )}

        {/* SERVICE REQUESTS SECTION */}
        {activeSection === 'service-requests' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Domestic Tasks & Service Requests</h2>
              <p className="text-xs text-zinc-500 mt-1">Create requests for plumbing, cleaning, or electrical repair jobs, and review worker bids.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Requests lists pane */}
              <div className="glass-card rounded-2xl p-4 divide-y divide-zinc-800/40 space-y-1">
                <div className="flex justify-between items-center pb-3 px-1">
                  <h3 className="font-bold text-xs text-zinc-300">My Posted Tasks</h3>
                  <button 
                    onClick={() => setSelectedRequest(null)}
                    className="text-[10px] text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <PlusCircle size={10} /> Create New
                  </button>
                </div>
                {requests.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs">No requests posted yet</div>
                ) : (
                  requests.map((r) => (
                    <button
                      key={r._id}
                      onClick={() => handleSelectRequest(r)}
                      className={`w-full text-left p-3.5 rounded-xl transition duration-150 border cursor-pointer mt-1 ${selectedRequest?._id === r._id ? 'bg-indigo-600/10 border-indigo-500/20' : 'border-transparent hover:bg-zinc-900/40'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md capitalize">{r.category}</span>
                        <span className={`w-2 h-2 rounded-full ${r.status === 'open' ? 'bg-emerald-500' : 'bg-zinc-500'}`}></span>
                      </div>
                      <h4 className="font-bold text-xs text-zinc-200 mt-2 truncate">{r.title}</h4>
                      <div className="flex justify-between items-center text-[9px] text-zinc-500 mt-2 font-medium">
                        <span>Budget: Rs.{r.budget}</span>
                        <span>Date: {r.startDate}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Workspace display */}
              <div className="lg:col-span-2">
                {selectedRequest ? (
                  <div className="glass-card p-6 rounded-2xl space-y-6">
                    <div className="border-b border-zinc-850 pb-3 flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-zinc-100">{selectedRequest.title}</h3>
                        <p className="text-[9px] text-zinc-500 mt-1 capitalize">Category: {selectedRequest.category} &bull; Budget: Rs.{selectedRequest.budget}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-indigo-500/10 text-indigo-400`}>
                        {selectedRequest.status}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-xs text-zinc-300">Labourer Applications & Bids</h4>
                      {bids.length === 0 ? (
                        <div className="text-center py-10 text-zinc-500 text-xs">Waiting for worker bids...</div>
                      ) : (
                        <div className="space-y-3">
                          {bids.map((bid) => (
                            <div key={bid._id} className="p-4 rounded-xl bg-zinc-950/30 border border-zinc-800/80 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <img src={bid.labour?.avatar} alt="avatar" className="w-9 h-9 rounded-full border border-zinc-800" />
                                <div>
                                  <h5 className="font-semibold text-zinc-200 text-xs">{bid.labour?.name}</h5>
                                  <p className="text-[10px] text-zinc-500 mt-0.5">Exp: {bid.labour?.experience} yrs &bull; Rate: Rs.{bid.labour?.expectedWage}/day</p>
                                  <p className="text-zinc-400 text-[10px] italic mt-1.5 leading-normal bg-zinc-950/40 p-2 rounded-lg">"{bid.coverLetter}"</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {bid.status === 'pending' ? (
                                  <>
                                    <button
                                      onClick={() => handleUpdateBid(bid._id, 'rejected')}
                                      className="p-1 rounded-lg border border-red-500/20 text-red-400 text-[10px]"
                                    >
                                      Decline
                                    </button>
                                    <button
                                      onClick={() => handleUpdateBid(bid._id, 'accepted')}
                                      className="py-1 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px]"
                                    >
                                      Hire
                                    </button>
                                  </>
                                ) : (
                                  <span className={`text-[10px] font-bold uppercase ${bid.status === 'accepted' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {bid.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Post Request Form
                  <div className="glass-card p-6 rounded-2xl space-y-4">
                    <h3 className="font-bold text-sm text-zinc-200">Post Task Requirement</h3>
                    <form onSubmit={handleCreateRequest} className="space-y-4">
                      {formError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
                          <AlertCircle size={14} /> <span>{formError}</span>
                        </div>
                      )}
                      {formSuccess && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                          <CheckCircle2 size={14} /> <span>{formSuccess}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-zinc-400">Task Title</label>
                          <input
                            type="text"
                            placeholder="e.g. Geyser leaking in washroom"
                            value={reqTitle}
                            onChange={e => setReqTitle(e.target.value)}
                            className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-zinc-400">Speciality Specialty Category</label>
                          <select
                            value={reqCategory}
                            onChange={e => setReqCategory(e.target.value)}
                            className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white"
                          >
                            <option value="electrician">Electrician</option>
                            <option value="plumber">Plumber</option>
                            <option value="painter">Painter</option>
                            <option value="carpenter">Carpenter</option>
                            <option value="mason">Mason / Builder</option>
                            <option value="driver">Driver</option>
                            <option value="mechanic">Mechanic</option>
                            <option value="cleaner">Cleaner</option>
                            <option value="technician">AC & Fridge Repair</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-400">Willing to Pay (Rs. Fixed Cost)</label>
                        <input
                          type="number"
                          placeholder="e.g. 500"
                          value={reqBudget}
                          onChange={e => setReqBudget(e.target.value)}
                          className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-400">Home Address</label>
                        <input
                          type="text"
                          placeholder="e.g. Bandra West, Mumbai"
                          value={reqAddress}
                          onChange={e => setReqAddress(e.target.value)}
                          className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-400">Requirement description</label>
                        <textarea
                          placeholder="Please describe the repair issue in detail..."
                          value={reqDesc}
                          onChange={e => setReqDesc(e.target.value)}
                          rows={3}
                          className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs uppercase cursor-pointer"
                      >
                        Publish Home Request
                      </button>
                    </form>
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
              <p className="text-xs text-zinc-500 mt-1">Direct message exchange with labourers and contractors.</p>
            </div>
            <ChatBox />
          </div>
        )}

        {/* WALLET SECTION */}
        {activeSection === 'wallet' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Payments Wallet</h2>
              <p className="text-xs text-zinc-500 mt-1">Check balances and audit transaction logs.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="glass-card p-6 rounded-2xl flex flex-col justify-between h-[150px] sm:col-span-1">
                <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Available Funds</h4>
                <p className="text-3xl font-extrabold text-indigo-400">Rs. {wallet.balance}</p>
                <button
                  onClick={async () => {
                    if (token) {
                      await fetch('http://localhost:5000/api/users/profile', {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          $inc: { balance: 2000 }
                        })
                      });
                      alert('Rs. 2000 mock funds deposited!');
                      fetchWallet();
                    }
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-xs cursor-pointer"
                >
                  Deposit Rs. 2000 (Mock)
                </button>
              </div>

              <div className="glass-card p-6 rounded-2xl sm:col-span-2 space-y-4">
                <h3 className="font-bold text-sm text-zinc-200">Transactions Ledger</h3>
                <div className="max-h-[200px] overflow-y-auto space-y-3 pr-1 text-xs">
                  {wallet.transactions?.length === 0 ? (
                    <div className="text-center text-zinc-500 py-10">No payments recorded yet</div>
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
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Citizen Settings</h2>
              <p className="text-xs text-zinc-500 mt-1">Configure communication numbers and residential location addresses.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="glass-card p-6 rounded-2xl space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Mobile Contact Number</label>
                <input
                  type="text"
                  value={profileMobile}
                  onChange={e => setProfileMobile(e.target.value)}
                  className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Residential City Address</label>
                <input
                  type="text"
                  value={profileAddress}
                  onChange={e => setProfileAddress(e.target.value)}
                  className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-md transition"
              >
                Save Settings
              </button>
            </form>
          </div>
        )}

      </main>

      {/* DIRECT HIRE DIALOG MODAL OVERLAY */}
      <AnimatePresence>
        {directHireModalOpen && hiringTarget && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#18181b] border border-zinc-800 p-6 rounded-2xl text-left shadow-2xl space-y-4"
            >
              {!hireSuccess ? (
                <>
                  <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
                    <Sparkles className="text-indigo-400" size={24} />
                    <h3 className="font-bold text-base text-zinc-100">Directly Hire Skilled Worker</h3>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Worker Selected:</span>
                      <strong className="text-zinc-200">{hiringTarget.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Speciality:</span>
                      <strong className="text-zinc-200 capitalize">{hiringTarget.skills?.join(', ')}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Suggested Daily Rate:</span>
                      <strong className="text-zinc-200">Rs. {hiringTarget.expectedWage}/day</strong>
                    </div>
                  </div>

                  <form onSubmit={handleConfirmDirectHire} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-400">Offer Budget Amount (Rs. Fixed)</label>
                      <input
                        type="number"
                        value={hireBudget}
                        onChange={e => setHireBudget(e.target.value)}
                        className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-400">Work Details / Description</label>
                      <textarea
                        required
                        value={hireDesc}
                        onChange={e => setHireDesc(e.target.value)}
                        rows={3}
                        className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg py-2.5 px-3.5 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDirectHireModalOpen(false)}
                        className="py-2.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-400 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer flex items-center justify-center"
                      >
                        {loading ? <span className="w-3.5 h-3.5 border border-t-white border-indigo-400 rounded-full animate-spin"></span> : 'Send Direct Offer'}
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
                    <h3 className="font-bold text-lg text-white">Direct Offer Sent & Accepted!</h3>
                    <p className="text-xs text-zinc-500 mt-1">Direct job request registered and worker has been hired.</p>
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
