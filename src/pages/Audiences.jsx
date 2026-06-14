import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft, ChevronRight,
  Clock, Search, Filter, Plus, LayoutGrid, List, Loader2
} from 'lucide-react';
import { getISOWeek } from 'date-fns';
import { Card, Badge, Modal, Table, cn } from '../components/UI';
import { api } from '../services/api';
import { supabase } from '../lib/supabaseClient';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../context/NotificationContext';

// Mapping affichage ↔ valeur DB pour le type d'audience
const TYPES_AUDIENCE = [
  { value: 'initiale',    label: 'Première comparution' },
  { value: 'instruction', label: 'Instruction' },
  { value: 'plaidoirie',  label: 'Plaidoirie' },
  { value: 'verdict',     label: 'Verdict' },
  { value: 'appel',       label: 'Appel' },
];

const labelType = (v) => TYPES_AUDIENCE.find(t => t.value === v)?.label || v;

const Audiences = () => {
  const { can } = usePermissions();
  const { showToast } = useNotification();
  const canCreate = can('audiences.create');

  const [viewMode, setViewMode]         = useState('week');
  const [audiences, setAudiences]       = useState([]);
  const [affaires, setAffaires]         = useState([]);
  const [juges, setJuges]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterType, setFilterType]     = useState('Tous');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [weekOffset, setWeekOffset]     = useState(0);
  const [saving, setSaving]             = useState(false);
  const [formError, setFormError]       = useState('');

  // Form state — aligné sur le schéma BDD
  const [newAffaireId, setNewAffaireId] = useState('');
  const [newJugeId, setNewJugeId]       = useState('');
  const [newType, setNewType]           = useState('instruction');
  const [newDate, setNewDate]           = useState(() => new Date().toISOString().split('T')[0]);
  const [newHeureDebut, setNewHeureDebut] = useState('09:00');
  const [newHeureFin, setNewHeureFin]   = useState('10:00');
  const [newSalle, setNewSalle]         = useState('');

  const loadAudiences = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAllAudiences();
      setAudiences(data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAudiences(); }, [loadAudiences]);

  // Charge les affaires et juges pour les dropdowns du formulaire
  useEffect(() => {
    api.getAffaires().then(setAffaires).catch(() => setAffaires([]));
    api.getJuges().then(setJuges).catch(() => setJuges([]));
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('audiences-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audiences' }, () => {
        loadAudiences();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAudiences]);

  const filteredAudiences = audiences.filter(aud => {
    const matchSearch = (aud.num_dossier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (aud.salle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        labelType(aud.type_audience || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filterType === 'Tous' || aud.type_audience === filterType;
    return matchSearch && matchFilter;
  });

  const getWeekDates = (offset) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday + offset * 7);
    const result = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      result.push({
        label: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        date:  d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('fr-FR', { weekday: 'long' }),
      });
    }
    return result;
  };

  const weekDaysData = getWeekDates(weekOffset);
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

  const firstDay = new Date(weekDaysData[0].date);
  const moisFr   = firstDay.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const weekNum  = getISOWeek(firstDay);

  const handleAddAudience = async () => {
    if (!newAffaireId) { setFormError('Le dossier est obligatoire.'); return; }
    if (!newSalle.trim()) { setFormError('La salle est obligatoire.'); return; }
    if (!newDate) { setFormError('La date est obligatoire.'); return; }
    if (newHeureFin && newHeureFin <= newHeureDebut) {
      setFormError("L'heure de fin doit être après l'heure de début."); return;
    }
    setFormError('');
    setSaving(true);
    try {
      await api.programAudience({
        affaire_id:    parseInt(newAffaireId),
        juge_id:       newJugeId ? parseInt(newJugeId) : null,
        type_audience: newType,
        date_audience: newDate,
        heure_debut:   newHeureDebut,
        heure_fin:     newHeureFin || null,
        salle:         newSalle.trim(),
        statut:        'planifiee',
      });
      setIsAddModalOpen(false);
      setNewAffaireId(''); setNewJugeId(''); setNewSalle('');
      setNewHeureDebut('09:00'); setNewHeureFin('10:00');
      showToast('Audience programmée avec succès !', 'success');
      await loadAudiences();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10 pb-20 font-['Outfit']">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-navy-800 text-white rounded-2xl flex items-center justify-center">
                <CalendarIcon size={20} />
             </div>
             <h1 className="text-3xl font-black text-navy-900 dark:text-white tracking-tight uppercase">Planning Judiciaire</h1>
          </div>
          <p className="text-slate-500 font-medium ml-1">Calendrier hebdomadaire des séances et audiences.</p>
        </div>

        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setViewMode('week')}
            className={cn("flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
              viewMode === 'week' ? "bg-navy-800 text-white shadow-lg shadow-navy-500/20" : "text-slate-400 hover:text-navy-600")}
          >
            <LayoutGrid size={14} /> Semaine
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn("flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
              viewMode === 'list' ? "bg-navy-800 text-white shadow-lg shadow-navy-500/20" : "text-slate-400 hover:text-navy-600")}
          >
            <List size={14} /> Liste
          </button>
        </div>
      </div>

      {/* Contrôles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Rechercher par numéro de dossier, salle ou type..."
            className="w-full pl-14 pr-6 py-4 rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700 dark:text-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn("btn flex-1 !rounded-[1.5rem] border transition-all", isFilterOpen ? "bg-navy-900 text-white border-navy-900" : "btn-secondary border-slate-200")}
          >
            <Filter size={18} /> Filtres
          </button>
          {canCreate && (
            <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary flex-1 !rounded-[1.5rem] shadow-xl shadow-blue-500/20">
              <Plus size={18} /> Programmer
            </button>
          )}
        </div>
      </div>

      {/* Navigation semaine */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 transition-all"><ChevronLeft size={20}/></button>
          <h2 className="text-xl font-black text-navy-900 dark:text-white uppercase tracking-tight capitalize">
            {moisFr} • <span className="text-blue-500">Semaine {weekNum}</span>
          </h2>
          <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 transition-all"><ChevronRight size={20}/></button>
        </div>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)} className="text-xs font-black text-blue-500 hover:underline">
            Semaine actuelle
          </button>
        )}
      </div>

      {/* Filtres */}
      {isFilterOpen && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type d'audience</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full px-6 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none font-bold text-sm dark:text-white">
              <option value="Tous">Tous les types</option>
              {TYPES_AUDIENCE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setIsFilterOpen(false); showToast('Filtre appliqué', 'info'); }} className="w-full btn btn-primary py-3 rounded-xl text-xs">Appliquer le filtre</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
      ) : viewMode === 'week' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {days.map((day, i) => (
            <div key={day} className="space-y-6">
              <div className="text-center p-6 glass-card rounded-[2rem] border-none">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">{day}</p>
                <p className="text-2xl font-black dark:text-white tracking-tighter">{weekDaysData[i].label}</p>
              </div>
              <div className="space-y-4 min-h-[400px]">
                {filteredAudiences
                  .filter(aud => aud.date_audience === weekDaysData[i].date)
                  .map(aud => (
                    <div key={aud.id} className="group glass-card p-6 rounded-[2rem] border-none hover:translate-y-[-4px] transition-all cursor-pointer relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{labelType(aud.type_audience)}</span>
                        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase text-slate-500">{aud.salle}</div>
                      </div>
                      <p className="text-sm font-black text-navy-900 dark:text-white mb-4 group-hover:text-blue-600 transition-colors">{aud.num_dossier}</p>
                      <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-blue-500" />
                          <span>{aud.heure_debut}{aud.heure_fin ? ` – ${aud.heure_fin}` : ''}</span>
                        </div>
                      </div>
                    </div>
                  ))
                }
                {filteredAudiences.filter(aud => aud.date_audience === weekDaysData[i].date).length === 0 && (
                  <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] flex items-center justify-center grayscale opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aucune séance</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-2 border-none">
          {filteredAudiences.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-bold">Aucune audience trouvée</div>
          ) : (
            <Table
              headers={["Dossier", "Type d'audience", 'Date & Heure', 'Salle', '']}
              data={filteredAudiences}
              renderRow={(aud) => (
                <tr key={aud.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300">
                  <td className="py-6 px-8 font-black text-blue-600 dark:text-blue-400">{aud.num_dossier}</td>
                  <td className="py-6 px-4"><Badge variant="en_cours">{labelType(aud.type_audience)}</Badge></td>
                  <td className="py-6 px-4 font-bold text-sm text-slate-600 dark:text-slate-300">
                    {aud.date_audience} à {aud.heure_debut}{aud.heure_fin ? ` – ${aud.heure_fin}` : ''}
                  </td>
                  <td className="py-6 px-4 font-bold text-sm text-slate-500">{aud.salle}</td>
                  <td className="py-6 px-8 text-right">
                    <button className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-500 rounded-xl transition-all shadow-sm">
                      <Clock size={16} />
                    </button>
                  </td>
                </tr>
              )}
            />
          )}
        </Card>
      )}

      {/* Modal — programmer une audience */}
      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setFormError(''); }} title="Programmer une audience">
        <div className="space-y-6 py-4">
          {formError && (
            <div className="bg-red-500/10 text-red-500 text-xs font-bold p-3 rounded-xl border border-red-500/20">
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Dossier <span className="text-red-400">*</span>
            </label>
            <select
              value={newAffaireId}
              onChange={e => setNewAffaireId(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold dark:text-white"
            >
              <option value="">— Sélectionner un dossier —</option>
              {affaires.map(a => (
                <option key={a.id} value={a.id}>{a.num_dossier} — {a.type_affaire}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Juge président
            </label>
            <select
              value={newJugeId}
              onChange={e => setNewJugeId(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold dark:text-white"
            >
              <option value="">— Optionnel —</option>
              {juges.map(j => (
                <option key={j.id} value={j.id}>{j.prenom} {j.nom} ({j.grade?.replace(/_/g,' ')})</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type d'audience</label>
            <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold dark:text-white">
              {TYPES_AUDIENCE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date <span className="text-red-400">*</span></label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm dark:text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Début</label>
              <input type="time" value={newHeureDebut} onChange={e => setNewHeureDebut(e.target.value)} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm dark:text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fin</label>
              <input type="time" value={newHeureFin} onChange={e => setNewHeureFin(e.target.value)} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm dark:text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Salle <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={newSalle}
              onChange={e => setNewSalle(e.target.value)}
              placeholder="Ex: Salle A1"
              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold dark:text-white"
            />
          </div>
          <button
            onClick={handleAddAudience}
            disabled={saving}
            className="btn btn-primary w-full !py-4 shadow-xl shadow-blue-500/20 disabled:opacity-60"
          >
            {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Valider la programmation'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Audiences;
