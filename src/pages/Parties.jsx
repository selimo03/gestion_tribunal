import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, History, Phone,
  UserPlus, ArrowUpRight, FileText, Loader2
} from 'lucide-react';
import { Card, Table, Badge, Modal } from '../components/UI';
import { api } from '../services/api';
import { supabase } from '../lib/supabaseClient';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../context/NotificationContext';

const TYPES_PARTIE = [
  { value: 'plaignant', label: 'Plaignant',  variant: 'en_cours' },
  { value: 'defendeur', label: 'Défendeur',  variant: 'appelee' },
  { value: 'temoin',    label: 'Témoin',     variant: 'default' },
  { value: 'victime',   label: 'Victime',    variant: 'warning' },
  { value: 'expert',    label: 'Expert',     variant: 'jugee' },
];

const labelType = (v) => TYPES_PARTIE.find(t => t.value === v)?.label || v;
const variantType = (v) => TYPES_PARTIE.find(t => t.value === v)?.variant || 'default';

const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 mt-6 pb-2">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className="px-5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-black disabled:opacity-40 hover:border-blue-500 transition-all">←</button>
      <span className="text-sm font-bold text-slate-500 dark:text-slate-400 min-w-[90px] text-center">
        Page {page} / {totalPages}
      </span>
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
        className="px-5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-black disabled:opacity-40 hover:border-blue-500 transition-all">→</button>
    </div>
  );
};

const PAGE_SIZE = 10;

const Parties = () => {
  const { can } = usePermissions();
  const canCreate = can('parties.create');

  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedPartie, setSelectedPartie] = useState(null);
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const { showToast } = useNotification();
  const [parties, setParties]               = useState([]);
  const [affaires, setAffaires]             = useState([]);
  const [avocats, setAvocats]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [page, setPage]                     = useState(1);
  const [saving, setSaving]                 = useState(false);
  const [formError, setFormError]           = useState('');

  // Form state aligné sur le schéma
  const [newNom, setNewNom]                 = useState('');
  const [newPrenom, setNewPrenom]           = useState('');
  const [newType, setNewType]               = useState('plaignant');
  const [newTelephone, setNewTelephone]     = useState('');
  const [newAdresse, setNewAdresse]         = useState('');
  const [newDateNaissance, setNewDateNaissance] = useState('');
  const [newAffaireId, setNewAffaireId]     = useState('');
  const [newAvocatId, setNewAvocatId]       = useState('');


  const loadParties = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAllParties();
      setParties(data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadParties(); }, [loadParties]);

  useEffect(() => {
    api.getAffaires().then(setAffaires).catch(() => setAffaires([]));
    api.getAvocats().then(setAvocats).catch(() => setAvocats([]));
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('parties-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parties' }, () => loadParties())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadParties]);

  const filteredParties = parties.filter(p => {
    const fullName = `${p.nom || ''} ${p.prenom || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) ||
           (p.telephone || '').includes(searchTerm);
  });

  const totalPages  = Math.max(1, Math.ceil(filteredParties.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated   = filteredParties.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleAddPartie = async () => {
    if (!newNom.trim() || !newPrenom.trim()) {
      setFormError('Nom et prénom sont obligatoires.'); return;
    }
    if (!newAffaireId) {
      setFormError("Le dossier lié est obligatoire."); return;
    }
    setFormError('');
    setSaving(true);
    try {
      await api.addPartie({
        nom:         newNom.trim(),
        prenom:      newPrenom.trim(),
        type_partie: newType,
        telephone:   newTelephone.trim() || null,
        adresse:     newAdresse.trim() || null,
        date_naissance: newDateNaissance || null,
        affaire_id:  parseInt(newAffaireId),
        avocat_id:   newAvocatId ? parseInt(newAvocatId) : null,
      });
      setIsAddModalOpen(false);
      setNewNom(''); setNewPrenom(''); setNewTelephone(''); setNewAdresse('');
      setNewDateNaissance(''); setNewAffaireId(''); setNewAvocatId('');
      showToast('Partie inscrite avec succès !', 'success');
      await loadParties();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleShowDetails = (partie) => {
    setSelectedPartie(partie);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-10 pb-20 font-['Outfit']">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-navy-800 text-white rounded-2xl flex items-center justify-center">
                <Users size={20} />
             </div>
             <h1 className="text-3xl font-black text-navy-900 dark:text-white tracking-tight uppercase">Annuaire des Parties</h1>
          </div>
          <p className="text-slate-500 font-medium ml-1">Registre national des personnes impliquées dans les procédures.</p>
        </div>

        {canCreate && (
          <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary !rounded-2xl shadow-xl shadow-blue-500/20 px-8">
             <UserPlus size={20} />
             <span className="text-sm font-bold uppercase tracking-wider">Inscrire une partie</span>
          </button>
        )}
      </div>

      {/* Recherche */}
      <div className="glass-card p-4 rounded-[2rem] border-none flex items-center gap-4 px-8 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all group">
        <Search className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={24} />
        <input
          type="text"
          placeholder="Rechercher par nom, prénom ou téléphone..."
          className="bg-transparent border-none outline-none text-lg font-bold w-full placeholder:text-slate-400 dark:text-white"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
        />
      </div>

      {/* Tableau */}
      <Card className="p-2 border-none">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          </div>
        ) : filteredParties.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold">Aucune partie trouvée</div>
        ) : (
          <>
            <Table
              headers={['Identité', 'Rôle Judiciaire', 'Dossier lié', 'Téléphone', '']}
              data={paginated}
              renderRow={(p) => (
                <tr key={p.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300">
                  <td className="py-6 px-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center text-navy-900 dark:text-blue-400 font-black text-sm shadow-sm group-hover:scale-110 transition-transform">
                        {(p.prenom || '?')[0]}{(p.nom || '?')[0]}
                      </div>
                      <div>
                        <p className="text-sm font-black text-navy-900 dark:text-white">{p.prenom} {p.nom}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID #{p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    <Badge variant={variantType(p.type_partie)}>{labelType(p.type_partie)}</Badge>
                  </td>
                  <td className="py-6 px-4">
                    {p.affaires?.num_dossier ? (
                      <div className="flex items-center gap-2 text-sm font-black text-blue-600 dark:text-blue-400 tracking-tighter">
                         <FileText size={14} className="opacity-50" />
                         {p.affaires.num_dossier}
                      </div>
                    ) : p.affaire_id ? (
                      <span className="text-xs font-bold text-slate-500">Affaire #{p.affaire_id}</span>
                    ) : (
                      <span className="text-slate-400 text-xs font-bold">—</span>
                    )}
                  </td>
                  <td className="py-6 px-4">
                    {p.telephone ? (
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        <Phone size={12} className="text-slate-400"/> {p.telephone}
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="py-6 px-8 text-right">
                    <button
                      onClick={() => handleShowDetails(p)}
                      className="p-3 bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-500 rounded-xl transition-all shadow-sm border border-slate-100 dark:border-slate-700"
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </td>
                </tr>
              )}
            />
            <Pagination page={currentPage} totalPages={totalPages} onChange={(p) => setPage(p)} />
          </>
        )}
      </Card>

      {/* Fiche détail */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Fiche Individuelle">
        {selectedPartie && (
          <div className="space-y-8 py-4">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-blue-500/10 rounded-[2rem] flex items-center justify-center text-blue-600 text-3xl font-black border border-blue-500/20">
                {(selectedPartie.prenom || '?')[0]}{(selectedPartie.nom || '?')[0]}
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-navy-900 dark:text-white tracking-tight">{selectedPartie.prenom} {selectedPartie.nom}</h3>
                <Badge variant={variantType(selectedPartie.type_partie)}>{labelType(selectedPartie.type_partie)}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Téléphone</p>
                <p className="font-bold text-sm text-navy-900 dark:text-white">{selectedPartie.telephone || '—'}</p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Date de naissance</p>
                <p className="font-bold text-sm text-navy-900 dark:text-white">{selectedPartie.date_naissance || '—'}</p>
              </div>
            </div>

            {selectedPartie.adresse && (
              <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Adresse</p>
                <p className="font-medium text-sm text-navy-900 dark:text-white">{selectedPartie.adresse}</p>
              </div>
            )}

            {(selectedPartie.affaires?.num_dossier || selectedPartie.affaire_id) && (
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <History size={16}/> Dossier lié
                </h4>
                <div className="p-5 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-blue-500">
                        <FileText size={18} />
                     </div>
                     <div>
                        <p className="text-sm font-black text-navy-900 dark:text-white tracking-tight">
                          {selectedPartie.affaires?.num_dossier || `Affaire #${selectedPartie.affaire_id}`}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          Qualité: {labelType(selectedPartie.type_partie)}
                        </p>
                     </div>
                  </div>
                </div>
              </div>
            )}

            <button className="btn btn-primary w-full !py-4 shadow-xl shadow-blue-500/20" onClick={() => setIsModalOpen(false)}>
              Fermer la fiche
            </button>
          </div>
        )}
      </Modal>

      {/* Modal ajout */}
      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setFormError(''); }} title="Inscrire une nouvelle partie">
        <div className="space-y-6 py-4">
          {formError && (
            <div className="bg-red-500/10 text-red-500 text-xs font-bold p-3 rounded-xl border border-red-500/20">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Prénom <span className="text-red-400">*</span>
              </label>
              <input type="text" value={newPrenom} onChange={e => setNewPrenom(e.target.value)} placeholder="Prénom" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold dark:text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Nom <span className="text-red-400">*</span>
              </label>
              <input type="text" value={newNom} onChange={e => setNewNom(e.target.value)} placeholder="Nom" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold dark:text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qualité judiciaire</label>
            <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold dark:text-white">
              {TYPES_PARTIE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Dossier lié <span className="text-red-400">*</span>
            </label>
            <select value={newAffaireId} onChange={e => setNewAffaireId(e.target.value)} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold dark:text-white">
              <option value="">— Sélectionner un dossier —</option>
              {affaires.map(a => (
                <option key={a.id} value={a.id}>{a.num_dossier} — {a.type_affaire}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Avocat (optionnel)
            </label>
            <select value={newAvocatId} onChange={e => setNewAvocatId(e.target.value)} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold dark:text-white">
              <option value="">— Aucun —</option>
              {avocats.map(av => (
                <option key={av.id} value={av.id}>Me. {av.prenom} {av.nom} ({av.cabinet || av.specialite || '—'})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
              <input type="text" value={newTelephone} onChange={e => setNewTelephone(e.target.value)} placeholder="+235 66 00 00 00" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold dark:text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date de naissance</label>
              <input type="date" value={newDateNaissance} onChange={e => setNewDateNaissance(e.target.value)} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold dark:text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse</label>
            <input type="text" value={newAdresse} onChange={e => setNewAdresse(e.target.value)} placeholder="Quartier, ville" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold dark:text-white" />
          </div>
          <button
            onClick={handleAddPartie}
            disabled={saving}
            className="btn btn-primary w-full !py-4 shadow-xl shadow-blue-500/20 disabled:opacity-60"
          >
            {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Valider l'inscription"}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Parties;
