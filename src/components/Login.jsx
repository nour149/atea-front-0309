import React, { useState } from 'react';
import API from '../services/api';
import './Login.css';
import ateaLogo from '../assets/atea-logo.jpg';

const Login = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'reset'
  const [resetStep, setResetStep] = useState(1); // 1: Email, 2: Code, 3: Nouveau MDP
  const [formData, setFormData] = useState({ name: '', email: '', code: '', password: '', newPassword: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    try {
      if (authMode === 'login') {
        const response = await API.post('/auth/login', { email: formData.email, password: formData.password });
        const data = response.data;
        
        localStorage.setItem('user', JSON.stringify(data.user || data));
        if (data.token) localStorage.setItem('token', data.token);
        onLoginSuccess(data.user || data);

      } else if (authMode === 'register') {
        const response = await API.post('/auth/register', { name: formData.name, email: formData.email, password: formData.password });
        
        setAuthMode('login');
        setFormData({ name: '', email: '', code: '', password: '', newPassword: '' });
        alert('Compte créé avec succès ! Veuillez vous connecter.');

      } else if (authMode === 'reset') {
        if (resetStep === 1) {
          await API.post('/auth/send-reset-code', { email: formData.email });

          setResetStep(2);
          setSuccessMsg('Un code de vérification a été envoyé à votre adresse e-mail.');
        } else if (resetStep === 2) {
          if (!formData.code || formData.code.length < 6) {
            throw new Error("Veuillez entrer un code valide à 6 chiffres.");
          }
          setResetStep(3);
          setSuccessMsg('Code accepté. Entrez votre nouveau mot de passe.');
        } else if (resetStep === 3) {
          await API.post('/auth/verify-and-reset', { email: formData.email, code: formData.code, newPassword: formData.newPassword });

          setAuthMode('login');
          setResetStep(1);
          setFormData({ name: '', email: '', code: '', password: '', newPassword: '' });
          setSuccessMsg('Mot de passe mis à jour avec succès ! Connectez-vous.');
        }
      }
    } catch (err) {
      const rawMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Erreur de connexion';
      const errorMsg = (rawMsg.toLowerCase().includes('invalid email') || rawMsg.toLowerCase().includes('invalid password'))
        ? 'Adresse email ou mot de passe invalide'
        : rawMsg;
      setError(errorMsg);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-card">
        <div className="logo-container">
          <img src={ateaLogo} alt="Logo ATEA" className="atea-logo-img" />
          <h2>
            {authMode === 'register' && 'Créer un Compte'}
            {authMode === 'login' && 'Connexion au Portail'}
            {authMode === 'reset' && (
              resetStep === 1 ? 'Mot de passe oublié' :
              resetStep === 2 ? 'Entrer le code de vérification' : 'Nouveau mot de passe'
            )}
          </h2>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {successMsg && <div className="success-banner" style={{ background: '#c6f6d5', color: '#22543d', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px', textAlign: 'center' }}>{successMsg}</div>}

        <form onSubmit={handleSubmit}>
          {authMode === 'register' && (
            <div className="input-group">
              <label>Nom complet</label>
              <input type="text" name="name" placeholder="Votre nom complet" value={formData.name} onChange={handleChange} required />
            </div>
          )}

          {(authMode !== 'reset' || resetStep === 1) && (
            <div className="input-group">
              <label>Adresse Email</label>
              <input type="email" name="email" placeholder="nom@atea.tn" value={formData.email} onChange={handleChange} required />
            </div>
          )}

          {authMode === 'reset' && resetStep === 2 && (
            <div className="input-group">
              <label>Code de vérification (6 chiffres)</label>
              <input type="text" name="code" placeholder="123456" maxLength="6" value={formData.code} onChange={handleChange} required />
            </div>
          )}

          {(authMode === 'login' || authMode === 'register') && (
            <div className="input-group">
              <label>Mot de passe</label>
              <input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
            </div>
          )}

          {authMode === 'reset' && resetStep === 3 && (
            <div className="input-group">
              <label>Nouveau mot de passe</label>
              <input type="password" name="newPassword" placeholder="Nouveau mot de passe" value={formData.newPassword} onChange={handleChange} required />
            </div>
          )}

          <button type="submit" className="submit-btn">
            {authMode === 'register' && "S'inscrire"}
            {authMode === 'login' && 'Se connecter'}
            {authMode === 'reset' && (
              resetStep === 1 ? 'Envoyer le code' :
              resetStep === 2 ? 'Vérifier le code' : 'Mettre à jour le mot de passe'
            )}
          </button>
        </form>

        <div className="toggle-auth" style={{ marginTop: '15px', textAlign: 'center', fontSize: '14px' }}>
          {authMode === 'login' && (
            <>
              <p style={{ marginBottom: '8px' }}>
                Vous n'avez pas de compte ?{' '}
                <span style={{ color: '#3182ce', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { setAuthMode('register'); setError(''); setSuccessMsg(''); }}>
                  S'inscrire ici
                </span>
              </p>
              <p>
                <span style={{ color: '#718096', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setAuthMode('reset'); setResetStep(1); setError(''); setSuccessMsg(''); }}>
                  Mot de passe oublié ?
                </span>
              </p>
            </>
          )}

          {authMode !== 'login' && (
            <p>
              Déjà de retour ?{' '}
              <span style={{ color: '#3182ce', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { setAuthMode('login'); setResetStep(1); setError(''); setSuccessMsg(''); }}>
                Se connecter
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;