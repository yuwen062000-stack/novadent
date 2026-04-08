import React, { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked'; // Markdown → HTML 轉換（用於服務條款、隱私權政策）
import {
  Activity, Plus, ClipboardList, CheckCircle2, Clock, Building2, Microscope, Settings,
  ChevronRight, Camera, MapPin, Search, ArrowRight, ShieldCheck, FileText, Users,
  LayoutDashboard, BookOpen, Info, Phone, LogIn, Calendar, User, ArrowUpRight,
  Stethoscope, HeartPulse, UserPlus, Lock, Mail, MapPinned, Star, Check, X, Menu,
  Gift, Bell, BriefcaseMedical, ChevronDown, Image, Video as VideoIcon, LogOut,
  Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { CaseStatus, UserRole, Case, STATUS_LABELS, STATUS_COLORS, Article, ARTICLE_CATEGORIES, Clinic, Lab, SubAccount, MfgStep, CaseType, Consultation, CASE_TYPE_LABELS, PartnerStatus, Member, HomeConfig, AuthUser } from './types';

// ── M-01 Auth 模組 ─────────────────────────────────────────
import { ToastContainer } from './components/shared';
import { LoginPage as NewLoginPage } from './components/auth/LoginPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { ForceChangePasswordPage } from './components/auth/ForceChangePasswordPage';
import { RegisterPage as RegisterPageComponent } from './components/auth/RegisterPage';
import { getCurrentUser, logout, register as authRegister, refreshAccessToken, apiFetch, changePassword } from './services/authService';
const authService = { register: authRegister };

// ── Admin Pages ────────────────────────────────────────────
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminClinics } from './pages/admin/AdminClinics';
import { AdminLabs } from './pages/admin/AdminLabs';
import { AdminPartnerLinks } from './pages/admin/AdminPartnerLinks';
import { AdminArticles } from './pages/admin/AdminArticles';
import { AdminNotificationCMS } from './pages/admin/AdminNotificationCMS';
import { AdminSiteImages } from './pages/admin/AdminSiteImages';
import { AdminVideos } from './pages/admin/AdminVideos';
// ── SuperAdmin Pages ───────────────────────────────────────
import { SuperAuditLogs } from './pages/super/SuperAuditLogs';
import { SuperSystemSettings } from './pages/super/SuperSystemSettings';
import { SuperQAQuestions } from './pages/super/SuperQAQuestions';
import { SuperMfgTemplates } from './pages/super/SuperMfgTemplates';
import { SuperMenuManager } from './pages/super/SuperMenuManager';
import { SuperTagsManager } from './pages/super/SuperTagsManager';
// ── Member Pages ───────────────────────────────────────────
import { MemberQAWizard } from './pages/member/MemberQAWizard';
import { MemberRecommendations } from './pages/member/MemberRecommendations';
import { MemberCaseTracking } from './pages/member/MemberCaseTracking';
// ── Clinic Pages ───────────────────────────────────────────
import { ClinicCaseList } from './pages/clinic/ClinicCaseList';
import { ClinicCreateCase } from './pages/clinic/ClinicCreateCase';
import { ClinicCaseDetail } from './pages/clinic/ClinicCaseDetail';
import { ClinicPartnerLabs } from './pages/clinic/ClinicPartnerLabs';
// ── Lab Pages ──────────────────────────────────────────────
import { LabCaseList } from './pages/lab/LabCaseList';
import { LabCaseDetail } from './pages/lab/LabCaseDetail';
import { LabPartnerClinics } from './pages/lab/LabPartnerClinics';
// ── Shared Pages ───────────────────────────────────────────
import { MemberSettings } from './pages/member/MemberSettings';
import { NotificationsPage } from './pages/shared/NotificationsPage';
import { AccountMgmtPage } from './pages/shared/AccountMgmtPage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <AppContent />
    </BrowserRouter>
  );
}

const NavItem = React.memo(({ icon, label, active, onClick, badge }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative ${
      active ? 'bg-navy-700 text-white shadow-lg shadow-blue-950/20' : 'hover:bg-blue-900 hover:text-white'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
    {badge && <div className="absolute right-4 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
  </button>
));

const NavGroup = React.memo(({ icon, label, active, children }: { icon: React.ReactNode; label: string; active: boolean; children: React.ReactNode }) => {
  const [open, setOpen] = useState(active);
  useEffect(() => { if (active) setOpen(true); }, [active]);
  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'text-white' : 'hover:bg-blue-900 hover:text-white'}`}>
        {icon}
        <span className="font-medium flex-1 text-left">{label}</span>
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="ml-4 pl-2 border-l border-blue-800/50 space-y-0.5 mt-0.5">{children}</div>}
    </div>
  );
});

const FeatureCard = React.memo(({ icon, title, desc }: any) => (
  <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all">
    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-8">{icon}</div>
    <h3 className="text-2xl font-bold text-slate-900 mb-4">{title}</h3>
    <p className="text-slate-500 leading-relaxed">{desc}</p>
  </div>
));

// 前台 Header 預設選單（API 讀取失敗時的 fallback）
const DEFAULT_NAV_ITEMS = [
  { label: '首頁',        path: '/' },
  { label: '關於我們與服務', path: '/about' },
  { label: '衛教中心',    path: '/education' },
  { label: '影音專區',    path: '/videos' },
  { label: '合作診所',    path: '/clinics' },
  { label: '合作牙技所',  path: '/labs' },
];

const PublicHeader = React.memo(() => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // 從後台選單管理動態讀取（menuType='PUBLIC'，showInNav=true 或無此欄位時預設顯示）
  const [navItems, setNavItems] = useState<{label:string;path:string}[]>(DEFAULT_NAV_ITEMS);

  useEffect(() => {
    fetch('/api/admin/menu-public')
      .then(r => r.ok ? r.json() : null)
      .then((items: any[] | null) => {
        if (!Array.isArray(items) || items.length === 0) return; // API 無資料時保留預設
        // showInNav 欄位不存在時視為 true（向後相容）
        const navList = items
          .filter((i: any) => i.showInNav !== false && i.show_in_nav !== false)
          .map((i: any) => ({ label: i.label, path: i.path }));
        if (navList.length > 0) setNavItems(navList);
      })
      .catch(() => {}); // 失敗時保留預設選單
  }, []);

  const linkCls = (path: string) =>
    `text-sm font-bold ${location.pathname === path ? 'text-blue-800' : 'text-slate-600 hover:text-blue-800'}`;

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 cursor-pointer">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-800 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-blue-800/20">
            <Activity className="text-white w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span className="font-bold text-xl sm:text-2xl text-slate-900 tracking-tight">Novadent</span>
        </Link>
        {/* 桌機導覽列：從後台選單管理動態讀取 */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item, i) => (
            <Link key={i} to={item.path} className={linkCls(item.path)}>{item.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <Link to="/login" className="text-sm font-bold text-blue-800 px-4 py-2 hover:bg-blue-50 rounded-xl transition-colors">登入</Link>
            <Link to="/register" className="bg-navy-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-950 transition-all">立即註冊</Link>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-white border-b border-slate-100 overflow-hidden">
            <div className="px-4 py-6 space-y-4">
              {/* 手機漢堡選單：同樣動態讀取 */}
              {navItems.map((item, i) => (
                <Link key={i} to={item.path} onClick={() => setIsMenuOpen(false)}
                  className="block w-full text-left px-4 py-2 text-base font-bold text-slate-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-all">
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="w-full py-3 text-center text-sm font-bold text-blue-800 border border-blue-100 rounded-xl hover:bg-blue-50 transition-all">登入</Link>
                <Link to="/register" onClick={() => setIsMenuOpen(false)} className="w-full py-3 text-center text-sm font-bold text-white bg-navy-700 rounded-xl shadow-lg shadow-blue-900/20 hover:bg-blue-950 transition-all">立即註冊</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
});

const PublicFooter = React.memo(({ footerContacts, quickLinks }: {
  footerContacts: Record<string, string>;
  quickLinks: { label: string; path: string }[];
}) => (
  <footer className="bg-blue-950 text-slate-400 py-16">
    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
      <div className="col-span-1 md:col-span-1">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="text-blue-700 w-6 h-6" />
          <span className="font-bold text-xl text-white">Novadent</span>
        </div>
        <p className="text-sm leading-relaxed">專業假牙製作透明化平台，連結診所、牙技所與會員，建立醫療信任新標準。</p>
      </div>
      <div>
        <h4 className="text-white font-bold mb-6">快速連結</h4>
        <ul className="space-y-4 text-sm">
          {/* 從選單管理的 show_in_footer=true 動態讀取，無資料時顯示預設連結 */}
          {(quickLinks.length > 0 ? quickLinks : [
            { label: '關於我們', path: '/about' },
            { label: '衛教中心', path: '/knowledge' },
            { label: '影音專區', path: '/videos' },
          ]).map((link, i) => (
            <li key={i}><Link to={link.path} className="hover:text-blue-500">{link.label}</Link></li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="text-white font-bold mb-6">平台說明</h4>
        <ul className="space-y-4 text-sm">
          <li><Link to="/terms" className="hover:text-blue-500">服務條款</Link></li>
          <li><Link to="/privacy" className="hover:text-blue-500">隱私權政策</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="text-white font-bold mb-6">聯絡我們</h4>
        <ul className="space-y-4 text-sm">
          {(footerContacts.CONTACT_PHONE || '02-2345-6789') && (
            <li className="flex items-center gap-2"><Phone size={16} /> {footerContacts.CONTACT_PHONE || '02-2345-6789'}</li>
          )}
          {footerContacts.CONTACT_EMAIL && (
            <li className="flex items-center gap-2"><Mail size={16} /> {footerContacts.CONTACT_EMAIL}</li>
          )}
          {(footerContacts.CONTACT_ADDRESS || '台北市信義區信義路五段') && (
            <li className="flex items-center gap-2"><MapPin size={16} /> {footerContacts.CONTACT_ADDRESS || '台北市信義區信義路五段'}</li>
          )}
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-slate-800 text-center text-xs">
      &copy; 2026 Novadent. All rights reserved. 本平台不提供醫療診斷建議。
    </div>
  </footer>
));

interface HomePageProps {
  homeBanners: any[];
  heroBannerIndex: number;
  setHeroBannerIndex: (i: number) => void;
  homeConfig: HomeConfig;
  homeBottomImage: any;
}

const HomePage = React.memo(({ homeBanners, heroBannerIndex, setHeroBannerIndex, homeConfig, homeBottomImage }: HomePageProps) => (
  <div className="bg-white">
    <section className="relative py-12 sm:py-24 overflow-hidden">
      <div className="absolute top-0 right-0 w-full lg:w-1/2 h-full bg-blue-50/50 -skew-x-12 translate-x-1/4 -z-10"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <span className="inline-block px-4 py-1.5 bg-blue-100 text-blue-900 rounded-full text-[10px] sm:text-xs font-bold mb-6 uppercase tracking-widest">牙科製作透明化首選</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-tight mb-6 sm:mb-8">
            讓假牙製作過程<br />
            <span className="text-blue-800">清晰可見</span>，建立信任
          </h1>
          <p className="text-base sm:text-xl text-slate-600 mb-8 sm:mb-10 leading-relaxed">
            Novadent 連結病患、診所與牙技所，提供即時進度追蹤與專業衛教，讓您的假牙製作旅程不再充滿未知。
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/login" className="bg-navy-700 text-white px-8 sm:px-10 py-4 rounded-2xl font-bold text-base sm:text-lg shadow-xl shadow-blue-900/20 hover:bg-blue-950 transition-all flex items-center justify-center gap-2">
              立即開始 QA 諮詢 <ArrowRight size={20} />
            </Link>
            <Link to="/about" className="bg-white text-slate-700 border border-slate-200 px-8 sm:px-10 py-4 rounded-2xl font-bold text-base sm:text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
              了解服務流程
            </Link>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative">
          <div className="bg-white p-3 sm:p-4 rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden relative">
            {homeBanners.length > 0 ? (
              <>
                {homeBanners.map((b, i) => (
                  <img key={b.id} src={b.imageUrl} alt={b.altText || 'Banner'} className={`rounded-[1rem] sm:rounded-[1.5rem] w-full h-auto object-cover aspect-[4/3] transition-opacity duration-700 ${i === heroBannerIndex ? 'opacity-100' : 'opacity-0 absolute inset-0 p-3 sm:p-4'}`} referrerPolicy="no-referrer" />
                ))}
                {homeBanners.length > 1 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                    {homeBanners.map((_, i) => (
                      <button key={i} onClick={() => setHeroBannerIndex(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === heroBannerIndex ? 'bg-blue-800 scale-125' : 'bg-white/70'}`} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <img src={homeConfig.heroBannerUrl} alt="Dental Tech" className="rounded-[1rem] sm:rounded-[1.5rem] w-full h-auto object-cover aspect-[4/3]" referrerPolicy="no-referrer" />
            )}
          </div>
        </motion.div>
      </div>
    </section>
    <section className="py-16 sm:py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-20">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 sm:mb-6">為什麼選擇 Novadent？</h2>
          <p className="text-sm sm:text-lg text-slate-500">我們為牙科製作流程帶來前所未有的透明度與協作效率。</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          <FeatureCard icon={<ShieldCheck className="text-blue-800" size={32} />} title="專業信任" desc="所有合作診所與牙技所皆經過嚴格審核，確保醫療品質。" />
          <FeatureCard icon={<Clock className="text-blue-800" size={32} />} title="即時追蹤" desc="隨時隨地查看假牙製作進度，掌握每一個製程節點。" />
          <FeatureCard icon={<BookOpen className="text-blue-800" size={32} />} title="衛教知識" desc="提供專業的假牙護理與口腔健康知識，讓您更安心。" />
        </div>
        <div className="mt-20 pt-20 border-t border-slate-200">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-20">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 sm:mb-6">看懂牙科，從這裡開始</h2>
            <p className="text-sm sm:text-lg text-slate-500">專業知識影音，讓你輕鬆了解牙科</p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-200 overflow-hidden shadow-xl">
              <div className="grid grid-cols-1 lg:grid-cols-5">
                <div className="lg:col-span-3 aspect-video relative">
                  <iframe width="100%" height="100%" src="https://www.youtube.com/embed/VHqpMdA7fik" title="Novadent 平台介紹" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute inset-0"></iframe>
                </div>
                <div className="lg:col-span-2 p-8 sm:p-10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="bg-blue-50 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">平台介紹</span>
                      <span className="text-slate-400 text-xs font-medium">2026/03/17</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">Novadent 平台介紹</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">了解 Novadent 如何透過數位化平台，連結診所、牙技所與病患，建立透明且高效的牙科製作流程。</p>
                  </div>
                  <div className="mt-8 flex justify-end">
                    <Link to="/videos" className="text-blue-800 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">查看更多影片 <ChevronRight size={18} /></Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {homeBottomImage?.imageUrl && (
          <div className="mt-20 pt-20 border-t border-slate-200">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 sm:mb-6">臺灣牙科產業的現狀挑戰</h2>
            </div>
            <div className="flex justify-center">
              <img src={homeBottomImage.imageUrl} alt={homeBottomImage.altText || '臺灣牙科產業的現狀挑戰'} className="w-full rounded-2xl shadow-lg" referrerPolicy="no-referrer" />
            </div>
          </div>
        )}
      </div>
    </section>
  </div>
));

interface SidebarProps {
  role: string;
  view: string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (v: boolean) => void;
  handleSetView: (v: string) => void;
  currentUser: AuthUser | null;
  handleLogout: () => void;
  adminMenuLabels?: Record<string, string>; // 從 DB 選單設定動態讀取的路徑→名稱對應表
}

const Sidebar = React.memo(({ role, view, isMobileMenuOpen, setIsMobileMenuOpen, handleSetView, currentUser, handleLogout, adminMenuLabels = {} }: SidebarProps) => {
  const setViewAndClose = (v: string) => { handleSetView(v); setIsMobileMenuOpen(false); };
  const goHome = () => { setIsMobileMenuOpen(false); };
  // ml(path, fallback) — 從 DB 選單名稱取得顯示標籤，若尚未載入則使用預設值
  const ml = (path: string, fallback: string) => adminMenuLabels[path] || fallback;

  return (
    <>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-blue-950/60 backdrop-blur-sm z-50 md:hidden" />
        )}
      </AnimatePresence>
      <div className={`fixed md:sticky top-0 left-0 z-50 h-screen bg-blue-950 text-blue-200 flex flex-col shrink-0 transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full md:w-64'}`}>
        <div className="p-6 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-3 cursor-pointer" onClick={goHome}>
            <div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center">
              <Activity className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-white tracking-tight">Novadent</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 hover:bg-blue-900 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {role === 'INSURER' && (
            <>
              <NavItem icon={<LayoutDashboard size={20} />} label="總覽儀表板" active={view === 'OVERVIEW'} onClick={() => setViewAndClose('OVERVIEW')} />
              <NavItem icon={<Users size={20} />} label="客戶管理" active={view === 'INSURER_CUSTOMER_MGMT'} onClick={() => setViewAndClose('INSURER_CUSTOMER_MGMT')} />
            </>
          )}
          {role === 'ADMIN' && (
            <NavItem icon={<ClipboardList size={20} />} label="案件總覽" active={view === 'CASE_MANAGEMENT' || view === 'DETAIL'} onClick={() => setViewAndClose('CASE_MANAGEMENT')} />
          )}
          {role === 'CLINIC' && (
            <>
              <NavItem icon={<ClipboardList size={20} />} label="案件管理" active={view === 'CLINIC_CASES' || view === 'CLINIC_CASE_DETAIL'} onClick={() => setViewAndClose('CLINIC_CASES')} />
              <NavItem icon={<Plus size={20} />} label="新建案件" active={view === 'CLINIC_CREATE_CASE'} onClick={() => setViewAndClose('CLINIC_CREATE_CASE')} />
              <NavItem icon={<Building2 size={20} />} label="診所資料" active={view === 'CLINIC_PROFILE'} onClick={() => setViewAndClose('CLINIC_PROFILE')} />
              <NavItem icon={<Microscope size={20} />} label="合作牙技所" active={view === 'CLINIC_PARTNER_LABS'} onClick={() => setViewAndClose('CLINIC_PARTNER_LABS')} />
              <NavItem icon={<Users size={20} />} label="帳號管理" active={view === 'ACCOUNT_MGMT'} onClick={() => setViewAndClose('ACCOUNT_MGMT')} />
              <NavItem icon={<Settings size={20} />} label="帳號設定" active={view === 'ACCOUNT_SETTINGS'} onClick={() => setViewAndClose('ACCOUNT_SETTINGS')} />
            </>
          )}
          {role === 'LAB' && (
            <>
              <NavItem icon={<ClipboardList size={20} />} label="案件管理" active={view === 'LAB_CASES' || view === 'LAB_CASE_DETAIL'} onClick={() => setViewAndClose('LAB_CASES')} />
              <NavItem icon={<Microscope size={20} />} label="牙技所資料" active={view === 'LAB_PROFILE'} onClick={() => setViewAndClose('LAB_PROFILE')} />
              <NavItem icon={<Building2 size={20} />} label="合作診所" active={view === 'LAB_PARTNER_CLINICS'} onClick={() => setViewAndClose('LAB_PARTNER_CLINICS')} />
              <NavItem icon={<Users size={20} />} label="帳號管理" active={view === 'ACCOUNT_MGMT'} onClick={() => setViewAndClose('ACCOUNT_MGMT')} />
              <NavItem icon={<Settings size={20} />} label="帳號設定" active={view === 'ACCOUNT_SETTINGS'} onClick={() => setViewAndClose('ACCOUNT_SETTINGS')} />
            </>
          )}
          {role === 'MEMBER' && (
            <>
              <NavItem icon={<ClipboardList size={20} />} label="假牙問診" active={view === 'MEMBER_QA'} onClick={() => setViewAndClose('MEMBER_QA')} />
              <NavItem icon={<HeartPulse size={20} />} label="推薦診所" active={view === 'MEMBER_RECOMMENDATIONS'} onClick={() => setViewAndClose('MEMBER_RECOMMENDATIONS')} />
              <NavItem icon={<Activity size={20} />} label="案件追蹤" active={view === 'MEMBER_CASES'} onClick={() => setViewAndClose('MEMBER_CASES')} />
              <NavItem icon={<User size={20} />} label="個人設定" active={view === 'SETTINGS'} onClick={() => setViewAndClose('SETTINGS')} />
            </>
          )}
          {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (
            <>
              <NavItem icon={<LayoutDashboard size={20} />} label={ml('/admin/dashboard', '統計儀表板')} active={view === 'ADMIN_DASHBOARD'} onClick={() => setViewAndClose('ADMIN_DASHBOARD')} />
              <NavItem icon={<Users size={20} />} label={ml('/admin/users', '帳號管理')} active={view === 'ADMIN_USERS'} onClick={() => setViewAndClose('ADMIN_USERS')} />
              <NavItem icon={<Building2 size={20} />} label={ml('/admin/clinics', '診所管理')} active={view === 'ADMIN_CLINICS'} onClick={() => setViewAndClose('ADMIN_CLINICS')} />
              <NavItem icon={<Microscope size={20} />} label={ml('/admin/labs', '牙技所管理')} active={view === 'ADMIN_LABS'} onClick={() => setViewAndClose('ADMIN_LABS')} />
              <NavItem icon={<Activity size={20} />} label={ml('/admin/partner-links', '合作連結')} active={view === 'ADMIN_PARTNER_LINKS'} onClick={() => setViewAndClose('ADMIN_PARTNER_LINKS')} />
              {/* 內容管理群組：標籤從 DB 讀取，子項目各自對應路徑 */}
              <NavGroup icon={<FileText size={20} />} label={ml('/admin/content', '內容管理')} active={['ADMIN_ARTICLES','ADMIN_NOTIFICATION_CMS','ADMIN_SITE_IMAGES','ADMIN_VIDEOS'].includes(view)}>
                <NavItem icon={<FileText size={18} />} label={ml('/admin/articles', '文章管理')} active={view === 'ADMIN_ARTICLES'} onClick={() => setViewAndClose('ADMIN_ARTICLES')} />
                <NavItem icon={<Bell size={18} />} label={ml('/admin/notifications', '通知廣播')} active={view === 'ADMIN_NOTIFICATION_CMS'} onClick={() => setViewAndClose('ADMIN_NOTIFICATION_CMS')} />
                <NavItem icon={<Image size={18} />} label={ml('/admin/site-images', '圖片管理')} active={view === 'ADMIN_SITE_IMAGES'} onClick={() => setViewAndClose('ADMIN_SITE_IMAGES')} />
                <NavItem icon={<VideoIcon size={18} />} label={ml('/admin/videos', '影音管理')} active={view === 'ADMIN_VIDEOS'} onClick={() => setViewAndClose('ADMIN_VIDEOS')} />
              </NavGroup>
            </>
          )}
          {role === 'SUPER_ADMIN' && (
            <>
              {/* 系統管理群組：系統設定 + 選單管理 + 稽核日誌 */}
              <NavGroup icon={<Settings size={20} />} label={ml('/super/system', '系統管理')} active={['SUPER_SYSTEM_SETTINGS','SUPER_MENU','SUPER_AUDIT_LOGS'].includes(view)}>
                <NavItem icon={<Settings size={18} />} label={ml('/super/settings', '系統設定')} active={view === 'SUPER_SYSTEM_SETTINGS'} onClick={() => setViewAndClose('SUPER_SYSTEM_SETTINGS')} />
                <NavItem icon={<Settings size={18} />} label={ml('/super/menu', '選單管理')} active={view === 'SUPER_MENU'} onClick={() => setViewAndClose('SUPER_MENU')} />
                <NavItem icon={<ShieldCheck size={18} />} label={ml('/super/audit-logs', '稽核日誌')} active={view === 'SUPER_AUDIT_LOGS'} onClick={() => setViewAndClose('SUPER_AUDIT_LOGS')} />
              </NavGroup>
              {/* 進階設定群組：QA問卷 + 製程模板 */}
              <NavGroup icon={<ClipboardList size={20} />} label={ml('/super/advanced', '進階設定')} active={['SUPER_QA_QUESTIONS','SUPER_MFG_TEMPLATES','SUPER_TAGS'].includes(view)}>
                <NavItem icon={<ClipboardList size={18} />} label={ml('/super/qa-questions', 'QA問卷管理')} active={view === 'SUPER_QA_QUESTIONS'} onClick={() => setViewAndClose('SUPER_QA_QUESTIONS')} />
                <NavItem icon={<CheckCircle2 size={18} />} label={ml('/super/mfg-templates', '製程模板')} active={view === 'SUPER_MFG_TEMPLATES'} onClick={() => setViewAndClose('SUPER_MFG_TEMPLATES')} />
                <NavItem icon={<Star size={18} />} label={ml('/super/tags', 'Tag 管理')} active={view === 'SUPER_TAGS'} onClick={() => setViewAndClose('SUPER_TAGS')} />
              </NavGroup>
            </>
          )}
          {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (
            <NavItem icon={<User size={20} />} label="帳號設定" active={view === 'ACCOUNT_SETTINGS'} onClick={() => setViewAndClose('ACCOUNT_SETTINGS')} />
          )}
          {role !== 'GUEST' && (
            <NavItem icon={<Bell size={20} />} label="通知中心" active={view === 'NOTIFICATIONS'} onClick={() => setViewAndClose('NOTIFICATIONS')} />
          )}
        </nav>
        <div className="p-4 border-t border-blue-900 space-y-2">
          <div className="flex items-center gap-3 p-2 bg-blue-900/50 rounded-xl">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-900 font-bold shrink-0">{role[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentUser?.name || role}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser?.email || 'Novadent'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-xl transition-colors text-sm font-medium">
            <LogOut size={16} /> 登出
          </button>
        </div>
      </div>
    </>
  );
});

const AboutPage = React.memo(({ aboutBlocks, aboutLoaded }: { aboutBlocks: any[]; aboutLoaded: boolean }) => (
  <div className="py-24 max-w-5xl mx-auto px-6">
    <div className="space-y-20">
      {!aboutLoaded ? (
        // fetch 尚未完成 → 顯示真正的載入中
        <div className="text-center py-20 text-slate-400">載入中...</div>
      ) : aboutBlocks.length === 0 ? (
        // fetch 完成但 DB 沒有 ABOUT 資料 → 顯示靜態預設內容（不卡死）
        <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h2 className="text-3xl font-black text-slate-900 mb-8 text-center">關於 Novadent 諾星</h2>
          <div className="space-y-6 text-slate-600 leading-relaxed max-w-3xl mx-auto">
            <p>Novadent 是一個會員制牙科整合服務平台，專為需要假牙、牙套等較長週期牙科服務的民眾設計。</p>
            <p>平台連結一般民眾、合作診所與牙技所，讓假牙製作流程透明化，從初步諮詢到追蹤製作進度，全程在一個平台完成。</p>
          </div>
        </section>
      ) : (
        aboutBlocks.map((block: any) => (
          <section key={block.id} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
            {block.title && (
              <h2 className="text-3xl font-black text-slate-900 mb-8 text-center">{block.title}</h2>
            )}
            {block.blockType === 'text' ? (
              <div className="space-y-6 text-slate-600 leading-relaxed max-w-3xl mx-auto">
                {(block.textContent || '').split('\n').filter((p: string) => p.trim()).map((p: string, i: number) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : block.imageUrl ? (
              <div className="flex justify-center">
                <img src={block.imageUrl} alt={block.altText || block.title || ''} className="w-[85%] rounded-2xl shadow-md" referrerPolicy="no-referrer" />
              </div>
            ) : null}
          </section>
        ))
      )}
    </div>
  </div>
));

// ── 台灣完整縣市清單（前台篩選用）────
const TAIWAN_CITIES_PUBLIC = [
  '台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市',
  '基隆市', '新竹市', '新竹縣', '苗栗縣', '彰化縣', '南投縣',
  '雲林縣', '嘉義市', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣',
  '台東縣', '澎湖縣', '金門縣', '連江縣',
];

// ── 縣市多複選下拉元件 ────────────────────────────────────────
function CityMultiSelect({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // 點外部關閉
  React.useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (city: string) =>
    onChange(selected.includes(city) ? selected.filter(c => c !== city) : [...selected, city]);

  const label = selected.length === 0 ? '全部縣市' : selected.length === 1 ? selected[0] : `${selected[0]} 等 ${selected.length} 個縣市`;

  return (
    <div ref={ref} className="relative min-w-[160px]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-800 text-left"
      >
        <span className={selected.length > 0 ? 'text-blue-800 font-medium' : 'text-slate-500'}>{label}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-64 overflow-y-auto p-2">
          {selected.length > 0 && (
            <button onClick={() => onChange([])} className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg mb-1">
              清除篩選
            </button>
          )}
          {TAIWAN_CITIES_PUBLIC.map(city => (
            <label key={city} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(city)}
                onChange={() => toggle(city)}
                className="w-3.5 h-3.5 rounded"
              />
              <span className="text-sm text-slate-700">{city}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 合作診所公開頁 (/clinics) ─────────────────────────────────
const ClinicsPublicPage = React.memo(() => {
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cities, setCities] = useState<string[]>([]); // 多複選縣市

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    // 後端 city 參數支援單值；多選時用逗號串接，後端 LIKE 查詢各別匹配
    cities.forEach(c => params.append('city', c));
    fetch(`/api/clinics?${params}`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(res => { setClinics(res.data ?? res); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, cities]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-950 text-white py-16 px-6 text-center">
        <Building2 className="mx-auto mb-4 text-blue-400" size={48} />
        <h1 className="text-4xl font-black mb-3">合作診所</h1>
        <p className="text-blue-200 text-lg">嚴選合作牙科診所，提供透明、高品質的假牙製作服務</p>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 bg-white"
            placeholder="搜尋診所名稱..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <CityMultiSelect selected={cities} onChange={setCities} />
      </div>
      <div className="max-w-6xl mx-auto px-6 pb-16">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-800 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clinics.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Building2 size={48} className="mx-auto mb-4 opacity-30" />
            <p>目前沒有符合條件的診所</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {clinics.map((clinic: any) => (
              <div key={clinic.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all p-6 flex flex-col gap-3">
                {clinic.coverPhotoUrl ? (
                  <img src={clinic.coverPhotoUrl} alt={clinic.name} className="w-full h-40 object-cover rounded-xl mb-1" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-40 bg-blue-50 rounded-xl flex items-center justify-center mb-1">
                    <Building2 size={40} className="text-blue-200" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{clinic.name}</h3>
                  {clinic.city && <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1"><MapPin size={13} />{clinic.city}{clinic.detailedAddress ? `・${clinic.detailedAddress}` : ''}</p>}
                </div>
                {clinic.phone && (
                  <p className="text-sm text-slate-600 flex items-center gap-2"><Phone size={14} className="text-blue-600" />{clinic.phone}</p>
                )}
                {(clinic.services?.length > 0 || clinic.specialties?.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(clinic.services ?? clinic.specialties ?? []).slice(0, 4).map((s: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

// ── 合作牙技所公開頁 (/labs) ──────────────────────────────────
const LabsPublicPage = React.memo(() => {
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    cities.forEach(c => params.append('city', c));
    fetch(`/api/labs?${params}`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(res => { setLabs(res.data ?? res); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, cities]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-950 text-white py-16 px-6 text-center">
        <Microscope className="mx-auto mb-4 text-blue-400" size={48} />
        <h1 className="text-4xl font-black mb-3">合作牙技所</h1>
        <p className="text-blue-200 text-lg">專業假牙製作技術團隊，確保每一件作品的精準品質</p>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 bg-white"
            placeholder="搜尋牙技所名稱..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <CityMultiSelect selected={cities} onChange={setCities} />
      </div>
      <div className="max-w-6xl mx-auto px-6 pb-16">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-800 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : labs.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Microscope size={48} className="mx-auto mb-4 opacity-30" />
            <p>目前沒有符合條件的牙技所</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {labs.map((lab: any) => (
              <div key={lab.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all p-6 flex flex-col gap-3">
                {lab.coverPhotoUrl ? (
                  <img src={lab.coverPhotoUrl} alt={lab.name} className="w-full h-40 object-cover rounded-xl mb-1" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-40 bg-indigo-50 rounded-xl flex items-center justify-center mb-1">
                    <Microscope size={40} className="text-indigo-200" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{lab.name}</h3>
                  {lab.leadTechnicianName && <p className="text-sm text-blue-600 mt-0.5">技師：{lab.leadTechnicianName}</p>}
                  {lab.city && <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1"><MapPin size={13} />{lab.city}{lab.detailedAddress ? `・${lab.detailedAddress}` : ''}</p>}
                </div>
                {lab.phone && (
                  <p className="text-sm text-slate-600 flex items-center gap-2"><Phone size={14} className="text-indigo-600" />{lab.phone}</p>
                )}
                {(lab.specialties?.length > 0 || lab.acceptedCaseTypes?.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(lab.specialties ?? lab.acceptedCaseTypes ?? []).slice(0, 4).map((s: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

const QAStep = React.memo(({ title, desc, options, onSelect, multi = false, final = false }: any) => {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (opt: string) => {
    if (multi) {
      setSelected(prev => prev.includes(opt) ? prev.filter(i => i !== opt) : [...prev, opt]);
    } else {
      onSelect();
    }
  };
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h2 className="text-xl md:text-3xl font-black text-slate-900 mb-3 md:mb-4">{title}</h2>
        <p className="text-sm md:text-base text-slate-500">{desc}</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {options.map((opt: string) => (
          <button key={opt} onClick={() => toggle(opt)}
            className={`w-full p-4 md:p-5 rounded-xl md:rounded-2xl border-2 text-left font-bold transition-all flex items-center justify-between text-sm md:text-base ${
              selected.includes(opt) ? 'border-blue-800 bg-blue-50 text-blue-900' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50 text-slate-700'
            }`}>
            {opt}
            {selected.includes(opt) && <CheckCircle2 size={20} className="text-blue-700" />}
          </button>
        ))}
      </div>
      {multi && (
        <button onClick={onSelect} className="w-full bg-navy-700 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-lg md:text-xl shadow-xl shadow-blue-900/20 hover:bg-blue-950 transition-all">
          {final ? '完成諮詢，查看推薦' : '繼續下一步'}
        </button>
      )}
    </div>
  );
});

const QAPage = React.memo(({ setQaCompleted, setView }: { setQaCompleted: (v: boolean) => void; setView: (v: string) => void }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const totalSteps = 6;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setQaCompleted(true);
        setView('RECOMMENDATIONS');
      }, 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-blue-100 border-t-navy-700 rounded-full mb-8" />
        <h2 className="text-2xl font-black text-slate-900 mb-4">正在為您分析適合的診所...</h2>
        <p className="text-slate-500">我們正在根據您的需求，從合作名單中篩選最專業的醫療團隊</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto py-8 md:py-20">
      <div className="mb-8 md:mb-12">
        <div className="flex justify-between items-end mb-3">
          <span className="text-[10px] md:text-xs font-black text-blue-800 uppercase tracking-widest">Step {step} of {totalSteps}</span>
          <span className="text-[10px] md:text-xs font-bold text-slate-400">{Math.round((step / totalSteps) * 100)}% 完成</span>
        </div>
        <div className="h-1.5 md:h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
          <motion.div initial={{ width: 0 }} animate={{ width: `${(step / totalSteps) * 100}%` }} className="h-full bg-blue-800" />
        </div>
        <p className="text-[10px] md:text-xs text-slate-400 text-center flex items-center justify-center gap-1">
          <ShieldCheck size={12} /> 本問卷僅供初步媒合參考，不作為正式醫療診斷
        </p>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-3xl md:rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 md:p-12">
            {step === 1 && <QAStep title="您今天想解決什麼牙齒困擾呢？" desc="這能幫助我們為您媒合具備相關專長的醫師" options={['缺牙 / 想做假牙', '牙齒疼痛', '牙齒斷裂 / 破裂', '牙套 / 牙冠鬆動', '想評估是否需要植牙', '其他']} onSelect={handleNext} />}
            {step === 2 && <QAStep title="目前牙齒會感到明顯不舒服嗎？" desc="若有急迫疼痛，我們將優先為您標註急診需求" options={['非常疼痛', '偶爾疼痛', '只有咬東西不舒服', '沒有疼痛，只想改善外觀或功能']} onSelect={handleNext} />}
            {step === 3 && <QAStep title="這個狀況大約持續多久了？" desc="了解病程時間有助於醫師初步評估治療急迫性" options={['1 週內', '1 個月內', '3 個月以上', '已經拖很久了']} onSelect={handleNext} />}
            {step === 4 && <QAStep title="您的牙齒目前有以下哪些情況？" desc="可複選，這能讓我們推估治療的複雜程度" multi options={['已缺牙', '牙齒搖晃', '假牙鬆動', '曾做過根管治療', '曾做過植牙', '不確定']} onSelect={handleNext} />}
            {step === 5 && (
              <div className="space-y-6 md:space-y-8">
                <div>
                  <h2 className="text-xl md:text-3xl font-black text-slate-900 mb-3 md:mb-4">還有其他想補充的細節嗎？</h2>
                  <p className="text-sm md:text-base text-slate-500">選填。例如：左下後方咬東西會痛，之前做過假牙但最近鬆動。</p>
                </div>
                <textarea rows={4} className="w-full p-4 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-800 outline-none text-base md:text-lg" placeholder="請輸入您的描述..." />
                <button onClick={handleNext} className="w-full bg-navy-700 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-lg md:text-xl shadow-xl shadow-blue-900/20 hover:bg-blue-950 transition-all">繼續下一步</button>
              </div>
            )}
            {step === 6 && <QAStep title="您希望在哪個地區尋找診所？" desc="我們將為您篩選該地區評價優良的合作診所" options={['台北市', '新北市', '桃園市', '台中市', '高雄市', '其他縣市']} onSelect={handleNext} final />}
          </div>
        </motion.div>
      </AnimatePresence>
      {step > 1 && (
        <button onClick={() => setStep(step - 1)} className="mt-6 md:mt-8 text-slate-400 font-bold flex items-center gap-2 mx-auto hover:text-slate-600 transition-colors text-sm md:text-base">
          <ArrowRight size={18} className="rotate-180" /> 返回上一題
        </button>
      )}
    </div>
  );
});

const MobileHeader = React.memo(({ handleLogout, setIsMobileMenuOpen }: { handleLogout: () => void; setIsMobileMenuOpen: (v: boolean) => void }) => (
  <div className="md:hidden bg-blue-950 text-white p-4 flex items-center justify-between sticky top-0 z-40">
    <div className="flex items-center gap-2 cursor-pointer" onClick={handleLogout}>
      <div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center">
        <Activity className="text-white w-5 h-5" />
      </div>
      <span className="font-bold text-lg tracking-tight">Novadent</span>
    </div>
    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 hover:bg-blue-900 rounded-lg transition-colors">
      <Menu size={24} />
    </button>
  </div>
));

const ClinicDetail = React.memo(({ setView, selectedClinic }: { setView: (v: string) => void; selectedClinic: any }) => (
  <div className="p-4 md:p-8 max-w-5xl mx-auto py-6 md:py-10">
    <button onClick={() => setView('CASE_MANAGEMENT')} className="text-slate-500 hover:text-blue-800 flex items-center gap-2 mb-6 md:mb-8 font-medium transition-colors text-sm md:text-base">
      <ArrowRight size={18} className="rotate-180" /> 返回案件管理
    </button>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
      <div className="lg:col-span-2 space-y-6 md:space-y-8">
        <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <img src={selectedClinic?.coverPhoto || `https://picsum.photos/seed/${selectedClinic?.id}/800/400`} className="w-full h-48 md:h-64 object-cover" referrerPolicy="no-referrer" />
          <div className="p-6 md:p-10">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
              <div>
                <h1 className="text-2xl md:text-4xl font-black text-slate-900 mb-2">{selectedClinic?.name}</h1>
                <p className="flex items-center gap-2 text-slate-500 text-xs md:text-base"><MapPin size={18} className="shrink-0" /> {selectedClinic?.detailedAddress}</p>
              </div>
              <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-base">
                <Star size={16} fill="currentColor" /> {selectedClinic?.rating}
              </div>
            </div>
            <p className="text-sm md:text-lg text-slate-600 leading-relaxed mb-8 md:mb-10">{selectedClinic?.description}</p>
            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-4">服務項目</h3>
            <div className="flex flex-wrap gap-2 md:gap-3 mb-8 md:mb-10">
              {selectedClinic?.services?.map((s: string) => (
                <span key={s} className="px-3 md:px-4 py-1.5 md:py-2 bg-blue-50 text-blue-900 rounded-xl text-[10px] md:text-sm font-bold">{s}</span>
              ))}
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-4">專業醫師團隊</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {selectedClinic?.doctorTeam?.map((d: string) => (
                <div key={d} className="flex items-center gap-3 p-3 md:p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center text-blue-700 shadow-sm shrink-0"><Stethoscope size={18} /></div>
                  <span className="font-bold text-slate-800 text-sm md:text-base">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-blue-950 text-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] shadow-xl lg:sticky lg:top-24">
          <h3 className="text-xl md:text-2xl font-bold mb-6">立即預約諮詢</h3>
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-slate-400 text-sm md:text-base"><Phone size={18} /> {selectedClinic?.phone}</div>
            <div className="flex items-center gap-3 text-slate-400 text-sm md:text-base"><Clock size={18} /> 09:00 - 21:00</div>
          </div>
          <button className="w-full bg-blue-800 hover:bg-blue-700 text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-lg transition-all shadow-lg shadow-blue-800/20">
            撥打電話預約
          </button>
          <p className="text-[10px] md:text-xs text-slate-500 mt-6 text-center">預約後請告知診所您是 Novadent 會員，以便開啟進度追蹤。</p>
        </div>
      </div>
    </div>
  </div>
));

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState<UserRole>(() => getCurrentUser()?.role ?? 'GUEST');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getCurrentUser());
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // F5 重整時，先從 sessionStorage 恢復使用者狀態，避免 refresh 短暫失敗就變成 GUEST
    const storedUser = getCurrentUser();
    if (storedUser) {
      setCurrentUser(storedUser);
      setRole(storedUser.role as UserRole);
    }

    refreshAccessToken().then(user => {
      if (user) {
        // Refresh 成功：更新為後端最新的使用者資訊
        setCurrentUser(user);
        setRole(user.role);
        const p = location.pathname;
        // 注意：'/' 刻意不在條件內 — 登入後仍可瀏覽首頁，不強制跳轉
        // 只有在直接輸入角色根路徑（/admin、/clinic...）時才自動跳到對應首頁
        if (p === '/admin' || p === '/clinic' || p === '/lab' || p === '/member' || p === '/super') {
          switch (user.role) {
            case 'SUPER_ADMIN':
            case 'ADMIN':    navigate('/admin/dashboard', { replace: true }); break;
            case 'CLINIC':   navigate('/clinic/cases', { replace: true }); break;
            case 'LAB':      navigate('/lab/cases', { replace: true }); break;
            case 'MEMBER':   navigate('/member/cases', { replace: true }); break;
          }
        }
      } else if (!storedUser) {
        // Refresh 失敗 且 sessionStorage 也無使用者 → 確定是訪客
        setCurrentUser(null);
        setRole('GUEST');
      }
      // Refresh 失敗但 sessionStorage 有使用者：保留現有狀態。
      // 下次 API 呼叫若仍 401，authService 會清除 session，再導向登入。
      // 這可防止 Replit 暫時性網路波動或 server 重啟造成的「假性登出」。
      setAuthReady(true);
    });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps


  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    setRole(user.role);
    // forceChangePassword=true 時（子帳號/Admin 重設密碼後）強制導向改密碼頁
    if (user.forceChangePassword) {
      navigate('/force-change-password', { replace: true });
      return;
    }
    switch (user.role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':    navigate('/admin/dashboard', { replace: true }); break;
      case 'CLINIC':   navigate('/clinic/cases', { replace: true }); break;
      case 'LAB':      navigate('/lab/cases', { replace: true }); break;
      case 'MEMBER':   navigate('/member/cases', { replace: true }); break;
      default:         navigate('/', { replace: true });
    }
  };

  // 登出
  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setRole('GUEST');
    navigate('/');
  };
  const VIEW_PATH_MAP: Record<string, string> = {
    HOME: '/',
    SERVICE: '/about',
    KNOWLEDGE: '/education',
    VIDEOS: '/videos',
    LOGIN: '/login',
    REGISTER: '/register',
    TERMS: '/terms',
    PRIVACY: '/privacy',
    CLINICS_PUBLIC: '/clinics',
    LABS_PUBLIC: '/labs',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
    FORCE_CHANGE_PASSWORD: '/force-change-password',
    OVERVIEW: '/overview',
    CASE_MANAGEMENT: '/cases',
    CREATE: '/cases/new',
    DETAIL: '/cases/detail',
    SETTINGS: '/settings',
    ACCOUNT_MGMT: '/account',
    NOTIFICATIONS: '/notifications',
    MEMBER_QA: '/member/qa',
    MEMBER_RECOMMENDATIONS: '/member/recommendations',
    MEMBER_CASES: '/member/cases',
    CLINIC_CASES: '/clinic/cases',
    CLINIC_CREATE_CASE: '/clinic/cases/new',
    CLINIC_CASE_DETAIL: '/clinic/cases/detail',
    CLINIC_DETAIL: '/clinic/detail',
    CLINIC_PROFILE: '/clinic/profile',
    CLINIC_PARTNER_LABS: '/clinic/partner-labs',
    LAB_CASES: '/lab/cases',
    LAB_CASE_DETAIL: '/lab/cases/detail',
    LAB_PROFILE: '/lab/profile',
    LAB_PARTNER_CLINICS: '/lab/partner-clinics',
    LAB_SETTINGS: '/lab/settings',
    ACCOUNT_SETTINGS: '/account/settings',
    INSURER_CUSTOMER_MGMT: '/insurer/customers',
    ADMIN_DASHBOARD: '/admin/dashboard',
    ADMIN_USERS: '/admin/users',
    ADMIN_CLINICS: '/admin/clinics',
    ADMIN_LABS: '/admin/labs',
    ADMIN_PARTNER_LINKS: '/admin/partner-links',
    ADMIN_ARTICLES: '/admin/articles',
    ADMIN_NOTIFICATION_CMS: '/admin/notifications',
    ADMIN_SITE_IMAGES: '/admin/site-images',
    ADMIN_VIDEOS: '/admin/videos',
    SUPER_SYSTEM_SETTINGS: '/super/settings',
    SUPER_MENU: '/super/menu',
    SUPER_AUDIT_LOGS: '/super/audit-logs',
    SUPER_QA_QUESTIONS: '/super/qa-questions',
    SUPER_MFG_TEMPLATES: '/super/mfg-templates',
    SUPER_TAGS:          '/super/tags',
    ARTICLE: '/article',
    QA: '/qa',
    RECOMMENDATIONS: '/recommendations',
  };

  const PATH_VIEW_MAP: Record<string, string> = {};
  for (const [v, p] of Object.entries(VIEW_PATH_MAP)) {
    PATH_VIEW_MAP[p] = v;
  }

  const resolveViewFromPath = (path: string): string => {
    if (PATH_VIEW_MAP[path]) return PATH_VIEW_MAP[path];
    if (path === '/admin' || path.startsWith('/admin/')) return 'ADMIN_DASHBOARD';
    if (path === '/clinic' || path.startsWith('/clinic/')) return 'CLINIC_CASES';
    if (path === '/lab' || path.startsWith('/lab/')) return 'LAB_CASES';
    if (path === '/member' || path.startsWith('/member/')) return 'MEMBER_CASES';
    if (path === '/super' || path.startsWith('/super/')) return 'SUPER_SYSTEM_SETTINGS';
    return 'HOME';
  };

  const [view, setView] = useState<string>(() => resolveViewFromPath(location.pathname));
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [caseFilter, setCaseFilter] = useState<string>('ALL');
  const [qaCompleted, setQaCompleted] = useState(false);
  const [hasActiveCase, setHasActiveCase] = useState(false);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [homeConfig, setHomeConfig] = useState<HomeConfig>({ heroBannerUrl: '/S__14336065_0_0.jpg' });
  const [homeBanners, setHomeBanners] = useState<any[]>([]);
  const [homeBottomImage, setHomeBottomImage] = useState<any>(null);
  const [aboutBlocks, setAboutBlocks] = useState<any[]>([]);
  const [aboutLoaded, setAboutLoaded] = useState(false); // 控制 AboutPage 是否完成載入（區分「載入中」與「無資料」）
  const [heroBannerIndex, setHeroBannerIndex] = useState(0);

  useEffect(() => {
    fetch('/api/site-images').then(r => r.ok ? r.json() : []).then((imgs: any[]) => {
      const hero = imgs.find((i: any) => i.position === 'HERO');
      if (hero?.imageUrl) setHomeConfig(prev => ({ ...prev, heroBannerUrl: hero.imageUrl }));
      const banners = imgs.filter((i: any) => i.page === 'HOME' && (i.position === 'HERO' || i.position.startsWith('BANNER')) && i.visible && i.imageUrl).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
      if (banners.length > 0) setHomeBanners(banners);
      const bottom = imgs.find((i: any) => i.page === 'HOME' && i.position === 'CHALLENGE');
      if (bottom) setHomeBottomImage(bottom);
      const about = imgs.filter((i: any) => i.page === 'ABOUT' && i.visible).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
      setAboutBlocks(about);
    }).catch(() => {}).finally(() => {
      setAboutLoaded(true); // 無論成功或失敗，都標記載入完成，避免頁面永遠卡在「載入中...」
    });
  }, []);

  useEffect(() => {
    if (homeBanners.length <= 1) return;
    const timer = setInterval(() => setHeroBannerIndex(prev => (prev + 1) % homeBanners.length), 5000);
    return () => clearInterval(timer);
  }, [homeBanners.length]);

  useEffect(() => {
    const path = location.pathname;
    const matchedView = PATH_VIEW_MAP[path];
    if (matchedView) {
      setView(matchedView);
    } else if (path === '/admin' || path.startsWith('/admin/')) {
      setView('ADMIN_DASHBOARD');
    } else if (path === '/clinic' || path.startsWith('/clinic/')) {
      setView('CLINIC_CASES');
    } else if (path === '/lab' || path.startsWith('/lab/')) {
      setView('LAB_CASES');
    } else if (path === '/member' || path.startsWith('/member/')) {
      setView('MEMBER_CASES');
    } else if (path === '/super' || path.startsWith('/super/')) {
      setView('SUPER_SYSTEM_SETTINGS');
    }
  }, [location]);

  const handleSetView = (newView: string) => {
    setView(newView);
    const path = VIEW_PATH_MAP[newView];
    if (path) navigate(path);
  };

  // --- Public Website Components (defined at module level) ---

  const [footerContacts, setFooterContacts] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch('/api/page-contents').then(r => r.ok ? r.json() : [])
      .then((rows: any[]) => {
        const map: Record<string, string> = {};
        rows.forEach((r: any) => { if (r.key && r.value) map[r.key] = r.value; });
        setFooterContacts(map);
      }).catch(() => {});
  }, []);

  // ── SEO：啟動時從後台讀取 meta 設定，動態更新 <head> ────────
  // 讓 SuperAdmin 後台改完即生效，不需重新部署
  useEffect(() => {
    fetch('/api/settings/public')
      .then(r => r.ok ? r.json() : {})
      .then((seo: Record<string, string>) => {
        if (seo.seo_title)          document.title = seo.seo_title;
        const setMeta = (sel: string, val: string) => {
          let el = document.querySelector(sel) as HTMLMetaElement | null;
          if (!el) {
            el = document.createElement('meta');
            const attr = sel.includes('property=') ? 'property' : 'name';
            el.setAttribute(attr, sel.match(/["']([^"']+)["']/)?.[1] || '');
            document.head.appendChild(el);
          }
          el.setAttribute('content', val);
        };
        if (seo.seo_description)    setMeta('meta[name="description"]',          seo.seo_description);
        if (seo.seo_og_title)       setMeta('meta[property="og:title"]',          seo.seo_og_title);
        if (seo.seo_og_description) setMeta('meta[property="og:description"]',    seo.seo_og_description);
        if (seo.seo_og_url)         setMeta('meta[property="og:url"]',            seo.seo_og_url);
      }).catch(() => {});
  }, []);

  // Footer 快速連結：從 PUBLIC 選單中 showInFooter=true 的項目動態讀取
  const [quickLinks, setQuickLinks] = useState<{label:string;path:string}[]>([]);
  useEffect(() => {
    fetch('/api/admin/menu-public')
      .then(r => r.ok ? r.json() : [])
      .then((items: any[]) => {
        setQuickLinks(
          items
            .filter((i: any) => i.showInFooter || i.show_in_footer)
            .map((i: any) => ({ label: i.label, path: i.path }))
        );
      }).catch(() => {});
  }, []);

  // 後台選單標籤：ADMIN/SUPER_ADMIN 登入後讀取，讓左側選單名稱與 DB 同步
  const [adminMenuLabels, setAdminMenuLabels] = useState<Record<string, string>>({});
  const fetchAdminMenuLabels = useCallback(() => {
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return;
    apiFetch('/admin/menu-config')
      .then(r => r.ok ? r.json() : [])
      .then((items: any[]) => {
        const map: Record<string, string> = {};
        items.forEach((i: any) => { if (i.path) map[i.path] = i.label; });
        setAdminMenuLabels(map);
      }).catch(() => {});
  }, [role]);
  // 登入時載入一次
  useEffect(() => { fetchAdminMenuLabels(); }, [fetchAdminMenuLabels]);
  // 選單管理儲存後，SuperMenuManager 發出此事件 → 即時更新側邊欄，不需重整頁面
  useEffect(() => {
    window.addEventListener('menu-config-updated', fetchAdminMenuLabels);
    return () => window.removeEventListener('menu-config-updated', fetchAdminMenuLabels);
  }, [fetchAdminMenuLabels]);




  const handleRegisterSuccess = (registeredUser: AuthUser) => {
    setCurrentUser(registeredUser);
    setRole(registeredUser.role);
    handleSetView('MEMBER_QA');
  };






  // M-01：新增 Auth 相關頁面也屬於公開視圖（不顯示側選單）
  const isPublicView = ['HOME', 'SERVICE', 'KNOWLEDGE', 'VIDEOS', 'ARTICLE', 'LOGIN', 'REGISTER', 'TERMS', 'PRIVACY', 'FORGOT_PASSWORD', 'RESET_PASSWORD', 'FORCE_CHANGE_PASSWORD', 'CLINICS_PUBLIC', 'LABS_PUBLIC'].includes(view);

  if (!authReady && !isPublicView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans antialiased text-slate-900">
      {!isPublicView && <MobileHeader handleLogout={handleLogout} setIsMobileMenuOpen={setIsMobileMenuOpen} />}
      {!isPublicView && <Sidebar role={role} view={view} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} handleSetView={handleSetView} currentUser={currentUser} handleLogout={handleLogout} adminMenuLabels={adminMenuLabels} />}
      <main className="flex-1 overflow-y-auto">
        {isPublicView && <PublicHeader />}
        <AnimatePresence mode="wait">
          <motion.div key={`${role}-${view}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {view === 'HOME' && <HomePage homeBanners={homeBanners} heroBannerIndex={heroBannerIndex} setHeroBannerIndex={setHeroBannerIndex} homeConfig={homeConfig} homeBottomImage={homeBottomImage} />}
            {view === 'KNOWLEDGE' && <KnowledgeCenter setView={handleSetView} setSelectedArticle={setSelectedArticle} />}
            {view === 'VIDEOS' && <VideosPage />}
            {view === 'ARTICLE' && <ArticleDetail setView={handleSetView} selectedArticle={selectedArticle} />}
            {/* M-01：新版 LoginPage（含 PasswordInput、表單驗證、mock auth） */}
            {view === 'LOGIN' && <NewLoginPage onLogin={handleLogin} />}
            {/* M-01：忘記密碼 */}
            {view === 'FORGOT_PASSWORD' && <ForgotPasswordPage />}
            {/* M-01：重設密碼（token 來自 email 連結） */}
            {view === 'RESET_PASSWORD' && <ResetPasswordPage />}
            {/* M-01：強制修改密碼（admin 代重設後首次登入） */}
            {view === 'FORCE_CHANGE_PASSWORD' && <ForceChangePasswordPage />}
            {view === 'REGISTER' && <RegisterPageComponent onSuccess={handleRegisterSuccess} />}
            {view === 'SERVICE' && <AboutPage aboutBlocks={aboutBlocks} aboutLoaded={aboutLoaded} />}
            {view === 'TERMS' && <TermsPage />}
            {view === 'PRIVACY' && <PrivacyPage />}
            {view === 'CLINICS_PUBLIC' && <ClinicsPublicPage />}
            {view === 'LABS_PUBLIC' && <LabsPublicPage />}
            {view === 'QA' && <QAPage setQaCompleted={setQaCompleted} setView={handleSetView} />}
            {view === 'RECOMMENDATIONS' && <Recommendations setView={handleSetView} setSelectedClinic={setSelectedClinic} />}
            {view === 'OVERVIEW' && <Overview role={role} setView={handleSetView} currentCase={currentCase} setCaseFilter={setCaseFilter} />}
            {view === 'CASE_MANAGEMENT' && <Dashboard role={role} setView={handleSetView} currentCase={currentCase} qaCompleted={qaCompleted} setSelectedClinic={setSelectedClinic} hasActiveCase={hasActiveCase} setSelectedCase={setSelectedCase} caseFilter={caseFilter} setCaseFilter={setCaseFilter} />}
            {view === 'CREATE' && <CaseCreation setView={handleSetView} setHasActiveCase={setHasActiveCase} />}
            {view === 'DETAIL' && <CaseDetail role={role} setView={handleSetView} currentCase={selectedCase || currentCase} setCurrentCase={selectedCase ? setSelectedCase : setCurrentCase} />}
            {view === 'CLINIC_DETAIL' && <ClinicDetail setView={handleSetView} selectedClinic={selectedClinic} />}
            {view === 'SETTINGS' && <MemberSettings />}
            {view === 'ACCOUNT_MGMT' && <AccountMgmtPage userRole={role} />}
            {view === 'LAB_SETTINGS' && <AccountMgmtPage userRole={role} />}
            {view === 'INSURER_CUSTOMER_MGMT' && <InsurerCustomerMgmt />}
            {/* ── V1.2 Admin Pages ─────────────────────────── */}
            {view === 'ADMIN_DASHBOARD' && <AdminDashboard />}
            {view === 'ADMIN_USERS' && <AdminUsers />}
            {view === 'ADMIN_CLINICS' && <AdminClinics />}
            {view === 'ADMIN_LABS' && <AdminLabs />}
            {view === 'ADMIN_PARTNER_LINKS' && <AdminPartnerLinks />}
            {view === 'ADMIN_ARTICLES' && <AdminArticles />}
            {view === 'ADMIN_NOTIFICATION_CMS' && <AdminNotificationCMS />}
            {view === 'ADMIN_SITE_IMAGES' && <AdminSiteImages />}
            {view === 'ADMIN_VIDEOS' && <AdminVideos />}
            {/* ── V1.2 SuperAdmin Pages ────────────────────── */}
            {view === 'SUPER_SYSTEM_SETTINGS' && <SuperSystemSettings />}
            {view === 'SUPER_MENU' && <SuperMenuManager />}
            {view === 'SUPER_AUDIT_LOGS' && <SuperAuditLogs />}
            {view === 'SUPER_QA_QUESTIONS' && <SuperQAQuestions />}
            {view === 'SUPER_MFG_TEMPLATES' && <SuperMfgTemplates />}
            {view === 'SUPER_TAGS' && <SuperTagsManager />}
            {/* ── Member Pages ─────────────────────────────── */}
            {view === 'MEMBER_QA' && <MemberQAWizard setView={handleSetView} onConsultationCreated={setConsultationId} />}
            {view === 'MEMBER_RECOMMENDATIONS' && <MemberRecommendations setView={handleSetView} consultationId={consultationId} />}
            {view === 'MEMBER_CASES' && <MemberCaseTracking setView={handleSetView} />}
            {/* ── Clinic Pages ─────────────────────────────── */}
            {view === 'CLINIC_CASES' && <ClinicCaseList setView={handleSetView} setSelectedCaseId={setSelectedCaseId} />}
            {view === 'CLINIC_CREATE_CASE' && <ClinicCreateCase setView={handleSetView} />}
            {view === 'CLINIC_CASE_DETAIL' && <ClinicCaseDetail caseId={selectedCaseId} setView={handleSetView} />}
            {view === 'CLINIC_PROFILE' && <ClinicProfilePage />}
            {view === 'CLINIC_PARTNER_LABS' && <ClinicPartnerLabs />}
            {/* ── Lab Pages ────────────────────────────────── */}
            {view === 'LAB_CASES' && <LabCaseList setView={handleSetView} setSelectedCaseId={setSelectedCaseId} />}
            {view === 'LAB_CASE_DETAIL' && <LabCaseDetail caseId={selectedCaseId} setView={handleSetView} />}
            {view === 'LAB_PROFILE' && <LabProfilePage />}
            {view === 'LAB_PARTNER_CLINICS' && <LabPartnerClinics />}
            {/* ── Shared Pages ──────────────────────────────── */}
            {view === 'ACCOUNT_SETTINGS' && <AccountSettingsPage />}
            {view === 'NOTIFICATIONS' && <NotificationsPage />}
          </motion.div>
        </AnimatePresence>
        {isPublicView && <PublicFooter footerContacts={footerContacts} quickLinks={quickLinks} />}
      </main>
    </div>
  );
}

// ── 診所資料編輯頁（CLINIC 角色專用）────────────────────────
// 讓診所管理者更新自己的基本資訊（名稱、聯絡方式、地址、服務項目、封面照片等）
function ClinicProfilePage() {
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const [availableTags, setAvailableTags] = useState<{id:string;name:string}[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  useEffect(() => {
    // 分開載入，避免其中一個失敗導致另一個也拿不到
    apiFetch('/clinics/me').then(r => r.json())
      .then(data => setForm(data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
    apiFetch('/tags').then(r => r.json())
      .then(data => setAvailableTags(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // 點擊 tag：toggle 選取（存於 form.services 陣列）
  function toggleTag(tagName: string) {
    setForm((f: any) => {
      const current: string[] = Array.isArray(f.services) ? f.services : [];
      const next = current.includes(tagName)
        ? current.filter(t => t !== tagName)
        : [...current, tagName];
      return { ...f, services: next };
    });
  }

  async function handlePhotoUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await apiFetch('/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('上傳失敗');
      const { url } = await res.json();
      setForm((f: any) => ({ ...f, coverPhotoUrl: url }));
      showToast('✅ 照片已上傳');
    } catch { showToast('❌ 照片上傳失敗'); }
    finally { setUploading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/clinics/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name, phone: form.phone, email: form.email,
          city: form.city, district: form.district, detailedAddress: form.detailedAddress,
          treatmentTypes: form.treatmentTypes, services: form.services,
          description: form.description, coverPhotoUrl: form.coverPhotoUrl,
        }),
      });
      if (!res.ok) throw new Error('儲存失敗');
      showToast('✅ 診所資料已更新');
    } catch (err: any) { showToast(`❌ ${err.message || '儲存失敗'}`); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" /></div>;

  const inputCls = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800";
  const labelCls = "text-xs font-semibold text-slate-500 uppercase tracking-wider";

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl text-sm shadow-xl">{toast}</div>}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">診所資料</h1>
        <p className="text-slate-500 text-sm mt-1">管理您的診所基本資訊</p>
      </header>
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        {/* 封面照片 */}
        <div className="space-y-2">
          <label className={labelCls}>封面照片</label>
          <div className="flex items-center gap-4">
            {form.coverPhotoUrl ? (
              <img src={form.coverPhotoUrl} alt="封面" className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0" />
            ) : (
              <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                <Camera size={24} className="text-slate-300" />
              </div>
            )}
            <div className="flex-1">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="px-4 py-2 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50">
                {uploading ? '上傳中...' : '點擊上傳圖片'}
              </button>
            </div>
          </div>
        </div>
        {[
          { key: 'name', label: '診所名稱', required: true },
          { key: 'leadDoctorName', label: '負責醫師' },
          { key: 'phone', label: '聯絡電話' },
          { key: 'email', label: '聯絡 Email', type: 'email' },
          { key: 'city', label: '城市', select: true },
          { key: 'district', label: '區域' },
          { key: 'detailedAddress', label: '詳細地址' },
          { key: 'description', label: '診所簡介', textarea: true },
        ].map(({ key, label, required, type, textarea, select }: any) => (
          <div key={key} className="space-y-1.5">
            <label className={labelCls}>
              {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {select ? (
              <select value={form[key] || ''} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))} className={inputCls + ' bg-white'}>
                <option value="">請選擇縣市</option>
                {TAIWAN_CITIES_PUBLIC.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : textarea ? (
              <textarea rows={3} value={form[key] || ''} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))} className={inputCls + ' resize-none'} />
            ) : (
              <input type={type || 'text'} value={form[key] || ''} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))} className={inputCls} required={required} />
            )}
          </div>
        ))}
        {/* 服務 Tag（點擊選取）*/}
        {availableTags.length > 0 && (
          <div className="space-y-2">
            <label className={labelCls}>服務項目 <span className="text-slate-400 font-normal normal-case">（點擊選取，可複選）</span></label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => {
                const selected = Array.isArray(form.services) && form.services.includes(tag.name);
                return (
                  <button key={tag.id} type="button" onClick={() => toggleTag(tag.name)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      selected
                        ? 'bg-blue-800 text-white border-blue-800'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-700'
                    }`}>
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button type="submit" disabled={saving} className="w-full py-3 bg-blue-950 text-white rounded-xl text-sm font-semibold hover:bg-blue-900 disabled:opacity-40 transition-colors">
          {saving ? '儲存中...' : '儲存'}
        </button>
      </form>
    </div>
  );
}

// ── 牙技所資料編輯頁（LAB 角色專用）─────────────────────────
// 讓牙技所管理者更新自己的基本資訊（名稱、技師、聯絡方式、服務類型、封面照片等）
function LabProfilePage() {
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  useEffect(() => {
    apiFetch('/labs/me').then(r => r.json()).then(data => {
      setForm(data || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handlePhotoUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await apiFetch('/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('上傳失敗');
      const { url } = await res.json();
      setForm((f: any) => ({ ...f, coverPhotoUrl: url }));
      showToast('✅ 照片已上傳');
    } catch { showToast('❌ 照片上傳失敗'); }
    finally { setUploading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/labs/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name, leadTechnicianName: form.leadTechnicianName,
          phone: form.phone, email: form.email, city: form.city,
          detailedAddress: form.detailedAddress, acceptedCaseTypes: form.acceptedCaseTypes,
          specialties: form.specialties, coverPhotoUrl: form.coverPhotoUrl,
        }),
      });
      if (!res.ok) throw new Error('儲存失敗');
      showToast('✅ 牙技所資料已更新');
    } catch (err: any) { showToast(`❌ ${err.message || '儲存失敗'}`); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" /></div>;

  const inputCls = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800";
  const labelCls = "text-xs font-semibold text-slate-500 uppercase tracking-wider";

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl text-sm shadow-xl">{toast}</div>}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">牙技所資料</h1>
        <p className="text-slate-500 text-sm mt-1">管理您的牙技所基本資訊</p>
      </header>
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        {/* 封面照片 */}
        <div className="space-y-2">
          <label className={labelCls}>封面照片</label>
          <div className="flex items-center gap-4">
            {form.coverPhotoUrl ? (
              <img src={form.coverPhotoUrl} alt="封面" className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0" />
            ) : (
              <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                <Camera size={24} className="text-slate-300" />
              </div>
            )}
            <div className="flex-1">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="px-4 py-2 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50">
                {uploading ? '上傳中...' : '點擊上傳圖片'}
              </button>
            </div>
          </div>
        </div>
        {[
          { key: 'name', label: '牙技所名稱', required: true },
          { key: 'leadTechnicianName', label: '主任技師姓名' },
          { key: 'phone', label: '聯絡電話' },
          { key: 'email', label: '聯絡 Email', type: 'email' },
          { key: 'city', label: '城市', select: true },
          { key: 'detailedAddress', label: '詳細地址' },
        ].map(({ key, label, required, type, select }: any) => (
          <div key={key} className="space-y-1.5">
            <label className={labelCls}>
              {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {select ? (
              <select value={form[key] || ''} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))} className={inputCls + ' bg-white'}>
                <option value="">請選擇縣市</option>
                {TAIWAN_CITIES_PUBLIC.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <input type={type || 'text'} value={form[key] || ''} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))} className={inputCls} required={required} />
            )}
          </div>
        ))}
        <button type="submit" disabled={saving} className="w-full py-3 bg-blue-950 text-white rounded-xl text-sm font-semibold hover:bg-blue-900 disabled:opacity-40 transition-colors">
          {saving ? '儲存中...' : '儲存'}
        </button>
      </form>
    </div>
  );
}

// ── 帳號設定頁（所有已登入角色）──────────────────────────────
// 讓使用者修改自己的姓名、電話，以及變更登入密碼
function AccountSettingsPage() {
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);     // 新密碼欄位顯示切換
  const [showConfirmPw, setShowConfirmPw] = useState(false); // 確認密碼欄位顯示切換
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  useEffect(() => {
    apiFetch('/admin/users/me').then(r => r.json()).then(d => {
      setProfile(d || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/admin/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: profile.name, phone: profile.phone }),
      });
      if (!res.ok) throw new Error('儲存失敗');
      showToast('✅ 個人資料已更新');
    } catch (err: any) { showToast(`❌ ${err.message}`); }
    finally { setSaving(false); }
  }

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) { showToast('❌ 新密碼與確認密碼不符'); return; }
    if (pwForm.newPw.length < 8) { showToast('❌ 新密碼至少需要 8 個字元'); return; }
    setPwSaving(true);
    try {
      const result = await changePassword(pwForm.newPw);
      if (result.success) {
        showToast('✅ 密碼已變更');
        setPwForm({ current: '', newPw: '', confirm: '' });
      } else {
        showToast(`❌ ${result.error || '變更失敗'}`);
      }
    } catch { showToast('❌ 密碼變更失敗'); }
    finally { setPwSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" /></div>;

  const inputCls = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800";
  const labelCls = "text-xs font-semibold text-slate-500 uppercase tracking-wider";

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 space-y-6">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl text-sm shadow-xl">{toast}</div>}
      <header>
        <h1 className="text-2xl font-bold text-slate-900">帳號設定</h1>
        <p className="text-slate-500 text-sm mt-1">修改個人資料與登入密碼</p>
      </header>

      {/* 個人資料 */}
      <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">個人資料</h2>
        <div className="space-y-1.5">
          <label className={labelCls}>姓名</label>
          <input type="text" value={profile.name || ''} onChange={e => setProfile((p: any) => ({ ...p, name: e.target.value }))} className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>電話</label>
          <input type="tel" value={profile.phone || ''} onChange={e => setProfile((p: any) => ({ ...p, phone: e.target.value }))} placeholder="選填" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Email（不可修改）</label>
          <input type="email" value={profile.email || ''} disabled className={inputCls + ' bg-slate-50 text-slate-400 cursor-not-allowed'} />
        </div>
        <button type="submit" disabled={saving} className="w-full py-2.5 bg-blue-950 text-white rounded-xl text-sm font-semibold hover:bg-blue-900 disabled:opacity-40">
          {saving ? '儲存中...' : '儲存個人資料'}
        </button>
      </form>

      {/* 變更密碼 */}
      <form onSubmit={handleChangePw} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">變更密碼</h2>
        <div className="space-y-1.5">
          <label className={labelCls}>新密碼 <span className="text-red-500 normal-case font-bold">*</span></label>
          <div className="relative">
            <input type={showNewPw ? 'text' : 'password'} value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} placeholder="至少 8 個字元" className={inputCls + ' pr-10'} minLength={8} required />
            <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>確認新密碼 <span className="text-red-500 normal-case font-bold">*</span></label>
          <div className="relative">
            <input type={showConfirmPw ? 'text' : 'password'} value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="再次輸入新密碼" className={inputCls + ' pr-10'} required />
            <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={pwSaving} className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 disabled:opacity-40">
          {pwSaving ? '變更中...' : '變更密碼'}
        </button>
      </form>
    </div>
  );
}

// --- Admin Components ---
// --- Admin Components ---
function InsurerCustomerMgmt() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">客戶管理</h1>
        <p className="text-slate-500 mt-1 text-sm md:text-base">輸入客戶基本資料進行查詢</p>
      </header>

      <div className="bg-slate-100 p-6 md:p-8 rounded-[2rem] mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {/* Row 1 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">客戶/準客戶</label>
            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm">
              <option>客戶</option>
              <option>準客戶</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">姓名</label>
            <input type="text" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">保險年齡</label>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="歲" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm" />
              <span className="text-slate-400 text-xs">至</span>
              <input type="number" placeholder="歲" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">聯絡地址</label>
            <input type="text" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">貴賓會員資格</label>
            <input type="text" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">性別</label>
            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm">
              <option>全部</option>
              <option>男</option>
              <option>女</option>
            </select>
          </div>

          {/* Row 2 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">年收入</label>
            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm">
              <option>全部</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">活躍等級</label>
            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm">
              <option>全部</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">財富等級</label>
            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm">
              <option>全部</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">保險年齡增齡時間</label>
            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm">
              <option>全部</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">生日月份</label>
            <input type="month" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">距離上次投保時間</label>
            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm">
              <option>全部</option>
            </select>
          </div>

          {/* Row 3 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">保險身分</label>
            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm">
              <option>要保人或被保險人</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">滿期金客戶</label>
            <div className="flex items-center gap-2">
              <input type="date" className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-xs" />
              <span className="text-slate-400 text-xs">~</span>
              <input type="date" className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">繳費期滿</label>
            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm">
              <option></option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">繳費年期分類</label>
            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm">
              <option></option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">專案註記</label>
            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm">
              <option></option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">保戶圍地帳號開通狀態</label>
            <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all text-sm">
              <option>全部</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-12 py-3 bg-navy-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 hover:bg-blue-950 transition-all">查詢</button>
          <button className="px-12 py-3 bg-transparent border-2 border-slate-300 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all">清除條件</button>
        </div>
      </div>

      <div className="bg-white p-12 rounded-[2rem] border border-slate-200 border-dashed flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
          <Search size={32} />
        </div>
        <p className="text-slate-400 font-medium">請輸入條件後進行查詢</p>
      </div>
    </div>
  );
}

// ── Legacy prototype components removed (replaced by /pages/) ──

// --- Sub-components ---
function KnowledgeCenter({ setView, setSelectedArticle }: any) {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [articles, setArticles] = useState<Article[]>([]);
  const categories = ['全部', ...ARTICLE_CATEGORIES];

  useEffect(() => {
    fetch('/api/articles').then(r => r.ok ? r.json() : { data: [] }).then(res => setArticles(res.data || res)).catch(() => {});
  }, []);
  
  const filteredArticles = activeCategory === '全部' 
    ? articles 
    : articles.filter(a => a.category === activeCategory);

  return (
    <div className="bg-white py-8 md:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 mb-3 md:mb-4">衛教知識中心</h2>
            <p className="text-sm md:text-base text-slate-500">專業醫師撰寫，讓您更了解口腔健康與假牙知識</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {categories.map(cat => (
              <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-full border text-xs md:text-sm font-bold transition-colors ${
                  activeCategory === cat 
                    ? 'bg-blue-800 border-blue-800 text-white' 
                    : 'border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filteredArticles.map(article => (
            <motion.div key={article.id} whileHover={{ y: -8 }} onClick={() => { setSelectedArticle(article); setView('ARTICLE'); }} className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer">
              <div className="aspect-video relative overflow-hidden">
                <img src={article.coverUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute top-3 md:top-4 left-3 md:left-4 bg-white/90 backdrop-blur px-2 md:px-3 py-1 rounded-lg text-[10px] md:text-xs font-bold text-blue-800">{article.category}</div>
              </div>
              <div className="p-5 md:p-6">
                <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2 md:mb-3 line-clamp-2">{article.title}</h3>
                <p className="text-slate-500 text-xs md:text-sm line-clamp-2 mb-4 md:mb-6">{article.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map(tag => <span key={tag} className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded">#{tag}</span>)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TermsPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/page-contents/TERMS').then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.value) setContent(data.value); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);
  return (
    <div className="bg-white py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-8">服務條款</h1>
        <div className="prose prose-slate max-w-none">
          {loading ? <p className="text-slate-400">載入中...</p>
            : content ? <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(content) as string) }} />
            : <p className="text-lg text-slate-600 leading-relaxed">內容建置中，敬請期待。</p>}
        </div>
      </div>
    </div>
  );
}

function PrivacyPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/page-contents/PRIVACY').then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.value) setContent(data.value); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);
  return (
    <div className="bg-white py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-8">隱私權政策</h1>
        <div className="prose prose-slate max-w-none">
          {loading ? <p className="text-slate-400">載入中...</p>
            : content ? <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(content) as string) }} />
            : <p className="text-lg text-slate-600 leading-relaxed">內容建置中，敬請期待。</p>}
        </div>
      </div>
    </div>
  );
}

function VideosPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/videos').then(r => r.json()).then(data => {
      setVideos(Array.isArray(data) ? data : []);
    }).catch(() => setVideos([])).finally(() => setLoading(false));
  }, []);

  const extractYoutubeId = (url: string) => {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
    return m ? m[1] : '';
  };

  return (
    <div className="bg-white py-8 md:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 mb-3 md:mb-4">看懂牙科，從這裡開始</h2>
          <p className="text-sm md:text-base text-slate-500">專業知識影音，讓你輕鬆了解牙科</p>
        </div>
        {loading ? (
          <div className="text-center py-20 text-slate-400">載入中...</div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 text-slate-400">尚無影片</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {videos.map(video => {
              const ytId = extractYoutubeId(video.videoUrl || '');
              return (
                <div key={video.id} className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all">
                  <div className="aspect-video relative overflow-hidden">
                    {ytId ? (
                      <iframe width="100%" height="100%"
                        src={`https://www.youtube.com/embed/${ytId}`}
                        title={video.title} frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen className="absolute inset-0" />
                    ) : (
                      <div className="absolute inset-0 bg-slate-100 flex items-center justify-center text-slate-400">無法載入影片</div>
                    )}
                  </div>
                  <div className="p-5 md:p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-slate-400 text-[10px] md:text-xs font-medium">
                        {video.createdAt ? new Date(video.createdAt).toLocaleDateString('zh-TW') : ''}
                      </span>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-900 line-clamp-2">{video.title}</h3>
                    {video.description && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{video.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleDetail({ setView, selectedArticle }: any) {
  return (
    <div className="bg-white py-8 md:py-16 lg:py-20">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <button onClick={() => setView('KNOWLEDGE')} className="text-slate-500 hover:text-blue-800 flex items-center gap-2 mb-6 md:mb-8 font-medium transition-colors text-sm md:text-base"><ArrowRight size={18} className="rotate-180" /> 返回衛教中心</button>
        <img src={selectedArticle?.coverUrl} className="w-full aspect-video object-cover rounded-xl md:rounded-[2rem] mb-6 md:mb-10 shadow-lg" referrerPolicy="no-referrer" />
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 mb-4 md:mb-8 leading-tight">{selectedArticle?.title}</h1>
        <div className="prose prose-slate max-w-none text-sm md:text-base text-slate-700 leading-loose space-y-4 md:space-y-6">
          <p className="text-base md:text-lg font-medium text-slate-600">{selectedArticle?.summary}</p>
          {(selectedArticle?.content || '').split('\n').filter((p: string) => p.trim()).map((p: string, i: number) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoginPage({ setRole, setView }: any) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6">
      <div className="max-w-md w-full bg-white rounded-3xl md:rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-8 md:p-10 text-center">
          <div className="w-14 md:w-16 h-14 md:h-16 bg-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg shadow-blue-800/20"><Activity className="text-white w-7 md:w-8 h-7 md:h-8" /></div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">歡迎回來</h2>
          <p className="text-sm md:text-base text-slate-500">請輸入您的帳號資訊以繼續</p>
        </div>
        <div className="px-8 md:px-10 pb-8 md:pb-10 space-y-4 md:space-y-6">
          <input type="text" placeholder="Email 或 手機號碼" className="w-full px-5 py-3.5 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 outline-none text-sm md:text-base" />
          <input type="password" placeholder="密碼" className="w-full px-5 py-3.5 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 outline-none text-sm md:text-base" />
          <button onClick={() => { setRole('MEMBER'); setView('CASE_MANAGEMENT'); }} className="w-full bg-navy-700 text-white py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-lg shadow-xl shadow-blue-900/20">登入系統</button>
        </div>
      </div>
    </div>
  );
}

function Recommendations({ setView, setSelectedClinic }: any) {
  const [clinics, setClinics] = useState<Clinic[]>([]);

  useEffect(() => {
    fetch('/api/clinics').then(r => r.ok ? r.json() : { data: [] }).then(res => setClinics(res.data || res)).catch(() => {});
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <button onClick={() => setView('CASE_MANAGEMENT')} className="text-slate-500 hover:text-blue-800 flex items-center gap-2 mb-6 md:mb-8 font-medium transition-colors text-sm md:text-base"><ArrowRight size={18} className="rotate-180" /> 返回案件管理</button>
      
      <div className="mb-8 md:mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">為您推薦的專業診所</h1>
          <span className="w-fit px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] md:text-xs font-bold tracking-wider">RECOMMENDED</span>
        </div>
        <p className="text-slate-500 text-base md:text-lg">根據您的諮詢結果，為您篩選出以下符合需求的診所。</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {clinics.map(clinic => (
          <div key={clinic.id} className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col h-full">
            <div className="w-12 md:w-14 h-12 md:h-14 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center text-blue-600 mb-4 md:mb-6"><Building2 size={24} /></div>
            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2">{clinic.name}</h3>
            <p className="text-xs md:text-sm text-slate-500 flex items-center gap-1 mb-4 md:mb-6"><MapPin size={14} /> {clinic.area}</p>
            <div className="flex flex-wrap gap-2 mb-6 md:mb-8">
              {clinic.services.map(s => <span key={s} className="text-[10px] md:text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{s}</span>)}
            </div>
            <div className="mt-auto">
              <button onClick={() => { setSelectedClinic(clinic); setView('CLINIC_DETAIL'); }} className="w-full py-3 md:py-4 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-lg shadow-blue-950/20">
                查看診所詳情
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberCaseManagement({ setView, currentCase, hasActiveCase, qaCompleted, setSelectedClinic, setSelectedCase }: any) {
  const [showConsultations, setShowConsultations] = useState(true);
  const [historicalCases, setHistoricalCases] = useState<Case[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);

  useEffect(() => {
    fetch('/api/cases?status=COMPLETED').then(r => r.ok ? r.json() : { data: [] }).then(res => setHistoricalCases(res.data || res)).catch(() => {});
    fetch('/api/consultations').then(r => r.ok ? r.json() : { data: [] }).then(res => setConsultations(res.data || res)).catch(() => {});
  }, []);

  if (!qaCompleted) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[80vh]">
        <div className="max-w-2xl w-full bg-white rounded-[3rem] shadow-xl border border-slate-100 p-12 text-center">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <Stethoscope className="text-blue-800 w-12 h-12" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-6">歡迎來到 Novadent</h1>
          <p className="text-xl text-slate-500 mb-10 leading-relaxed">
            為了推薦最適合您的專業牙醫診所，<br/>請花 1 分鐘完成簡單的初步諮詢。
          </p>
          <div className="bg-amber-50 text-amber-700 text-sm p-4 rounded-2xl mb-10 flex items-start gap-3 text-left">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <p>安心提示：本問卷僅供初步媒合與了解您的需求，不作為正式醫療診斷。您的資料將被妥善保密。</p>
          </div>
          <button 
            onClick={() => setView('QA')}
            className="w-full sm:w-auto px-12 py-5 bg-navy-700 text-white rounded-2xl font-bold text-xl shadow-xl shadow-blue-900/20 hover:bg-blue-950 transition-all"
          >
            開始初步諮詢
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <header className="mb-6 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">案件管理</h1>
        <p className="text-slate-500 mt-1 md:mt-2 text-sm md:text-base">追蹤您的假牙製作進度與歷史紀錄</p>
      </header>

      {/* ① 進行中案件 (Cases in progress) */}
      <section className="mb-8 md:mb-12">
        <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-4 md:mb-6 flex items-center gap-2">
          <Clock size={20} className="text-blue-800" /> 進行中案件 ({hasActiveCase ? 1 : 0})
        </h2>
        {hasActiveCase ? (
          <div 
            className="bg-white rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
            onClick={() => { setSelectedCase(null); setView('DETAIL'); }}
          >
            <div className="p-5 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="font-black text-lg md:text-xl text-slate-900">{currentCase.createdAt.split(' ')[0]} - {currentCase.description}</h3>
                    <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${STATUS_COLORS[currentCase.status as CaseStatus]}`}>{STATUS_LABELS[currentCase.status as CaseStatus]}</span>
                  </div>
                  <p className="text-slate-500 text-xs md:text-sm flex items-center gap-2">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[10px] md:text-xs">{currentCase.id}</span>
                    <Building2 size={14} /> {currentCase.clinicName}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 md:p-5 rounded-xl md:rounded-2xl border border-slate-100">
                <div>
                  <p className="text-[10px] md:text-xs text-slate-500 mb-1">案件類型</p>
                  <p className="font-bold text-xs md:text-sm text-slate-900">{CASE_TYPE_LABELS[currentCase.type as CaseType]}</p>
                </div>
                <div>
                  <p className="text-[10px] md:text-xs text-slate-500 mb-1">目前階段</p>
                  <p className="font-bold text-xs md:text-sm text-blue-800">{currentCase.currentStage}</p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-[10px] md:text-xs text-slate-500 mb-1">最後更新</p>
                  <p className="font-bold text-xs md:text-sm text-slate-900">{currentCase.updatedAt}</p>
                </div>
                <div className="flex items-center justify-end col-span-2 lg:col-span-1">
                  <button className="w-full lg:w-auto text-blue-800 font-bold text-xs md:text-sm flex items-center justify-center gap-1 hover:text-blue-900 bg-blue-50 px-4 py-2 rounded-xl transition-colors">
                    查看進度 <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl md:rounded-[2rem] p-6 md:p-8 text-center text-slate-500 text-sm md:text-base">
            目前沒有進行中的案件
          </div>
        )}
      </section>

      {/* ② 歷史案件 (Completed / History) */}
      <section className="mb-8 md:mb-12">
        <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-4 md:mb-6 flex items-center gap-2">
          <CheckCircle2 size={20} className="text-slate-400" /> 歷史案件 ({historicalCases.length})
        </h2>
        <div className="space-y-3 md:space-y-4">
          {historicalCases.map(hCase => (
            <div key={hCase.id} className="bg-white p-4 md:p-5 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-lg md:rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                  <CheckCircle2 size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="font-bold text-sm md:text-base text-slate-700">{hCase.createdAt.split(' ')[0]} - {hCase.description}</h4>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] md:text-[10px] font-bold tracking-wider">{CASE_TYPE_LABELS[hCase.type as CaseType]}</span>
                  </div>
                  <p className="text-slate-400 text-[10px] md:text-xs">
                    <span className="font-mono mr-2">{hCase.id}</span> <span className="hidden sm:inline">| 診所: {hCase.clinicName} | 完成於: {hCase.updatedAt}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedCase(hCase); setView('DETAIL'); }}
                className="w-full md:w-auto text-xs md:text-sm font-bold text-slate-500 hover:text-slate-900 px-4 py-2 rounded-lg md:rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 md:border-none"
              >
                查看紀錄
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ③ 諮詢紀錄 (Consultations) */}
      <section>
        <div 
          className="flex justify-between items-center cursor-pointer bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors"
          onClick={() => setShowConsultations(!showConsultations)}
        >
          <h2 className="text-base md:text-lg font-bold text-slate-700 flex items-center gap-2">
            <FileText size={18} className="text-blue-500" /> 諮詢紀錄 ({consultations.length})
          </h2>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={(e) => { e.stopPropagation(); setView('QA'); }} className="text-blue-800 font-bold text-[10px] md:text-sm flex items-center gap-1 hover:text-blue-900 transition-colors bg-blue-50 px-2 py-1 md:px-3 md:py-1.5 rounded-lg">
              <Plus size={14} /> <span className="hidden xs:inline">新增諮詢</span>
            </button>
            <ChevronRight size={18} className={`text-slate-400 transition-transform ${showConsultations ? 'rotate-90' : ''}`} />
          </div>
        </div>
        
        {showConsultations && (
          <div className="mt-4 space-y-3 pl-2 border-l-2 border-slate-100">
            {consultations.map(consult => (
              <div key={consult.id} className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] md:text-xs font-bold text-slate-400">{consult.createdAt}</span>
                  </div>
                  <p className="text-xs md:text-sm font-medium text-slate-900">{consult.summary}</p>
                </div>
                <button onClick={() => setView('RECOMMENDATIONS')} className="w-full md:w-auto text-[10px] md:text-xs font-bold text-white bg-blue-950 hover:bg-blue-900 px-4 py-2 rounded-lg transition-colors">
                  查看推薦診所
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Overview({ role, setView, currentCase, setCaseFilter }: any) {
  const [stats, setStats] = useState({ members: 0, clinics: 0, labs: 0, cases: 0 });
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [pendingPartners, setPendingPartners] = useState<any[]>([]);

  useEffect(() => {
    if (role === 'ADMIN') {
      Promise.all([
        fetch('/api/clinics').then(r => r.ok ? r.json() : { data: [] }),
        fetch('/api/labs').then(r => r.ok ? r.json() : { data: [] }),
        fetch('/api/cases').then(r => r.ok ? r.json() : { data: [] }),
      ]).then(([clinicsRes, labsRes, casesRes]) => {
        const clinicsData = clinicsRes.data || clinicsRes;
        const labsData = labsRes.data || labsRes;
        const casesData = casesRes.data || casesRes;
        setStats({ members: 0, clinics: clinicsData.length, labs: labsData.length, cases: casesData.length });
        setRecentCases(casesData.slice(0, 5));
        setPendingPartners([
          ...clinicsData.filter((c: any) => c.status === PartnerStatus.PENDING),
          ...labsData.filter((l: any) => l.status === PartnerStatus.PENDING),
        ]);
      }).catch(() => {});
    }
  }, [role]);

  if (role === 'ADMIN') {
    const statCards = [
      { label: '總會員數', value: stats.members, icon: <Users size={24} />, color: 'bg-blue-50 text-blue-600' },
      { label: '診所數', value: stats.clinics, icon: <Building2 size={24} />, color: 'bg-blue-100 text-blue-800' },
      { label: '牙技所數', value: stats.labs, icon: <Microscope size={24} />, color: 'bg-indigo-50 text-indigo-600' },
      { label: '本月新增案件', value: stats.cases, icon: <ClipboardList size={24} />, color: 'bg-amber-50 text-amber-600' },
    ];

    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">管理後台總覽</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">歡迎回來，系統管理員</p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
          {statCards.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm"
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 ${stat.color} rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4`}>
                {stat.icon}
              </div>
              <p className="text-xs md:text-sm font-bold text-slate-500 mb-1">{stat.label}</p>
              <p className="text-2xl md:text-3xl font-black text-slate-900">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-4 md:mb-6">最近新增案件</h3>
            <div className="space-y-3 md:space-y-4">
              {recentCases.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-xs md:text-sm truncate">{c.id}</p>
                    <p className="text-[10px] md:text-xs text-slate-500 truncate">{c.clinicName} → {c.labName || '未指派'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold whitespace-nowrap ml-2 ${STATUS_COLORS[c.status as CaseStatus]}`}>
                    {STATUS_LABELS[c.status as CaseStatus]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-4 md:mb-6">待審核帳號</h3>
            <div className="space-y-3 md:space-y-4">
              {pendingPartners.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg md:rounded-xl flex items-center justify-center border border-slate-200 text-slate-400 shrink-0">
                      {p.leadDoctorName ? <Building2 size={16} className="md:w-5 md:h-5" /> : <Microscope size={16} className="md:w-5 md:h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-xs md:text-sm truncate">{p.name}</p>
                      <p className="text-[10px] md:text-xs text-slate-500 truncate">{p.leadDoctorName || p.leadTechnicianName} | {p.city}</p>
                    </div>
                  </div>
                  <button onClick={() => setView('ADMIN_CLINICS')} className="text-[10px] md:text-xs font-bold text-blue-800 hover:text-blue-900 bg-white px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-blue-100 transition-colors whitespace-nowrap ml-2">
                    前往審核
                  </button>
                </div>
              ))}
              {pendingPartners.length === 0 && (
                <p className="text-center text-slate-400 py-6 md:py-8 text-xs md:text-sm">目前沒有待審核的帳號</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'CLINIC') {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">總覽儀表板</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">歡迎回來，{role} 管理員</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-white p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-800 shrink-0">
              <Activity size={28} className="sm:w-8 sm:h-8" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mb-1">進行中案件 (今年度)</p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900">12</p>
            </div>
          </div>
          <div className="bg-white p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 shrink-0">
              <CheckCircle2 size={28} className="sm:w-8 sm:h-8" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mb-1">已結案 (今年度)</p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900">48</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'INSURER') {
    const insurerCards = [
      { id: 'customer', label: '客戶管理', icon: <Users size={32} />, onClick: () => setView('INSURER_CUSTOMER_MGMT') },
      { id: 'policy', label: '保單管理', icon: <FileText size={32} /> },
      { id: 'progress', label: '保單進度查詢', icon: <Search size={32} /> },
      { id: 'claims', label: '理賠服務', icon: <BriefcaseMedical size={32} /> },
      { id: 'birthday', label: 'VIP生日禮兌換', icon: <Gift size={32} />, badge: '0', subtext: '未回覆' },
      { id: 'second', label: '指定第二順位', icon: <Users size={32} />, badge: '0', subtext: '等待處理件數' },
      { id: 'reminder', label: '保單繳費提醒', icon: <Bell size={32} /> },
    ];

    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <header className="mb-8 md:mb-12">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">總覽儀表板</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">歡迎回來，保險業務員</p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {insurerCards.map((card, i) => (
            <motion.div
              key={card.id}
              whileHover={{ y: -5, shadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
              onClick={card.onClick}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-6 group-hover:bg-blue-50 group-hover:text-blue-800 transition-colors">
                {card.icon}
              </div>
              <h3 className="font-bold text-slate-900 mb-1">{card.label}</h3>
              {card.badge && (
                <div className="mt-2">
                  <span className="text-2xl font-black text-blue-800">{card.badge}</span>
                  <p className="text-xs text-slate-400 font-medium">{card.subtext}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (role === 'LAB') {
    const cases = currentCase ? [currentCase] : [];
    const pendingCount = cases.filter(c => c.status === CaseStatus.ASSIGNED).length;
    const inProgressCount = cases.filter(c => c.status === CaseStatus.ACCEPTED || c.status === CaseStatus.IN_PROGRESS).length;
    const completedCount = cases.filter(c => c.status === CaseStatus.COMPLETED).length;

    const handleCardClick = (filter: string) => {
      setCaseFilter(filter);
      setView('CASE_MANAGEMENT');
    };

    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">總覽儀表板</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">歡迎回來，牙技所管理員</p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <motion.div 
            whileHover={{ y: -5 }}
            onClick={() => handleCardClick('PENDING')}
            className="bg-white p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 sm:gap-6 cursor-pointer relative group"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0 group-hover:bg-amber-100 transition-colors">
              <Clock size={28} className="sm:w-8 sm:h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs sm:text-sm font-bold text-slate-500">待接單</p>
                {pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {pendingCount}
                  </span>
                )}
              </div>
              <p className="text-3xl sm:text-4xl font-black text-slate-900">{pendingCount}</p>
            </div>
            <ChevronRight className="absolute right-4 sm:right-6 text-slate-200 group-hover:text-amber-500 transition-colors" />
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            onClick={() => handleCardClick('IN_PROGRESS')}
            className="bg-white p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 sm:gap-6 cursor-pointer group relative"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-800 shrink-0 group-hover:bg-blue-100 transition-colors">
              <Activity size={28} className="sm:w-8 sm:h-8" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mb-1">進行中</p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900">{inProgressCount}</p>
            </div>
            <ChevronRight className="absolute right-4 sm:right-6 text-slate-200 group-hover:text-blue-800 transition-colors" />
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            onClick={() => handleCardClick('COMPLETED')}
            className="bg-white p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 sm:gap-6 cursor-pointer group relative sm:col-span-2 lg:col-span-1"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 shrink-0 group-hover:bg-slate-100 transition-colors">
              <CheckCircle2 size={28} className="sm:w-8 sm:h-8" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mb-1">已結案</p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900">{completedCount}</p>
            </div>
            <ChevronRight className="absolute right-4 sm:right-6 text-slate-200 group-hover:text-slate-500 transition-colors" />
          </motion.div>
        </div>
      </div>
    );
  }

  // Default for ADMIN
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">總覽儀表板</h1>
          <p className="text-slate-500 mt-1">歡迎回來，{role} 管理員</p>
        </div>
      </header>
      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm p-8 text-center text-slate-500">
        總覽資訊建置中...
      </div>
    </div>
  );
}

function Dashboard({ role, setView, currentCase, qaCompleted, setSelectedClinic, hasActiveCase, setSelectedCase, caseFilter, setCaseFilter }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [allCases, setAllCases] = useState<Case[]>([]);

  useEffect(() => {
    fetch('/api/cases').then(r => r.ok ? r.json() : { data: [] }).then(res => setAllCases(res.data || res)).catch(() => {});
  }, []);

  if (role === 'MEMBER') {
    return <MemberCaseManagement setView={setView} currentCase={currentCase} qaCompleted={qaCompleted} setSelectedClinic={setSelectedClinic} hasActiveCase={hasActiveCase} setSelectedCase={setSelectedCase} />;
  }

  const filteredCases = allCases.filter(c => {
    // Search filter
    const matchesSearch = !searchTerm || 
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.clinicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.patientName && c.patientName.toLowerCase().includes(searchTerm.toLowerCase()));

    // Status filter
    let matchesStatus = true;
    if (caseFilter === 'PENDING') matchesStatus = c.status === CaseStatus.ASSIGNED;
    else if (caseFilter === 'IN_PROGRESS') matchesStatus = c.status === CaseStatus.ACCEPTED || c.status === CaseStatus.IN_PROGRESS;
    else if (caseFilter === 'COMPLETED') matchesStatus = c.status === CaseStatus.COMPLETED;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">案件管理中心</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">歡迎回來，{role === 'LAB' ? '牙技所' : role} 管理員</p>
        </div>
        {role === 'CLINIC' && (
          <button 
            onClick={() => setView('CREATE')} 
            className="bg-navy-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 w-full sm:w-auto"
          >
            <Plus size={20} /> 建立新案件
          </button>
        )}
      </header>
      
      <div className="space-y-6 mb-6 sm:mb-8">
        {/* Search Bar */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder={role === 'LAB' ? "搜尋案件編號或診所名稱..." : "搜尋患者姓名或牙技所名稱..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-800 shadow-sm text-sm sm:text-base"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200">
          {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((f) => (
            <button
              key={f}
              onClick={() => setCaseFilter(f)}
              className={`px-4 md:px-6 py-3 text-sm font-bold transition-all relative whitespace-nowrap ${
                caseFilter === f ? 'text-blue-800' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {f === 'ALL' ? '全部' : f === 'PENDING' ? '待接單' : f === 'IN_PROGRESS' ? '進行中' : '已結案'}
              {caseFilter === f && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-800" />}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList size={18} className="text-blue-800" /> 
              {caseFilter === 'ALL' ? '所有案件' : caseFilter === 'PENDING' ? '待接單案件' : caseFilter === 'IN_PROGRESS' ? '進行中案件' : '已結案案件'} 
              ({filteredCases.length})
            </h2>
          </div>
          {filteredCases.length > 0 ? (
            filteredCases.map(c => (
              <div key={c.id} className="p-4 md:p-6 hover:bg-slate-50 transition-colors cursor-pointer group border-b border-slate-100 last:border-0" onClick={() => { setSelectedCase(c); setView('DETAIL'); }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 md:gap-6 min-w-0">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${c.status === CaseStatus.COMPLETED ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-800'}`}>
                      {c.status === CaseStatus.COMPLETED ? <CheckCircle2 size={20} className="md:w-6 md:h-6" /> : <Microscope size={20} className="md:w-6 md:h-6" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-base md:text-lg text-slate-900 truncate">{c.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap ${STATUS_COLORS[c.status as CaseStatus]}`}>{STATUS_LABELS[c.status as CaseStatus]}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold tracking-wider whitespace-nowrap">{CASE_TYPE_LABELS[c.type as CaseType]}</span>
                      </div>
                      <p className="text-slate-500 text-xs md:text-sm truncate">
                        {role === 'LAB' ? (
                          <>診所: <span className="font-bold text-slate-700">{c.clinicName}</span></>
                        ) : (
                          <>患者: <span className="font-bold text-slate-700">{c.patientName}</span> | 牙技所: <span className="font-bold text-slate-700">{c.labName}</span></>
                        )}
                        <span className="mx-2 text-slate-300 hidden sm:inline">|</span>
                        <span className="block sm:inline mt-1 sm:mt-0">更新於: {c.updatedAt}</span>
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-blue-800 transition-colors shrink-0" />
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-500">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-slate-300" />
              </div>
              <p>沒有符合條件的案件</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CaseCreation({ setView, setHasActiveCase }: any) {
  const [labsList, setLabsList] = useState<Lab[]>([]);

  useEffect(() => {
    fetch('/api/labs').then(r => r.ok ? r.json() : { data: [] }).then(res => setLabsList(res.data || res)).catch(() => {});
  }, []);

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <button onClick={() => setView('CASE_MANAGEMENT')} className="text-slate-500 hover:text-blue-800 flex items-center gap-2 mb-6 font-medium transition-colors"><ArrowRight size={18} className="rotate-180" /> 返回列表</button>
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8 bg-blue-950 text-white">
          <h2 className="text-xl sm:text-2xl font-bold">建立製作案件</h2>
        </div>
        <div className="p-6 sm:p-8 space-y-4 sm:space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">患者姓名</label>
            <input type="text" placeholder="患者姓名 (去識別化)" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-800 text-sm sm:text-base" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">製作項目描述</label>
            <textarea rows={3} placeholder="製作項目描述" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-800 text-sm sm:text-base" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">合作牙技所</label>
            <select className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none appearance-none bg-white focus:ring-2 focus:ring-blue-800 text-sm sm:text-base">
              <option value="">請選擇合作牙技所</option>
              {labsList.map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
            </select>
          </div>
          <button onClick={() => { setHasActiveCase(true); setView('CASE_MANAGEMENT'); }} className="w-full bg-navy-700 text-white py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg shadow-blue-900/20 hover:bg-blue-950 transition-all mt-2">確認建立並指派</button>
        </div>
      </div>
    </div>
  );
}

function CaseDetail({ role, setView, currentCase, setCurrentCase }: any) {
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editPhoto, setEditPhoto] = useState<string | undefined>(undefined);

  const handleUpdateStep = (stepId: string) => {
    setCurrentCase((prev: Case) => {
      const newSteps = prev.mfgSteps.map(step => {
        if (step.id === stepId) {
          if (step.status === 'PENDING') return { ...step, status: 'IN_PROGRESS', updatedAt: new Date().toLocaleString('zh-TW', { hour12: false }).slice(0, 16) };
          if (step.status === 'IN_PROGRESS') return { ...step, status: 'COMPLETED', updatedAt: new Date().toLocaleString('zh-TW', { hour12: false }).slice(0, 16), note: '已完成此階段作業' };
        }
        return step;
      });
      
      const completedCount = newSteps.filter(s => s.status === 'COMPLETED').length;
      const progress = Math.round((completedCount / newSteps.length) * 100);
      const currentStage = newSteps.find(s => s.status === 'IN_PROGRESS')?.name || newSteps.find(s => s.status === 'PENDING')?.name || '完成與交付';

      return { ...prev, mfgSteps: newSteps, progress, currentStage };
    });
  };

  const handleEditStep = (step: MfgStep) => {
    setEditingStepId(step.id);
    setEditNote(step.note || '');
    setEditPhoto(step.photoUrl);
  };

  const handleSaveEdit = (stepId: string) => {
    setCurrentCase((prev: Case) => {
      const newSteps = prev.mfgSteps.map(step => {
        if (step.id === stepId) {
          return { 
            ...step, 
            note: editNote, 
            photoUrl: editPhoto,
            updatedAt: `${new Date().toLocaleString('zh-TW', { hour12: false }).slice(0, 16)} (已更新)`
          };
        }
        return step;
      });
      return { ...prev, mfgSteps: newSteps };
    });
    setEditingStepId(null);
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <button onClick={() => setView('CASE_MANAGEMENT')} className="text-slate-500 hover:text-blue-800 flex items-center gap-2 mb-6 sm:mb-8 font-medium transition-colors"><ArrowRight size={18} className="rotate-180" /> 返回</button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm lg:sticky lg:top-24">
            <h3 className="font-bold text-slate-900 mb-4 sm:mb-6">案件資訊</h3>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between text-sm gap-2"><span className="text-slate-500 shrink-0">案件編號</span><span className="font-bold break-all text-right">{currentCase.id}</span></div>
              <div className="flex justify-between text-sm gap-2"><span className="text-slate-500 shrink-0">案件類型</span><span className="font-bold text-blue-800 text-right">{CASE_TYPE_LABELS[currentCase.type]}</span></div>
              <div className="flex justify-between text-sm gap-2"><span className="text-slate-500 shrink-0">患者</span><span className="font-bold text-right">{currentCase.patientName}</span></div>
              <div className="flex justify-between text-sm gap-2"><span className="text-slate-500 shrink-0">診所</span><span className="font-bold text-right">{currentCase.clinicName}</span></div>
              <div className="flex justify-between text-sm gap-2"><span className="text-slate-500 shrink-0">牙技所</span><span className="font-bold text-right">{currentCase.labName}</span></div>
            </div>
            <div className="mt-6 sm:mt-8 pt-6 border-t border-slate-100">
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-slate-500">目前進度</span>
                <span className="text-blue-800">{currentCase.progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-800 rounded-full transition-all duration-1000" style={{ width: `${currentCase.progress}%` }}></div>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">製程時間軸</h3>
            {role === 'LAB' && <span className="text-xs sm:text-sm font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-full">牙技所更新模式</span>}
          </div>
          
          <div className="relative pl-6 sm:pl-8 space-y-6 sm:space-y-8 border-l-2 border-slate-100">
            {currentCase.mfgSteps.map((step: MfgStep, idx: number) => (
              <div key={idx} className="relative">
                <div className={`absolute -left-[33px] sm:-left-[41px] w-4 h-4 sm:w-5 sm:h-5 rounded-full border-4 border-white ${
                  step.status === 'COMPLETED' ? 'bg-blue-800' : 
                  step.status === 'IN_PROGRESS' ? 'bg-blue-500 animate-pulse' : 'bg-slate-200'
                }`} />
                
                <div className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all ${
                  step.status === 'IN_PROGRESS' ? 'border-blue-200 shadow-md' : 'border-slate-100 shadow-sm'
                }`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                    <h4 className={`font-bold text-base sm:text-lg ${step.status === 'PENDING' ? 'text-slate-400' : 'text-slate-900'}`}>{step.name}</h4>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-[10px] sm:text-xs font-bold ${
                        step.status === 'COMPLETED' ? 'bg-blue-100 text-blue-900' :
                        step.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {step.status === 'COMPLETED' ? '已完成' : step.status === 'IN_PROGRESS' ? '進行中' : '未開始'}
                      </span>
                      {role === 'LAB' && step.status === 'COMPLETED' && editingStepId !== step.id && (
                        <button 
                          onClick={() => handleEditStep(step)}
                          className="text-[10px] sm:text-xs font-bold text-slate-400 hover:text-blue-800 flex items-center gap-1 transition-colors"
                        >
                          編輯
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {step.updatedAt && <p className="text-[10px] sm:text-xs text-slate-400 mb-3 flex items-center gap-1"><Clock size={12} /> {step.updatedAt}</p>}
                  
                  {editingStepId === step.id ? (
                    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                      <div>
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-2">修改製程照片</label>
                        {editPhoto ? (
                          <div className="relative group inline-block w-full sm:w-auto">
                            <img src={editPhoto} className="rounded-xl w-full max-w-sm h-40 sm:h-48 object-cover border border-slate-200" referrerPolicy="no-referrer" />
                            <button 
                              onClick={() => setEditPhoto(undefined)}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 cursor-pointer transition-colors">
                            <Camera className="mx-auto text-slate-400 mb-2" size={24} />
                            <span className="text-sm text-slate-500 font-medium">點擊重新上傳照片</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">修改備註說明</label>
                        <textarea 
                          rows={2} 
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 outline-none text-sm focus:border-blue-800 focus:ring-1 focus:ring-blue-800" 
                          placeholder="修改備註事項..."
                        />
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setEditingStepId(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">
                          取消
                        </button>
                        <button onClick={() => handleSaveEdit(step.id)} className="flex-1 py-2.5 bg-navy-700 text-white rounded-xl text-sm font-bold hover:bg-blue-950 transition-colors shadow-lg shadow-blue-900/20">
                          儲存修改
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {step.photoUrl && (
                        <div className="mt-4 mb-3">
                          <img src={step.photoUrl} alt={step.name} className="rounded-xl w-full max-w-sm h-48 object-cover border border-slate-200" referrerPolicy="no-referrer" />
                        </div>
                      )}

                      {step.note && (
                        <div className="mt-3 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          {step.note}
                        </div>
                      )}
                    </>
                  )}

                  {/* LAB Interactive UI for non-completed steps */}
                  {role === 'LAB' && editingStepId !== step.id && (
                    <>
                      {step.status === 'PENDING' && (
                        <button onClick={() => handleUpdateStep(step.id)} className="mt-4 w-full py-3 bg-blue-950 text-white rounded-xl text-sm font-bold hover:bg-blue-900 transition-colors">
                          開始此階段製作
                        </button>
                      )}

                      {step.status === 'IN_PROGRESS' && (
                        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">上傳製程照片</label>
                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 cursor-pointer transition-colors">
                              <Camera className="mx-auto text-slate-400 mb-2" size={24} />
                              <span className="text-sm text-slate-500 font-medium">點擊上傳照片</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">備註說明</label>
                            <textarea rows={2} className="w-full p-3 rounded-xl border border-slate-200 outline-none text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="輸入此階段的備註事項..."></textarea>
                          </div>
                          <button onClick={() => handleUpdateStep(step.id)} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                            標記為完成並通知
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


