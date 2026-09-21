import React, { useState, useEffect } from 'react';
import { AZVASALogo } from './AZVASALogo';
import { UserProfile } from '../types';
import { getProfiles, authenticateWithCredentials, setCurrentUser, syncUsersToServer, syncUsersFromServer } from '../lib/storage';
import {
  Lock,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  LogIn
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  // Credentials form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);
  const [credLoading, setCredLoading] = useState(false);

  // Sync users from server upon mounting to guarantee multi-device access
  useEffect(() => {
    syncUsersFromServer();
  }, []);

  // Credentials Submit Handler (Supports company email or username + password)
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredError(null);
    setCredLoading(true);

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier || !cleanPassword) {
      setCredError('Please enter both username/company email and password.');
      setCredLoading(false);
      return;
    }

    const localProfiles = getProfiles();

    try {
      // 1. Try server API login first with client profiles attached
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanIdentifier,
          usernameOrEmail: cleanIdentifier,
          password: cleanPassword,
          clientProfiles: localProfiles
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        setCurrentUser(data.user);
        syncUsersFromServer();
        onLoginSuccess(data.user);
        return;
      } else if (data.error) {
        setCredError(data.error);
        setCredLoading(false);
        return;
      }
    } catch {
      // Server unreachable or network error, fallback to local storage
    }

    // 2. Client-side local authentication fallback
    const result = authenticateWithCredentials(cleanIdentifier, cleanPassword);
    if (result.success && result.user) {
      // Background sync to server
      syncUsersToServer(localProfiles);
      setCurrentUser(result.user);
      onLoginSuccess(result.user);
    } else {
      setCredError(result.error || 'Invalid credentials. Please verify your username/company email and password.');
    }
    setCredLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-12 bg-[#fafaf9] selection:bg-[#084ab8] selection:text-white">
      {/* Container */}
      <div className="w-full max-w-md bg-white border border-[#e8e7e5] rounded-3xl shadow-sm p-8 md:p-10 flex flex-col items-center">
        
        {/* Brand Logo & Heading */}
        <div className="mb-8 flex flex-col items-center justify-center">
          <AZVASALogo variant="login" className="mb-2" />
          
          <div className="text-center mt-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#084ab8]">
              AZVASA SalesTrack
            </h1>
            <p className="text-xs font-medium text-[#646260] mt-1 max-w-xs">
              Institutional Sales Tracking & Team Follow-up Platform
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {credError && (
          <div className="w-full mb-5 p-3.5 rounded-xl border border-[#f28705]/40 bg-[#fff4e6] text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-[#b85c00] shrink-0 mt-0.5" />
            <div className="font-medium leading-relaxed text-[#2d2b2a]">
              {credError}
            </div>
          </div>
        )}

        {/* Corporate Username & Password Login Form */}
        <form onSubmit={handleCredentialsSubmit} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#2d2b2a] mb-1.5">
              Username or Company Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#8e8b88] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter your username or company email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                className="w-full pl-10 pr-3 py-2.5 text-xs border border-[#e8e7e5] rounded-xl bg-white text-[#2d2b2a] placeholder:text-[#8e8b88] focus:outline-none focus:border-[#084ab8] focus:ring-2 focus:ring-[#084ab8]/10 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2d2b2a] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8e8b88] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-2.5 text-xs border border-[#e8e7e5] rounded-xl bg-white text-[#2d2b2a] placeholder:text-[#8e8b88] focus:outline-none focus:border-[#084ab8] focus:ring-2 focus:ring-[#084ab8]/10 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e8b88] hover:text-[#2d2b2a] p-1 cursor-pointer transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={credLoading}
            className="w-full mt-2 py-3 px-4 bg-[#084ab8] hover:bg-[#06378a] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{credLoading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Footer Note */}
        <div className="w-full mt-8 pt-6 border-t border-[#e8e7e5] text-center">
          <p className="text-[11px] text-[#8e8b88]">
            &copy; 2026 Azvasa Education. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  );
};
