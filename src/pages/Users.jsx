import React, { useState, useEffect, useCallback } from 'react';
import {
  Users as UsersIcon, Search, CheckCircle,
  XCircle, Loader2, RefreshCw, UserCog
} from 'lucide-react';
import { Card, Table, Badge, Modal, ConfirmDialog, cn } from '../components/UI';
import { supabase } from '../lib/supabaseClient';
import { getRoleLabel, getRoleColor } from '../lib/permissions';
import { useNotification } from '../context/NotificationContext';

const ROLES_LIST = [
  'super_admin', 'juge', 'procureur', 'avocat',
  'greffier', 'huissier', 'notaire', 'gestionnaire',
];

const Users = () => {
  const { showToast } = useNotification();
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editUser, setEditUser]         = useState(null);
  const [newRole, setNewRole]           = useState('');
  const [saving, setSaving]             = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(null); // user à désactiver/activer
  const [toggling, setToggling]           = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profils')
        .select('*')
        .order('nom');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      showToast('Erreur: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filtered = users.filter(u =>
    `${u.nom} ${u.prenom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenEdit = (u) => { setEditUser(u); setNewRole(u.role); };

  const handleSaveRole = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profils')
        .update({ role: newRole })
        .eq('id', editUser.id);
      if (error) throw error;
      showToast(`Rôle de ${editUser.prenom} ${editUser.nom} mis à jour`, 'success');
      setEditUser(null);
      loadUsers();
    } catch (err) {
      showToast('Erreur: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmToggle) return;
    setToggling(true);
    try {
      const { error } = await supabase
        .from('profils')
        .update({ actif: !confirmToggle.actif })
        .eq('id', confirmToggle.id);
      if (error) throw error;
      showToast(`Compte ${!confirmToggle.actif ? 'activé' : 'désactivé'}`, 'success');
      setConfirmToggle(null);
      loadUsers();
    } catch (err) {
      showToast('Erreur: ' + err.message, 'error');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 font-['Outfit']">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-[#020617] p-8 rounded-[3rem] glass-card border-none">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <UsersIcon size={20} />
            </div>
            <h1 className="text-3xl font-black text-navy-900 dark:text-white tracking-tight">Gestion des Utilisateurs</h1>
          </div>
          <p className="text-slate-500 font-medium ml-1">Gérez les comptes, rôles et accès du personnel judiciaire.</p>
        </div>
        <button onClick={loadUsers} className="btn btn-secondary !rounded-2xl gap-2">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: users.length, color: 'bg-blue-500/10 text-blue-600' },
          { label: 'Actifs', value: users.filter(u => u.actif !== false).length, color: 'bg-emerald-500/10 text-emerald-600' },
          { label: 'Inactifs', value: users.filter(u => u.actif === false).length, color: 'bg-red-500/10 text-red-600' },
          { label: 'Admins', value: users.filter(u => u.role === 'super_admin').length, color: 'bg-purple-500/10 text-purple-600' },
        ].map((s, i) => (
          <div key={i} className={cn('p-6 rounded-2xl font-black text-center', s.color, 'bg-opacity-100')}>
            <p className="text-3xl">{s.value}</p>
            <p className="text-xs uppercase tracking-widest mt-1 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recherche */}
      <div className="glass-card p-4 rounded-[2rem] border-none flex items-center gap-4 px-8 focus-within:ring-4 focus-within:ring-blue-500/10">
        <Search className="text-slate-400" size={22} />
        <input
          type="text"
          placeholder="Rechercher par nom ou rôle..."
          className="bg-transparent border-none outline-none text-lg font-bold w-full placeholder:text-slate-400 dark:text-white"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tableau */}
      <Card className="p-2 border-none">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold">Aucun utilisateur trouvé</div>
        ) : (
          <Table
            headers={['Utilisateur', 'Rôle', 'Statut', 'Actions']}
            data={filtered}
            renderRow={(u) => (
              <tr key={u.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-200">
                <td className="py-5 px-8">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white',
                      u.actif === false ? 'bg-slate-400' : 'bg-gradient-to-br from-blue-500 to-navy-600'
                    )}>
                      {(u.prenom?.[0] || '?')}{(u.nom?.[0] || '')}
                    </div>
                    <div>
                      <p className="text-sm font-black text-navy-900 dark:text-white">
                        {u.prenom} {u.nom}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        ID: {u.id?.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-5 px-4">
                  <span className={cn(
                    'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border',
                    getRoleColor(u.role)
                  )}>
                    {getRoleLabel(u.role)}
                  </span>
                </td>
                <td className="py-5 px-4">
                  {u.actif === false ? (
                    <Badge variant="error">Inactif</Badge>
                  ) : (
                    <Badge variant="jugee">Actif</Badge>
                  )}
                </td>
                <td className="py-5 px-8">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-2.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all"
                      title="Changer le rôle"
                    >
                      <UserCog size={16} />
                    </button>
                    <button
                      onClick={() => setConfirmToggle(u)}
                      className={cn(
                        'p-2.5 rounded-xl transition-all',
                        u.actif === false
                          ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                          : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                      )}
                      title={u.actif === false ? 'Activer' : 'Désactiver'}
                    >
                      {u.actif === false ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    </button>
                  </div>
                </td>
              </tr>
            )}
          />
        )}
      </Card>

      {/* Modal changement de rôle */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Modifier le rôle">
        {editUser && (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-navy-600 flex items-center justify-center text-white font-black">
                {editUser.prenom?.[0]}{editUser.nom?.[0]}
              </div>
              <div>
                <p className="font-black text-navy-900 dark:text-white">{editUser.prenom} {editUser.nom}</p>
                <p className="text-xs text-slate-400">Rôle actuel : {getRoleLabel(editUser.role)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nouveau rôle</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none font-bold">
                {ROLES_LIST.map(r => (
                  <option key={r} value={r}>{getRoleLabel(r)}</option>
                ))}
              </select>
            </div>

            <button onClick={handleSaveRole} disabled={saving || newRole === editUser.role}
              className="btn btn-primary w-full !py-4 disabled:opacity-60">
              {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Confirmer le changement de rôle'}
            </button>
          </div>
        )}
      </Modal>

      {/* Confirmation activation/désactivation compte */}
      <ConfirmDialog
        isOpen={!!confirmToggle}
        title={confirmToggle?.actif === false ? 'Activer ce compte ?' : 'Désactiver ce compte ?'}
        message={
          confirmToggle?.actif === false
            ? `${confirmToggle?.prenom} ${confirmToggle?.nom} pourra de nouveau accéder au système.`
            : `${confirmToggle?.prenom} ${confirmToggle?.nom} ne pourra plus se connecter.`
        }
        confirmLabel={confirmToggle?.actif === false ? 'Activer' : 'Désactiver'}
        variant={confirmToggle?.actif === false ? 'warning' : 'danger'}
        loading={toggling}
        onConfirm={handleToggleStatus}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
};

export default Users;
