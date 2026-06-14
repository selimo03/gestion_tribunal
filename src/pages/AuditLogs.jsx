import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, Activity, Clock, Search, Lock,
  AlertTriangle, RefreshCw, Download, CheckCircle2, XCircle, Shield,
  Fingerprint, FileSpreadsheet, FileDown,
  Plus, Pencil, Trash2, Eye, LogIn, LogOut, FileText, UserCog, UserX
} from 'lucide-react';
import { Card, cn } from '../components/UI';
import { supabase } from '../lib/supabaseClient';
import { api } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../context/NotificationContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Styles alignés sur le CHECK constraint de audit_logs.action
// (cf. 04_audit_acces.sql + 08_fix_audit_chain.sql).
const ACTION_STYLE = {
  LECTURE:           { color: 'text-slate-400',   bg: 'bg-slate-500/10',   icon: Eye },
  CREATION:          { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: Plus },
  MODIFICATION:      { color: 'text-blue-400',    bg: 'bg-blue-500/10',    icon: Pencil },
  SUPPRESSION:       { color: 'text-red-400',     bg: 'bg-red-500/10',     icon: Trash2 },
  CONNEXION:         { color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    icon: LogIn },
  DECONNEXION:       { color: 'text-slate-400',   bg: 'bg-slate-500/10',   icon: LogOut },
  ECHEC_CONNEXION:   { color: 'text-orange-400',  bg: 'bg-orange-500/10',  icon: AlertTriangle },
  EXPORT:            { color: 'text-purple-400',  bg: 'bg-purple-500/10',  icon: FileText },
  CHANGEMENT_ROLE:   { color: 'text-amber-400',   bg: 'bg-amber-500/10',   icon: UserCog },
  ACCES_REFUSE:      { color: 'text-red-400',     bg: 'bg-red-500/10',     icon: XCircle },
  REFUS_INSCRIPTION: { color: 'text-rose-400',    bg: 'bg-rose-500/10',    icon: UserX },
  DEFAULT:           { color: 'text-slate-400',   bg: 'bg-slate-500/10',   icon: Clock },
};

// Actions considérées comme anomalies de sécurité (≠ décisions admin légitimes).
const ANOMALY_ACTIONS = new Set(['ACCES_REFUSE', 'ECHEC_CONNEXION']);

const getActionStyle = (action) => ACTION_STYLE[action] || ACTION_STYLE.DEFAULT;

const AuditLogs = () => {
  const { isAdmin } = usePermissions();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, anomalies: 0, today: 0 });

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifResult, setVerifResult] = useState(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { showToast } = useNotification();
  const LIMIT = 50;

  const handleVerifier = async () => {
    setVerifying(true);
    setVerifResult(null);
    try {
      const result = await api.verifierChaineAudit();
      setVerifResult(result);
      showToast(result.valide
        ? `Chaîne intègre — ${result.total} entrées vérifiées`
        : `Chaîne corrompue à partir de l'entrée ${result.premierIncoherent}`, result.valide ? 'success' : 'error');
    } catch (err) {
      showToast('Erreur de vérification: ' + err.message, 'error');
    } finally {
      setVerifying(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setHasMore(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(0, LIMIT - 1);

      if (error) throw error;
      const today = new Date().toISOString().split('T')[0];
      const rows = data || [];
      setLogs(rows);
      if (rows.length < LIMIT) setHasMore(false);
      setStats({
        total:     rows.length,
        anomalies: rows.filter(l => ANOMALY_ACTIONS.has(l.action)).length,
        today:     rows.filter(l => l.timestamp?.startsWith(today)).length,
      });
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const channel = supabase.channel('audit_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
        setLogs(prev => [payload.new, ...prev]);
        setStats(prev => ({ ...prev, total: prev.total + 1 }));
      }).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const filtered = logs.filter(l =>
    !search ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.cible_type?.toLowerCase().includes(search.toLowerCase()) ||
    l.role_au_moment?.toLowerCase().includes(search.toLowerCase())
  );

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(logs.length, logs.length + LIMIT - 1);
      const rows = data || [];
      setLogs(prev => [...prev, ...rows]);
      if (rows.length < LIMIT) setHasMore(false);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const exportCSV = () => {
    const csv = ['﻿Timestamp,Utilisateur,Rôle,Action,Cible,Hash',
      ...filtered.map(l => [
        l.timestamp,
        l.utilisateur_nom || '',
        l.role_au_moment || '',
        l.action,
        `${l.cible_type}:${l.cible_id || ''}`,
        l.hash_courant?.slice(0, 16) || ''
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportOpen(false);
    showToast('Export CSV réussi', 'success');
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const today = new Date().toLocaleString('fr-FR');

    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("Journal d'Audit Sécurisé", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Tribunal de Grande Instance N'Djamena · Export du ${today}`, 14, 24);
    doc.text(`${filtered.length} entrée(s) · Chaîne SHA-256 immuable`, 14, 29);

    autoTable(doc, {
      startY: 34,
      head: [['Date', 'Utilisateur', 'Rôle', 'Action', 'Cible', 'Hash (16c)']],
      body: filtered.map(l => [
        l.timestamp ? new Date(l.timestamp).toLocaleString('fr-FR') : '—',
        l.utilisateur_nom || '—',
        l.role_au_moment || '—',
        l.action,
        `${l.cible_type}${l.cible_id ? ':' + l.cible_id.toString().slice(0, 8) : ''}`,
        l.hash_courant?.slice(0, 16) || '—',
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      columnStyles: {
        5: { font: 'courier', fontSize: 6 },
      },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `JusticeTchad · Audit immuable · Page ${i}/${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    }

    doc.save(`audit_${new Date().toISOString().split('T')[0]}.pdf`);
    setIsExportOpen(false);
    showToast('Export PDF réussi', 'success');
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
          <Lock size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-black text-navy-900 dark:text-white">Accès Refusé</h2>
        <p className="text-slate-500 text-sm">Seul le Super Administrateur peut consulter les logs d'audit.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 font-['Outfit']">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <ShieldAlert size={20} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-navy-900 dark:text-white tracking-tight uppercase">
              Audit & Traçabilité
            </h1>
          </div>
          <p className="text-slate-500 font-medium ml-1">Logs immuables — chaîne cryptographique SHA-256.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={fetchLogs} className="btn btn-secondary !py-2 !px-4 text-sm">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
          <button
            onClick={handleVerifier}
            disabled={verifying}
            className={cn(
              "btn !py-2 !px-4 text-sm disabled:opacity-60",
              verifResult?.valide === true  ? "bg-emerald-500 text-white hover:bg-emerald-600" :
              verifResult?.valide === false ? "bg-red-500 text-white hover:bg-red-600" :
                                              "bg-navy-800 text-white hover:bg-navy-900"
            )}
          >
            {verifying ? <RefreshCw size={16} className="animate-spin" /> : <Fingerprint size={16} />}
            {verifying ? 'Vérification…' :
             verifResult?.valide === true  ? `✓ Chaîne intègre (${verifResult.total})` :
             verifResult?.valide === false ? `✗ Corrompue` :
                                             "Vérifier l'intégrité"}
          </button>
          <div className="relative">
            <button onClick={() => setIsExportOpen(!isExportOpen)} className="btn btn-primary !py-2 !px-4 text-sm">
              <Download size={16} /> Exporter
            </button>
            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden">
                <button
                  onClick={exportCSV}
                  className="w-full px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-left flex items-center gap-3 transition-colors border-b border-slate-100 dark:border-slate-800"
                >
                  <FileSpreadsheet size={16} className="text-emerald-500" />
                  <span className="text-xs font-black text-navy-900 dark:text-white uppercase tracking-widest">CSV</span>
                </button>
                <button
                  onClick={exportPDF}
                  className="w-full px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-left flex items-center gap-3 transition-colors"
                >
                  <FileDown size={16} className="text-red-500" />
                  <span className="text-xs font-black text-navy-900 dark:text-white uppercase tracking-widest">PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bandeau résultat vérification */}
      {verifResult && (
        <div className={cn(
          "p-5 rounded-2xl border flex items-center gap-4",
          verifResult.valide
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
            : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
        )}>
          {verifResult.valide
            ? <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
            : <XCircle size={24} className="text-red-500 shrink-0" />}
          <div className="flex-1">
            <p className="font-black uppercase tracking-widest text-xs">
              {verifResult.valide ? 'Chaîne SHA-256 intègre' : 'Chaîne SHA-256 corrompue'}
            </p>
            <p className="text-xs font-medium mt-1">
              {verifResult.valide
                ? `Les ${verifResult.total} entrées ont été re-hashées et concordent avec la chaîne stockée. Aucune altération détectée.`
                : `Première incohérence détectée à l'entrée ${verifResult.premierIncoherent}. Les hashes calculés ne correspondent plus.`}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="!bg-navy-900 text-white border-none">
          <div className="flex items-center justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</p>
              <p className="text-4xl font-black mt-1">{stats.total}</p></div>
            <Shield size={32} className="text-blue-400 opacity-60" />
          </div>
        </Card>
        <Card className="border border-orange-500/20 bg-orange-500/5">
          <div className="flex items-center justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Anomalies</p>
              <p className="text-4xl font-black mt-1 text-orange-400">{stats.anomalies}</p></div>
            <AlertTriangle size={32} className="text-orange-400 opacity-60" />
          </div>
        </Card>
        <Card className="border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aujourd'hui</p>
              <p className="text-4xl font-black mt-1 text-emerald-400">{stats.today}</p></div>
            <Activity size={32} className="text-emerald-400 opacity-60" />
          </div>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="Filtrer par action, rôle, type..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-medium text-slate-700 dark:text-slate-300" />
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={24} className="animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Shield size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold">Aucun log trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  {['Timestamp','Rôle','Action','Cible','Hash'].map(h => (
                    <th key={h} className="text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const s = getActionStyle(log.action);
                  const Icon = s.icon;
                  return (
                    <tr key={log.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400 shrink-0" />
                          <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-navy-500/10 text-navy-400 border-navy-500/20">
                          {log.role_au_moment || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl w-fit', s.bg)}>
                          <Icon size={13} className={s.color} />
                          <span className={cn('text-[10px] font-black uppercase tracking-wider', s.color)}>{log.action}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-slate-500">
                        {log.cible_type ? <><span className="text-blue-400">{log.cible_type}</span><span className="text-slate-400"> #{log.cible_id?.slice(0,8)}</span></> : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                          {log.hash_precedent ? log.hash_precedent.slice(0,16) + '...' : 'GENESIS'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Charger plus */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn btn-secondary !rounded-2xl px-10 disabled:opacity-60"
          >
            {loadingMore ? 'Chargement...' : `Charger plus (${logs.length} affichés)`}
          </button>
        </div>
      )}

      <div className="flex items-center justify-center gap-3 py-4 text-slate-500">
        <Lock size={14} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">
          Logs immuables — SHA-256 chainé — Toute modification est détectable
        </p>
      </div>
    </div>
  );
};

export default AuditLogs;
