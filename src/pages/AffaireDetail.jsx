import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Info, Users, Calendar, FileText, Gavel,
  Plus, Upload, Clock, CheckCircle2, Printer,
  History, FileSearch, ArrowUpRight, Loader2, AlertCircle
} from 'lucide-react';
import { Card, Badge, Table, Modal, cn } from '../components/UI';
import { api } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../context/NotificationContext';

const AffaireDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();

  const [affaire, setAffaire]       = useState(null);
  const [parties, setParties]       = useState([]);
  const [audiences, setAudiences]   = useState([]);
  const [verdict, setVerdict]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('infos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType]   = useState('');
  const [newStatus, setNewStatus]   = useState('en_cours');
  const [verdictDecision, setVerdictDecision] = useState('');
  const [verdictPeine, setVerdictPeine]       = useState('');
  const [verdictMotif, setVerdictMotif]       = useState('');
  const [formError, setFormError]   = useState('');
  const [saving, setSaving]         = useState(false);
  const { showToast } = useNotification();

  // Assignations
  const [assignations, setAssignations] = useState([]);
  const [allUsers, setAllUsers]         = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('juge');

  // Pièces jointes
  const [pieces, setPieces]           = useState([]);
  const [piecesLoading, setPiecesLoading] = useState(false);
  const [uploading, setUploading]     = useState(false);
  const fileInputRef                  = React.useRef(null);

  // Historique
  const [historique, setHistorique]   = useState([]);
  const [histLoading, setHistLoading] = useState(false);


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [affData, partData, audData, verdData] = await Promise.all([
        api.getAffaireById(id),
        api.getPartiesByAffaire(id),
        api.getAudiencesByAffaire(id),
        api.getVerdictByAffaire(id),
      ]);
      setAffaire(affData);
      setParties(partData);
      setAudiences(audData);
      setVerdict(verdData);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sauvegarder en Supabase
  const handleModalSubmit = async () => {
    setFormError('');

    if (modalType === 'status') {
      setSaving(true);
      try {
        await api.updateAffaireStatut(id, newStatus);
        setAffaire(prev => ({ ...prev, statut: newStatus }));
        setIsModalOpen(false);
        showToast('Statut mis à jour avec succès', 'success');
      } catch (err) {
        setFormError(err.message);
      } finally {
        setSaving(false);
      }
    }

    if (modalType === 'verdict') {
      // Validation
      if (!verdictDecision.trim()) { setFormError('La décision est obligatoire.'); return; }
      if (!verdictPeine.trim())    { setFormError('La peine est obligatoire.'); return; }
      if (!verdictMotif.trim())    { setFormError('La motivation est obligatoire.'); return; }

      setSaving(true);
      try {
        await api.saveVerdict({
          affaire_id:     parseInt(id),
          juge_id:        affaire.juge_id,
          type_decision:  verdictDecision.toLowerCase().includes('coupable') ? 'condamnation' : 'jugement',
          contenu:        `${verdictDecision.trim()} — ${verdictMotif.trim()}`,
          sanction:       verdictPeine.trim(),
          date_decision:  new Date().toISOString().split('T')[0],
        });
        await api.updateAffaireStatut(id, 'jugee');
        setAffaire(prev => ({ ...prev, statut: 'jugee' }));
        setVerdict({
          date_decision: new Date().toISOString().split('T')[0],
          contenu:       `${verdictDecision.trim()} — ${verdictMotif.trim()}`,
          sanction:      verdictPeine.trim(),
        });
        setIsModalOpen(false);
        showToast('Verdict rendu et enregistré en base de données', 'success');
      } catch (err) {
        setFormError(err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  // Charger assignations et users pour l'onglet assignation
  const loadAssignations = useCallback(async () => {
    const [a, u] = await Promise.all([
      api.getAssignations(id),
      api.getAllUsers(),
    ]);
    setAssignations(a);
    setAllUsers(u);
  }, [id]);

  // Charger pièces jointes
  const loadPieces = useCallback(async () => {
    setPiecesLoading(true);
    const data = await api.getPiecesJointes(id);
    setPieces(data);
    setPiecesLoading(false);
  }, [id]);

  // Charger historique
  const loadHistorique = useCallback(async () => {
    setHistLoading(true);
    const data = await api.getDossierHistorique(id);
    setHistorique(data);
    setHistLoading(false);
  }, [id]);

  // Charger selon onglet actif
  useEffect(() => {
    if (activeTab === 'assignation') loadAssignations();
    if (activeTab === 'pieces')      loadPieces();
    if (activeTab === 'historique')  loadHistorique();
  }, [activeTab, loadAssignations, loadPieces, loadHistorique]);

  const handleAssigner = async () => {
    if (!selectedUser) return;
    try {
      await api.assignDossier(id, selectedUser, selectedRole);
      showToast('Assignation effectuée avec succès', 'success');
      loadAssignations();
    } catch (err) {
      showToast('Erreur: ' + err.message, 'error');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadPieceJointe(id, file);
      showToast('Fichier uploadé avec succès', 'success');
      loadPieces();
    } catch (err) {
      showToast('Erreur upload: ' + err.message + ' — Créez le bucket "pieces-jointes" dans Supabase Storage', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (path, name) => {
    const url = await api.getPieceJointeUrl(path);
    if (url) {
      const a = document.createElement('a');
      a.href = url; a.download = name; a.target = '_blank';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } else {
      showToast('Impossible de générer le lien de téléchargement', 'error');
    }
  };

  const tabs = [
    { id: 'infos',       label: 'Détails',     icon: Info },
    { id: 'parties',     label: 'Parties',     icon: Users },
    { id: 'audiences',   label: 'Audiences',   icon: Calendar },
    { id: 'assignation', label: 'Assignation', icon: Plus },
    { id: 'pieces',      label: 'Pièces',      icon: FileSearch },
    { id: 'verdict',     label: 'Verdict',     icon: Gavel },
    { id: 'historique',  label: 'Historique',  icon: History },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 space-y-4">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Ouverture du dossier...</p>
    </div>
  );

  if (!affaire) return (
    <div className="flex flex-col items-center justify-center h-96 space-y-6">
      <div className="p-8 bg-red-50 text-red-500 rounded-full"><FileText size={64}/></div>
      <h2 className="text-2xl font-black text-navy-900 uppercase">Dossier non trouvé</h2>
      <button onClick={() => navigate('/affaires')} className="btn btn-primary">Retour au registre</button>
    </div>
  );

  const canEditStatus  = can('affaires.edit');
  const canRenderVerdict = can('decisions.create');

  return (
    <div className="space-y-10 pb-20 font-['Outfit']">
      {/* Top Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <button onClick={() => navigate('/affaires')} className="flex items-center gap-3 text-slate-500 hover:text-navy-900 dark:hover:text-white transition-all group font-bold">
          <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 group-hover:bg-slate-50">
            <ArrowLeft size={18} />
          </div>
          <span>Registre des Affaires</span>
        </button>

        <div className="flex gap-3">
          <button onClick={() => window.print()} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-500 hover:text-blue-500 transition-all shadow-sm">
            <Printer size={20} />
          </button>
        </div>
      </div>

      {/* Header du dossier */}
      <div className="glass-card p-10 rounded-[3rem] border-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 relative z-10">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-24 h-24 bg-gradient-to-br from-navy-800 to-navy-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-navy-500/30">
              <Gavel size={40} />
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <h1 className="text-4xl font-black text-navy-900 dark:text-white tracking-tighter">{affaire.num_dossier}</h1>
                <Badge variant={affaire.statut}>{affaire.statut?.replace('_', ' ')}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-slate-500 uppercase tracking-widest">
                <span className="flex items-center gap-2 text-blue-600"><FileText size={16}/> {affaire.type_affaire}</span>
                <span className="flex items-center gap-2"><Calendar size={16}/> {affaire.date_ouverture}</span>
                <span className="flex items-center gap-2"><Users size={16}/> {parties.length} Parties</span>
              </div>
            </div>
          </div>

          {/* Boutons d'action selon permissions réelles */}
          <div className="flex flex-wrap gap-4">
            {canEditStatus && (
              <button
                onClick={() => { setModalType('status'); setNewStatus(affaire.statut); setFormError(''); setIsModalOpen(true); }}
                className="btn btn-secondary !rounded-2xl !px-8"
              >
                Modifier Statut
              </button>
            )}
            {canRenderVerdict && affaire.statut !== 'jugee' && (
              <button
                onClick={() => { setModalType('verdict'); setVerdictDecision(''); setVerdictPeine(''); setVerdictMotif(''); setFormError(''); setIsModalOpen(true); }}
                className="btn btn-primary !rounded-2xl !px-10 shadow-xl shadow-blue-500/20"
              >
                Rendre Verdict
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-3 px-8 py-4 text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap",
              activeTab === tab.id ? "bg-navy-800 text-white shadow-lg" : "text-slate-400 hover:text-navy-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      <div className="animate-fade-in">
        {activeTab === 'infos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card title="Exposition des Faits" subtitle="Détails circonstanciels" className="lg:col-span-2 border-none !p-10">
              <div className="space-y-8 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Magistrat Assigné</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-black text-xs">
                        {(affaire.juge_nom || 'NA').split(' ').map(n => n[0]).join('').substring(0,2)}
                      </div>
                      <p className="font-bold text-navy-900 dark:text-white">{affaire.juge_nom || 'Non assigné'}</p>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Juridiction</p>
                    <p className="font-bold text-navy-900 dark:text-white">TGI de N'Djamena</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Résumé de l'affaire</p>
                  <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{affaire.description}</p>
                </div>
              </div>
            </Card>

            <Card title="Chronologie" subtitle="Suivi des étapes" className="border-none !p-10">
              <div className="space-y-6 mt-6">
                {[
                  { date: affaire.date_ouverture, event: 'Enregistrement du dossier', done: true },
                  { date: '—', event: 'Identification des parties', done: parties.length > 0 },
                  { date: '—', event: 'Audiences programmées', done: audiences.length > 0 },
                  { date: '—', event: 'Verdict prononcé', done: !!verdict },
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="flex flex-col items-center">
                      <div className={cn("w-6 h-6 rounded-full border-4 transition-all", item.done ? "bg-blue-500 border-blue-100 dark:border-blue-900/50" : "bg-slate-100 border-white dark:bg-slate-800 dark:border-slate-700")} />
                      {i < 3 && <div className="w-0.5 h-12 bg-slate-100 dark:bg-slate-800 my-1" />}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.date}</p>
                      <p className={cn("text-sm font-bold", item.done ? "text-navy-900 dark:text-white" : "text-slate-400")}>{item.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'parties' && (
          <Card title="Personnes Impliquées" className="border-none !p-10">
            {parties.length === 0 ? (
              <div className="text-center py-20 text-slate-400 font-bold">Aucune partie enregistrée pour ce dossier</div>
            ) : (
              <Table
                headers={['Identité', 'Qualité Judiciaire', 'Contacts', '']}
                data={parties}
                renderRow={(p) => (
                  <tr key={p.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300">
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-xs">{p.nom[0]}{p.prenom[0]}</div>
                        <p className="text-sm font-black text-navy-900 dark:text-white">{p.nom} {p.prenom}</p>
                      </div>
                    </td>
                    <td className="py-6 px-4"><Badge variant={p.type === 'Accusé' ? 'appelee' : 'en_cours'}>{p.type}</Badge></td>
                    <td className="py-6 px-4">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <p>{p.email}</p><p>{p.tel}</p>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <button className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-blue-500 transition-all">
                        <History size={16} />
                      </button>
                    </td>
                  </tr>
                )}
              />
            )}
          </Card>
        )}

        {activeTab === 'audiences' && (
          <Card title="Historique des Séances" className="border-none !p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {audiences.length > 0 ? audiences.map((aud) => (
                <div key={aud.id} className="glass-card p-8 rounded-[2.5rem] border-none flex items-center justify-between group hover:translate-x-2 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center shadow-sm">
                      <p className="text-[10px] font-black text-blue-500 uppercase">{aud.date_audience?.split('-')[1]}</p>
                      <p className="text-2xl font-black text-navy-900 dark:text-white">{aud.date_audience?.split('-')[2]}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{aud.type_audience}</p>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-sm font-black text-navy-900 dark:text-white"><Clock size={14} className="text-blue-500"/> {aud.heure_debut}</span>
                        <span className="text-blue-600 font-bold text-sm">{aud.salle}</span>
                      </div>
                    </div>
                  </div>
                  <button className="p-3 bg-blue-500/5 text-blue-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-all">
                    <ArrowUpRight size={20} />
                  </button>
                </div>
              )) : (
                <div className="col-span-2 text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200">
                  <p className="text-sm font-black uppercase tracking-widest text-slate-400">Aucune audience programmée</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'assignation' && (
          <Card title="Assignation du Dossier" subtitle="Gérer les personnes impliquées" className="border-none !p-10">
            {(canEditStatus) && (
              <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <p className="text-sm font-black text-navy-900 dark:text-white">Assigner à un membre du personnel</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
                    className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm">
                    <option value="">Sélectionner un utilisateur</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.prenom} {u.nom} — {u.role}</option>
                    ))}
                  </select>
                  <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
                    className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm">
                    <option value="juge">Juge</option>
                    <option value="procureur">Procureur</option>
                    <option value="greffier">Greffier</option>
                    <option value="avocat">Avocat</option>
                    <option value="huissier">Huissier</option>
                  </select>
                  <button onClick={handleAssigner} disabled={!selectedUser}
                    className="btn btn-primary !py-3 rounded-2xl disabled:opacity-60">
                    Assigner
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{assignations.length} personne(s) assignée(s)</p>
              {assignations.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold">Aucune assignation pour ce dossier</div>
              ) : (
                assignations.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center font-black text-xs">
                        {a.profils?.prenom?.[0]}{a.profils?.nom?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-navy-900 dark:text-white">{a.profils?.prenom} {a.profils?.nom}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{a.role_assigne}</p>
                      </div>
                    </div>
                    {canEditStatus && (
                      <button onClick={async () => { await api.removeAssignation(id, a.utilisateur_id); loadAssignations(); }}
                        className="text-[10px] font-black text-red-500 hover:underline uppercase tracking-widest">
                        Retirer
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {activeTab === 'pieces' && (
          <Card title="Archives Numériques" className="border-none !p-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              {/* Zone d'upload */}
              <div
                className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center space-y-4 hover:border-blue-500 transition-all group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="text-blue-500 animate-spin" size={32} />
                ) : (
                  <div className="p-5 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-3xl group-hover:scale-110 transition-transform">
                    <Upload size={32} />
                  </div>
                )}
                <div>
                  <p className="font-black text-navy-900 dark:text-white">{uploading ? 'Upload en cours...' : 'Importer un fichier'}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">PDF, JPG, PNG (max 10Mo)</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleUpload} />
              </div>

              {/* Liste des pièces */}
              <div className="md:col-span-2 space-y-3">
                {piecesLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="animate-spin text-blue-500" size={24} />
                  </div>
                ) : pieces.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-bold">Aucune pièce jointe pour ce dossier</div>
                ) : (
                  pieces.map((file, i) => (
                    <div key={i} className="glass-card p-5 rounded-2xl border-none flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 group-hover:text-blue-500 transition-colors">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-navy-900 dark:text-white">{file.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {file.metadata?.size ? `${(file.metadata.size / 1024).toFixed(1)} Ko` : '—'}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => handleDownload(file.path, file.name)}
                        className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">
                        Télécharger
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'verdict' && (
          <Card title="Sentence & Verdict" className="border-none !p-10">
            {verdict ? (
              <div className="p-10 bg-emerald-500/5 border border-emerald-500/10 rounded-[3rem] space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-emerald-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-emerald-500/20">
                    <CheckCircle2 size={40} />
                  </div>
                  <div>
                    <h4 className="text-3xl font-black text-emerald-600 tracking-tighter uppercase">Affaire Jugée</h4>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                      Rendu le {verdict.date_decision} · {verdict.type_decision}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Type de décision</p>
                    <p className="text-2xl font-black text-navy-900 dark:text-white capitalize">{verdict.type_decision?.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Sanction Prononcée</p>
                    <p className="text-xl font-black text-red-600 tracking-tight">{verdict.sanction || '—'}</p>
                  </div>
                  <div className="md:col-span-2 p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">Motivation & Justification</p>
                    <p className="text-lg text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed">"{verdict.contenu}"</p>
                    {verdict.susceptible_appel && (
                      <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mt-4">
                        Susceptible d'appel — délai : {verdict.delai_appel_jours || 30} jours
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-24 space-y-8 bg-slate-50 dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200">
                <div className="p-10 bg-white dark:bg-slate-800 inline-flex rounded-[2.5rem] shadow-sm text-slate-200">
                  <Gavel size={80} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-black text-navy-900 dark:text-white tracking-tight uppercase">Instruction en cours</h4>
                  <p className="text-slate-500 font-medium max-w-sm mx-auto">Le verdict sera prononcé à l'issue des audiences de plaidoirie.</p>
                </div>
                {canRenderVerdict && (
                  <button
                    onClick={() => { setModalType('verdict'); setVerdictDecision(''); setVerdictPeine(''); setVerdictMotif(''); setFormError(''); setIsModalOpen(true); }}
                    className="btn btn-primary !rounded-2xl !px-12 shadow-xl shadow-blue-500/20"
                  >
                    Rendre le verdict
                  </button>
                )}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'historique' && (
          <Card title="Historique des Modifications" subtitle="Traçabilité complète du dossier" className="border-none !p-10">
            {histLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-500" size={24} />
              </div>
            ) : historique.length === 0 ? (
              <div className="text-center py-20 text-slate-400 font-bold">
                Aucune modification enregistrée pour ce dossier
              </div>
            ) : (
              <div className="space-y-3 mt-6">
                {historique.map((log) => {
                  // log = ligne de vue_timeline_affaire : { id, evenement, commentaire, auteur_nom, timestamp, ancien_etat, nouvel_etat }
                  const dotColor = {
                    ouverture: 'bg-emerald-500',
                    changement_statut: 'bg-blue-500',
                    changement_juge: 'bg-amber-500',
                    audience_planifiee: 'bg-indigo-500',
                    audience_tenue: 'bg-purple-500',
                    decision_rendue: 'bg-red-500',
                    changement_confidentialite: 'bg-orange-500',
                  }[log.evenement] || 'bg-slate-400';

                  // Construit un diff lisible si dispo
                  const diff = (() => {
                    if (!log.ancien_etat || !log.nouvel_etat) return null;
                    const champsClefs = ['statut','niveau_confidentiel','juge_id','type_affaire'];
                    return champsClefs
                      .filter(k => log.ancien_etat[k] !== log.nouvel_etat[k])
                      .map(k => ({ champ: k, avant: log.ancien_etat[k], apres: log.nouvel_etat[k] }));
                  })();

                  return (
                    <div key={log.id} className="flex gap-6 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex flex-col items-center">
                        <div className={cn("w-3 h-3 rounded-full mt-1 shrink-0", dotColor)} />
                        <div className="w-0.5 flex-1 bg-slate-100 dark:bg-slate-800 mt-2" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-navy-900 dark:text-white uppercase tracking-wide">
                            {log.evenement?.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : '—'}
                          </span>
                        </div>
                        {log.commentaire && (
                          <p className="text-xs text-slate-500 font-medium">{log.commentaire}</p>
                        )}
                        {diff && diff.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {diff.map(d => (
                              <div key={d.champ} className="flex items-center gap-2 text-[11px] font-bold">
                                <span className="text-slate-400 uppercase tracking-wider">{d.champ}:</span>
                                <span className="text-red-500">{String(d.avant ?? '—')}</span>
                                <span className="text-slate-400">→</span>
                                <span className="text-emerald-500">{String(d.apres ?? '—')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {log.auteur_nom && (
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest">par {log.auteur_nom}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Modal statut / verdict */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalType === 'verdict' ? 'Rendre un verdict' : 'Modifier le Statut'}>
        <div className="space-y-6 py-4">
          {formError && (
            <div className="bg-red-500/10 text-red-500 text-xs font-bold p-3 rounded-xl border border-red-500/20 flex items-center gap-2">
              <AlertCircle size={14} /> {formError}
            </div>
          )}

          {modalType === 'status' && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nouveau Statut</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none font-bold">
                <option value="en_cours">En cours</option>
                <option value="appelee">En appel</option>
                <option value="classee">Classée</option>
                <option value="jugee">Jugée</option>
              </select>
            </div>
          )}

          {modalType === 'verdict' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Décision du Tribunal <span className="text-red-400">*</span></label>
                <input type="text" placeholder="Ex: Coupable / Non coupable" value={verdictDecision} onChange={e => setVerdictDecision(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Peine Prononcée <span className="text-red-400">*</span></label>
                <input type="text" placeholder="Ex: 5 ans ferme + 500 000 FCFA" value={verdictPeine} onChange={e => setVerdictPeine(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motivation & Justification <span className="text-red-400">*</span></label>
                <textarea placeholder="Exposé des motifs du tribunal..." value={verdictMotif} onChange={e => setVerdictMotif(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none font-bold min-h-[100px]" />
              </div>
            </div>
          )}

          <p className="text-slate-500 font-medium text-sm leading-relaxed">
            Cette action est enregistrée sous votre matricule et traçable dans les logs d'audit.
          </p>
          <button className="btn btn-primary w-full !py-4 shadow-xl shadow-blue-500/20 disabled:opacity-60" disabled={saving} onClick={handleModalSubmit}>
            {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Valider & Signer'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AffaireDetail;
