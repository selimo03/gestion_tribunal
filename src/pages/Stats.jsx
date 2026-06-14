import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
import { Card, StatCard, Modal } from '../components/UI';
import { api } from '../services/api';
import { TrendingUp, Users, Briefcase, Award, Loader2, Gavel, FileText, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useNotification } from '../context/NotificationContext';

const Stats = () => {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [loading, setLoading]   = useState(true);
  const [kpi, setKpi]           = useState(null);
  const [statuts, setStatuts]   = useState([]);
  const [activity, setActivity] = useState([]);
  const [chargeJuges, setChargeJuges] = useState([]);
  const [isMagistratsModalOpen, setIsMagistratsModalOpen] = useState(false);
  const [isArchivesOpen, setIsArchivesOpen] = useState(false);
  const [archives, setArchives] = useState([]);
  const [archivesLoading, setArchivesLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Une seule vue par requête — fini les comptages manuels
        const [k, byStatut, monthly, juges] = await Promise.all([
          api.getKpiDashboard(),
          api.getStatsParStatut(),
          api.getActiviteMensuelle(),
          api.getChargeJuges(),
        ]);
        setKpi(k);
        setStatuts(byStatut);
        setActivity(monthly);
        setChargeJuges(juges);
      } catch (err) {
        console.error('Stats load error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Charge la liste des dossiers archivés (jugés ou classés)
  const openArchives = async () => {
    setIsArchivesOpen(true);
    setArchivesLoading(true);
    try {
      const { data } = await supabase
        .from('affaires')
        .select('id, num_dossier, type_affaire, description, statut, date_ouverture, date_cloture')
        .in('statut', ['jugee', 'classee'])
        .order('date_cloture', { ascending: false, nullsFirst: false });
      setArchives(data || []);
    } catch {
      setArchives([]);
    } finally {
      setArchivesLoading(false);
    }
  };

  // Indicateurs dérivés
  const total       = statuts.reduce((acc, s) => acc + s.value, 0);
  const jugees      = statuts.find(s => s.name === 'Jugées')?.value ?? 0;
  const classees    = statuts.find(s => s.name === 'Classées')?.value ?? 0;
  const efficacite  = total > 0 ? Math.round(((jugees + classees) / total) * 100) : 0;
  const tauxCloture = total > 0 ? Math.round((jugees / total) * 100) : 0;

  const handleDownloadReport = () => {
    const date = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const reportText = [
      `RAPPORT DE PERFORMANCE MENSUEL - JUSTICE TCHAD`,
      `Date : ${date}`,
      ``,
      `INDICATEURS CLÉS :`,
      `- Affaires en cours : ${kpi?.affaires_en_cours ?? 0}`,
      `- Audiences aujourd'hui : ${kpi?.audiences_aujourdhui ?? 0}`,
      `- Jugées ce mois : ${kpi?.jugees_ce_mois ?? 0}`,
      `- En appel : ${kpi?.affaires_en_appel ?? 0}`,
      `- Juges actifs : ${kpi?.juges_actifs ?? 0}`,
      `- Avocats actifs : ${kpi?.avocats_actifs ?? 0}`,
      `- Dossiers sensibles : ${kpi?.dossiers_sensibles ?? 0}`,
      `- Efficacité globale : ${efficacite}%`,
      `- Taux de clôture : ${tauxCloture}%`,
      ``,
      `RÉPARTITION PAR STATUT :`,
      ...statuts.map(s => `- ${s.name} : ${s.value} dossier(s)`),
      ``,
      `CHARGE DE TRAVAIL PAR JUGE :`,
      ...chargeJuges.slice(0, 10).map(j =>
        `- ${j.juge} (${j.grade}) : ${j.total_dossiers} dossier(s) — ${j.en_cours} en cours, ${j.rendus} rendus`
      ),
      ``,
      `Document certifié conforme par le greffe du Tribunal de Grande Instance de N'Djamena.`,
    ].join('\n');

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `Rapport_JusticeTchad_${date.replace(' ', '_')}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Rapport téléchargé avec succès', 'success');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 pb-20 font-['Outfit']">
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-navy-900 dark:text-white tracking-tight uppercase">Analyses & Statistiques</h1>
        <p className="text-slate-500 font-medium">Indicateurs alimentés directement par les vues SQL <code className="text-xs">vue_kpi_dashboard</code>.</p>
      </div>

      {/* KPIs depuis vue_kpi_dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Efficacité" value={`${efficacite}%`} icon={TrendingUp} color="green" />
        <div className="cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setIsMagistratsModalOpen(true)}>
          <StatCard title="Juges actifs" value={kpi?.juges_actifs ?? 0} icon={Users} color="blue" />
        </div>
        <div className="cursor-pointer hover:scale-[1.02] transition-transform" onClick={openArchives}>
          <StatCard title="Dossiers Archivés" value={jugees + classees} icon={Briefcase} color="navy" />
        </div>
        <StatCard title="Taux de clôture" value={`${tauxCloture}%`} icon={Award} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Affaires par Statut" subtitle="Répartition globale du registre">
          <div className="h-[350px] mt-6">
            {statuts.every(s => s.value === 0) ? (
              <div className="flex items-center justify-center h-full text-slate-400 font-bold">Aucun dossier enregistré</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statuts}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <YAxis hide />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[10, 10, 10, 10]}>
                    {statuts.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="Activité par Mois" subtitle="Dossiers ouverts cette année">
          <div className="h-[350px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity}>
                <defs>
                  <linearGradient id="colorStats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={4} fillOpacity={1} fill="url(#colorStats)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Nouveau : charge de travail par juge (vue_charge_juges) */}
      <Card title="Charge de travail par juge" subtitle="Vue SQL vue_charge_juges">
        {chargeJuges.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-bold">Aucun juge avec des dossiers</div>
        ) : (
          <div className="space-y-3 mt-4">
            {chargeJuges.slice(0, 8).map((j) => {
              const maxDossiers = Math.max(...chargeJuges.map(x => Number(x.total_dossiers)), 1);
              const pct = (Number(j.total_dossiers) / maxDossiers) * 100;
              return (
                <div key={j.juge_id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center"><Gavel size={14} /></div>
                      <div>
                        <p className="text-sm font-black text-navy-900 dark:text-white">{j.juge}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest">{j.grade?.replace(/_/g,' ')}{j.chambre ? ` · ${j.chambre}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                      <span className="text-blue-500">{j.en_cours} en cours</span>
                      <span className="text-emerald-500">{j.rendus} rendus</span>
                      <span className="text-navy-900 dark:text-white">{j.total_dossiers} total</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  {j.duree_moy_traitement_jours && (
                    <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest">
                      Durée moyenne : {j.duree_moy_traitement_jours} jours
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Rapport */}
      <Card title="Rapport de Performance">
        <div className="p-8 bg-blue-500/5 rounded-[2rem] border border-blue-500/10 space-y-4">
          <h4 className="text-xl font-black text-navy-900 dark:text-white tracking-tight">Synthèse automatique</h4>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            {total === 0
              ? "Aucun dossier n'est encore enregistré dans le système."
              : `Le registre contient ${total} dossier(s). ${jugees} ont été jugés, ${classees} classés, ${kpi?.affaires_en_cours ?? 0} en cours d'instruction. ${kpi?.dossiers_sensibles ?? 0} dossier(s) sensible(s) (confidentiel/secret).`
            }
          </p>
          <div className="pt-4">
            <button onClick={handleDownloadReport} className="btn btn-primary !rounded-2xl">
              Télécharger le rapport complet
            </button>
          </div>
        </div>
      </Card>

      {/* Modal juges */}
      <Modal isOpen={isMagistratsModalOpen} onClose={() => setIsMagistratsModalOpen(false)} title="Charge par juge">
        <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {chargeJuges.length === 0 ? (
            <p className="text-center text-slate-400 py-8 font-bold">Aucun juge enregistré</p>
          ) : (
            chargeJuges.map((j) => (
              <div key={j.juge_id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-navy-900 dark:text-white">{j.juge}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{j.grade?.replace(/_/g, ' ')}</p>
                </div>
                <span className="text-2xl font-black text-blue-500">{j.total_dossiers}</span>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Modal dossiers archivés */}
      <Modal isOpen={isArchivesOpen} onClose={() => setIsArchivesOpen(false)} title={`Dossiers archivés (${archives.length})`}>
        <div className="space-y-3 py-2 max-h-[65vh] overflow-y-auto pr-2">
          {archivesLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
          ) : archives.length === 0 ? (
            <p className="text-center text-slate-400 py-10 font-bold">Aucun dossier archivé pour le moment</p>
          ) : (
            archives.map((a) => (
              <div
                key={a.id}
                onClick={() => { setIsArchivesOpen(false); navigate(`/affaires/${a.id}`); }}
                className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-all border border-transparent hover:border-blue-500/30"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="font-black text-sm text-navy-900 dark:text-white">{a.num_dossier}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{a.type_affaire}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                    a.statut === 'jugee' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {a.statut === 'jugee' ? 'Jugée' : 'Classée'}
                  </span>
                </div>
                {a.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">{a.description}</p>
                )}
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                  <span className="flex items-center gap-1"><Calendar size={10}/> Ouv. {a.date_ouverture}</span>
                  {a.date_cloture && <span className="flex items-center gap-1"><Calendar size={10}/> Clôt. {a.date_cloture}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Stats;
