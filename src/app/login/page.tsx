// File: src/app/login/page.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  getAuth,
  AuthError 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

type AuthMode = 'signin' | 'signup';

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [program, setProgram] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Handle hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted
  if (!mounted) {
    return null;
  }

  const validateEmail = (email: string) => {
    return email.endsWith('@uwaterloo.ca');
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!validateEmail(email)) {
      setError('Please use your @uwaterloo.ca email.');
      setIsLoading(false);
      return;
    }

    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      setIsLoading(false);
      if (auth.currentUser) {
        router.push('/matches');
      }
    } catch (error) {
      const authError = error as AuthError;
      switch (authError.code) {
        case 'auth/user-not-found':
          setError('No account found with this email.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.');
          break;
        default:
          setError('Failed to sign in. Please try again.');
      }
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!validateEmail(email)) {
      setError('Please use your @uwaterloo.ca email.');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    if (!name.trim()) {
      setError('Please enter your name.');
      setIsLoading(false);
      return;
    }

    try {
      const auth = getAuth();
      await createUserWithEmailAndPassword(auth, email, password);

      // Store additional user data in Firestore
      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          name: name.trim(),
          program: program.trim(),
          email: email,
          createdAt: new Date(),
          lastActive: new Date(),
          isActive: true
        });
        // Wait for auth.currentUser to be available
        let retries = 0;
        while (!auth.currentUser && retries < 10) {
          await new Promise(res => setTimeout(res, 200));
          retries++;
        }
        console.log('SignUp: auth.currentUser after Firestore write:', auth.currentUser);
        if (auth.currentUser) {
          setSuccess('Account created successfully! You can now sign in.');
          setMode('signin');
        } else {
          setError('Account created, but user not found. Please try signing in.');
        }
      } else {
        setError('Account created, but user not found. Please try signing in.');
      }
      setIsLoading(false);
    } catch (error) {
      console.error('SignUp error:', error);
      const authError = error as AuthError;
      switch (authError.code) {
        case 'auth/email-already-in-use':
          setError('This email is already registered. Please sign in instead.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/operation-not-allowed':
          setError('Email/password accounts are not enabled. Please contact support.');
          break;
        case 'auth/weak-password':
          setError('Please choose a stronger password.');
          break;
        default:
          setError('Failed to create account. Please try again.');
      }
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!validateEmail(email)) {
      setError('Please enter your @uwaterloo.ca email.');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Password reset email sent! Please check your inbox.');
    } catch {
      setError('Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-100 p-6">
      <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-6" style={{ color: '#5B3DF6' }}>Welcome to NearU</h1>
        
        {/* Mode Toggle */}
        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`px-4 py-2 rounded-l-lg font-semibold transition-colors ${
              mode === 'signin' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-indigo-100 text-indigo-600'
            }`}
            style={mode !== 'signin' ? { backgroundColor: '#ede9fe', color: '#5B3DF6' } : {}}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`px-4 py-2 rounded-r-lg font-semibold transition-colors ${
              mode === 'signup' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-indigo-100 text-indigo-600'
            }`}
            style={mode !== 'signup' ? { backgroundColor: '#ede9fe', color: '#5B3DF6' } : {}}
          >
            Sign Up
          </button>
        </div>

        {error && <p className="text-red-600 mb-4">{error}</p>}
        {success && <p className="text-green-600 mb-4">{success}</p>}

        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
          <input
            type="email"
            placeholder="you@uwaterloo.ca"
            className="w-full p-3 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (min. 6 characters)"
            className="w-full p-3 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          {mode === 'signup' && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                className="w-full p-3 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Program (e.g., Computer Science)"
                className="w-full p-3 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                required
              />
            </>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>

          {mode === 'signin' && (
            <button
              type="button"
              onClick={handlePasswordReset}
              className="w-full text-indigo-600 hover:text-indigo-800 focus:outline-none"
            >
              Forgot Password?
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
