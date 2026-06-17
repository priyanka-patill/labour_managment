"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { DashboardSidebar } from '../../../components/DashboardSidebar';
import { 
  Users, Briefcase, Wallet, ShieldAlert, CheckCircle, Trash2, 
  Award, AlertTriangle, ShieldCheck, ArrowLeft, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, token } = useSelector((state: RootState) => state.auth);

  const [activeSection, setActiveSection] = useState('overview');
  const [stats, setStats] = useState<any>({
    users: { total: 0, employers: 0, labourers: 0, common: 0 },
    jobs: { total: 0, open: 0, inProgress: 0, completed: 0 },
    transactions: { count: 0, volume: 0 },
    complaints: { total: 0, pending: 0 }
  });
  const [complaints, setComplaints] = useState<any[]>([]);
  const [userList, setUserList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Fetch stats
      const statsRes = await fetch('http://localhost:5000/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (!statsData.error) setStats(statsData);

      // 2. Fetch complaints
      const compRes = await fetch('http://localhost:5000/api/admin/complaints', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const compData = await compRes.json();
      if (Array.isArray(compData)) setComplaints(compData);

      // 3. Fetch all users
      // In a real app we would have an admin user query endpoint. Since getWorkers gives labourers, we can query it and mock get all users
      const workersRes = await fetch('http://localhost:5000/api/users/workers?search=');
      const workers = await workersRes.json();
      
      // Let's mock a combination of workers and test contractors
      const mockContractors = [
        { _id: 'employer-1', name: 'Rajesh Kulkarni', email: 'rajesh@kulkarniinfra.com', role: 'employer', companyName: 'Kulkarni Infra', projectsCompleted: 12, trustScore: 95 },
        { _id: 'employer-2', name: 'Anil Deshmukh', email: 'anil@deshmukhbuild.com', role: 'employer', companyName: 'Deshmukh Builders', projectsCompleted: 4, trustScore: 82 }
      ];

      setUserList([
        ...(Array.isArray(workers) ? workers : []),
        ...mockContractors
      ]);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !user) {
      router.push('/auth');
      return;
    }
    // Check admin email authorization or role
    if (user.email !== 'admin@shramik.com' && user.role !== 'admin') {
      router.push(`/dashboard/${user.role}`);
      return;
    }

    fetchData();
  }, [token, user]);

  // Toggle verify badge status
  const handleToggleVerify = async (userId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/verify`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.error) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Ban user account
  const handleBanUser = async (userId: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to ban and delete this user?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.error) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Resolve complaint
  const handleResolveComplaint = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/complaints/${id}/resolve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.error) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-zinc-900">
      
      {/* Adapts sidebar to Admin */}
      <DashboardSidebar activeSection={activeSection} setActiveSection={setActiveSection} />

      <main className="flex-grow p-4 sm:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Shramik Admin Panel</h2>
            <p className="text-xs text-zinc-500 mt-1">Audit verification badges, inspect payments volume, and resolve complaint tickets.</p>
          </div>
          <button
            onClick={fetchData}
            className="p-2 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="text-xs font-semibold">Reload</span>
          </button>
        </div>

        {/* Analytic Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <h4 className="text-[11px] text-zinc-500 font-semibold uppercase">Total Users</h4>
              <p className="text-xl font-bold text-zinc-100 mt-1">{stats.users.total}</p>
            </div>
          </div>
          <div className="glass-card p-6 rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Briefcase size={20} />
            </div>
            <div>
              <h4 className="text-[11px] text-zinc-500 font-semibold uppercase">Total Contracts</h4>
              <p className="text-xl font-bold text-zinc-100 mt-1">{stats.jobs.total}</p>
            </div>
          </div>
          <div className="glass-card p-6 rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <div>
              <h4 className="text-[11px] text-zinc-500 font-semibold uppercase">Payments Volume</h4>
              <p className="text-xl font-bold text-zinc-100 mt-1">Rs. {stats.transactions.volume}</p>
            </div>
          </div>
          <div className="glass-card p-6 rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h4 className="text-[11px] text-zinc-500 font-semibold uppercase">Complaints</h4>
              <p className="text-xl font-bold text-zinc-100 mt-1">{stats.complaints.pending} Pending</p>
            </div>
          </div>
        </div>

        {/* User Management Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* User management list */}
          <div className="glass-card p-6 rounded-2xl lg:col-span-2 space-y-4">
            <h3 className="font-bold text-sm text-zinc-200">Account Moderation Sheet</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 font-semibold uppercase text-[10px]">
                    <th className="pb-3">Name / Email</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3 text-center">Verified Badge</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {userList.map((usr) => (
                    <tr key={usr._id} className="text-zinc-300">
                      <td className="py-3">
                        <div className="font-bold text-zinc-200">{usr.name}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{usr.email}</div>
                      </td>
                      <td className="py-3 capitalize font-semibold">{usr.role}</td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => handleToggleVerify(usr._id)}
                          className={`px-2.5 py-1 rounded-md font-bold text-[9px] cursor-pointer transition ${usr.isVerified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/40'}`}
                        >
                          {usr.isVerified ? 'Verified' : 'Unverified'}
                        </button>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleBanUser(usr._id)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg cursor-pointer transition"
                          title="Ban Account"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Complaints lists panel */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-sm text-zinc-200">Complaint Tickets ({complaints.length})</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {complaints.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-xs">No complaint tickets logged</div>
              ) : (
                complaints.map((c) => (
                  <div key={c._id} className="p-3.5 rounded-xl border border-zinc-850 bg-zinc-950/20 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-zinc-200">{c.subject}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${c.status === 'pending' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-normal">{c.description}</p>
                    <div className="text-[9px] text-zinc-500">
                      From: {c.fromUser?.name || 'User'} &bull; Target: {c.reportedUser?.name || 'N/A'}
                    </div>
                    {c.status === 'pending' && (
                      <button
                        onClick={() => handleResolveComplaint(c._id)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-[10px] cursor-pointer mt-1"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>

    </div>
  );
}
