import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Building2,
  Palette,
  Shield,
  ChevronRight,
  Globe,
  Check,
  Smartphone,
  Download,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/store/AuthContext';
import {
  useTheme,
  COLOR_THEMES_META,
  ColorTheme,
} from '@/hooks/useTheme';
import { usePWA } from '@/hooks/usePWA';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { toast } from 'sonner';

const SECTIONS = [
  { id: 'profile', label: 'User Profile', icon: User },
  { id: 'appearance', label: 'Theme & Accent Colors', icon: Palette },
  { id: 'pwa', label: 'PWA & Native App', icon: Smartphone },
  { id: 'property', label: 'Property & Company', icon: Building2 },
  { id: 'language', label: 'Language / भाषा', icon: Globe },
  { id: 'security', label: 'Security & Auth', icon: Shield },
];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState('appearance');
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const { user } = useAuth();
  const {
    colorTheme,
    setColorTheme,
    theme,
    setTheme,
  } = useTheme();

  const { isInstallable, isInstalled, isOnline, installApp } = usePWA();

  return (
    <div className="page-container">
      <PageHeader
        title="Settings & System Config"
        subtitle="Configure primary theme colors, PWA app install, company details, and operator profile"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation list */}
        <Card className="md:col-span-1 h-fit p-2">
          <div className="space-y-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  activeSection === s.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <s.icon size={16} />
                <span className="flex-1 text-left truncate">{s.label}</span>
                <ChevronRight size={14} className="opacity-40" />
              </button>
            ))}
          </div>
        </Card>

        {/* Form Body */}
        <div className="md:col-span-3">
          {/* 1. Theme & Accent Colors */}
          {activeSection === 'appearance' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Accent Color Palette */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette size={18} className="text-primary" />
                    Color Theme Presets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Customize the primary accent color across buttons, calendar, charts, and status indicators.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(Object.keys(COLOR_THEMES_META) as ColorTheme[]).map((cKey) => {
                      const color = COLOR_THEMES_META[cKey];
                      const isSelected = colorTheme === cKey;
                      return (
                        <button
                          key={cKey}
                          type="button"
                          onClick={() => setColorTheme(cKey)}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                            isSelected
                              ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
                              : 'border-border hover:border-foreground/30 bg-card'
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm border border-black/10 flex items-center justify-center text-white text-[10px]"
                            style={{ backgroundColor: color.hex }}
                          >
                            {isSelected && <Check size={12} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-foreground truncate">{color.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{color.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Dark / Light Mode */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Appearance Mode</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        theme === 'light'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:border-foreground/30'
                      }`}
                    >
                      <div className="w-full h-12 rounded-lg bg-stone-100 border border-stone-200 mb-3 shadow-inner" />
                      <div className="font-bold text-xs sm:text-sm text-foreground">☀️ Clean Light</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">High legibility daytime</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        theme === 'dark'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:border-foreground/30'
                      }`}
                    >
                      <div className="w-full h-12 rounded-lg bg-stone-900 border border-stone-800 mb-3 shadow-inner" />
                      <div className="font-bold text-xs sm:text-sm text-foreground">🌙 Deep Dark</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Late night operations</div>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 2. PWA App Installation & Offline */}
          {activeSection === 'pwa' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone size={18} className="text-primary" />
                    Progressive Web App (PWA) & Mobile Installation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground">Haven CRM Native App</h4>
                        {isInstalled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 flex items-center gap-1">
                            <Check size={12} /> Installed
                          </span>
                        ) : isInstallable ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600">
                            Ready to Install
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                            PWA Ready
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Run Haven CRM as a standalone app with offline caching, fast boot, and zero browser address bar clutter.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isInstallable && (
                        <Button onClick={installApp} className="gap-1.5 text-xs">
                          <Download size={14} /> Install on this Device
                        </Button>
                      )}
                      {isInstalled && (
                        <Button variant="outline" size="sm" disabled className="text-xs text-emerald-600 border-emerald-500/30">
                          <Check size={14} className="mr-1" /> Installed on Device
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Network Status */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2.5">
                      {isOnline ? (
                        <Wifi size={16} className="text-emerald-500" />
                      ) : (
                        <WifiOff size={16} className="text-amber-500" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          {isOnline ? 'Online (Real-time Sync)' : 'Offline (Cached Mode)'}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Service Worker is actively caching shell assets and fonts.
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                      sw: haven-crm-v1.2
                    </span>
                  </div>

                  {/* Installation Guide by OS */}
                  <div className="space-y-3 pt-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      How to Install on Different Devices
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                        <div className="font-bold text-xs text-foreground">🤖 Android / Chrome</div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Browser menu (3 dots) par tap karein aur <strong>"Add to Home Screen"</strong> ya <strong>"Install app"</strong> select karein.
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                        <div className="font-bold text-xs text-foreground">🍏 iPhone / Safari</div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Safari me <strong>Share button (⎋)</strong> tap karein aur scroll karke <strong>"Add to Home Screen"</strong> par tap karein.
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                        <div className="font-bold text-xs text-foreground">💻 Mac / Windows PC</div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Chrome ya Edge me URL bar ke right corner me <strong>Install icon (⊕)</strong> par click karein.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 3. Operator Profile */}
          {activeSection === 'profile' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Operator Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-4">
                    <Avatar fallback={getInitials(user?.name || 'Praveen')} className="w-16 h-16 text-lg" />
                    <div>
                      <h4 className="font-bold text-foreground text-base">{user?.name}</h4>
                      <p className="text-xs text-muted-foreground capitalize">Role: {user?.role}</p>
                      <Button size="sm" variant="outline" className="mt-2 text-xs h-7">
                        Upload Profile Photo
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 block">
                        Full Name
                      </label>
                      <Input defaultValue={user?.name || 'Praveen Singh'} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 block">
                        Email Address
                      </label>
                      <Input defaultValue={user?.email || 'praveen@uniquehavenhomes.com'} type="email" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 block">
                        Phone Number
                      </label>
                      <Input defaultValue="+91 91400 00000" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 block">
                        Base City
                      </label>
                      <Input defaultValue="Lucknow, Uttar Pradesh" />
                    </div>
                  </div>
                  <Button onClick={() => toast.success('Profile details saved!')}>
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 4. Property & Company */}
          {activeSection === 'property' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Company & Entity Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 block">
                        Company Legal Name
                      </label>
                      <Input defaultValue="The Unique Haven Homes Private Limited" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 block">
                        GSTIN
                      </label>
                      <Input defaultValue="09AAACT0000A1Z5" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 block">
                        Default Check-in
                      </label>
                      <Input defaultValue="14:00" type="time" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 block">
                        Default Check-out
                      </label>
                      <Input defaultValue="11:00" type="time" />
                    </div>
                  </div>
                  <Button onClick={() => toast.success('Company metadata updated!')}>
                    Update Company Profile
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 5. Language */}
          {activeSection === 'language' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Language / भाषा प्राथमिकता</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Haven CRM supports bilingual operations for ground managers & staff.
                  </p>
                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    <button
                      onClick={() => {
                        setLang('en');
                        toast.success('Language set to English');
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                        lang === 'en' ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-foreground">English</div>
                        <div className="text-xs text-muted-foreground">Default interface</div>
                      </div>
                      {lang === 'en' && <Check size={16} className="text-primary" />}
                    </button>

                    <button
                      onClick={() => {
                        setLang('hi');
                        toast.success('भाषा हिंदी सेट की गई');
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                        lang === 'hi' ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-foreground">हिन्दी (Hindi)</div>
                        <div className="text-xs text-muted-foreground">भारतीय भाषा</div>
                      </div>
                      {lang === 'hi' && <Check size={16} className="text-primary" />}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 6. Security */}
          {activeSection === 'security' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Security & Access Control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                      Current Password
                    </label>
                    <Input type="password" placeholder="••••••••" className="max-w-md" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                      New Password
                    </label>
                    <Input type="password" placeholder="••••••••" className="max-w-md" />
                  </div>
                  <Button onClick={() => toast.success('Password updated!')}>
                    Update Security Password
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
