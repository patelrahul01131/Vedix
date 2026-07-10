import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogIn, UserPlus, Key } from 'lucide-react';

const API_URL = 'http://localhost:3001/api/auth';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/login' : '/register';
      const response = await axios.post(`${API_URL}${endpoint}`, { email, password });
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface border border-gray-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex justify-center mb-8">
          <div className="h-16 w-16 bg-primary/20 text-primary rounded-2xl flex items-center justify-center">
            <Key size={32} />
          </div>
        </div>
        
        <h2 className="text-3xl font-bold text-center text-textPrimary mb-2">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-center text-textSecondary mb-8">
          {isLogin ? 'Login to manage your Agent API keys' : 'Sign up to get access to the AI Agent'}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-gray-900/50 border border-gray-700 text-textPrimary rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full bg-gray-900/50 border border-gray-700 text-textPrimary rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primaryHover text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? <><LogIn size={20} /> Sign In</> : <><UserPlus size={20} /> Sign Up</>}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:text-primaryHover text-sm font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
