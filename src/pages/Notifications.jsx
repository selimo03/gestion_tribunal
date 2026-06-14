import React, { useState, useEffect } from 'react';
import {
  Bell, Calendar, FileText, UserCheck, ShieldAlert,
  Clock, ChevronRight, CheckCheck, Inbox
} from 'lucide-react';
import { Card, Badge } from '../components/UI';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

// ─── Catégories de notifications ─────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',      label: 'Toutes',        icon: Bell },
  { id: 'audience', label: 'Audiences',     icon: Calendar },
  { id: 'affaire',  label: 'Affaires',      icon: FileText },
  { id: 'demande',  label: 'Demandes',      icon: UserCheck },
  { id: 'systeme',  label: 'Système',       icon: ShieldAlert },
];

const TYPE_COLORS = {
  audience: 'bg-blue-500/10 text-blue-500',
  affaire:  'bg-emerald-500/10 text-emerald-500',
  demande:  'bg-amber-500/10 text-amber-500',
  systeme:  'bg-slate-500/10 text-slate-500',
};

const TYPE_ICONS = {
  audience: Calendar,
  affaire:  FileText,
  demande:  UserCheck,
  systeme:  ShieldAlert,
};

// ─── Skeleton loader ──────────────────────────────────────────────────────────
const NotifSkeleton = () => (
  <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 animate-pulse">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
      </div>
    </div>
  </div>
);

// ─── Page principale ──────────────────────────────────────────────────────────
const Notifications = () => {
  const navigate = useNavigate();
  const [notifs, setNotifs]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [category, setCategory]   = useState('all');
  const [readIds, setReadIds]      = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('notif_read') || '[]'));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [audiences] = await Promise.all([
          api.getNotifications(),
        ]);

        // Audiences → type "audience"
        const all = [
          ...audiences.map(a => ({ ...a, type: 'audience', time: new Date() })),
        ];
        setNotifs(all);
      } catch (err) {
        console.error('Erreur notifications:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const markAllRead = () => {
    const ids = new Set(notifs.map(n => n.id));
    setReadIds(ids);
    localStorage.setItem('notif_read', JSON.stringify([...ids]));
  };

  const markRead = (id) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    localStorage.setItem('notif_read', JSON.stringify([...next]));
  };

  const filtered = category === 'all'
    ? notifs
    : notifs.filter(n => n.type === category);

  const unreadCount = notifs.filter(n => !readIds.has(n.id)).length;

  return (
    <div className="space-y-8 pb-20 page-enter font-['Outfit']">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-navy-900 dark:text-white tracking-tight">
            Notifications
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Tout est à jour'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20"
          >
            <CheckCheck size={16} />
            Tout marquer lu
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const active = category === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-500/50'
              }`}
            >
              <Icon size={14} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Liste */}
      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => <NotifSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center">
              <Inbox size={36} className="text-slate-400" />
            </div>
            <p className="text-slate-400 font-bold text-lg">Aucune notification</p>
            <p className="text-slate-400 text-sm">Tout est calme pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(n => {
              const isRead = readIds.has(n.id);
              const TypeIcon = TYPE_ICONS[n.type] || Bell;
              return (
                <div
                  key={n.id}
                  onClick={() => { markRead(n.id); navigate(n.path || '/dashboard'); }}
                  className={`flex items-start gap-4 p-5 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    !isRead ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''
                  }`}
                >
                  {/* Icône */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${TYPE_COLORS[n.type] || 'bg-slate-100 text-slate-500'}`}>
                    <TypeIcon size={20} />
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-bold truncate ${isRead ? 'text-slate-600 dark:text-slate-400' : 'text-navy-900 dark:text-white'}`}>
                        {n.title}
                      </p>
                      {!isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{n.desc}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={n.type === 'audience' ? 'en_cours' : n.type === 'demande' ? 'appelee' : 'default'}>
                        {n.type}
                      </Badge>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={10} />
                        À venir
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={16} className="text-slate-300 shrink-0 mt-1" />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Notifications;
