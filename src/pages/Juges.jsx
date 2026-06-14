import React, { useState, useEffect, useCallback } from 'react';
import { Gavel, Plus, Search, Loader2, CheckCircle, XCircle, Mail, Phone, Award } from 'lucide-react';
import { Card, Table, Modal, Badge, cn } from '../components/UI';
import { api } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../context/NotificationContext';

const GRADES = [
  { value: 'juge_instruction',  label: "Juge d'instruction" },
  { value: 'juge_siege',        label: 'Juge du siège' },
  { value: 'juge_paix',         label: 'Juge de paix' },
  { value: 'president_chambre', label: 'Président de chambre' },
  { value: 'president_tribunal',label: 'Président du tribunal' },
];

const Juges = () => {
  const { can } = usePermissions();
  const { showToast } = useNotification();
  const canCreate = can('juges.create');
  const canEdit   = can('juges.edit');

  const [juges, setJuges]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [formError, setFormError]       = useState('');
  const [saving, setSaving]             = useState(false);
  const [form, setForm] = useState({
    matricule: '', nom: '', prenom: '',
    grade: 'juge_siege', chambre: '',
    email: '', telephone: '',
    date_nomination: new Date().toISOString().split('T')[0],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getJuges({ actifSeul: false });
      setJuges(data);
    } catch (err) {
      showToast('Erreur: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = juges.filter(j =>
    `${j.prenom} ${j.nom} ${j.matricule} ${j.chambre || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setForm({
      matricule: '', nom: '', prenom: '',
      grade: 'juge_siege', chambre: '',
      email: '', telephone: '',
      date_nomination: new Date().toISOString().split('T')[0],
    });
    setFormError('');
  };

  const handleCreate = async () => {
    if (!form.matricule.trim()) { setFormError('Le matricule est obligatoire.'); return; }
    if (!form.nom.trim() || !form.prenom.trim()) { setFormError('Nom et prénom obligatoires.'); return; }
    setSaving(true);
    try {
      await api.createJuge({
        matricule:       form.matricule.trim(),
        nom:             form.nom.trim(),
        prenom:          form.prenom.trim(),
        grade:           form.grade,
        chambre:         form.chambre.trim() || null,
        email:           form.email.trim() || null,
        telephone:       form.telephone.trim() || null,
        date_nomination: form.date_nomination,
        actif:           true,
      });
      showToast('Juge enregistré avec succès', 'success');
      setIsModalOpen(false);
      resetForm();
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (j) => {
    try {
      await api.toggleJugeActif(j.id, !j.actif);
      showToast(j.actif ? 'Juge désactivé' : 'Juge réactivé', 'success');
      load();
    } catch (err) {
      showToast('Erreur: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-[#020617] p-8 rounded-[3rem] glass-card border-none">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-navy-800 text-white rounded-2xl flex items-center justify-center">
              <Gavel size={20} />
            </div>
            <h1 className="text-3xl font-black text-navy-900 dark:text-white tracking-tight">Magistrats</h1>
          </div>
          <p className="text-slate-500 font-medium ml-1">Annuaire des juges du Tribunal de Grande Instance.</p>
        </div>
        {canCreate && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn btn-primary !rounded-2xl shadow-xl shadow-blue-500/20 px-8">
            <Plus size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Nouveau Juge</span>
          </button>
        )}
      </div>

      {/* Recherche */}
      <div className="glass-card p-4 rounded-3xl flex items-center gap-4 px-8 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
        <Search className="text-slate-400" size={24} />
        <input
          type="text"
          placeholder="Rechercher par nom, matricule, chambre..."
          className="bg-transparent border-none outline-none text-lg font-bold w-full placeholder:text-slate-400 dark:text-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tableau */}
      <Card className="p-2 border-none">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold">Aucun juge enregistré</div>
        ) : (
          <Table
            headers={['Matricule', 'Identité', 'Grade', 'Chambre', 'Contact', 'Statut', '']}
            data={filtered}
            renderRow={(j) => (
              <tr key={j.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300">
                <td className="py-6 px-8">
                  <span className="text-sm font-black text-blue-600 dark:text-blue-400 tracking-tight">{j.matricule}</span>
                </td>
                <td className="py-6 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center text-[10px] font-black">
                      {j.prenom?.[0]}{j.nom?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-black text-navy-900 dark:text-white">{j.prenom} {j.nom}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Nommé le {j.date_nomination}</p>
                    </div>
                  </div>
                </td>
                <td className="py-6 px-4">
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center gap-1.5 w-fit">
                    <Award size={11} /> {j.grade?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="py-6 px-4 text-sm font-bold text-slate-500">
                  {j.chambre || '—'}
                </td>
                <td className="py-6 px-4">
                  <div className="space-y-1">
                    {j.email && <p className="text-[10px] text-slate-500 flex items-center gap-1.5"><Mail size={10} /> {j.email}</p>}
                    {j.telephone && <p className="text-[10px] text-slate-500 flex items-center gap-1.5"><Phone size={10} /> {j.telephone}</p>}
                  </div>
                </td>
                <td className="py-6 px-4">
                  <Badge variant={j.actif ? 'success' : 'error'}>
                    {j.actif ? 'Actif' : 'Inactif'}
                  </Badge>
                </td>
                <td className="py-6 px-8 text-right">
                  {canEdit && (
                    <button
                      onClick={() => handleToggle(j)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        j.actif
                          ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40"
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20"
                      )}
                    >
                      {j.actif ? <XCircle size={12} className="inline mr-1" /> : <CheckCircle size={12} className="inline mr-1" />}
                      {j.actif ? 'Désactiver' : 'Réactiver'}
                    </button>
                  )}
                </td>
              </tr>
            )}
          />
        )}
      </Card>

      {/* Modal nouveau juge */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Enregistrer un juge">
        <div className="space-y-4 py-2">
          {formError && (
            <div className="bg-red-500/10 text-red-500 text-xs font-bold p-3 rounded-xl border border-red-500/20">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Matricule *" value={form.matricule} onChange={v => setForm(f => ({ ...f, matricule: v }))} placeholder="MAG-2026-001" />
            <Champ label="Date de nomination" type="date" value={form.date_nomination} onChange={v => setForm(f => ({ ...f, date_nomination: v }))} />
            <Champ label="Prénom *" value={form.prenom} onChange={v => setForm(f => ({ ...f, prenom: v }))} />
            <Champ label="Nom *" value={form.nom} onChange={v => setForm(f => ({ ...f, nom: v }))} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Grade</label>
            <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none font-bold text-sm">
              {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <Champ label="Chambre" value={form.chambre} onChange={v => setForm(f => ({ ...f, chambre: v }))} placeholder="ex: Chambre civile" />
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
            <Champ label="Téléphone" value={form.telephone} onChange={v => setForm(f => ({ ...f, telephone: v }))} />
          </div>
          <button onClick={handleCreate} disabled={saving} className="w-full btn btn-primary py-4 rounded-2xl disabled:opacity-60">
            {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Enregistrer le juge'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

// Petit helper de champ (factorise le markup)
const Champ = ({ label, value, onChange, type = 'text', placeholder }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
    />
  </div>
);

export default Juges;
