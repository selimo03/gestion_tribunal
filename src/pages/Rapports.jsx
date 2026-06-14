import React, { useState, useEffect, useRef } from 'react';
import {
  Download, BarChart2, Briefcase, Calendar,
  Printer, TrendingUp, CheckCircle2, Clock, AlertCircle,
  ChevronDown, FileBarChart
} from 'lucide-react';
import { Card, Badge } from '../components/UI';
import { api } from '../services/api';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-xl ${className}`} />
);

// ─── Composant principal ──────────────────────────────────────────────────────
const Rapports = () => {
  const [stats, setStats]         = useState(null);
  const [statuts, setStatuts]     = useState([]);
  const [affaires, setAffaires]   = useState([]);
  const [audiences, setAudiences] = useState([]);
  const [totalAffaires, setTotalAffaires]   = useState(0);
  const [totalAudiences, setTotalAudiences] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState('affaires');
  const printRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, st, afRes, auRes] = await Promise.all([
          api.getStats(),
          api.getStatsParStatut(),
          api.getAffairesPaginated({ page: 1, pageSize: 50 }),
          api.getAudiencesPaginated({ page: 1, pageSize: 50 }),
        ]);
        setStats(s);
        setStatuts(st);
        setAffaires(afRes.data);
        setTotalAffaires(afRes.count);
        setAudiences(auRes.data);
        setTotalAudiences(auRes.count);
      } catch (err) {
        console.error('Erreur chargement rapports:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ─── Export PDF via jsPDF ──────────────────────────────────────────────────
  const exportPDF = async () => {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

      // En-tête
      doc.setFillColor(2, 6, 23);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('TRIBUNAL DE GRANDE INSTANCE', 105, 15, { align: 'center' });
      doc.setFontSize(13);
      doc.text("N'DJAMENA — TCHAD", 105, 23, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Rapport généré le ${dateStr} — JusticeTchad v2.0`, 105, 32, { align: 'center' });

      doc.setTextColor(0, 0, 0);

      if (selectedReport === 'affaires') {
        // KPIs
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Rapport des Affaires', 14, 55);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Total affaires : ${totalAffaires}`, 14, 65);
        doc.text(`En cours : ${stats?.en_cours || 0}`, 14, 72);
        doc.text(`Jugées ce mois : ${stats?.jugee_mois || 0}`, 14, 79);

        // Table
        autoTable(doc, {
          startY: 90,
          head: [['N° Dossier', 'Type', 'Juge assigné', 'Statut', 'Ouverture']],
          body: affaires.slice(0, 50).map(a => [
            a.num_dossier || '—',
            a.type_affaire || '—',
            a.juge_nom || 'Non assigné',
            (a.statut || '').replace('_', ' ').toUpperCase(),
            a.date_ouverture
              ? new Date(a.date_ouverture).toLocaleDateString('fr-FR')
              : '—',
          ]),
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });

      } else if (selectedReport === 'audiences') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Rapport des Audiences', 14, 55);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Total audiences : ${totalAudiences}`, 14, 65);

        autoTable(doc, {
          startY: 75,
          head: [['Dossier', 'Date', 'Heure', 'Salle', 'Juge', 'Statut']],
          body: audiences.slice(0, 50).map(a => [
            a.num_dossier || '—',
            a.date_audience
              ? new Date(a.date_audience).toLocaleDateString('fr-FR')
              : '—',
            a.heure_debut || '—',
            a.salle || '—',
            a.juge_nom || '—',
            (a.statut || '').replace('_', ' ').toUpperCase(),
          ]),
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });

      } else if (selectedReport === 'statistiques') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Rapport Statistique', 14, 55);

        autoTable(doc, {
          startY: 70,
          head: [['Statut', 'Nombre', 'Pourcentage']],
          body: statuts.map(s => {
            const total = statuts.reduce((acc, x) => acc + x.value, 0);
            const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : '0';
            return [s.name, s.value, `${pct}%`];
          }),
          styles: { fontSize: 10, cellPadding: 4 },
          headStyles: { fillColor: [2, 6, 23], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });
      }

      // Pied de page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Page ${i} / ${pageCount} — Document confidentiel — JusticeTchad`,
          105, 290, { align: 'center' }
        );
      }

      const filename = `JusticeTchad_${selectedReport}_${now.toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Erreur export PDF:', err);
    } finally {
      setGenerating(false);
    }
  };

  // ─── Impression ────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ─── Types de rapports disponibles ────────────────────────────────────────
  const reportTypes = [
    {
      id: 'affaires',
      label: 'Rapport Affaires',
      desc: 'Liste complète des dossiers avec statuts',
      icon: Briefcase,
      color: 'blue',
      count: totalAffaires,
    },
    {
      id: 'audiences',
      label: 'Rapport Audiences',
      desc: 'Planning des audiences planifiées',
      icon: Calendar,
      color: 'emerald',
      count: totalAudiences,
    },
    {
      id: 'statistiques',
      label: 'Rapport Statistique',
      desc: 'Répartition et indicateurs clés',
      icon: BarChart2,
      color: 'amber',
      count: statuts.reduce((a, s) => a + s.value, 0),
    },
  ];

  const colorMap = {
    blue:    'bg-blue-500/10 text-blue-500 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    amber:   'bg-amber-500/10 text-amber-500 border-amber-500/20',
  };

  return (
    <div className="space-y-8 pb-20 page-enter font-['Outfit']">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy-900 dark:text-white tracking-tight">
            Rapports & Exports
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Générez et exportez les données en PDF
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:border-slate-300 transition-all"
          >
            <Printer size={16} />
            Imprimer
          </button>
          <button
            onClick={exportPDF}
            disabled={generating || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {generating ? 'Génération...' : 'Exporter PDF'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Affaires en cours', value: stats?.en_cours || 0, icon: Briefcase, color: 'text-blue-500' },
            { label: 'Audiences du jour', value: stats?.aujourd_hui || 0, icon: Clock, color: 'text-amber-500' },
            { label: 'Jugées ce mois', value: stats?.jugee_mois || 0, icon: CheckCircle2, color: 'text-emerald-500' },
            { label: 'En appel', value: stats?.en_attente || 0, icon: AlertCircle, color: 'text-orange-500' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                  <Icon size={20} className={item.color} />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                    <p className="text-2xl font-black text-navy-900 dark:text-white">{item.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sélection du type de rapport */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
          Type de rapport à exporter
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportTypes.map(rt => {
            const Icon = rt.icon;
            const isSelected = selectedReport === rt.id;
            return (
              <button
                key={rt.id}
                onClick={() => setSelectedReport(rt.id)}
                className={`text-left p-5 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-4 ${colorMap[rt.color]}`}>
                  <Icon size={22} />
                </div>
                <p className="font-black text-navy-900 dark:text-white">{rt.label}</p>
                <p className="text-xs text-slate-400 mt-1">{rt.desc}</p>
                <p className="text-2xl font-black mt-3 text-navy-900 dark:text-white">
                  {loading ? '—' : rt.count}
                  <span className="text-sm font-medium text-slate-400 ml-1">entrées</span>
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aperçu du rapport */}
      <Card className="!p-0 overflow-hidden print-show" ref={printRef}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <FileBarChart size={20} className="text-blue-500" />
          <div>
            <h3 className="font-black text-navy-900 dark:text-white">
              {reportTypes.find(r => r.id === selectedReport)?.label}
            </h3>
            <p className="text-xs text-slate-400">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {selectedReport === 'affaires' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    {['N° Dossier', 'Type', 'Juge', 'Statut', 'Date ouverture'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {affaires.slice(0, 20).map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3 font-bold text-blue-600 dark:text-blue-400">{a.num_dossier}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{a.type_affaire}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{a.juge_nom}</td>
                      <td className="px-5 py-3"><Badge variant={a.statut}>{a.statut?.replace('_', ' ')}</Badge></td>
                      <td className="px-5 py-3 text-slate-400">
                        {a.date_ouverture ? new Date(a.date_ouverture).toLocaleDateString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReport === 'audiences' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    {['Dossier', 'Date', 'Heure', 'Salle', 'Juge'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {audiences.slice(0, 20).map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3 font-bold text-emerald-600 dark:text-emerald-400">{a.num_dossier}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                        {a.date_audience ? new Date(a.date_audience).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{a.heure_debut || '—'}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{a.salle || '—'}</td>
                      <td className="px-5 py-3 text-slate-400">{a.juge_nom || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReport === 'statistiques' && (
              <div className="p-6 space-y-4">
                {statuts.map(s => {
                  const total = statuts.reduce((acc, x) => acc + x.value, 0);
                  const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                  return (
                    <div key={s.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-navy-900 dark:text-white">{s.name}</span>
                        <span className="font-black text-navy-900 dark:text-white">{s.value} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                      </div>
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: s.color || '#3b82f6' }}
                        />
                      </div>
                    </div>
                  );
                })}
                {statuts.length === 0 && (
                  <p className="text-center text-slate-400 py-10">Aucune donnée statistique</p>
                )}
              </div>
            )}

            {/* Message si trop d'entrées */}
            {((selectedReport === 'affaires' && totalAffaires > 20) ||
              (selectedReport === 'audiences' && totalAudiences > 20)) && (
              <div className="px-5 py-3 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-800/30 flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium">
                <ChevronDown size={16} />
                Aperçu limité à 20 entrées. L&apos;export PDF contient jusqu&apos;à 50 entrées.
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Statistiques par statut rapide */}
      {!loading && statuts.length > 0 && selectedReport !== 'statistiques' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statuts.map(s => (
            <div key={s.name} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-center">
              <div
                className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                style={{ backgroundColor: `${s.color}20`, color: s.color }}
              >
                <TrendingUp size={18} />
              </div>
              <p className="text-2xl font-black text-navy-900 dark:text-white">{s.value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{s.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Rapports;
