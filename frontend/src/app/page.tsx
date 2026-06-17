"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { toggleTheme, setLanguage } from '../store/authSlice';
import { getTranslation } from '../utils/translations';
import { 
  Search, Sun, Moon, Languages, Shield, CheckCircle2, MessageSquare, 
  MapPin, Clock, Award, Star, BookOpen, Users, HelpCircle, ArrowRight, Wrench, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { theme, language, user } = useSelector((state: RootState) => state.auth);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visibleStats, setVisibleStats] = useState({ workers: 1240, jobs: 480, earnings: 1450000 });

  // Simulate updating counters
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleStats(prev => ({
        workers: prev.workers + Math.floor(Math.random() * 2),
        jobs: prev.jobs + Math.floor(Math.random() * 2),
        earnings: prev.earnings + Math.floor(Math.random() * 200)
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/auth?role=common&search=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push('/auth');
    }
  };

  const categories = [
    { key: 'electrician', icon: Wrench, count: 124 },
    { key: 'plumber', icon: Wrench, count: 98 },
    { key: 'painter', icon: Wrench, count: 145 },
    { key: 'carpenter', icon: Wrench, count: 76 },
    { key: 'mason', icon: Wrench, count: 182 },
    { key: 'welder', icon: Wrench, count: 54 },
    { key: 'driver', icon: Wrench, count: 110 },
    { key: 'mechanic', icon: Wrench, count: 87 },
    { key: 'cleaner', icon: Wrench, count: 130 },
    { key: 'technician', icon: Wrench, count: 65 }
  ];

  const t = (key: any) => getTranslation(key, language);

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'hi' : language === 'hi' ? 'mr' : 'en';
    dispatch(setLanguage(nextLang));
  };

  const faqs = [
    {
      q: language === 'en' ? "How does the platform ensure safety?" : language === 'hi' ? "प्लेटफ़ॉर्म सुरक्षा कैसे सुनिश्चित करता है?" : "प्लॅटफॉर्म सुरक्षिततेची खात्री कशी देतो?",
      a: language === 'en' ? "We perform verification checks on certificates and issue 'Verification Badges'. Users also build trust scores based on reviews." : language === 'hi' ? "हम प्रमाणपत्रों पर सत्यापन जांच करते हैं और 'सत्यापन बैज' जारी करते हैं। उपयोगकर्ता समीक्षाओं के आधार पर ट्रस्ट स्कोर भी बनाते हैं।" : "आम्ही प्रमाणपत्रांची पडताळणी करतो आणि 'व्हेरिफिकेशन बॅज' जारी करतो. युजर्स रिव्ह्यूच्या आधारे ट्रस्ट स्कोर तयार करतात."
    },
    {
      q: language === 'en' ? "Is there a service fee for labourers?" : language === 'hi' ? "क्या श्रमिकों के लिए कोई सेवा शुल्क है?" : "कामगारांसाठी काही सेवा शुल्क आहे का?",
      a: language === 'en' ? "No, the platform is free for labourers. Employers can hire without any hidden middleman commission cuts." : language === 'hi' ? "नहीं, मंच श्रमिकों के लिए मुफ्त है। नियोक्ता बिना किसी छिपे हुए बिचौलिये के कमीशन के काम पर रख सकते हैं।" : "नाही, कामगारांसाठी हे मोफत आहे. कंत्राटदार कोणत्याही दलालीशिवाय थेट कामावर ठेवू शकतात."
    },
    {
      q: language === 'en' ? "How does QR attendance work?" : language === 'hi' ? "क्यूआर उपस्थिति कैसे काम करती है?" : "क्यूआर हजेरी कशी काम करते?",
      a: language === 'en' ? "Labourers generate a check-in QR code on their dashboard. Employers scan this to verify logs, clocking in check-in/out times." : language === 'hi' ? "श्रमिक अपने डैशबोर्ड पर एक चेक-इन क्यूआर कोड जेनरेट करते हैं। नियोक्ता लॉग सत्यापित करने के लिए इसे स्कैन करते हैं।" : "कामगार त्यांच्या डॅशबोर्डवर क्यूआर कोड तयार करतात. कंत्राटदार हजेरीची पडताळणी करण्यासाठी हा कोड स्कॅन करतात."
    }
  ];

  return (
    <div className={`min-h-screen ${theme}`}>
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-zinc-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
              <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
                S
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                SHRAMIK
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-zinc-300 hover:text-zinc-50 transition">{t('features')}</a>
              <a href="#categories" className="text-zinc-300 hover:text-zinc-50 transition">{t('categories')}</a>
              <a href="#testimonials" className="text-zinc-300 hover:text-zinc-50 transition">{t('testimonials')}</a>
              <a href="#faqs" className="text-zinc-300 hover:text-zinc-50 transition">{t('faqs')}</a>

              {/* Language Switcher */}
              <button 
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 text-zinc-300 hover:text-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 transition cursor-pointer"
              >
                <Languages size={15} />
                <span className="text-xs font-semibold uppercase">{language}</span>
              </button>

              {/* Auth Buttons */}
              {user ? (
                <button 
                  onClick={() => router.push(`/dashboard/${user.role}`)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer shadow-lg shadow-indigo-500/25"
                >
                  {t('dashboard')}
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => router.push('/auth')}
                    className="text-zinc-300 hover:text-zinc-50 text-sm font-semibold cursor-pointer"
                  >
                    {t('login')}
                  </button>
                  <button 
                    onClick={() => router.push('/auth?register=true')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer shadow-lg shadow-indigo-500/20"
                  >
                    {t('getStarted')}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-3">
              <button onClick={toggleLanguage} className="p-1.5 text-zinc-300 border border-zinc-800 rounded-lg">
                <Languages size={16} />
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1.5 text-zinc-300 border border-zinc-800 rounded-lg">
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden glass-panel border-b border-zinc-800 px-4 pt-2 pb-4 space-y-2 flex flex-col"
            >
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-zinc-300 py-2">{t('features')}</a>
              <a href="#categories" onClick={() => setMobileMenuOpen(false)} className="text-zinc-300 py-2">{t('categories')}</a>
              <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="text-zinc-300 py-2">{t('testimonials')}</a>
              <a href="#faqs" onClick={() => setMobileMenuOpen(false)} className="text-zinc-300 py-2">{t('faqs')}</a>
              {user ? (
                <button 
                  onClick={() => { setMobileMenuOpen(false); router.push(`/dashboard/${user.role}`); }}
                  className="bg-indigo-600 text-white w-full py-2 rounded-lg font-semibold"
                >
                  {t('dashboard')}
                </button>
              ) : (
                <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
                  <button onClick={() => { setMobileMenuOpen(false); router.push('/auth'); }} className="text-zinc-300 w-full py-2 text-center">{t('login')}</button>
                  <button onClick={() => { setMobileMenuOpen(false); router.push('/auth?register=true'); }} className="bg-indigo-600 text-white w-full py-2 rounded-lg font-semibold">{t('getStarted')}</button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 px-4 sm:px-6 lg:px-8">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-6">
              <Shield size={12} /> Decentralized Workforce Empowerment
            </span>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              {t('heroTitle')}{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
                Without Middlemen
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-zinc-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              {t('subtitle')}
            </p>
          </motion.div>

          {/* Search bar */}
          <motion.form 
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto bg-zinc-900/60 p-2 rounded-2xl border border-zinc-800 backdrop-blur-md shadow-2xl"
          >
            <div className="flex-1 flex items-center px-3 gap-2">
              <Search className="text-zinc-500" size={20} />
              <input 
                type="text" 
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-white placeholder-zinc-500 text-sm"
              />
            </div>
            <button 
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition shadow-lg shadow-indigo-500/25 cursor-pointer flex items-center justify-center gap-1"
            >
              Search <ArrowRight size={16} />
            </button>
          </motion.form>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-zinc-800 bg-zinc-950/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-size-3 grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-4">
              <h3 className="text-4xl font-extrabold text-indigo-400">{visibleStats.workers.toLocaleString()}+</h3>
              <p className="text-sm text-zinc-500 mt-1 uppercase font-semibold tracking-wider">Verified Labourers</p>
            </div>
            <div className="p-4 border-y md:border-y-0 md:border-x border-zinc-800">
              <h3 className="text-4xl font-extrabold text-purple-400">{visibleStats.jobs.toLocaleString()}+</h3>
              <p className="text-sm text-zinc-500 mt-1 uppercase font-semibold tracking-wider">Active Jobs Posted</p>
            </div>
            <div className="p-4">
              <h3 className="text-4xl font-extrabold text-emerald-400">Rs. {(visibleStats.earnings / 100000).toFixed(1)}L+</h3>
              <p className="text-sm text-zinc-500 mt-1 uppercase font-semibold tracking-wider">Wages Distributed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">{t('features')}</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">Modern workflows designed to bridge networking transparency and payment convenience.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-8 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">AI Worker Matching</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Our matching engine scores workers based on coordinates distance, wage rates, stars ratings, and verification credentials.</p>
          </div>
          <div className="glass-card p-8 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
              <Clock size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">QR Attendance Logging</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Secured daily clock-ins and clock-outs verified by location-fenced QR scanner tools to track working hours.</p>
          </div>
          <div className="glass-card p-8 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Instant Peer-to-Peer Chat</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Direct messaging channels with real-time sockets to connect employers, labourers, and home owners directly.</p>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section id="categories" className="py-20 bg-zinc-950/20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">{t('categories')}</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">Hire pre-vetted professionals matching over 15+ micro-specialties.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {categories.map((cat, index) => (
              <div 
                key={index}
                onClick={() => router.push(`/auth?role=common&category=${cat.key}`)}
                className="glass-card p-6 rounded-xl text-center cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <cat.icon size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-zinc-200">{t(cat.key as any)}</h4>
                  <span className="text-[10px] text-zinc-500">{cat.count} Workers</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">{t('testimonials')}</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">Hear from contractors and daily-wage labourers who converted to Shramik.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-card p-8 rounded-2xl relative">
            <div className="flex items-center gap-1 text-amber-400 mb-4">
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed mb-6">
              "Finding masons and carpenters for our metro construction projects used to take days. With Shramik, I post requirements and match with 95%+ compatibility scorers within minutes. Truly revolutionary!"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-700 font-bold flex items-center justify-center text-xs text-white">RK</div>
              <div>
                <h5 className="font-semibold text-sm">Rajesh Kulkarni</h5>
                <span className="text-[10px] text-zinc-500">Contractor, Kulkarni Infra Group</span>
              </div>
            </div>
          </div>
          <div className="glass-card p-8 rounded-2xl relative">
            <div className="flex items-center gap-1 text-amber-400 mb-4">
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed mb-6">
              "I used to stand in the local labour market (naka) every morning waiting for work. Now, jobs come to my phone. I check-in via QR, work, and get paid instantly in my wallet. My income has doubled."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-700 font-bold flex items-center justify-center text-xs text-white">SP</div>
              <div>
                <h5 className="font-semibold text-sm">Sanjay Patil</h5>
                <span className="text-[10px] text-zinc-500">Certified Electrician, Mumbai</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faqs" className="py-24 bg-zinc-950/20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">{t('faqs')}</h2>
            <p className="text-zinc-400">Everything you need to know about the platform.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="glass-card rounded-xl overflow-hidden border border-zinc-800 transition-colors duration-150"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left font-bold text-sm text-zinc-200 focus:outline-none"
                >
                  <span>{faq.q}</span>
                  <HelpCircle size={16} className={`text-zinc-400 transition-transform ${activeFaq === index ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-zinc-800/40 bg-zinc-900/20 text-xs text-zinc-400 leading-relaxed p-5"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-6">
          <div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              SHRAMIK
            </span>
            <p className="text-xs text-zinc-500 mt-1">&copy; {new Date().getFullYear()} Shramik Tech. All rights reserved.</p>
          </div>
          <div className="flex gap-6 text-xs text-zinc-400">
            <a href="#" className="hover:text-zinc-50 transition">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-50 transition">Terms of Service</a>
            <a href="#" className="hover:text-zinc-50 transition">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
