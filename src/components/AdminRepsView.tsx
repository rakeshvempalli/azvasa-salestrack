import React, { useState } from 'react';
import { UserProfile, Lead, UserRole } from '../types';
import {
  UserPlus,
  UserCheck2,
  UserX,
  Mail,
  Phone,
  Briefcase,
  Shield,
  Edit,
  ArrowRightLeft,
  X,
  CheckCircle2,
  AlertCircle,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Search,
  Users
} from 'lucide-react';

interface AdminRepsViewProps {
  reps: UserProfile[];
  leads: Lead[];
  currentUser: UserProfile;
  onAddRep: (rep: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) => UserProfile | null | void;
  onUpdateRep: (id: string, updates: Partial<UserProfile>) => void;
  onDeleteUser?: (id: string, reassignToRepId?: string) => void;
  onReassignAllLeads: (fromRepId: string, toRepId: string) => void;
}

export const AdminRepsView: React.FC<AdminRepsViewProps> = ({
  reps,
  leads,
  currentUser,
  onAddRep,
  onUpdateRep,
  onDeleteUser,
  onReassignAllLeads
}) => {
  // Filter & Search states
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);

  // Deletion modal states
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deleteOption, setDeleteOption] = useState<'reassign' | 'unassign'>('reassign');
  const [deleteReassignToRepId, setDeleteReassignToRepId] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordInForm, setShowPasswordInForm] = useState(false);
  const [role, setRole] = useState<UserRole>('sales_rep');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('Senior Academic Consultant');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Bulk reassignment modal state
  const [reassignFromUser, setReassignFromUser] = useState<UserProfile | null>(null);
  const [reassignToUserId, setReassignToUserId] = useState('');

  // Password visibility map for list
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Copy notification toast
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Created credentials modal popup (shows exact credentials with 1-click copy)
  const [createdCredentialsModal, setCreatedCredentialsModal] = useState<{
    user: UserProfile;
    plainPassword?: string;
  } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Quick auto-generate password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setUsername('');
    setPassword('Password@123');
    setShowPasswordInForm(false);
    setRole('sales_rep');
    setPhone('');
    setEmployeeId('');
    setDesignation('Senior Academic Consultant');
    setStatus('active');
    setFormError(null);
    setEditUser(null);
  };

  const handleOpenAdd = (defaultRole: UserRole = 'sales_rep') => {
    resetForm();
    setRole(defaultRole);
    if (defaultRole === 'super_admin') {
      setDesignation('Co-Director & Super Admin');
      setEmployeeId(`AZ-SA-${String(reps.filter(r => r.role === 'super_admin').length + 1).padStart(3, '0')}`);
    } else if (defaultRole === 'sales_manager') {
      setDesignation('Regional Sales Manager');
      setEmployeeId(`AZ-SM-${String(reps.filter(r => r.role === 'sales_manager').length + 1).padStart(3, '0')}`);
    } else {
      setDesignation('Senior Academic Consultant');
      setEmployeeId(`AZ-REP-${String(reps.filter(r => r.role === 'sales_rep').length + 1).padStart(3, '0')}`);
    }
    setShowAddModal(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setEditUser(user);
    setFullName(user.full_name);
    setEmail(user.email);
    setUsername(user.username || user.email.split('@')[0]);
    setPassword(user.password || 'Password@123');
    setRole(user.role);
    setPhone(user.phone);
    setEmployeeId(user.employee_id);
    setDesignation(user.designation);
    setStatus(user.status);
    setShowAddModal(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (!editUser) {
      if (newRole === 'super_admin') {
        setDesignation('Co-Director & Super Admin');
        setEmployeeId(`AZ-SA-${String(reps.filter(r => r.role === 'super_admin').length + 1).padStart(3, '0')}`);
      } else if (newRole === 'sales_manager') {
        setDesignation('Regional Sales Manager');
        setEmployeeId(`AZ-SM-${String(reps.filter(r => r.role === 'sales_manager').length + 1).padStart(3, '0')}`);
      } else {
        setDesignation('Senior Academic Consultant');
        setEmployeeId(`AZ-REP-${String(reps.filter(r => r.role === 'sales_rep').length + 1).padStart(3, '0')}`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setFormError('Full Name and Email are required.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const finalUsername = username.trim() || trimmedEmail.split('@')[0];
    const finalPassword = password.trim() || 'Password@123';

    if (editUser) {
      // Check if email already used by someone else
      if (reps.some(r => r.id !== editUser.id && r.email.toLowerCase() === trimmedEmail)) {
        setFormError('Another user with this email already exists.');
        return;
      }

      onUpdateRep(editUser.id, {
        full_name: fullName.trim(),
        email: trimmedEmail,
        username: finalUsername,
        password: finalPassword,
        role,
        phone: phone.trim() || '+91 98000 00000',
        employee_id: employeeId.trim() || editUser.employee_id,
        designation: designation.trim() || editUser.designation,
        status
      });

      setSuccessToast(`Credentials updated successfully for ${fullName.trim()}!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } else {
      // Check if email already exists
      if (reps.some(r => r.email.toLowerCase() === trimmedEmail)) {
        setFormError('A team member with this email already exists.');
        return;
      }

      const res = onAddRep({
        email: trimmedEmail,
        username: finalUsername,
        password: finalPassword,
        full_name: fullName.trim(),
        role,
        phone: phone.trim() || '+91 98000 00000',
        employee_id: employeeId.trim() || `AZ-${role.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-3)}`,
        designation: designation.trim() || (role === 'super_admin' ? 'Super Admin' : role === 'sales_manager' ? 'Sales Manager' : 'Sales Representative'),
        status
      });

      const userDisplay: UserProfile = (res as UserProfile) || {
        id: `user-${Date.now()}`,
        email: trimmedEmail,
        username: finalUsername,
        password: finalPassword,
        full_name: fullName.trim(),
        role,
        phone: phone.trim() || '+91 98000 00000',
        employee_id: employeeId.trim() || `AZ-${role.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-3)}`,
        designation: designation.trim() || (role === 'super_admin' ? 'Super Admin' : role === 'sales_manager' ? 'Sales Manager' : 'Sales Representative'),
        status,
        created_at: new Date().toISOString()
      };

      setCreatedCredentialsModal({
        user: userDisplay,
        plainPassword: finalPassword
      });

      setSuccessToast(`Team member added successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleToggleStatus = (user: UserProfile) => {
    if (user.email.toLowerCase() === 'vempallirakhi20@gmail.com') {
      setSuccessToast('The primary Super Admin account cannot be deactivated.');
      setTimeout(() => setSuccessToast(null), 4000);
      return;
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    onUpdateRep(user.id, { status: nextStatus });

    // If deactivating and has leads, prompt to reassign
    if (nextStatus === 'inactive') {
      const userLeads = leads.filter(l => l.assigned_rep_id === user.id);
      if (userLeads.length > 0) {
        setReassignFromUser(user);
      }
    }
  };

  const handleInitiateDelete = (user: UserProfile) => {
    if (user.email.toLowerCase() === 'vempallirakhi20@gmail.com') {
      setSuccessToast('The primary Super Admin account (vempallirakhi20@gmail.com) cannot be deleted.');
      setTimeout(() => setSuccessToast(null), 4000);
      return;
    }

    const superAdmins = reps.filter(r => r.role === 'super_admin' && r.status === 'active');
    if (user.role === 'super_admin' && superAdmins.length <= 1) {
      setSuccessToast('Cannot delete the only active Super Admin.');
      setTimeout(() => setSuccessToast(null), 4000);
      return;
    }

    // Pre-select an active rep/manager other than this user
    const otherActiveRep = reps.find(r => r.id !== user.id && r.status === 'active');
    setDeleteReassignToRepId(otherActiveRep ? otherActiveRep.id : '');
    setDeleteOption('reassign');
    setDeleteError(null);
    setUserToDelete(user);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    const userLeads = leads.filter(l => l.assigned_rep_id === userToDelete.id);
    if (userLeads.length > 0 && deleteOption === 'reassign' && !deleteReassignToRepId) {
      setDeleteError('Please select an active team member to reassign leads to, or choose "Move to Unassigned Pool".');
      return;
    }

    setIsDeleting(true);
    try {
      if (onDeleteUser) {
        await onDeleteUser(
          userToDelete.id,
          deleteOption === 'reassign' ? deleteReassignToRepId : undefined
        );
      }
      setSuccessToast(`${userToDelete.full_name} has been removed successfully.`);
      setTimeout(() => setSuccessToast(null), 4000);
      setUserToDelete(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete user. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExecuteReassign = () => {
    if (!reassignFromUser || !reassignToUserId) return;
    onReassignAllLeads(reassignFromUser.id, reassignToUserId);
    setReassignFromUser(null);
    setReassignToUserId('');
  };

  const handleCopyCredentials = (user: UserProfile) => {
    const roleTitle = user.role === 'super_admin' ? 'Super Admin' : user.role === 'sales_manager' ? 'Sales Manager' : 'Sales Representative';
    const text = `AZVASA SalesTrack - Login Credentials
-------------------------------------------
Team Member: ${user.full_name}
Role: ${roleTitle}
Employee ID: ${user.employee_id}

[Option 1] Sign in with Google:
Google Email: ${user.email}

[Option 2] Sign in with Username & Password:
Username: ${user.username || user.email}
Password: ${user.password || 'Password@123'}
-------------------------------------------`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedUserId(user.id);
      setTimeout(() => setCopiedUserId(null), 3000);
    });
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Counts by role
  const superAdminCount = reps.filter(r => r.role === 'super_admin').length;
  const salesManagerCount = reps.filter(r => r.role === 'sales_manager').length;
  const salesRepCount = reps.filter(r => r.role === 'sales_rep').length;
  const activeCount = reps.filter(r => r.status === 'active').length;

  // Filtered list
  const filteredUsers = reps.filter(user => {
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesName = user.full_name.toLowerCase().includes(q);
      const matchesEmail = user.email.toLowerCase().includes(q);
      const matchesUsername = (user.username || '').toLowerCase().includes(q);
      const matchesEmpId = user.employee_id.toLowerCase().includes(q);
      const matchesDesignation = user.designation.toLowerCase().includes(q);
      return matchesName || matchesEmail || matchesUsername || matchesEmpId || matchesDesignation;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner & Metric Counters */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#084ab8]">
                Team & Credentials Management
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#eef4ff] text-[#084ab8] border border-[#084ab8]/20">
                {reps.length} Total Members
              </span>
            </div>
            <p className="text-xs text-[#646260] mt-1 max-w-2xl">
              Add corporate team members (Super Admin, Sales Manager, Sales Representatives). Configure their authorized email for Google login and set their unique username & password to hand out.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenAdd('sales_rep')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#084ab8] hover:bg-[#06378a] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          </div>
        </div>

        {/* Quick Role Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-[#f3f2f1]">
          <div 
            onClick={() => setRoleFilter(roleFilter === 'super_admin' ? 'all' : 'super_admin')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              roleFilter === 'super_admin' ? 'border-[#084ab8] bg-[#eef4ff]' : 'border-[#e8e7e5] bg-[#fafaf9] hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#646260]">Super Admins</span>
              <Shield className="w-3.5 h-3.5 text-[#084ab8]" />
            </div>
            <div className="text-lg font-bold text-[#2d2b2a] mt-1">{superAdminCount}</div>
            <span className="text-[10px] text-[#084ab8]">Full system control</span>
          </div>

          <div 
            onClick={() => setRoleFilter(roleFilter === 'sales_manager' ? 'all' : 'sales_manager')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              roleFilter === 'sales_manager' ? 'border-[#7c3aed] bg-[#f5f3ff]' : 'border-[#e8e7e5] bg-[#fafaf9] hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#646260]">Sales Managers</span>
              <Briefcase className="w-3.5 h-3.5 text-[#7c3aed]" />
            </div>
            <div className="text-lg font-bold text-[#2d2b2a] mt-1">{salesManagerCount}</div>
            <span className="text-[10px] text-[#7c3aed]">Pipeline & Team lead</span>
          </div>

          <div 
            onClick={() => setRoleFilter(roleFilter === 'sales_rep' ? 'all' : 'sales_rep')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              roleFilter === 'sales_rep' ? 'border-[#f28705] bg-[#fff4e6]' : 'border-[#e8e7e5] bg-[#fafaf9] hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#646260]">Sales Representatives</span>
              <UserCheck2 className="w-3.5 h-3.5 text-[#f28705]" />
            </div>
            <div className="text-lg font-bold text-[#2d2b2a] mt-1">{salesRepCount}</div>
            <span className="text-[10px] text-[#f28705]">Lead follow-up & visits</span>
          </div>

          <div className="p-3 rounded-xl border border-[#e8e7e5] bg-[#fafaf9]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#646260]">Active Status</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg font-bold text-emerald-700 mt-1">{activeCount} / {reps.length}</div>
            <span className="text-[10px] text-emerald-600">Can authenticate</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#e8e7e5] shadow-2xs">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              roleFilter === 'all'
                ? 'bg-[#084ab8] text-white shadow-xs'
                : 'text-[#646260] hover:text-[#2d2b2a] hover:bg-[#f3f2f1]'
            }`}
          >
            All Roles ({reps.length})
          </button>
          <button
            onClick={() => setRoleFilter('super_admin')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              roleFilter === 'super_admin'
                ? 'bg-[#084ab8] text-white shadow-xs'
                : 'text-[#646260] hover:text-[#2d2b2a] hover:bg-[#f3f2f1]'
            }`}
          >
            Super Admins ({superAdminCount})
          </button>
          <button
            onClick={() => setRoleFilter('sales_manager')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              roleFilter === 'sales_manager'
                ? 'bg-[#084ab8] text-white shadow-xs'
                : 'text-[#646260] hover:text-[#2d2b2a] hover:bg-[#f3f2f1]'
            }`}
          >
            Sales Managers ({salesManagerCount})
          </button>
          <button
            onClick={() => setRoleFilter('sales_rep')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              roleFilter === 'sales_rep'
                ? 'bg-[#084ab8] text-white shadow-xs'
                : 'text-[#646260] hover:text-[#2d2b2a] hover:bg-[#f3f2f1]'
            }`}
          >
            Sales Reps ({salesRepCount})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8b88]" />
          <input
            type="text"
            placeholder="Search team member or credentials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8] shadow-2xs"
          />
        </div>
      </div>

      {/* Copy toast */}
      {copiedUserId && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2d2b2a] text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs animate-slideUp">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Login credentials formatted & copied to clipboard!</span>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#fafaf9] border-b border-[#e8e7e5] text-[#646260] font-semibold">
              <tr>
                <th className="py-3 px-4">Member Profile</th>
                <th className="py-3 px-4">System Role</th>
                <th className="py-3 px-4">Authorized Google Account</th>
                <th className="py-3 px-4">Login Credentials</th>
                <th className="py-3 px-4">Assigned Leads</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f2f1]">
              {filteredUsers.map(user => {
                const userLeadsCount = leads.filter(l => l.assigned_rep_id === user.id).length;
                const isActive = user.status === 'active';
                const isPrimaryAdmin = user.email.toLowerCase() === 'vempallirakhi20@gmail.com';
                const isPasswordShown = !!visiblePasswords[user.id];

                return (
                  <tr key={user.id} className="hover:bg-[#fafaf9] transition-colors">
                    {/* User Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt={user.full_name}
                          className="w-9 h-9 rounded-xl object-cover border border-[#e8e7e5] shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-xs text-[#2d2b2a] block">
                              {user.full_name}
                            </strong>
                            {isPrimaryAdmin && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                                Primary Admin
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#646260]">
                            {user.designation} • <span className="font-mono text-[9px]">{user.employee_id}</span>
                          </span>
                          <span className="text-[10px] text-[#8e8b88] flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            {user.phone}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-3.5 px-4">
                      {user.role === 'super_admin' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#eef4ff] text-[#084ab8] border border-[#084ab8]/20">
                          <Shield className="w-3 h-3 text-[#084ab8]" />
                          Super Admin
                        </span>
                      )}
                      {user.role === 'sales_manager' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#f5f3ff] text-[#7c3aed] border border-[#7c3aed]/20">
                          <Briefcase className="w-3 h-3 text-[#7c3aed]" />
                          Sales Manager
                        </span>
                      )}
                      {user.role === 'sales_rep' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#fff4e6] text-[#b85c00] border border-[#f28705]/20">
                          <UserCheck2 className="w-3 h-3 text-[#f28705]" />
                          Sales Rep
                        </span>
                      )}
                    </td>

                    {/* Authorized Google Email */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span className="font-mono text-[11px] text-[#2d2b2a] bg-[#f3f2f1] px-2 py-0.5 rounded-md border border-[#e8e7e5]">
                          {user.email}
                        </span>
                      </div>
                    </td>

                    {/* Direct Credentials (Username & Password) */}
                    <td className="py-3.5 px-4">
                      <div className="bg-[#f9f9f8] border border-[#e8e7e5] rounded-lg p-1.5 space-y-1 w-52">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#646260]">User:</span>
                          <span className="font-mono font-bold text-[#084ab8]">{user.username || user.email.split('@')[0]}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#f0f0ef]">
                          <span className="text-[#646260]">Pass:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-medium text-[#2d2b2a]">
                              {isPasswordShown ? (user.password || 'Password@123') : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(user.id)}
                              title={isPasswordShown ? "Hide password" : "Show password"}
                              className="text-[#8e8b88] hover:text-[#2d2b2a] p-0.5"
                            >
                              {isPasswordShown ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Assigned Leads */}
                    <td className="py-3.5 px-4 font-semibold text-xs text-[#2d2b2a]">
                      {user.role === 'super_admin' ? (
                        <span className="text-[#084ab8] font-medium text-[11px]">All ({leads.length})</span>
                      ) : user.role === 'sales_manager' ? (
                        <span className="text-[#7c3aed] font-medium text-[11px]">Team Oversight</span>
                      ) : (
                        <span className={userLeadsCount > 0 ? 'text-[#084ab8]' : 'text-[#8e8b88]'}>
                          {userLeadsCount} leads
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={isPrimaryAdmin}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                          isActive
                            ? 'bg-[#eefbf4] text-emerald-700 border-emerald-300 hover:bg-[#e2f7eb]'
                            : 'bg-[#fff4e6] text-[#b85c00] border-[#f28705]/30 hover:bg-[#ffeacc]'
                        } ${isPrimaryAdmin ? 'opacity-80 cursor-not-allowed' : ''}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-[#f28705]'}`} />
                        {isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleCopyCredentials(user)}
                          title="Copy Full Login Credentials to Share"
                          className="p-1.5 rounded-lg border border-[#e8e7e5] hover:border-[#084ab8] hover:bg-[#eef4ff] text-[#084ab8] transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(user)}
                          title="Edit User Details & Password"
                          className="p-1.5 rounded-lg border border-[#e8e7e5] hover:border-[#084ab8] hover:bg-[#eef4ff] text-[#646260] hover:text-[#084ab8] transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {!isPrimaryAdmin && (
                          <button
                            onClick={() => handleInitiateDelete(user)}
                            title="Delete User"
                            className="p-1.5 rounded-lg border border-[#e8e7e5] hover:border-red-500 hover:bg-red-50 text-[#646260] hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-[#646260]">
            <Users className="w-8 h-8 text-[#8e8b88] mx-auto mb-2" />
            <p className="text-xs font-semibold">No team members match your filter.</p>
            <button
              onClick={() => { setRoleFilter('all'); setSearchQuery(''); }}
              className="mt-2 text-xs text-[#084ab8] hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#e8e7e5] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-scaleIn">
            <div className="flex items-center justify-between border-b border-[#e8e7e5] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#eef4ff] text-[#084ab8] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#084ab8]">
                    {editUser ? 'Edit Team Member & Credentials' : 'Add New Team Member'}
                  </h3>
                  <p className="text-[11px] text-[#646260]">
                    Assign role, corporate email, username, and password.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-[#8e8b88] hover:text-[#2d2b2a] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-[#fff4e6] border border-[#f28705]/40 rounded-xl text-xs text-[#2d2b2a] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#f28705] shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1.5">
                  Select Role <span className="text-[#f28705]">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('super_admin')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      role === 'super_admin'
                        ? 'border-[#084ab8] bg-[#eef4ff] text-[#084ab8] font-bold shadow-xs'
                        : 'border-[#e8e7e5] bg-white text-[#646260] hover:bg-[#fafaf9]'
                    }`}
                  >
                    <Shield className="w-4 h-4 mx-auto mb-1 text-[#084ab8]" />
                    <div className="text-xs">Super Admin</div>
                    <div className="text-[9px] text-[#646260] mt-0.5">Whole Access</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('sales_manager')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      role === 'sales_manager'
                        ? 'border-[#7c3aed] bg-[#f5f3ff] text-[#7c3aed] font-bold shadow-xs'
                        : 'border-[#e8e7e5] bg-white text-[#646260] hover:bg-[#fafaf9]'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 mx-auto mb-1 text-[#7c3aed]" />
                    <div className="text-xs">Sales Manager</div>
                    <div className="text-[9px] text-[#646260] mt-0.5">Team & Pipeline</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('sales_rep')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      role === 'sales_rep'
                        ? 'border-[#f28705] bg-[#fff4e6] text-[#b85c00] font-bold shadow-xs'
                        : 'border-[#e8e7e5] bg-white text-[#646260] hover:bg-[#fafaf9]'
                    }`}
                  >
                    <UserCheck2 className="w-4 h-4 mx-auto mb-1 text-[#f28705]" />
                    <div className="text-xs">Sales Rep</div>
                    <div className="text-[9px] text-[#646260] mt-0.5">Assigned Leads</div>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  Full Name <span className="text-[#f28705]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vikram Malhotra"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                />
              </div>

              {/* Authorized Email (Used for Google OAuth) */}
              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1 flex items-center justify-between">
                  <span>Authorized Email Address (Google OAuth) <span className="text-[#f28705]">*</span></span>
                  <span className="text-[10px] text-[#084ab8] font-normal">Enables "Login with Google"</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. vikram.malhotra@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (!username && e.target.value.includes('@')) {
                      setUsername(e.target.value.split('@')[0]);
                    }
                  }}
                  required
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                />
                <span className="text-[10px] text-[#646260] mt-0.5 block">
                  The user can sign in using this email via Google or using the username & password below.
                </span>
              </div>

              {/* Username and Password Credentials Box */}
              <div className="p-3.5 rounded-xl bg-[#f9f9f8] border border-[#e8e7e5] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#084ab8] flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#084ab8]" />
                    Direct Login Credentials
                  </span>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[10px] font-semibold text-[#084ab8] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Generate Secure Password
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#2d2b2a] mb-1">
                      Username <span className="text-[#f28705]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. vikram_m"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono border border-[#e8e7e5] rounded-lg bg-white focus:outline-none focus:border-[#084ab8]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#2d2b2a] mb-1">
                      Password <span className="text-[#f28705]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswordInForm ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-1.5 pr-8 text-xs font-mono border border-[#e8e7e5] rounded-lg bg-white focus:outline-none focus:border-[#084ab8]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordInForm(!showPasswordInForm)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8e8b88] hover:text-[#2d2b2a]"
                      >
                        {showPasswordInForm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-[#646260]">
                  Give this username and password to the team member so they can login directly.
                </p>
              </div>

              {/* Phone and Employee ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98450 XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    placeholder="AZ-SM-001"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                  />
                </div>
              </div>

              {/* Designation */}
              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  Designation / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Regional Sales Manager"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  Account Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                >
                  <option value="active">Active (Permit login & assignment)</option>
                  <option value="inactive">Inactive (Block authentication)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#e8e7e5] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#646260] border border-[#e8e7e5] rounded-xl hover:bg-[#f3f2f1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#084ab8] hover:bg-[#06378a] rounded-xl shadow-xs cursor-pointer"
                >
                  {editUser ? 'Save Changes & Sync' : 'Add Team Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Reassign Modal */}
      {reassignFromUser && (
        <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-[#e8e7e5] shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#f28705]" />
                <h3 className="text-sm font-bold text-[#084ab8]">
                  Bulk Reassign Accounts
                </h3>
              </div>
              <button
                onClick={() => setReassignFromUser(null)}
                className="text-[#8e8b88] hover:text-[#2d2b2a]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#646260]">
              Transfer all active institutional leads currently assigned to{' '}
              <strong className="text-[#2d2b2a]">{reassignFromUser.full_name}</strong> to another active team member:
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                Select Destination Team Member
              </label>
              <select
                value={reassignToUserId}
                onChange={(e) => setReassignToUserId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
              >
                <option value="">-- Choose active consultant or manager --</option>
                {reps
                  .filter(r => r.id !== reassignFromUser.id && r.status === 'active')
                  .map(r => (
                    <option key={r.id} value={r.id}>
                      {r.full_name} ({r.role.replace('_', ' ')} - {r.employee_id})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReassignFromUser(null)}
                className="flex-1 py-2 text-xs font-semibold text-[#646260] border border-[#e8e7e5] rounded-xl hover:bg-[#f3f2f1]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reassignToUserId}
                onClick={handleExecuteReassign}
                className="flex-1 py-2 text-xs font-semibold text-white bg-[#084ab8] hover:bg-[#06378a] rounded-xl shadow-xs disabled:opacity-40"
              >
                Transfer Leads
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#e8e7e5] shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2d2b2a]">
                    Delete Team Member
                  </h3>
                  <p className="text-xs text-[#646260]">
                    Remove user account from AZVASA SalesTrack.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="text-[#8e8b88] hover:text-[#2d2b2a] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Details Summary */}
            <div className="p-3 bg-[#fafaf9] rounded-xl border border-[#e8e7e5] flex items-center gap-3">
              <img
                src={userToDelete.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt={userToDelete.full_name}
                className="w-10 h-10 rounded-xl object-cover border border-[#e8e7e5] shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2d2b2a] truncate">
                    {userToDelete.full_name}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    userToDelete.role === 'super_admin'
                      ? 'bg-[#eef4ff] text-[#084ab8]'
                      : userToDelete.role === 'sales_manager'
                      ? 'bg-[#f5f3ff] text-[#7c3aed]'
                      : 'bg-[#fff4e6] text-[#b85c00]'
                  }`}>
                    {userToDelete.role.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-[11px] text-[#646260] truncate">
                  {userToDelete.email} • <span className="font-mono text-[10px]">{userToDelete.employee_id}</span>
                </div>
              </div>
            </div>

            {/* Leads check */}
            {(() => {
              const assignedCount = leads.filter(l => l.assigned_rep_id === userToDelete.id).length;
              if (assignedCount > 0) {
                return (
                  <div className="space-y-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{userToDelete.full_name} has {assignedCount} assigned lead(s)</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Choose what to do with their active pipeline leads before deleting this account:
                    </p>

                    <div className="space-y-2 pt-1">
                      <label className="flex items-start gap-2 p-2 rounded-lg bg-white border border-amber-200 cursor-pointer hover:border-amber-300">
                        <input
                          type="radio"
                          name="deleteLeadAction"
                          checked={deleteOption === 'reassign'}
                          onChange={() => setDeleteOption('reassign')}
                          className="mt-0.5 text-[#084ab8]"
                        />
                        <div className="flex-1 text-[11px]">
                          <span className="font-semibold text-[#2d2b2a] block">Reassign leads to another team member</span>
                          <span className="text-[#646260]">Directly transfer all {assignedCount} leads to an active consultant or manager.</span>
                          {deleteOption === 'reassign' && (
                            <div className="mt-2">
                              <select
                                value={deleteReassignToRepId}
                                onChange={(e) => setDeleteReassignToRepId(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-[#e8e7e5] rounded-lg bg-white focus:outline-none focus:border-[#084ab8]"
                              >
                                <option value="">-- Select active recipient --</option>
                                {reps
                                  .filter(r => r.id !== userToDelete.id && r.status === 'active')
                                  .map(r => (
                                    <option key={r.id} value={r.id}>
                                      {r.full_name} ({r.role.replace('_', ' ')})
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </label>

                      <label className="flex items-start gap-2 p-2 rounded-lg bg-white border border-amber-200 cursor-pointer hover:border-amber-300">
                        <input
                          type="radio"
                          name="deleteLeadAction"
                          checked={deleteOption === 'unassign'}
                          onChange={() => setDeleteOption('unassign')}
                          className="mt-0.5 text-[#084ab8]"
                        />
                        <div className="flex-1 text-[11px]">
                          <span className="font-semibold text-[#2d2b2a] block">Move leads to Unassigned Pool</span>
                          <span className="text-[#646260]">Keep leads safe in the pipeline without an assigned rep for later pickup.</span>
                        </div>
                      </label>
                    </div>
                  </div>
                );
              } else {
                return (
                  <p className="text-xs text-[#646260] leading-relaxed">
                    This team member has <strong>0 assigned leads</strong>. Their user profile, credentials, and login authorization will be permanently removed from AZVASA SalesTrack.
                  </p>
                );
              }
            })()}

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e8e7e5]">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[#646260] border border-[#e8e7e5] hover:bg-[#f3f2f1] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.99] rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Team Member'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Toast */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 bg-[#084ab8] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-medium border border-blue-400/30 animate-slideDown">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Created Credentials Modal */}
      {createdCredentialsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#e8e7e5] shadow-2xl space-y-5 animate-scaleIn">
            <div className="flex items-start justify-between border-b border-[#e8e7e5] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2d2b2a]">
                    Credentials Created Successfully!
                  </h3>
                  <p className="text-xs text-[#646260]">
                    Share these credentials with the new team member.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreatedCredentialsModal(null)}
                className="text-[#8e8b88] hover:text-[#2d2b2a] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Member Profile Summary */}
            <div className="bg-[#fafaf9] p-3 rounded-xl border border-[#e8e7e5] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#2d2b2a] block">
                  {createdCredentialsModal.user.full_name}
                </span>
                <span className="text-[11px] text-[#646260]">
                  {createdCredentialsModal.user.designation} • {createdCredentialsModal.user.employee_id}
                </span>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                createdCredentialsModal.user.role === 'super_admin'
                  ? 'bg-[#eef4ff] text-[#084ab8] border-[#084ab8]/20'
                  : createdCredentialsModal.user.role === 'sales_manager'
                  ? 'bg-[#f5f3ff] text-[#7c3aed] border-[#7c3aed]/20'
                  : 'bg-[#fff4e6] text-[#b85c00] border-[#f28705]/20'
              }`}>
                {createdCredentialsModal.user.role === 'super_admin'
                  ? 'Super Admin'
                  : createdCredentialsModal.user.role === 'sales_manager'
                  ? 'Sales Manager'
                  : 'Sales Rep'}
              </span>
            </div>

            {/* Credential Details */}
            <div className="space-y-3">
              {/* Username & Password */}
              <div className="p-3.5 bg-white rounded-xl border border-[#e8e7e5] space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2d2b2a]">
                  <Key className="w-3.5 h-3.5 text-[#084ab8]" />
                  <span>Login Credentials</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#fafaf9] p-2.5 rounded-lg border border-[#f0f0ef]">
                    <span className="text-[10px] text-[#646260] block font-medium">Username</span>
                    <span className="font-mono text-xs font-bold text-[#084ab8] select-all break-all">
                      {createdCredentialsModal.user.username || createdCredentialsModal.user.email.split('@')[0]}
                    </span>
                  </div>

                  <div className="bg-[#fafaf9] p-2.5 rounded-lg border border-[#f0f0ef]">
                    <span className="text-[10px] text-[#646260] block font-medium">Password</span>
                    <span className="font-mono text-xs font-bold text-emerald-700 select-all break-all">
                      {createdCredentialsModal.plainPassword || createdCredentialsModal.user.password || 'Password@123'}
                    </span>
                  </div>
                </div>

                <div className="bg-[#fafaf9] px-2.5 py-1.5 rounded-lg border border-[#f0f0ef] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#646260] block">Email (Can also be used to log in)</span>
                    <span className="font-mono text-xs text-[#2d2b2a]">
                      {createdCredentialsModal.user.email}
                    </span>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(createdCredentialsModal.user.email)}
                    title="Copy Email"
                    className="text-[#646260] hover:text-[#084ab8] text-xs flex items-center gap-1 cursor-pointer p-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  handleCopyCredentials({
                    ...createdCredentialsModal.user,
                    password: createdCredentialsModal.plainPassword || createdCredentialsModal.user.password
                  });
                }}
                className="flex-1 py-2.5 px-3 bg-[#eef4ff] hover:bg-[#dbe7ff] text-[#084ab8] border border-[#084ab8]/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Full Credentials</span>
              </button>

              <button
                type="button"
                onClick={() => setCreatedCredentialsModal(null)}
                className="flex-1 py-2.5 px-4 bg-[#084ab8] hover:bg-[#06378a] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-all text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
