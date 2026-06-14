import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  User, Mail, Shield, Calendar, CheckCircle,
  Camera, Save, Lock, Activity, Loader2, AlertCircle, LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal, Badge } from '../components/UI';
import { supabase } from '../lib/supabaseClient';
import { api } from '../services/api';
import { getRoleLabel, getRoleColor, normalizeRole } from '../lib/permissions';
import { cn } from '../components/UI';
import { useNotification } from '../context/NotificationContext';

const Profile = () => {
  const { user, login, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isEditing, setIsEditing]     = useState(false);
  const { showToast } = useNotification();
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState('');
  const [activityLogs, setActivityLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [prenom, setPrenom] = useState('');
  const [nom, setNom]       = useState('');
  const [email, setEmail]   = useState('');

  // Champ changement de mot de passe
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [newPwd, setNewPwd]       = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError]   = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  // Upload photo de profil
  const fileInputRef                  = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl]     = useState(null);

  useEffect(() => {
    if (user?.avatar_url) setAvatarUrl(user.avatar_url);
  }, [user?.avatar_url]);

  const handleUploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image trop lourde (max 2 Mo)', 'error');
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('Le fichier doit être une image', 'error');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext  = file.name.split('.').pop().toLowerCase();
      const path = `${user.id}/avatar_${Date.now()}.${ext}`;

      // Upload dans le bucket "avatars"
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;

      // URL publique
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      // Mettre à jour profils
      const { error: profErr } = await supabase
        .from('profils')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (profErr) throw profErr;

      setAvatarUrl(publicUrl);
      login({ ...user, avatar_url: publicUrl });
      showToast('Photo de profil mise à jour !', 'success');
    } catch (err) {
      showToast('Erreur upload : ' + err.message, 'error');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (user) {
      setPrenom(user.prenom || '');
      setNom(user.nom || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Sauvegarde profil en BDD
  const handleSave = async () => {
    if (!isEditing) { setIsEditing(true); return; }
    if (!nom.trim() || !prenom.trim()) {
      setSaveError('Nom et prénom sont obligatoires.'); return;
    }
    setSaveError('');
    setSaving(true);
    try {
      // Mise à jour table profils
      const { error: profileErr } = await supabase
        .from('profils')
        .update({ nom: nom.trim(), prenom: prenom.trim() })
        .eq('id', user.id);
      if (profileErr) throw profileErr;

      // Mise à jour email Supabase Auth si changé
      if (email.trim() !== user.email) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailErr) throw emailErr;
        showToast('Profil mis à jour. Confirmez le nouvel email dans votre boite mail.', 'success');
      } else {
        showToast('Profil mis à jour avec succès !', 'success');
      }

      // Synchroniser le store
      login({ ...user, nom: nom.trim(), prenom: prenom.trim(), email: email.trim() });
      setIsEditing(false);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Changement de mot de passe
  const handleChangePwd = async () => {
    setPwdError('');
    if (newPwd.length < 8)        { setPwdError('Minimum 8 caractères.'); return; }
    if (!/[A-Z]/.test(newPwd))    { setPwdError('Au moins une majuscule requise.'); return; }
    if (!/[0-9]/.test(newPwd))    { setPwdError('Au moins un chiffre requis.'); return; }
    if (newPwd !== confirmPwd)    { setPwdError('Les mots de passe ne correspondent pas.'); return; }
    setPwdSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      showToast('Mot de passe modifié avec succès !', 'success');
      setIsChangingPwd(false);
      setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setPwdSaving(false);
    }
  };

  // Charger logs d'activité réels depuis audit_logs
  const handleOpenLogs = async () => {
    setIsLogModalOpen(true);
    setLogsLoading(true);
    try {
      const logs = await api.getUserAuditLogs(user.id, 15);
      setActivityLogs(logs);
    } catch {
      setActivityLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  if (!user) return null;

  const role = normalizeRole(user.role || 'huissier');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center gap-8 bg-white dark:bg-slate-900/50 p-8 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl backdrop-blur-xl">
        <div className="relative group">
          <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-blue-500 to-navy-600 flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-blue-500/30 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <>{(user.prenom?.[0] || '?')}{(user.nom?.[0] || '')}</>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-2 -right-2 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-white/10 text-blue-500 hover:scale-110 transition-transform disabled:opacity-60"
            title="Changer la photo de profil"
          >
            {uploadingAvatar ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleUploadAvatar}
          />
        </div>

        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <h1 className="text-3xl font-black text-navy-900 dark:text-white tracking-tight">
              {user.prenom} {user.nom}
            </h1>
            <span className={cn('text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border', getRoleColor(role))}>
              {getRoleLabel(role)}
            </span>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-xl">
              <Mail size={14} /> {user.email}
            </div>
            {user.date_creation && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-xl">
                <Calendar size={14} />
                Depuis {new Date(user.date_creation).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full md:w-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary px-8 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 disabled:opacity-60"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : (isEditing ? <Save size={20} /> : <User size={20} />)}
            {isEditing ? 'Enregistrer' : 'Modifier le Profil'}
          </button>
          <button onClick={handleLogout} className="btn btn-secondary px-8 py-3 rounded-2xl flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-8">

          {/* Informations professionnelles */}
          <div className="bg-white dark:bg-slate-900/50 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl backdrop-blur-xl">
            <h3 className="text-xl font-black text-navy-900 dark:text-white mb-8 flex items-center gap-3">
              <Shield size={24} className="text-blue-500" />
              Informations Professionnelles
            </h3>

            {saveError && (
              <div className="mb-6 bg-red-500/10 text-red-500 text-xs font-bold p-3 rounded-xl border border-red-500/20 flex items-center gap-2">
                <AlertCircle size={14} /> {saveError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Prénom</label>
                <input type="text" value={prenom} onChange={e => setPrenom(e.target.value)} disabled={!isEditing}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 font-bold text-navy-900 dark:text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nom</label>
                <input type="text" value={nom} onChange={e => setNom(e.target.value)} disabled={!isEditing}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 font-bold text-navy-900 dark:text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Professionnel</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={!isEditing}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 font-bold text-navy-900 dark:text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Fonction / Rôle</label>
                <div className="w-full px-6 py-4 bg-slate-100 dark:bg-white/10 border border-transparent rounded-2xl font-bold text-slate-500 flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-500" />
                  {getRoleLabel(role)} (Certifié)
                </div>
              </div>
            </div>
          </div>

          {/* Sécurité & mot de passe */}
          <div className="bg-white dark:bg-slate-900/50 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl backdrop-blur-xl">
            <h3 className="text-xl font-black text-navy-900 dark:text-white mb-8 flex items-center gap-3">
              <Lock size={24} className="text-blue-500" />
              Sécurité du Compte
            </h3>

            <div className="space-y-6">
              {/* Changement mot de passe */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-black text-navy-900 dark:text-white">Mot de passe</p>
                    <p className="text-xs text-slate-500 font-bold">Modifiez votre clé d'accès sécurisée.</p>
                  </div>
                  <button
                    onClick={() => setIsChangingPwd(!isChangingPwd)}
                    className="px-5 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-blue-500 shadow border border-slate-100 dark:border-white/5 hover:bg-slate-50 transition-all"
                  >
                    {isChangingPwd ? 'Annuler' : 'Modifier'}
                  </button>
                </div>
                {isChangingPwd && (
                  <div className="space-y-4 mt-4">
                    {pwdError && (
                      <div className="bg-red-500/10 text-red-500 text-xs font-bold p-3 rounded-xl border border-red-500/20 flex items-center gap-2">
                        <AlertCircle size={14} /> {pwdError}
                      </div>
                    )}
                    <input type="password" placeholder="Nouveau mot de passe" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                      className="w-full px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-navy-900 dark:text-white focus:ring-4 focus:ring-blue-500/10" />
                    <input type="password" placeholder="Confirmer le mot de passe" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                      className="w-full px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-navy-900 dark:text-white focus:ring-4 focus:ring-blue-500/10" />
                    <p className="text-[10px] text-slate-400 font-bold ml-1">Min. 8 caractères · 1 majuscule · 1 chiffre</p>
                    <button onClick={handleChangePwd} disabled={pwdSaving} className="btn btn-primary w-full !py-3 rounded-2xl disabled:opacity-60">
                      {pwdSaving ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Confirmer le nouveau mot de passe'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite */}
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-navy-900 to-[#020617] p-10 rounded-[3rem] border border-white/5 text-white shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-6">Statut du Compte</p>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-400">Accès Base de Données</span>
                <span className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.5)]"></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-400">RLS Activé</span>
                <span className="text-sm font-black text-blue-400">CONFORME</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-400">Rôle vérifié</span>
                <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black uppercase">{getRoleLabel(role)}</span>
              </div>
              <div className="pt-6 border-t border-white/5">
                <button
                  onClick={handleOpenLogs}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-colors"
                >
                  Journal d'Activité
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal journal d'activité — données réelles */}
      <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title="Journal d'Activité Récent">
        <div className="space-y-4 py-4">
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
            {logsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin text-blue-500" size={24} />
              </div>
            ) : activityLogs.length === 0 ? (
              <p className="text-center text-slate-400 font-bold py-10">Aucune activité enregistrée</p>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl shrink-0">
                      <Activity size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-navy-900 dark:text-white">{log.action}</p>
                      <p className="text-[10px] text-slate-400 font-bold">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : '—'}
                        {log.cible_type ? ` · ${log.cible_type}` : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant="en_cours">OK</Badge>
                </div>
              ))
            )}
          </div>
          <button onClick={() => setIsLogModalOpen(false)} className="btn btn-primary w-full !py-4 shadow-xl shadow-blue-500/20">
            Fermer le journal
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;
