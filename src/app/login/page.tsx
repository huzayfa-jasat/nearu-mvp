// File: src/app/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, AuthError } from 'firebase/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate email format
    if (!email.endsWith('@uwaterloo.ca')) {
      setError('Please use your @uwaterloo.ca email.');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      console.log('Attempting to sign in with:', email);
      // Try signing in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful:', userCredential.user.uid);
      router.push('/checkin');
    } catch (signInError) {
      console.log('Sign in failed, attempting to create account...', signInError);
      try {
        // If no account, create one
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('Account creation successful:', userCredential.user.uid);
        router.push('/checkin');
      } catch (createError) {
        console.error('Account creation failed:', createError);
        const authError = createError as AuthError;
        let errorMessage = 'Authentication failed. ';
        
        switch (authError.code) {
          case 'auth/email-already-in-use':
            errorMessage += 'This email is already registered. Please try signing in.';
            break;
          case 'auth/invalid-email':
            errorMessage += 'Please enter a valid email address.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage += 'Email/password accounts are not enabled. Please contact support.';
            break;
          case 'auth/weak-password':
            errorMessage += 'Please choose a stronger password.';
            break;
          default:
            errorMessage += authError.message;
        }
        
        setError(errorMessage);
        return;
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-100 p-6">
      <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-6">Welcome to NearU</h1>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <form onSubmit={handleAuth}>
          <input
            type="email"
            placeholder="you@uwaterloo.ca"
            className="w-full mb-4 p-3 border border-gray-300 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (min. 6 characters)"
            className="w-full mb-6 p-3 border border-gray-300 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
