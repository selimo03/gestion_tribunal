import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, MoreVertical, Eye, FileText,
  Download, Calendar, ArrowUpDown, Lock, Loader2,
  Shield, ShieldAlert, ShieldCheck, FileSpreadsheet, FileDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, Table, Badge, Modal, ConfirmDialog, cn } from '../components/UI';
import { api } from '../services/api';
import { supabase } from '../lib/supabaseClient';
import { useNotification } from '../context/NotificationContext';

// Fix 6 : composant pagination simple
const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 mt-6 pb-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="px-5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-black disabled:opacity-40 hover:border-blue-500 transition-all"
      >←</button>
      <span className="text-sm font-bold text-slate-500 dark:text-slate-400 min-w-[90px] text-center">
        Page {page} / {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="px-5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-black disabled:opacity-40 hover:border-blue-500 transition-all"
      >→</button>
    </div>
  );
};

const PAGE_SIZE = 10;

// Méta des 4 niveaux de confidentialité
const NIVEAUX = {
  public:       { label: 'Public',       icon: Shield,       color: 'text-slate-400',  bg: 'bg-slate-100 dark:bg-slate-800' },
  restreint:    { label: 'Restreint',    icon: ShieldCheck,  color: 'text-blue-500',   bg: 'bg-blue-500/10' },
  confidentiel: { label: 'Confidentiel', icon: Lock,         color: 'text-amber-500',  bg: 'bg-amber-500/10' },
  secret:       { label: 'Secret',       icon: ShieldAlert,  color: 'text-red-500',    bg: 'bg-red-500/10' },
};

// Fix 11 : échappement CSV correct pour tous les champs
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const Affaires = () => {
  const navigate = useNavigate();

  // Fix 1 & 5 : données depuis Supabase
  const [cases, setCases]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  // UI state
  const [searchTerm, setSearchTerm]     = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { showToast } = useNotification();
  const [filterStatut, setFilterStatut] = useState('Tous');
  const [filterDate, setFilterDate]     = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [confirmDelete, setConfirmDelete]   = useState(null); // id de l'affaire à supprimer
  const [deleting, setDeleting]             = useState(false);

  // Pagination — Fix 6
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Form state
  const [newDossierType, setNewDossierType]   = useState('Pénal');
  const [newDossierDesc, setNewDossierDesc]   = useState('');
  const [newJugeId, setNewJugeId]             = useState('');
  const [newNiveau, setNewNiveau]             = useState('public');
  const [juges, setJuges]                     = useState([]);
  const [formError, setFormError]             = useState('');
  const [saving, setSaving]                   = useState(false);


  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fix 1 : chargement depuis Supabase avec pagination serveur
  const loadAffaires = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAffairesPaginated({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        statut: filterStatut,
        date: filterDate
      });
      setCases(res.data);
      setTotalCount(res.count);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterStatut, filterDate]);

  useEffect(() => {
    loadAffaires();
  }, [loadAffaires]);

  // Charge la liste des juges actifs pour le dropdown
  useEffect(() => {
    api.getJuges().then(setJuges).catch(() => setJuges([]));
  }, []);

  // Fix 8 : synchronisation temps-réel
  useEffect(() => {
    const channel = supabase
      .channel('affaires-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affaires' }, () => {
        loadAffaires();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadAffaires]);

  const currentPage = Math.min(page, totalPages);

  // Export CSV
  const handleExportCSV = async () => {
    showToast("Génération de l'export CSV...", 'info');
    try {
      const res = await api.getAffairesPaginated({
        page: 1,
        pageSize: 5000,
        search: debouncedSearch,
        statut: filterStatut,
        date: filterDate
      });
      const dataToExport = res.data;

      const header = ['Numéro', 'Description', 'Type', 'Ouverture', 'Magistrat', 'Statut', 'Confidentialité']
        .map(escapeCSV).join(',');
      const rows = dataToExport.map(c =>
        [c.num_dossier, c.description, c.type_affaire, c.date_ouverture, c.juge_nom, c.statut, c.niveau_confidentiel]
          .map(escapeCSV)
          .join(',')
      );
      // BOM UTF-8 pour Excel
      const csvContent = '﻿' + [header, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `affaires_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setIsExportOpen(false);
      showToast('Export CSV réussi', 'success');
    } catch (err) {
      showToast('Erreur export: ' + err.message, 'error');
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    showToast("Génération de l'export PDF...", 'info');
    try {
      const res = await api.getAffairesPaginated({
        page: 1,
        pageSize: 5000,
        search: debouncedSearch,
        statut: filterStatut,
        date: filterDate
      });
      const dataToExport = res.data;

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const today = new Date().toLocaleDateString('fr-FR');

      // En-tête
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text("Registre des Affaires Judiciaires", 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Tribunal de Grande Instance N'Djamena · Édition du ${today}`, 14, 24);
      doc.text(`${dataToExport.length} dossier(s) listé(s)`, 14, 29);

      // Tableau
      autoTable(doc, {
        startY: 34,
        head: [['Numéro', 'Type', 'Description', 'Ouverture', 'Magistrat', 'Statut', 'Niveau']],
        body: dataToExport.map(c => [
          c.num_dossier || '',
          c.type_affaire || '',
          (c.description || '').substring(0, 70) + ((c.description || '').length > 70 ? '…' : ''),
          c.date_ouverture || '',
          c.juge_nom || 'Non assigné',
          (c.statut || '').replace('_', ' '),
          c.niveau_confidentiel || 'public',
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        columnStyles: {
          0: { cellWidth: 28, fontStyle: 'bold' },
          2: { cellWidth: 90 },
        },
      });

      // Pied de page
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `JusticeTchad v2.0 — Page ${i}/${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
      }

      doc.save(`affaires_${new Date().toISOString().split('T')[0]}.pdf`);
      setIsExportOpen(false);
      showToast('Export PDF réussi', 'success');
    } catch (err) {
      showToast('Erreur export: ' + err.message, 'error');
    }
  };

  // Création via Supabase (l'ID est généré par la BDD)
  const handleNewDossier = async () => {
    if (!newDossierDesc.trim()) {
      setFormError('La description est obligatoire.');
      return;
    }
    if (!newJugeId) {
      setFormError('Le juge assigné est obligatoire.');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      const year   = new Date().getFullYear();
      const suffix = Date.now().toString().slice(-5);
      const newCase = {
        num_dossier:         `TND-${year}-${suffix}`,
        description:         newDossierDesc.trim(),
        type_affaire:        newDossierType,
        date_ouverture:      new Date().toISOString().split('T')[0],
        juge_id:             parseInt(newJugeId),
        statut:              'en_cours',
        niveau_confidentiel: newNiveau,
      };
      await api.createAffaire(newCase);
      setIsNewModalOpen(false);
      setNewDossierDesc('');
      setNewJugeId('');
      setNewNiveau('public');
      showToast('Dossier créé avec succès !', 'success');
      await loadAffaires();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeNiveau = async (c, nouveauNiveau) => {
    try {
      await api.updateNiveauConfidentiel(c.id, nouveauNiveau);
      setActiveDropdown(null);
      showToast(`Niveau changé en « ${NIVEAUX[nouveauNiveau].label} »`, 'success');
    } catch (err) {
      showToast('Erreur: ' + err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.deleteAffaire(confirmDelete);
      setConfirmDelete(null);
      setActiveDropdown(null);
      showToast('Dossier supprimé', 'success');
    } catch (err) {
      showToast('Erreur: ' + err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-[#020617] p-8 rounded-[3rem] glass-card border-none">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-navy-800 text-white rounded-2xl flex items-center justify-center">
                <FileText size={20} />
             </div>
             <h1 className="text-3xl font-black text-navy-900 dark:text-white tracking-tight">Registre des Affaires</h1>
          </div>
          <p className="text-slate-500 font-medium ml-1">Consultez et gérez l'ensemble des dossiers judiciaires.</p>
        </div>

        <div className="flex gap-4">
          <div className="relative">
            <button onClick={() => setIsExportOpen(!isExportOpen)} className="btn btn-secondary !rounded-2xl border-slate-200">
               <Download size={18} />
               <span className="text-sm font-bold uppercase tracking-wider">Exporter</span>
            </button>
            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden">
                <button
                  onClick={handleExportCSV}
                  className="w-full px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 text-left flex items-center gap-3 transition-colors border-b border-slate-100 dark:border-slate-800"
                >
                  <FileSpreadsheet size={18} className="text-emerald-500" />
                  <div>
                    <p className="text-sm font-black text-navy-900 dark:text-white">CSV</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Excel, tableurs</p>
                  </div>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 text-left flex items-center gap-3 transition-colors"
                >
                  <FileDown size={18} className="text-red-500" />
                  <div>
                    <p className="text-sm font-black text-navy-900 dark:text-white">PDF</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Impression, archivage</p>
                  </div>
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setIsNewModalOpen(true)} className="btn btn-primary !rounded-2xl shadow-xl shadow-blue-500/20 px-8">
             <Plus size={20} />
             <span className="text-sm font-bold uppercase tracking-wider">Nouveau Dossier</span>
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 glass-card p-4 rounded-3xl flex items-center gap-4 px-8 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
          <Search className="text-slate-400" size={24} />
          <input
            type="text"
            placeholder="Rechercher par numéro de dossier ou description..."
            className="bg-transparent border-none outline-none text-lg font-bold w-full placeholder:text-slate-400 dark:text-white"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>

        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={cn(
            "btn px-10 !rounded-3xl border transition-all",
            isFilterOpen ? "bg-navy-900 text-white border-navy-900" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
          )}
        >
          <Filter size={20} />
          <span className="text-sm font-bold uppercase tracking-wider">Filtres Avancés</span>
        </button>
      </div>

      {/* Filtres */}
      {isFilterOpen && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Statut</label>
            <select
              value={filterStatut}
              onChange={(e) => { setFilterStatut(e.target.value); setPage(1); }}
              className="w-full px-6 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl outline-none font-bold text-sm"
            >
              <option value="Tous">Tous les statuts</option>
              <option value="en_cours">En cours</option>
              <option value="jugee">Jugée</option>
              <option value="appelee">En appel</option>
              <option value="classee">Classée</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Période</label>
            <input
              type="month"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
              className="w-full px-6 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl outline-none font-bold text-sm"
            />
          </div>
          <div className="flex items-end gap-3">
            <button
              onClick={() => { setFilterStatut('Tous'); setFilterDate(''); setPage(1); setIsFilterOpen(false); showToast('Filtres réinitialisés', 'info'); }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 font-bold hover:bg-slate-200 transition-colors"
            >Réinitialiser</button>
            <button
              onClick={() => { setIsFilterOpen(false); showToast('Filtres appliqués', 'success'); }}
              className="flex-1 btn btn-primary py-3 rounded-xl text-xs"
            >Appliquer</button>
          </div>
        </div>
      )}

      {/* Tableau */}
      <Card className="p-2 border-none">
        {/* Fix 10 : état de chargement */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500 font-bold">{error}</div>
        ) : cases.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold">Aucun dossier trouvé</div>
        ) : (
          <>
            <Table
              headers={[
                <div className="flex items-center gap-2">Numéro <ArrowUpDown size={12} /></div>,
                "Description de l'affaire",
                'Type',
                'Ouverture',
                'Magistrat',
                'Statut',
                ''
              ]}
              data={cases}
              renderRow={(c) => (
                <tr key={c.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300">
                  <td className="py-6 px-8">
                     <div className="flex items-center gap-2">
                       <span className="text-sm font-black text-blue-600 dark:text-blue-400 tracking-tighter">{c.num_dossier}</span>
                       {(() => {
                         const meta = NIVEAUX[c.niveau_confidentiel] || NIVEAUX.public;
                         const Icon = meta.icon;
                         if (c.niveau_confidentiel === 'public') return null;
                         return <Icon size={12} className={meta.color} title={meta.label} />;
                       })()}
                     </div>
                  </td>
                  <td className="py-6 px-4">
                    <div className="max-w-xs overflow-hidden">
                       <p className="text-sm font-bold text-navy-900 dark:text-white truncate">{c.description}</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Tribunal de Grande Instance</p>
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                      {c.type_affaire}
                    </span>
                  </td>
                  <td className="py-6 px-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                       <Calendar size={14} />
                       {c.date_ouverture}
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center text-[10px] font-black">
                          {(c.juge_nom || '?').split(' ').map(n => n[0]).join('').substring(0, 2)}
                       </div>
                       <span className="text-sm font-black text-slate-700 dark:text-slate-300">{c.juge_nom || 'Non assigné'}</span>
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    <Badge variant={c.statut}>{(c.statut || '').replace('_', ' ')}</Badge>
                  </td>
                  <td className="py-6 px-8 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button
                        onClick={() => navigate(`/affaires/${c.id}`)}
                        className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                       >
                         <Eye size={16} />
                       </button>
                       <div className="relative">
                         <button
                          onClick={() => setActiveDropdown(activeDropdown === c.id ? null : c.id)}
                          className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-200 transition-all"
                         >
                           <MoreVertical size={16} />
                         </button>
                         {activeDropdown === c.id && (
                           <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden">
                             <div className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                               Niveau de confidentialité
                             </div>
                             {Object.entries(NIVEAUX).map(([key, meta]) => {
                               const Icon = meta.icon;
                               const active = c.niveau_confidentiel === key;
                               return (
                                 <button
                                   key={key}
                                   onClick={() => handleChangeNiveau(c, key)}
                                   className={cn(
                                     "w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-black uppercase tracking-widest flex items-center gap-2",
                                     active ? "bg-slate-50 dark:bg-slate-800" : ""
                                   )}
                                 >
                                   <Icon size={12} className={meta.color} />
                                   <span className={meta.color}>{meta.label}</span>
                                   {active && <span className="ml-auto text-[9px] text-slate-400">●</span>}
                                 </button>
                               );
                             })}
                             <button
                               className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-black uppercase tracking-widest text-red-600 border-t border-slate-100 dark:border-slate-800"
                               onClick={() => { setConfirmDelete(c.id); setActiveDropdown(null); }}
                             >
                               Archiver/Supprimer
                             </button>
                           </div>
                         )}
                       </div>
                    </div>
                  </td>
                </tr>
              )}
            />
            {/* Fix 6 : pagination */}
            <Pagination page={currentPage} totalPages={totalPages} onChange={(p) => { setPage(p); setActiveDropdown(null); }} />
          </>
        )}
      </Card>

      {/* Modal nouveau dossier — Fix 12 : validation */}
      <Modal isOpen={isNewModalOpen} onClose={() => { setIsNewModalOpen(false); setFormError(''); }} title="Ouvrir un nouveau dossier">
        <div className="space-y-6">
          {formError && (
            <div className="bg-red-500/10 text-red-500 text-xs font-bold p-3 rounded-xl border border-red-500/20">
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type d'Affaire</label>
            <select
              value={newDossierType}
              onChange={(e) => setNewDossierType(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold"
            >
              <option value="Pénal">Pénal</option>
              <option value="Civil">Civil</option>
              <option value="Commercial">Commercial</option>
              <option value="Administratif">Administratif</option>
              <option value="Famille">Famille</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Juge assigné <span className="text-red-400">*</span>
            </label>
            <select
              value={newJugeId}
              onChange={(e) => setNewJugeId(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold"
            >
              <option value="">— Sélectionner un juge —</option>
              {juges.map(j => (
                <option key={j.id} value={j.id}>
                  {j.prenom} {j.nom} · {j.grade?.replace(/_/g, ' ')}{j.chambre ? ` · ${j.chambre}` : ''}
                </option>
              ))}
            </select>
            {juges.length === 0 && (
              <p className="text-[10px] text-amber-500 font-bold ml-1">
                Aucun juge enregistré — ajoutez-en depuis la page Juges.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Niveau de confidentialité
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(NIVEAUX).map(([key, meta]) => {
                const Icon = meta.icon;
                const active = newNiveau === key;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setNewNiveau(key)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-2xl border font-bold text-xs uppercase tracking-wider transition-all",
                      active
                        ? `${meta.bg} ${meta.color} border-current shadow-sm`
                        : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-500 hover:border-blue-500/40'
                    )}
                  >
                    <Icon size={14} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Description initiale <span className="text-red-400">*</span>
            </label>
            <textarea
              value={newDossierDesc}
              onChange={(e) => setNewDossierDesc(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold min-h-[120px]"
              placeholder="Saisissez les faits du dossier..."
            />
          </div>
          <button
            onClick={handleNewDossier}
            disabled={saving}
            className="w-full btn btn-primary py-4 rounded-2xl disabled:opacity-60"
          >
            {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Créer le Dossier Judiciaire'}
          </button>
        </div>
      </Modal>

      {/* Confirmation suppression */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Supprimer ce dossier ?"
        message="Cette action est irréversible. Le dossier et toutes ses données associées seront définitivement supprimés."
        confirmLabel="Supprimer définitivement"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default Affaires;
