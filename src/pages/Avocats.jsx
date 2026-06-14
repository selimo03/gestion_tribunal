import React, { useState, useEffect, useCallback } from 'react';
import { Scale, Plus, Search, Loader2, CheckCircle, XCircle, Mail, Phone, Building2 } from 'lucide-react';
import { Card, Table, Modal, Badge, cn } from '../components/UI';
import { api } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../context/NotificationContext';

const Avocats = () => {
  const { can } = usePermissions();
  const { showToast } = useNotification();
  const canCreate = can('avocats.create');
  const canEdit   = can('avocats.edit');

  const [avocats, setAvocats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [formError, setFormError]       = useState('');
  const [saving, setSaving]             = useState(false);
  const [form, setForm] = useState({
    num_barreau: '', nom: '', prenom: '',
    cabinet: '', specialite: '',
    email: '', telephone: '', adresse: '',
    date_inscription: new Date().toISOString().split('T')[0],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAvocats({ actifSeul: false });
      setAvocats(data);
    } catch (err) {
      showToast('Erreur: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = avocats.filter(a =>
    `${a.prenom} ${a.nom} ${a.num_barreau} ${a.cabinet || ''} ${a.specialite || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const resetForm = () => {
    setForm({
      num_barreau: '', nom: '', prenom: '',
      cabinet: '', specialite: '',
      email: '', telephone: '', adresse: '',
      date_inscription: new Date().toISOString().split('T')[0],
    });
    setFormError('');
  };

  const handleCreate = async () => {
    if (!form.num_barreau.trim()) { setFormError('Le numéro de barreau est obligatoire.'); return; }
    if (!form.nom.trim() || !form.prenom.trim()) { setFormError('Nom et prénom obligatoires.'); return; }
    setSaving(true);
    try {
      await api.createAvocat({
        num_barreau:      form.num_barreau.trim(),
        nom:              form.nom.trim(),
        prenom:           form.prenom.trim(),
        cabinet:          form.cabinet.trim() || null,
        specialite:       form.specialite.trim() || null,
        email:            form.email.trim() || null,
        telephone:        form.telephone.trim() || null,
        adresse:          form.adresse.trim() || null,
        date_inscription: form.date_inscription,
        actif:            true,
      });
      showToast('Avocat enregistré avec succès', 'success');
      setIsModalOpen(false);
      resetForm();
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (a) => {
    try {
      await api.toggleAvocatActif(a.id, !a.actif);
      showToast(a.actif ? 'Avocat désactivé' : 'Avocat réactivé', 'success');
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
              <Scale size={20} />
            </div>
            <h1 className="text-3xl font-black text-navy-900 dark:text-white tracking-tight">Avocats</h1>
          </div>
          <p className="text-slate-500 font-medium ml-1">Annuaire du barreau — défense et partie civile.</p>
        </div>
        {canCreate && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn btn-primary !rounded-2xl shadow-xl shadow-blue-500/20 px-8">
            <Plus size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Nouvel Avocat</span>
          </button>
        )}
      </div>

      {/* Recherche */}
      <div className="glass-card p-4 rounded-3xl flex items-center gap-4 px-8 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
        <Search className="text-slate-400" size={24} />
        <input
          type="text"
          placeholder="Rechercher par nom, n° barreau, cabinet, spécialité..."
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
          <div className="text-center py-20 text-slate-400 font-bold">Aucun avocat enregistré</div>
        ) : (
          <Table
            headers={['N° Barreau', 'Identité', 'Cabinet', 'Spécialité', 'Contact', 'Statut', '']}
            data={filtered}
            renderRow={(a) => (
              <tr key={a.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300">
                <td className="py-6 px-8">
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{a.num_barreau}</span>
                </td>
                <td className="py-6 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center text-[10px] font-black">
                      {a.prenom?.[0]}{a.nom?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-black text-navy-900 dark:text-white">Me. {a.prenom} {a.nom}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Inscrit le {a.date_inscription}</p>
                    </div>
                  </div>
                </td>
                <td className="py-6 px-4">
                  {a.cabinet ? (
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Building2 size={12} className="text-slate-400" /> {a.cabinet}
                    </span>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className="py-6 px-4">
                  {a.specialite ? (
                    <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                      {a.specialite}
                    </span>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className="py-6 px-4">
                  <div className="space-y-1">
                    {a.email && <p className="text-[10px] text-slate-500 flex items-center gap-1.5"><Mail size={10} /> {a.email}</p>}
                    {a.telephone && <p className="text-[10px] text-slate-500 flex items-center gap-1.5"><Phone size={10} /> {a.telephone}</p>}
                  </div>
                </td>
                <td className="py-6 px-4">
                  <Badge variant={a.actif ? 'success' : 'error'}>
                    {a.actif ? 'Actif' : 'Inactif'}
                  </Badge>
                </td>
                <td className="py-6 px-8 text-right">
                  {canEdit && (
                    <button
                      onClick={() => handleToggle(a)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        a.actif
                          ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20"
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20"
                      )}
                    >
                      {a.actif ? <XCircle size={12} className="inline mr-1" /> : <CheckCircle size={12} className="inline mr-1" />}
                      {a.actif ? 'Désactiver' : 'Réactiver'}
                    </button>
                  )}
                </td>
              </tr>
            )}
          />
        )}
      </Card>

      {/* Modal nouvel avocat */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Enregistrer un avocat">
        <div className="space-y-4 py-2">
          {formError && (
            <div className="bg-red-500/10 text-red-500 text-xs font-bold p-3 rounded-xl border border-red-500/20">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Champ label="N° de barreau *" value={form.num_barreau} onChange={v => setForm(f => ({ ...f, num_barreau: v }))} placeholder="BAR-2026-001" />
            <Champ label="Date d'inscription" type="date" value={form.date_inscription} onChange={v => setForm(f => ({ ...f, date_inscription: v }))} />
            <Champ label="Prénom *" value={form.prenom} onChange={v => setForm(f => ({ ...f, prenom: v }))} />
            <Champ label="Nom *" value={form.nom} onChange={v => setForm(f => ({ ...f, nom: v }))} />
            <Champ label="Cabinet" value={form.cabinet} onChange={v => setForm(f => ({ ...f, cabinet: v }))} />
            <Champ label="Spécialité" value={form.specialite} onChange={v => setForm(f => ({ ...f, specialite: v }))} placeholder="Pénal, Affaires…" />
            <Champ label="Email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
            <Champ label="Téléphone" value={form.telephone} onChange={v => setForm(f => ({ ...f, telephone: v }))} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse</label>
            <textarea
              value={form.adresse}
              onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm min-h-[80px]"
            />
          </div>
          <button onClick={handleCreate} disabled={saving} className="w-full btn btn-primary py-4 rounded-2xl disabled:opacity-60">
            {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Enregistrer l'avocat"}
          </button>
        </div>
      </Modal>
    </div>
  );
};

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

export default Avocats;
