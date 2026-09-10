import API from '../services/api';
import './Dashboard.css';
import ateaLogo from '../assets/atea-logo.jpg';
import React, { useState, useEffect, useCallback } from 'react';

const Dashboard = ({ user, onLogout }) => {
  const categories = [
    {
      title: 'Matériel informatique',
      items: ['Imprimante', 'Pc Bureau', 'Pc Portable', 'Accessoires informatiques']
    },
    {
      title: 'Mobilier et équipements',
      items: [
        'Chauffage',
        'Armoire',
        'Bureau',
        'Meubles de rangement',
        'Etagères d’archive',
        'Boite d’archive',
        'Chaise orthopédique',
        'Chaise roulante',
        'Climatiseurs',
        'Lignes téléphoniques externes',
        'Bain d’huile'
      ]
    },
    {
      title: 'Besoins en fourniture bureautique',
      items: ['Stylos', 'Papier A4', 'Classeurs', 'Bloc-notes', 'Agrafeuse']
    },
    {
      title: 'Besoins en Formations et Certifications',
      items: ['Project Management', 'Finance Publique, gestion budgetaire', 'Gestion bien et DRH', 'Management qualité', 'Langues']
    },
    {
      title: 'Autres',
      items: ['Produits de nettoyage', 'Entretien de l’espace sanitaire et du bureau (peinture maintenance)']
    }
  ];

  const [submissions, setSubmissions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Matériel informatique');
  const [selectedItem, setSelectedItem] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const displayRole = user.role === 'admin' ? 'ADMINISTRATEUR' : 'EMPLOYÉ';

  const currentCategoryObj = categories.find(c => c.title === selectedCategory);
  const hasPredefinedItems = currentCategoryObj && currentCategoryObj.items.length > 0;

  const fetchData = useCallback(async () => {
    try {
      const requestsRes = await API.get('/requests');
      setSubmissions(requestsRes.data);

      if (user.role === 'admin') {
        const usersRes = await API.get('/users');
        setEmployees(usersRes.data);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des données', err);
    }
  }, [user.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddRequest = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!selectedItem.trim()) {
      alert('Veuillez indiquer ou sélectionner un article.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        category: selectedCategory,
        itemRequested: selectedItem.trim(),
        description: 'Besoin exprimé via le portail ATEA'
      };

      if (user.role === 'admin' && selectedEmployeeId) {
        payload.userId = selectedEmployeeId;
      }

      await API.post('/requests', payload);

      setSelectedItem('');
      setSelectedEmployeeId('');
      await fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Erreur lors de l’ajout');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = (currentStatus === 'Livré') ? 'En attente' : 'Livré';
    try {
      await API.patch(`/requests/${id}/status`, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error('Erreur mise à jour statut', err);
      alert(err.response?.data?.message || 'Action non autorisée');
    }
  };

  const confirmDelete = async (id) => {
    try {
      await API.delete(`/requests/${id}`);
      setDeleteTargetId(null);
      fetchData();
    } catch (err) {
      console.error('Erreur suppression', err);
      alert(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const empName = sub.user?.name || '';
    const matchSearch = empName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        sub.itemRequested.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        sub.category.toLowerCase().includes(searchTerm.toLowerCase());
    return searchTerm === '' || matchSearch;
  });

  const groupedRequests = {};

  if (user.role === 'admin') {
    employees.forEach(emp => {
      const empName = emp.name || emp.fullName || 'Employé Inconnu';
      groupedRequests[empName] = { employee: emp, subs: [] };
    });

    filteredSubmissions.forEach(sub => {
      const empName = sub.user?.name || sub.user?.fullName || 'Employé Inconnu';
      if (!groupedRequests[empName]) {
        groupedRequests[empName] = { employee: sub.user, subs: [] };
      }
      groupedRequests[empName].subs.push(sub);
    });
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <img src={ateaLogo} alt="Logo ATEA" className="dash-logo" />
          <h1>Portail de Gestion ATEA</h1>
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="user-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
            <span className="user-name" style={{ fontWeight: 'bold', color: '#2d3748' }}>{user.name || user.fullName}</span>
            <span className={`role-badge ${user.role}`} style={{ fontSize: '11px', marginTop: '2px', textTransform: 'uppercase' }}>
              {displayRole}
            </span>
          </div>
          <button onClick={onLogout} className="logout-btn">Déconnexion</button>
        </div>
      </header>

      <main className="dashboard-content">
        {user.role === 'admin' ? (
          <div className="admin-section">
            <div className="section-title">
              <h2>Tableau Récapitulatif Global des Besoins</h2>
              <p>Vue centralisée et interactive des demandes et du personnel.</p>
            </div>

            <form onSubmit={handleAddRequest} className="besoins-form" style={{ background: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <h3>Ajouter une demande (Admin / Pour un employé)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Employé concerné</label>
                  <select 
                    value={selectedEmployeeId} 
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
                  >
                    <option value="">-- Moi-même (Admin) --</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>{emp.name || emp.fullName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Catégorie</label>
                  <select 
                    value={selectedCategory} 
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedItem('');
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
                  >
                    {categories.map((cat, idx) => (
                      <option key={idx} value={cat.title}>{cat.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Article / Précision</label>
                  {hasPredefinedItems ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <select 
                        value={selectedItem} 
                        onChange={(e) => setSelectedItem(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
                        required={!selectedItem}
                      >
                        <option value="">-- Sélectionnez dans la liste ou tapez ci-dessous --</option>
                        {currentCategoryObj.items.map((it, i) => (
                          <option key={i} value={it}>{it}</option>
                        ))}
                      </select>
                      <input 
                        type="text" 
                        placeholder="Ou tapez un article personnalisé..." 
                        value={selectedItem}
                        onChange={(e) => setSelectedItem(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '13px' }}
                      />
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="Tapez votre besoin en toute liberté..." 
                      value={selectedItem}
                      onChange={(e) => setSelectedItem(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
                      required
                    />
                  )}
                </div>
              </div>

              <button type="submit" className="submit-besoins-btn" disabled={loading} style={{ marginTop: '15px', padding: '10px 20px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                {loading ? 'Enregistrement...' : '+ Ajouter la demande'}
              </button>
            </form>

            <div className="search-bar-container" style={{ marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="Rechercher un employé ou un équipement..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
              />
            </div>

            <div className="grouped-admin-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Object.keys(groupedRequests).length === 0 ? (
                <div style={{ background: '#fff', padding: '30px', textAlign: 'center', borderRadius: '8px', color: '#a0aec0' }}>
                  Aucun employé trouvé.
                </div>
              ) : (
                Object.entries(groupedRequests).map(([empName, { subs }]) => (
                  <div key={empName} style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <div style={{ background: '#f7fafc', padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, color: '#2d3748', fontSize: '16px' }}>👤 {empName}</h3>
                      <span style={{ background: subs.length > 0 ? '#e2e8f0' : '#edf2f7', color: subs.length > 0 ? '#4a5568' : '#a0aec0', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                        {subs.length} demande(s)
                      </span>
                    </div>

                    <div style={{ padding: '0 20px 15px 20px' }}>
                      {subs.length === 0 ? (
                        <p style={{ color: '#a0aec0', fontSize: '13px', fontStyle: 'italic', padding: '15px 0 5px 0', margin: 0 }}>Aucune demande enregistrée pour cet employé.</p>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                          <thead>
                            <tr style={{ textAlign: 'left', color: '#718096', fontSize: '13px', borderBottom: '1px solid #edf2f7' }}>
                              <th style={{ padding: '10px' }}>Catégorie</th>
                              <th style={{ padding: '10px' }}>Article Demandé</th>
                              <th style={{ padding: '10px' }}>Statut</th>
                              <th style={{ padding: '10px' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subs.map((sub) => {
                              const isDelivered = sub.status === 'Livré';
                              return (
                                <tr key={sub._id} style={{ borderBottom: '1px solid #edf2f7' }}>
                                  <td style={{ padding: '10px', color: '#4a5568', fontSize: '13px' }}>{sub.category}</td>
                                  <td style={{ padding: '10px', fontWeight: '600' }}>{sub.itemRequested}</td>
                                  <td style={{ padding: '10px' }}>
                                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: isDelivered ? '#c6f6d5' : '#feebc8', color: isDelivered ? '#22543d' : '#c05621' }}>
                                      {sub.status}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                                    <button 
                                      onClick={() => handleToggleStatus(sub._id, sub.status)}
                                      style={{ padding: '6px 10px', background: isDelivered ? '#e2e8f0' : '#3182ce', color: isDelivered ? '#2d3748' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                      {isDelivered ? 'Marquer En attente' : 'Marquer Livré'}
                                    </button>
                                    <button 
                                      onClick={() => setDeleteTargetId(sub._id)}
                                      style={{ padding: '6px 10px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                      Supprimer
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="employee-section">
            <div className="section-title">
              <h2>Formulaire d'Expression des Besoins</h2>
              <p>Ajoutez ou complétez vos requêtes à tout moment.</p>
            </div>

            <form onSubmit={handleAddRequest} className="besoins-form" style={{ background: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <h3>Ajouter un nouveau besoin</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Catégorie</label>
                  <select 
                    value={selectedCategory} 
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedItem('');
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
                  >
                    {categories.map((cat, idx) => (
                      <option key={idx} value={cat.title}>{cat.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Article / Précision</label>
                  {hasPredefinedItems ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <select 
                        value={selectedItem} 
                        onChange={(e) => setSelectedItem(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
                        required={!selectedItem}
                      >
                        <option value="">-- Sélectionnez dans la liste ou tapez ci-dessous --</option>
                        {currentCategoryObj.items.map((it, i) => (
                          <option key={i} value={it}>{it}</option>
                        ))}
                      </select>
                      <input 
                        type="text" 
                        placeholder="Ou tapez un article personnalisé..." 
                        value={selectedItem}
                        onChange={(e) => setSelectedItem(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '13px' }}
                      />
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="Tapez votre besoin en toute liberté..." 
                      value={selectedItem}
                      onChange={(e) => setSelectedItem(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
                      required
                    />
                  )}
                </div>
              </div>

              <button type="submit" className="submit-besoins-btn" disabled={loading} style={{ marginTop: '15px', padding: '10px 20px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                {loading ? 'Enregistrement...' : '+ Ajouter à mes demandes'}
              </button>
            </form>

            <div className="card list-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <h3>Mes demandes enregistrées dans le système</h3>
              {submissions.length === 0 ? (
                <p style={{ color: '#a0aec0', padding: '20px 0' }}>Aucune demande enregistrée pour le moment.</p>
              ) : (
                <table style={{ width: '100%', marginTop: '15px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f7fafc', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>Catégorie</th>
                      <th style={{ padding: '10px' }}>Article</th>
                      <th style={{ padding: '10px' }}>Statut</th>
                      <th style={{ padding: '10px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => {
                      const isDelivered = sub.status === 'Livré';
                      return (
                        <tr key={sub._id} style={{ borderBottom: '1px solid #edf2f7' }}>
                          <td style={{ padding: '10px', fontSize: '13px', color: '#4a5568' }}>{sub.category}</td>
                          <td style={{ padding: '10px', fontWeight: '600' }}>{sub.itemRequested}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: isDelivered ? '#c6f6d5' : '#feebc8', color: isDelivered ? '#22543d' : '#c05621' }}>
                              {sub.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                            {!isDelivered ? (
                              <button 
                                onClick={() => handleToggleStatus(sub._id, sub.status)}
                                style={{ padding: '6px 10px', background: '#38a169', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                              >
                                Confirmer la réception
                              </button>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#38a169', fontWeight: '600', alignSelf: 'center' }}>✓ Reçu</span>
                            )}
                            <button 
                              onClick={() => setDeleteTargetId(sub._id)}
                              style={{ padding: '6px 10px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>

      {deleteTargetId && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', width: '350px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>Confirmation</h3>
            <p style={{ color: '#4a5568', fontSize: '14px', marginBottom: '20px' }}>Voulez-vous vraiment supprimer cette demande ?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button 
                onClick={() => setDeleteTargetId(null)}
                style={{ padding: '8px 16px', background: '#e2e8f0', color: '#2d3748', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button 
                onClick={() => confirmDelete(deleteTargetId)}
                style={{ padding: '8px 16px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;