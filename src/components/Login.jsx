import React, { useState } from 'react';
import API from '../services/api';
import './Login.css';
import ateaLogo from '../assets/atea-logo.jpg';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await API.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects ou erreur serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={ateaLogo} alt="Logo ATEA" className="login-logo" />
            <h2>Portail ATEA</h2>
            <p>Connectez-vous pour accéder à votre espace</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Adresse Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="nom.prenom@atea.nat.tn" 
              required 
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              required 
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;