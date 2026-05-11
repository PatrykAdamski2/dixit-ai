import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Gamepad2, Mail, Lock, User } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

export function AuthView() {
  const [isLogin, setIsLogin] = useState(true);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setUser = useGameStore((state) => state.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { login, password } : { login, password, email };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          // Backend zwraca płaski obiekt, mapujemy go na strukturę profilu w storze
          // Na przyszłość: obsługa monet i awatara bezpośrednio z API
          setUser({
            username: data.username || data.user?.username || data.user?.login || login,
            coins: data.coins ?? data.user?.coins ?? 0,
            avatar: data.avatar ?? data.user?.avatar ?? (data.username || login).substring(0, 2).toUpperCase()
          });
          navigate('/menu');
        } else {
          setIsLogin(true);
          setError('Konto utworzone! Zaloguj się.');
        }
      } else {
        setError(data.error || 'Wystąpił błąd');
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem');
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 flex flex-col gap-8 transform transition-all duration-300">
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center text-orange-500 mb-6 rotate-[-5deg] shadow-lg">
          <Gamepad2 size={32} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          Dixit AI Online
        </h1>
        <p className="text-gray-500 font-medium">
          {isLogin ? 'Witaj z powrotem! Zaloguj się by grać.' : 'Stwórz konto, aby dołączyć do zabawy.'}
        </p>
      </div>

      {error && (
        <div className={`p-3 rounded-xl text-center text-sm font-bold ${error.includes('utworzone') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isLogin && (
          <div className="relative">
            <User className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <Input 
              className="pl-12" 
              placeholder="Nick" 
              required 
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </div>
        )}
        
        <div className="relative">
          <Mail className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <Input 
            className="pl-12" 
            type={isLogin ? "text" : "email"} 
            placeholder={isLogin ? "Nick" : "E-Mail"} 
            required 
            value={isLogin ? login : email}
            onChange={(e) => isLogin ? setLogin(e.target.value) : setEmail(e.target.value)}
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <Input 
            className="pl-12" 
            type="password" 
            placeholder="Hasło" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" size="lg" className="mt-4 w-full">
          {isLogin ? 'Zaloguj się' : 'Stwórz konto'}
        </Button>
      </form>

      <div className="text-center border-t border-gray-100 pt-6">
        <p className="text-gray-600 mb-4 font-medium">
          {isLogin ? "Nie masz konta?" : "Masz już konto?"}
        </p>
        <Button 
          variant="outline" 
          size="md"
          className="w-full"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? 'Zarejestruj nowe konto' : 'Przełącz na logowanie'}
        </Button>
      </div>
    </div>
  );
}