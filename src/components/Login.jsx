import React, { useState, useEffect } from 'react';
import API from '../services/api';
import './Dashboard.css';
import ateaLogo from '../assets/atea-logo.jpg';

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'new-request'
  const [requests, setRequests] = useState([]);
  const [allRequestsAdmin, setAllRequestsAdmin] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Formulaire nouvelle demande
  const [requestType, setRequestType] = useState('Matériel');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('Moyenne');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Charger les données au montage
  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (user.role === 'admin') {
        const res = await API.get('/requests/all');
        setAllRequestsAdmin(res.data);
      } else {
        const res = await API.get('/requests/my-requests');
        setRequests(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      await API.post('/requests', {
        type: requestType,
        title,
        description,
        urgency
      });

      setSuccessMsg("Demande soumise avec succès !");
      setTitle('');
      setDescription('');
      setRequestType('Matériel');
      setUrgency('Moyenne');
      setActiveTab('requests');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la création de la demande.");
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await API.patch(`/requests/${id}/status`, { status: newStatus });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la mise à jour du statut.");
    }
  };

  // Filtrage admin par nom ou titre
  const filteredAdminRequests = allRequestsAdmin.filter((item) => {
    const query = searchTerm.toLowerCase();
    const userName = item.user?.name?.toLowerCase() || '';
    const itemTitle = item.title?.toLowerCase() || '';
    return userName.includes(query) || itemTitle.includes(query);
  });

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <img src={ateaLogo} alt="Logo ATEA" className="dashboard-logo" />
          <h1>Portail ATEA</h1>
        </div>
        <div className="header-right">
          <span className="user-welcome">Bonjour, <strong>{user.name}</strong> ({user.role === 'admin' ? 'Administrateur' : 'Employé'})</span>
          <button onClick={onLogout} className="logout-btn">Déconnexion</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-nav">
          <button 
            className={activeTab === 'requests' ? 'nav-btn active' : 'nav-btn'} 
            onClick={() => setActiveTab('requests')}
          >
            {user.role === 'admin' ? 'Toutes les Demandes' : 'Mes Demandes'}
          </button>
          {user.role !== 'admin' && (
            <button 
              className={activeTab === 'new-request' ? 'nav-btn active' : 'nav-btn'} 
              onClick={() => setActiveTab('new-request')}
            >
              Nouvelle Demande
            </button>
          )}
        </div>

        {error && <div className="error-banner">{error}</div>}
        {successMsg && <div className="success-banner">{successMsg}</div>}

        {activeTab === 'requests' && (
          <div className="requests-section">
            {user.role === 'admin' && (
              <div className="search-bar-container">
                <input 
                  type="text" 
                  placeholder="Rechercher par employé ou titre..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            )}

            {loading ? (
              <p className="loading-text">Chargement en cours...</p>
            ) : (
              <div className="table-responsive">
                <table className="requests-table">
                  <thead>
                    <tr>
                      {user.role === 'admin' && <th>Employé</th>}
                      <th>Type</th>
                      <th>Titre</th>
                      <th>Description</th>
                      <th>Urgence</th>
                      <th>Statut</th>
                      <th>Date</th>
                      {user.role === 'admin' && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(user.role === 'admin' ? filteredAdminRequests : requests).length === 0 ? (
                      <tr>
                        <td colSpan={user.role === 'admin' ? 8 : 7} className="no-data">Aucune demande trouvée.</td>
                      </tr>
                    ) : (
                      (user.role === 'admin' ? filteredAdminRequests : requests).map((req) => (
                        <tr key={req._id || req.id}>
                          {user.role === 'admin' && <td>{req.user?.name || 'N/A'}</td>}
                          <td>{req.type}</td>
                          <td>{req.title}</td>
                          <td>{req.description}</td>
                          <td>
                            <span className={`badge urgency-${req.urgency?.toLowerCase()}`}>
                              {req.urgency}
                            </span>
                          </td>
                          <td>
                            <span className={`badge status-${req.status?.toLowerCase()}`}>
                              {req.status}
                            </span>
                          </td>
                          <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                          {user.role === 'admin' && (
                            <td>
                              <select 
                                value={req.status} 
                                onChange={(e) => handleUpdateStatus(req._id || req.id, e.target.value)}
                                className="status-select"
                              >
                                <option value="En attente">En attente</option>
                                <option value="Approuvé">Approuvé</option>
                                <option value="Rejeté">Rejeté</option>
                                <option value="Traité">Traité</option>
                              </select>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'new-request' && user.role !== 'admin' && (
          <div className="form-section">
            <h2>Soumettre un besoin ou une demande de matériel</h2>
            <form onSubmit={handleCreateRequest} className="request-form">
              <div className="input-group">
                <label>Type de demande</label>
                <select value={requestType} onChange={(e) => setRequestType(e.target.value)}>
                  <option value="Matériel">Matériel</option>
                  <option value="Logiciel">Logiciel</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div className="input-group">
                <label>Titre</label>
                <input 
                  type="text" 
                  placeholder="Ex: Remplacement clavier / Licence IDE" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  required 
                />
              </div>

              <div className="input-group">
                <label>Description détaillée</label>
                <textarea 
                  placeholder="Précisez vos besoins..." 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  rows="4" 
                  required 
                />
              </div>

              <div className="input-group">
                <label>Niveau d'urgence</label>
                <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                  <option value="Basse">Basse</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Haute">Haute</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </div>

              <button type="submit" className="submit-btn">Envoyer la demande</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;