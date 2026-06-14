import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck, CheckCircle2, XCircle, Mail, Calendar,
  Search, Loader2, Shield, AlertCircle
} from 'lucide-react';
import { Card, Modal, Badge, cn } from '../components/UI';
import { api } from '../services/api';
import { getRoleLabel } from '../lib/permissions';

import { useNotification } from '../context/NotificationContext';

const ROLES_DISPONIBLES = [
  'juge', 'procureur', 'avocat', 'greffier',
  'huissier', 'notaire', 'gestionnaire'
];

const Demandes = () => {
  const { showToast } = useNotification();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filtreStatut, setFiltreStatut] = useState('pending');

  // Modal d'approbation
  const [demandeActive, setDemandeActive] = useState(null);
  const [modalType, setModalType]         = useState(null); // 'approuver' | 'refuser'
  const [roleEffectif, setRoleEffectif]   = useState('');
  const [motif, setMotif]                 = useState('');
  const [saving, setSaving]               = useState(false);
  const [formError, setFormError]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDemandes();
      setDemandes(data);
    } catch (err) {
      showToast('Erreur : ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = demandes.filter(d => {
    const matchStatut = filtreStatut === 'tous' || d.statut_compte === filtreStatut;
    const matchSearch = !search
      || `${d.prenom} ${d.nom} ${d.email}`.toLowerCase().includes(search.toLowerCase());
    return matchStatut && matchSearch;
  });

  const openApprouver = (d) => {
    setDemandeActive(d);
    setModalType('approuver');
    setRoleEffectif(d.role_demande || 'avocat');
    setFormError('');
  };

  const openRefuser = (d) => {
    setDemandeActive(d);
    setModalType('refuser');
    setMotif('');
    setFormError('');
  };

  const closeModal = () => {
    setDemandeActive(null);
    setModalType(null);
    setMotif('');
    setRoleEffectif('');
    setFormError('');
  };

  const handleApprouver = async () => {
    setFormError('');
    setSaving(true);
    try {
      await api.approuverDemande(demandeActive.id, roleEffectif);
      showToast(`Compte approuvé : ${demandeActive.prenom} ${demandeActive.nom} (${roleEffectif})`, 'success');
      closeModal();
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRefuser = async () => {
    setFormError('');
    if (!motif.trim()) {
      setFormError('Le motif de refus est obligatoire.');
      return;
    }
    setSaving(true);
    try {
      await api.refuserDemande(demandeActive.id, motif);
      showToast(`Demande refusée : ${demandeActive.prenom} ${demandeActive.nom}`, 'success');
      closeModal();
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    pending: demandes.filter(d => d.statut_compte === 'pending').length,
    refuse:  demandes.filter(d => d.statut_compte === 'refuse').length,
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-[#020617] p-8 rounded-[3rem] glass-card border-none">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <UserCheck size={20} />
            </div>
            <h1 className="text-3xl font-black text-navy-900 dark:text-white tracking-tight">Demandes d'inscription</h1>
          </div>
          <p className="text-slate-500 font-medium ml-1">
            Validez ou refusez les nouvelles demandes de compte.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="px-5 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">En attente</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.pending}</p>
          </div>
          <div className="px-5 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">Refusées</p>
            <p className="text-2xl font-black text-red-600 dark:text-red-400">{stats.refuse}</p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 glass-card p-4 rounded-3xl flex items-center gap-4 px-8 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
          <Search className="text-slate-400" size={24} />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, email..."
            className="bg-transparent border-none outline-none text-lg font-bold w-full placeholder:text-slate-400 dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['pending', 'refuse', 'tous'].map(s => (
            <button
              key={s}
              onClick={() => setFiltreStatut(s)}
              className={cn(
                "px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                filtreStatut === s
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 hover:border-blue-500"
              )}
            >
              {s === 'pending' ? 'En attente' : s === 'refuse' ? 'Refusées' : 'Toutes'}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-2 border-none">
          <div className="text-center py-16">
            <Shield size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="font-bold text-slate-400">
              {filtreStatut === 'pending'
                ? 'Aucune demande en attente'
                : filtreStatut === 'refuse'
                  ? 'Aucune demande refusée'
                  : 'Aucune demande à afficher'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((d) => (
            <Card key={d.id} className="p-6 border-none">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                {/* Avatar + identité */}
                <div className="flex items-center gap-4 flex-1">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white shadow-lg",
                    d.statut_compte === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                  )}>
                    {d.prenom?.[0]}{d.nom?.[0]}
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-black text-navy-900 dark:text-white">
                      {d.prenom} {d.nom}
                    </p>
                    <div className="flex flex-wrap gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><Mail size={11} /> {d.email}</span>
                      <span className="flex items-center gap-1.5">
                        <Calendar size={11} />
                        {new Date(d.date_demande).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rôle demandé */}
                <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-center">
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Rôle demandé</p>
                  <p className="text-sm font-black text-navy-900 dark:text-white mt-0.5">
                    {getRoleLabel(d.role_demande)}
                  </p>
                </div>

                {/* Statut + actions */}
                <div className="flex items-center gap-3">
                  {d.statut_compte === 'pending' ? (
                    <>
                      <button
                        onClick={() => openRefuser(d)}
                        className="px-5 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        <XCircle size={14} />
                        Refuser
                      </button>
                      <button
                        onClick={() => openApprouver(d)}
                        className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        <CheckCircle2 size={14} />
                        Approuver
                      </button>
                    </>
                  ) : (
                    <Badge variant="error">Refusée</Badge>
                  )}
                </div>
              </div>

              {/* Motif de refus si applicable */}
              {d.statut_compte === 'refuse' && d.motif_refus && (
                <div className="mt-4 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Motif du refus</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 italic">« {d.motif_refus} »</p>
                  {d.validateur_nom && (
                    <p className="text-[10px] text-slate-400 font-bold mt-2">
                      Par {d.validateur_nom} · {new Date(d.date_validation).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal Approuver */}
      <Modal isOpen={modalType === 'approuver'} onClose={closeModal} title="Approuver la demande">
        {demandeActive && (
          <div className="space-y-6 py-2">
            {formError && (
              <div className="bg-red-500/10 text-red-500 text-xs font-bold p-3 rounded-xl border border-red-500/20 flex items-center gap-2">
                <AlertCircle size={14} /> {formError}
              </div>
            )}

            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
              <p className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">Compte à approuver</p>
              <p className="text-lg font-black text-navy-900 dark:text-white">
                {demandeActive.prenom} {demandeActive.nom}
              </p>
              <p className="text-xs text-slate-500 font-bold mt-1">{demandeActive.email}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Rôle à attribuer
              </label>
              <select
                value={roleEffectif}
                onChange={e => setRoleEffectif(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none font-bold text-sm"
              >
                {ROLES_DISPONIBLES.map(r => (
                  <option key={r} value={r}>
                    {getRoleLabel(r)} {r === demandeActive.role_demande ? '(demandé)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 font-bold ml-1">
                Par défaut : le rôle demandé. Vous pouvez le surclasser/déclasser.
              </p>
            </div>

            <button
              onClick={handleApprouver}
              disabled={saving}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/20 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              {saving ? 'Approbation...' : 'Approuver le compte'}
            </button>
          </div>
        )}
      </Modal>

      {/* Modal Refuser */}
      <Modal isOpen={modalType === 'refuser'} onClose={closeModal} title="Refuser la demande">
        {demandeActive && (
          <div className="space-y-6 py-2">
            {formError && (
              <div className="bg-red-500/10 text-red-500 text-xs font-bold p-3 rounded-xl border border-red-500/20 flex items-center gap-2">
                <AlertCircle size={14} /> {formError}
              </div>
            )}

            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
              <p className="text-red-400 text-xs font-black uppercase tracking-widest mb-1">Compte à refuser</p>
              <p className="text-lg font-black text-navy-900 dark:text-white">
                {demandeActive.prenom} {demandeActive.nom}
              </p>
              <p className="text-xs text-slate-500 font-bold mt-1">{demandeActive.email}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Motif du refus <span className="text-red-400">*</span>
              </label>
              <textarea
                value={motif}
                onChange={e => setMotif(e.target.value)}
                placeholder="Ex : informations insuffisantes, rôle non vérifiable..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none font-bold text-sm min-h-[100px]"
              />
              <p className="text-[10px] text-slate-400 font-bold ml-1">
                Le motif sera visible par l'utilisateur lors de sa tentative de connexion.
              </p>
            </div>

            <button
              onClick={handleRefuser}
              disabled={saving}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/20 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <XCircle size={18} />}
              {saving ? 'Refus...' : 'Refuser la demande'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Demandes;
