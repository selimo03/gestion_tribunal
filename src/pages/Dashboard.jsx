import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  ShieldAlert,
  Lock,
  Zap,
  Activity,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import { Card, StatCard, Badge, cn } from '../components/UI';
import { api } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const Dashboard = () => {
  const { user } = useAuthStore();
  const { can, isJuge, isProcureur, isAvocat, isGreffier, isHuissier, isNotaire, isGestionnaire, isAdmin } = usePermissions();

  // Titre de civilité selon le rôle
  const titreRole = isAdmin       ? 'Administrateur'
                  : isJuge        ? 'Juge'
                  : isProcureur   ? 'Procureur'
                  : isAvocat      ? 'Maître'
                  : isGreffier    ? 'Greffier'
                  : isNotaire     ? 'Notaire'
                  : isHuissier    ? 'Huissier'
                  : isGestionnaire? 'Gestionnaire'
                  : 'Utilisateur';
  const canSeeDemandes = can('demandes.view');
  const navigate = useNavigate();

  const [stats, setStats] = useState({ en_cours: 0, aujourd_hui: 0, jugee_mois: 0, en_attente: 0 });
  const [chartData, setChartData] = useState([]);
  const [recentAffaires, setRecentAffaires] = useState([]);
  const [upcomingAudiences, setUpcomingAudiences] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadError(null);
        const [s, chart, affaires, audiences] = await Promise.all([
          api.getStats(),
          api.getActivityData(),
          api.getRecentAffaires(3),
          api.getUpcomingAudiences(3),
        ]);
        setStats(s);
        setChartData(chart);
        setRecentAffaires(affaires);
        setUpcomingAudiences(audiences);

        // Charger demandes pending si l'utilisateur a les droits
        if (canSeeDemandes) {
          const d = await api.getDemandes();
          setDemandes((d || []).filter(x => x.statut_compte === 'pending').slice(0, 5));
        }
      } catch (err) {
        console.error('Dashboard load error:', err.message);
        setLoadError('Impossible de charger les données du tableau de bord. Vérifiez votre connexion.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canSeeDemandes]);

  // Mois courant en français pour l'affichage des audiences
  const moisFr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  return (
    <div className="space-y-10 pb-20 font-['Outfit']">
      {/* Erreur de chargement */}
      {loadError && (
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-sm font-bold">{loadError}</p>
          <button
            onClick={() => { setLoadError(null); setLoading(true); }}
            className="ml-auto text-xs font-black uppercase tracking-widest px-3 py-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-navy-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-navy-500/20 group">
         <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Zap size={180} />
         </div>
         <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/30">
               <ShieldAlert size={14} /> Système de Sécurité Actif
            </div>
            <h1 className="text-4xl font-black tracking-tight">
              Bonjour, {titreRole}{' '}
              <span className="text-blue-400">{user?.prenom} {user?.nom}</span>
            </h1>
            <p className="text-slate-400 font-medium max-w-xl">
               Le tribunal de N'Djamena est sous surveillance continue. Vous avez accès au registre national selon vos privilèges de {user?.role}.
            </p>
         </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Affaires en cours"  value={stats.en_cours}    icon={Briefcase}    color="blue"   onClick={() => navigate('/affaires')} />
          <StatCard title="Audiences ce jour"  value={stats.aujourd_hui} icon={Clock}        color="orange" onClick={() => navigate('/audiences')} />
          <StatCard title="Jugées ce mois"      value={stats.jugee_mois}  icon={CheckCircle2} color="green"  onClick={() => navigate('/affaires')} />
          <StatCard title="En appel"            value={stats.en_attente}  icon={AlertCircle}  color="navy"   onClick={() => navigate('/affaires')} />
        </div>
      )}

      {/* Widget Demandes en attente — uniquement pour super_admin/gestionnaire */}
      {canSeeDemandes && demandes.length > 0 && (
        <Card className="!p-0 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <UserCheck size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-navy-900 dark:text-white">
                    {demandes.length} demande{demandes.length > 1 ? 's' : ''} d'inscription en attente
                  </h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                    Validation requise par l'administration
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/demandes')}
                className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/30 transition-all"
              >
                Voir toutes <ArrowRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {demandes.map(d => (
                <div
                  key={d.id}
                  onClick={() => navigate('/demandes')}
                  className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-amber-500/20 hover:border-amber-500/50 cursor-pointer transition-all flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs">
                    {d.prenom?.[0]}{d.nom?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-navy-900 dark:text-white truncate">{d.prenom} {d.nom}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Demande : {d.role_demande}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-amber-500" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart — Fix 2 : données réelles */}
        <Card title="Évolution de l'activité" subtitle="Dossiers ouverts par mois" className="lg:col-span-2 border-none !p-8">
          <div className="h-[350px] mt-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '15px' }}
                  itemStyle={{ fontWeight: 800, fontSize: '14px' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Security / Audit Summary */}
        <Card title="État du Système" subtitle="Surveillance & Audit" className="border-none !p-8 bg-slate-50 dark:bg-slate-900/50">
           <div className="space-y-6 mt-6">
              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                       <Activity size={18} />
                    </div>
                    <span className="text-sm font-bold">Base de données</span>
                 </div>
                 <Badge variant="jugee">Connectée</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                       <Lock size={18} />
                    </div>
                    <span className="text-sm font-bold">Gestion RLS</span>
                 </div>
                 <Badge variant="en_cours">Activée</Badge>
              </div>
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Prochaines audiences — Fix 2 : données réelles */}
        <Card title="Prochaines audiences" subtitle="Planning immédiat" className="border-none !p-8">
          <div className="space-y-4 mt-6">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-[2rem] animate-pulse" />
              ))
            ) : upcomingAudiences.length === 0 ? (
              <p className="text-center text-slate-400 font-bold py-8">Aucune audience à venir</p>
            ) : (
              upcomingAudiences.map((aud) => {
                const dateObj = new Date(aud.date);
                return (
                  <div
                    key={aud.id}
                    onClick={() => navigate('/audiences')}
                    className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-[2rem] transition-all border border-transparent hover:border-blue-500/20 group cursor-pointer"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <p className="text-[9px] font-black text-blue-500 uppercase">{moisFr[dateObj.getMonth()]}</p>
                        <p className="text-xl font-black text-navy-900 dark:text-white">{dateObj.getDate()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-black text-navy-900 dark:text-white tracking-tight">{aud.num_dossier}</p>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          <span className="flex items-center gap-1"><Clock size={12} className="text-blue-500"/> {aud.heure}</span>
                          <span className="text-blue-600">{aud.salle}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Dossiers récents — Fix 2 : données réelles */}
        <Card title="Dossiers Récents" subtitle="Mises à jour prioritaires" className="border-none !p-8">
          <div className="space-y-4 mt-6">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-[2rem] animate-pulse" />
              ))
            ) : recentAffaires.length === 0 ? (
              <p className="text-center text-slate-400 font-bold py-8">Aucun dossier récent</p>
            ) : (
              recentAffaires.map((c) => (
                <div key={c.id} onClick={() => navigate('/affaires')} className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all cursor-pointer">
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center",
                      c.niveau_confidentiel && c.niveau_confidentiel !== 'public'
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-blue-500/10 text-blue-500"
                    )}>
                      {c.niveau_confidentiel && c.niveau_confidentiel !== 'public'
                        ? <Lock size={20} />
                        : <TrendingUp size={20} />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-navy-900 dark:text-white">{c.num_dossier}</p>
                        {c.niveau_confidentiel && c.niveau_confidentiel !== 'public' && (
                          <Badge variant="appelee">{c.niveau_confidentiel}</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{c.type_affaire}</p>
                    </div>
                  </div>
                  <Badge variant={c.statut}>{c.statut?.replace('_', ' ')}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
