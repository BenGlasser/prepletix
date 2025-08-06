import { useState } from 'react';
import Login from './Login';
import SignUp from './SignUp';

export default function AuthWrapper() {
  const [isLogin, setIsLogin] = useState(true);

  return isLogin ? (
    <Login onToggleMode={() => setIsLogin(false)} />
  ) : (
    <SignUp onToggleMode={() => setIsLogin(true)} />
  );
}