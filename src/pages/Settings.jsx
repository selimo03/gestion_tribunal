import React, { useState, useEffect } from 'react';
import {
  Bell, Shield, Database, Palette,
  RefreshCw, Download, AlertTriangle, CheckCircle
} from 'lucide-react';
import { Card, cn } from '../components/UI';
import { applyLanguageDirection } from '../lib/i18n';

import { useNotification } from '../context/NotificationContext';

const SETTINGS_KEY = 'justice_tchad_settings';

const defaultSettings = {
  emailNotifs:    true,
  smsNotifs:      false,
  autoBackup:     true,
  twoFactor:      true,
  theme:          'system',
  language:       'fr',
  sessionTimeout: '30',
  rlsStrict:      true,
};

const Settings = () => {
  const { showToast } = useNotification();
  const [saved, setSaved] = useState(false);

  // Fix 6 : chargement depuis localStorage
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch { return defaultSettings; }
  });

  // Sauvegarder à chaque changement
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Appliquer le thème immédiatement quand il change
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
      localStorage.setItem('darkMode', String(prefersDark));
    }
  }, [settings.theme]);

  // Appliquer la direction RTL/LTR à chaque changement de langue
  useEffect(() => {
    applyLanguageDirection();
  }, [settings.language]);

  // Recharger la page pour appliquer la traduction partout (les composants n'observent pas i18n)
  const handleLanguageChange = (value) => {
    setSettings(prev => ({ ...prev, language: value }));
    showToast('Langue mise à jour — rechargement en cours...', 'info');
    setTimeout(() => window.location.reload(), 700);
  };

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    showToast('Paramètre mis à jour et sauvegardé', 'success');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    showToast('Configuration enregistrée', 'success');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportConfig = () => {
    const data = JSON.stringify(settings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config_justice_tchad.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Configuration exportée');
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
    showToast('Paramètres réinitialisés aux valeurs par défaut');
  };

  return (
    <div className="space-y-10 pb-20 font-['Outfit']">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-navy-900 dark:text-white tracking-tight uppercase">Paramètres du Système</h1>
          <p className="text-slate-500 font-medium">Configurations globales, sécurité et préférences.</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-2xl text-sm font-bold border border-emerald-500/20">
            <CheckCircle size={16} /> Sauvegardé
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">

          {/* Notifications */}
          <Card title="Notifications & Alertes" icon={Bell}>
            <div className="space-y-4 pt-4">
              {[
                { key: 'emailNotifs', label: 'Notifications par Email', desc: 'Récapitulatif quotidien des audiences et affaires.' },
                { key: 'smsNotifs',   label: 'Alertes SMS d\'Urgence',  desc: 'Pour les modifications de planning de dernière minute.' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                  <div>
                    <p className="font-bold text-sm text-navy-900 dark:text-white">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <button onClick={() => handleToggle(key)}
                    className={cn('w-12 h-6 rounded-full transition-all relative', settings[key] ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700')}>
                    <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all', settings[key] ? 'right-1' : 'left-1')} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Sécurité */}
          <Card title="Sécurité & Accès" icon={Shield}>
            <div className="space-y-4 pt-4">
              {[
                { key: 'twoFactor', label: 'Authentification 2FA', desc: 'Obligatoire pour les magistrats et greffiers.' },
                { key: 'rlsStrict', label: 'Politique RLS Stricte', desc: 'Isolation totale des données entre les rôles.' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                  <div>
                    <p className="font-bold text-sm text-navy-900 dark:text-white">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <button onClick={() => handleToggle(key)}
                    className={cn('w-12 h-6 rounded-full transition-all relative', settings[key] ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700')}>
                    <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all', settings[key] ? 'right-1' : 'left-1')} />
                  </button>
                </div>
              ))}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiration de session</label>
                <select value={settings.sessionTimeout} onChange={e => handleChange('sessionTimeout', e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm text-navy-900 dark:text-white">
                  <option value="15" className="bg-white dark:bg-slate-800">15 minutes</option>
                  <option value="30" className="bg-white dark:bg-slate-800">30 minutes</option>
                  <option value="60" className="bg-white dark:bg-slate-800">1 heure</option>
                  <option value="120" className="bg-white dark:bg-slate-800">2 heures</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Base de données */}
          <Card title="Maintenance Base de Données" icon={Database}>
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                <div>
                  <p className="font-bold text-sm text-navy-900 dark:text-white">Sauvegarde Automatique</p>
                  <p className="text-xs text-slate-400 mt-0.5">Gérée par Supabase — sauvegarde quotidienne automatique.</p>
                </div>
                <button onClick={() => handleToggle('autoBackup')}
                  className={cn('w-12 h-6 rounded-full transition-all relative', settings.autoBackup ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700')}>
                  <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all', settings.autoBackup ? 'right-1' : 'left-1')} />
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button onClick={handleExportConfig} className="btn btn-secondary flex-1 !py-4 gap-2">
                  <Download size={18} /> Export Config JSON
                </button>
                <button onClick={handleReset} className="btn flex-1 !py-4 gap-2 border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl">
                  <RefreshCw size={18} /> Réinitialiser
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Colonne droite */}
        <div className="space-y-8">
          <Card title="Préférences" icon={Palette}>
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Langue</label>
                <select value={settings.language} onChange={e => handleLanguageChange(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm text-navy-900 dark:text-white">
                  <option value="fr" className="bg-white dark:bg-slate-800 text-navy-900 dark:text-white">Français (Officiel)</option>
                  <option value="ar" className="bg-white dark:bg-slate-800 text-navy-900 dark:text-white">العربية (Arabe)</option>
                  <option value="en" className="bg-white dark:bg-slate-800 text-navy-900 dark:text-white">English</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Thème</label>
                <select value={settings.theme} onChange={e => handleChange('theme', e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm text-navy-900 dark:text-white">
                  <option value="system" className="bg-white dark:bg-slate-800 text-navy-900 dark:text-white">Système Automatique</option>
                  <option value="light" className="bg-white dark:bg-slate-800 text-navy-900 dark:text-white">Mode Clair</option>
                  <option value="dark" className="bg-white dark:bg-slate-800 text-navy-900 dark:text-white">Mode Sombre</option>
                </select>
              </div>
            </div>
          </Card>

          <div className="bg-gradient-to-br from-navy-900 to-[#020617] p-8 rounded-[3rem] border border-white/5 text-white shadow-2xl space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">État de la Plateforme</p>
            <div className="space-y-3">
              {[
                { label: 'Hébergement',    value: 'Supabase Cloud',        color: 'text-emerald-400' },
                { label: 'Base de données', value: 'PostgreSQL 16',        color: 'text-blue-400' },
                { label: 'Cryptage',       value: 'AES-256 (pgcrypto)',    color: 'text-emerald-400' },
                { label: 'RLS',            value: 'Activé',                color: 'text-emerald-400' },
                { label: 'Audit',          value: 'SHA-256 chainé',        color: 'text-blue-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">{item.label}</span>
                  <span className={cn('font-mono font-black', item.color)}>{item.value}</span>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center gap-3 text-amber-400 text-xs font-bold bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
                <AlertTriangle size={18} className="shrink-0" />
                <span>Toute modification est journalisée dans l'audit légal.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
