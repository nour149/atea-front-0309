import API from '../services/api';
import './Dashboard.css';
import ateaLogo from '../assets/atea-logo.jpg';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

const Dashboard = ({ user, onLogout }) => {

  // ==========================================================
  // STATE
  // ==========================================================

  const [submissions, setSubmissions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedArticle, setSelectedArticle] = useState('');
  const [customItem, setCustomItem] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Used only while exporting Excel
  const [auditLoading, setAuditLoading] = useState(false);

  const displayRole =
    user.role === 'admin'
      ? 'ADMINISTRATEUR'
      : 'EMPLOYÉ';


  // ==========================================================
  // CLEAN AUDIT LOG
  // ==========================================================

  const cleanAuditLogs = (logs) => {

    if (!Array.isArray(logs)) {
      return [];
    }

    return logs.filter(Boolean);
  };


  // ==========================================================
  // EXCEL ACTION LABEL
  // ==========================================================

  const getExcelActionLabel = (action) => {

    const normalized =
      String(action || '')
        .trim()
        .toUpperCase();

    switch (normalized) {

      case 'REQUEST_CREATED':
        return 'Demande créée';

      case 'STATUS_CHANGE':
        return 'Changement de statut';

      case 'REQUEST_DELETED':
        return 'Demande supprimée';

      default:
        return action || '—';
    }
  };


  // ==========================================================
  // FETCH DATA
  // ==========================================================

  const fetchData = useCallback(async () => {

    try {

      const [
        requestsRes,
        categoriesRes,
        articlesRes
      ] = await Promise.all([

        API.get('/requests'),

        API.get('/categories'),

        API.get('/articles')

      ]);


      // --------------------------------------------------------
      // REQUESTS
      // --------------------------------------------------------

      const requestData =
        requestsRes?.data;

      const requests =
        Array.isArray(requestData)
          ? requestData
          : Array.isArray(requestData?.requests)
            ? requestData.requests
            : Array.isArray(requestData?.data)
              ? requestData.data
              : [];


      // The backend already hides soft-deleted requests.
      // This additional frontend filter ensures that a deleted
      // request cannot accidentally appear in the dashboard.

      setSubmissions(
        requests.filter(
          (request) =>
            request?.isDeleted !== true
        )
      );


      // --------------------------------------------------------
      // CATEGORIES
      // --------------------------------------------------------

      const categoryData =
        categoriesRes?.data;

      const categoryList =
        Array.isArray(categoryData)
          ? categoryData
          : Array.isArray(categoryData?.categories)
            ? categoryData.categories
            : Array.isArray(categoryData?.data)
              ? categoryData.data
              : [];


      setCategories(
        categoryList.filter(
          (category) =>
            category?.active !== false
        )
      );


      // --------------------------------------------------------
      // ARTICLES
      // --------------------------------------------------------

      const articleData =
        articlesRes?.data;

      const articleList =
        Array.isArray(articleData)
          ? articleData
          : Array.isArray(articleData?.articles)
            ? articleData.articles
            : Array.isArray(articleData?.data)
              ? articleData.data
              : [];


      setArticles(
        articleList.filter(
          (article) =>
            article?.active !== false
        )
      );


    } catch (err) {

      console.error(
        'Erreur lors du chargement des données:',
        err
      );

      toast.error(
        err.response?.data?.message ||
        'Erreur lors du chargement des données.'
      );

    }

  }, []);


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    fetchData();

  }, [fetchData]);


  // ==========================================================
  // SELECTED CATEGORY OBJECT
  // ==========================================================

  const selectedCategoryObject =
    categories.find(
      (category) =>
        String(
          category?._id
        ) ===
        String(
          selectedCategory
        )
    );


  // ==========================================================
  // MAINTENANCE CATEGORY
  // ==========================================================

  const isMaintenance =
    String(
      selectedCategoryObject?.name ||
      ''
    )
      .trim()
      .toLowerCase() ===
    'maintenance';


  // ==========================================================
  // ARTICLES FOR SELECTED CATEGORY
  // ==========================================================

  const categoryArticles =
    articles.filter(
      (article) => {

        const articleCategory =
          article?.category?._id ||
          article?.category?.id ||
          article?.category;

        return (
          String(articleCategory) ===
          String(selectedCategory)
        );

      }
    );


  // ==========================================================
  // EXPORT REQUESTS TO EXCEL
  // ==========================================================

  const exportRequestsToExcel = async () => {

    if (!user || user.role !== 'admin') {

      toast.error(
        'Seul un administrateur peut exporter les demandes.'
      );

      return;
    }


    if (auditLoading) {
      return;
    }


    setAuditLoading(true);


    try {

      // ========================================================
      // GET ALL REQUESTS
      //
      // IMPORTANT:
      // /requests/export returns ALL needrequests,
      // including soft-deleted requests.
      // ========================================================

      const response =
        await API.get(
          '/requests/export'
        );


      const data =
        response.data;


      const requests =
        Array.isArray(data)
          ? data
          : Array.isArray(data?.requests)
            ? data.requests
            : Array.isArray(data?.data)
              ? data.data
              : [];


      console.log(
        'REQUESTS FOR EXCEL:',
        requests
      );


      if (
        requests.length === 0
      ) {

        toast.info(
          'Aucune demande à exporter.'
        );

        return;

      }


      // ========================================================
      // DATE FORMAT
      // ========================================================

      const formatDate = (value) => {

        if (!value) {
          return '—';
        }


        const date =
          new Date(value);


        if (
          Number.isNaN(
            date.getTime()
          )
        ) {

          return '—';

        }


        return date.toLocaleString(
          'fr-FR'
        );

      };


     const excelData = requests.map((request) => {
  const employee =
    request?.employee ||
    request?.user?.name ||
    request?.user?.fullName ||
    request?.user?.email ||
    '—';

  const employeeEmail =
    request?.employeeEmail ||
    request?.user?.email ||
    '—';

  const category =
    request?.category ||
    request?.categoryName ||
    request?.category?.name ||
    '—';

  const article =
    request?.article?.name ||
    (typeof request?.article === 'string'
      ? request.article
      : '');

  const customItem =
    request?.customItem || '';

  return {
    'Date de création': formatDate(request?.createdAt),

    'Employé': employee,

    'Email': employeeEmail,

    'Catégorie': category,

    'Article': article || '—',

    'Besoin personnalisé': customItem || '—',

    'Description': request?.description || '—',

    'Quantité': request?.quantity ?? 0,

    'Statut': request?.status || '—',

    'Date de suppression': formatDate(request?.deletedAt),

    'Supprimée par':
      request?.deletedBy?.name ||
      request?.deletedByName ||
      (typeof request?.deletedBy === 'string'
        ? request.deletedBy
        : '') ||
      '—',

    'Dernière modification': formatDate(request?.updatedAt)
  };
});

const worksheet = XLSX.utils.json_to_sheet(excelData);

worksheet['!cols'] = [
  { wch: 22 }, // Date de création
  { wch: 25 }, // Employé
  { wch: 35 }, // Email
  { wch: 25 }, // Catégorie
  { wch: 30 }, // Article
  { wch: 30 }, // Besoin personnalisé
  { wch: 45 }, // Description
  { wch: 12 }, // Quantité
  { wch: 18 }, // Statut
  { wch: 22 }, // Date de suppression
  { wch: 25 }, // Supprimée par
  { wch: 25 }  // Dernière modification
];
      // ========================================================
      // CREATE WORKBOOK
      // ========================================================

      const workbook =
        XLSX.utils.book_new();


      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'Demandes'
      );


      // ========================================================
      // FILE NAME
      // ========================================================

      const today =
        new Date()
          .toISOString()
          .slice(0, 10);


      XLSX.writeFile(
        workbook,
        `ATEA_Demandes_${today}.xlsx`
      );


      toast.success(
        'Export Excel des demandes effectué avec succès.'
      );


    } catch (err) {

      console.error(
        'Erreur export demandes Excel:',
        err
      );


      toast.error(
        err.response?.data?.message ||
        'Erreur lors de l’export des demandes.'
      );


    } finally {

      setAuditLoading(false);

    }

  };


  // ==========================================================
  // ADD REQUEST
  // ==========================================================

  const handleAddRequest = async (e) => {

    e.preventDefault();


    if (loading) {
      return;
    }


    if (!selectedCategory) {

      toast.warn(
        'Veuillez sélectionner une catégorie.'
      );

      return;
    }


    // --------------------------------------------------------
    // QUANTITY
    // --------------------------------------------------------

    const numericQuantity =
      Number(quantity);


    if (
      !Number.isInteger(
        numericQuantity
      ) ||
      numericQuantity <= 0
    ) {

      toast.warn(
        'La quantité doit être un nombre entier supérieur à 0.'
      );

      return;
    }


    // --------------------------------------------------------
    // MAINTENANCE
    // --------------------------------------------------------

    if (isMaintenance) {

      if (
        !customItem.trim()
      ) {

        toast.warn(
          'Pour la catégorie Maintenance, veuillez préciser le besoin.'
        );

        return;
      }

    } else {

      // ------------------------------------------------------
      // ARTICLE / CUSTOM ITEM XOR
      // ------------------------------------------------------

      const hasArticle =
        Boolean(
          selectedArticle
        );


      const hasCustomItem =
        Boolean(
          customItem.trim()
        );


      if (
        (hasArticle && hasCustomItem) ||
        (!hasArticle && !hasCustomItem)
      ) {

        toast.warn(
          'Veuillez sélectionner un article OU saisir un article personnalisé.'
        );

        return;
      }

    }


    setLoading(true);


    try {

      const payload = {

        category:
          selectedCategory,

        article:
          isMaintenance
            ? null
            : selectedArticle ||
              null,

        customItem:
          customItem.trim()
            ? customItem.trim()
            : null,

        description:
          'Besoin exprimé via le portail ATEA',

        quantity:
          numericQuantity

      };


      console.log(
        'REQUEST PAYLOAD:',
        payload
      );


      await API.post(
        '/requests',
        payload
      );


      toast.success(
        'Demande ajoutée avec succès.'
      );


      // --------------------------------------------------------
      // RESET FORM
      // --------------------------------------------------------

      setSelectedCategory('');
      setSelectedArticle('');
      setCustomItem('');
      setQuantity(1);


      // --------------------------------------------------------
      // REFRESH DATA
      // --------------------------------------------------------

      await fetchData();


    } catch (err) {

      console.error(
        'Erreur lors de l’ajout',
        err
      );


      toast.error(
        err.response?.data?.message ||
        'Erreur lors de l’ajout.'
      );


    } finally {

      setLoading(false);

    }

  };


  // ==========================================================
  // CHANGE STATUS
  // ==========================================================

  const handleStatusChange =
    async (
      id,
      newStatus
    ) => {

      try {

        await API.patch(
          '/requests/' +
          id +
          '/status',
          {
            status:
              newStatus
          }
        );


        toast.success(
          newStatus === 'Validé'
            ? 'Demande validée avec succès.'
            : 'Demande marquée comme livrée avec succès.'
        );


        await fetchData();


      } catch (err) {

        console.error(
          'Erreur mise à jour statut',
          err
        );


        toast.error(
          err.response?.data?.message ||
          'Action non autorisée.'
        );

      }

    };


  // ==========================================================
  // DELETE
  // ==========================================================

  const confirmDelete =
    async (id) => {

      try {

        await API.delete(
          '/requests/' +
          id
        );


        setDeleteTargetId(
          null
        );


        toast.info(
          'Demande supprimée avec succès.'
        );


        await fetchData();


      } catch (err) {

        console.error(
          'Erreur suppression',
          err
        );


        toast.error(
          err.response?.data?.message ||
          'Erreur lors de la suppression.'
        );

      }

    };


  // ==========================================================
  // DISPLAY CATEGORY
  // ==========================================================

  const getCategoryName =
    (category) => {

      if (!category) {
        return '—';
      }


      if (
        typeof category ===
        'object'
      ) {

        return (
          category.name ||
          '—'
        );

      }


      const foundCategory =
        categories.find(
          (cat) =>
            String(cat._id) ===
            String(category)
        );


      return (
        foundCategory?.name ||
        '—'
      );

    };


  // ==========================================================
  // DISPLAY ARTICLE
  // ==========================================================

  const getArticleName =
    (article) => {

      if (!article) {
        return '—';
      }


      if (
        typeof article ===
        'object'
      ) {

        return (
          article.name ||
          '—'
        );

      }


      const foundArticle =
        articles.find(
          (item) =>
            String(item._id) ===
            String(article)
        );


      return (
        foundArticle?.name ||
        '—'
      );

    };


  // ==========================================================
  // DISPLAY REQUEST ITEM
  // ==========================================================

  const getRequestItem =
    (sub) => {

      if (sub.customItem) {
        return sub.customItem;
      }


      return getArticleName(
        sub.article
      );

    };


  // ==========================================================
  // DISPLAY EMPLOYEE
  // ==========================================================

  const getEmployeeName =
    (sub) => {

      if (!sub?.user) {
        return 'Employé Inconnu';
      }


      if (
        typeof sub.user ===
        'object'
      ) {

        return (
          sub.user.name ||
          sub.user.fullName ||
          sub.user.email ||
          'Employé Inconnu'
        );

      }


      return 'Employé Inconnu';

    };


  // ==========================================================
  // DELETE PERMISSION
  // ==========================================================

  const canDelete =
    (sub) => {

      // --------------------------------------------------------
      // ADMIN
      // --------------------------------------------------------

      if (
        user.role ===
        'admin'
      ) {

        return true;

      }


      // --------------------------------------------------------
      // EMPLOYEE
      // Own request + En attente only
      // --------------------------------------------------------

      const isOwnRequest =
        String(
          sub.user?._id || ''
        ) ===
        String(
          user?._id || ''
        );


      const isPending =
        String(
          sub.status || ''
        )
          .trim()
          .toLowerCase() ===
        'en attente';


      return (
        isOwnRequest &&
        isPending
      );

    };


  // ==========================================================
  // STATUS ACTIONS
  // ==========================================================

  const renderStatusActions =
    (sub) => {

      const normalizedStatus =
        String(
          sub.status || ''
        )
          .trim()
          .toLowerCase();


      // --------------------------------------------------------
      // EN ATTENTE → VALIDÉ
      // --------------------------------------------------------

      if (
        normalizedStatus ===
        'en attente'
      ) {

        return (

          <button
            onClick={() =>
              handleStatusChange(
                sub._id,
                'Validé'
              )
            }
            style={{
              padding:
                '6px 10px',
              background:
                '#3182ce',
              color:
                '#fff',
              border:
                'none',
              borderRadius:
                '4px',
              cursor:
                'pointer',
              fontSize:
                '12px'
            }}
          >
            {user.role ===
            'admin'
              ? '✓ Valider la demande'
              : '✓ Valider ma demande'}
          </button>

        );

      }


      // --------------------------------------------------------
      // VALIDÉ → LIVRÉ
      // --------------------------------------------------------

      if (
        normalizedStatus ===
        'validé'
      ) {

        return (

          <button
            onClick={() =>
              handleStatusChange(
                sub._id,
                'Livré'
              )
            }
            style={{
              padding:
                '6px 10px',
              background:
                '#38a169',
              color:
                '#fff',
              border:
                'none',
              borderRadius:
                '4px',
              cursor:
                'pointer',
              fontSize:
                '12px'
            }}
          >
            ✓ Marquer Livré
          </button>

        );

      }


      // --------------------------------------------------------
      // LIVRÉ
      // --------------------------------------------------------

      if (
        normalizedStatus ===
        'livré'
      ) {

        return (

          <span
            style={{
              fontSize:
                '12px',
              color:
                '#38a169',
              fontWeight:
                '600',
              alignSelf:
                'center'
            }}
          >
            ✓ Livré
          </span>

        );

      }


      return null;

    };


  // ==========================================================
  // SEARCH
  // ==========================================================

  const filteredSubmissions =
    submissions.filter(
      (sub) => {

        const search =
          searchTerm
            .trim()
            .toLowerCase();


        if (!search) {
          return true;
        }


        const empName =
          getEmployeeName(
            sub
          ).toLowerCase();


        const category =
          getCategoryName(
            sub.category
          ).toLowerCase();


        const item =
          getRequestItem(
            sub
          ).toLowerCase();


        const description =
          String(
            sub.description ||
            ''
          ).toLowerCase();


        const status =
          String(
            sub.status ||
            ''
          ).toLowerCase();


        return (

          empName.includes(
            search
          ) ||

          category.includes(
            search
          ) ||

          item.includes(
            search
          ) ||

          description.includes(
            search
          ) ||

          status.includes(
            search
          )

        );

      }
    );


  // ==========================================================
  // GROUP REQUESTS FOR ADMIN
  // ==========================================================

  const groupedRequests = {};


  if (
    user.role ===
    'admin'
  ) {

    filteredSubmissions.forEach(
      (sub) => {

        const empName =
          getEmployeeName(
            sub
          );


        if (
          !groupedRequests[
            empName
          ]
        ) {

          groupedRequests[
            empName
          ] = {

            employee:
              sub.user,

            subs: []

          };

        }


        groupedRequests[
          empName
        ].subs.push(
          sub
        );

      }
    );

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="dashboard-container">

      {/* ==================================================== */}
      {/* HEADER                                               */}
      {/* ==================================================== */}

      <header className="dashboard-header">

        <div className="header-left">

          <img
            src={ateaLogo}
            alt="Logo ATEA"
            className="dash-logo"
          />

          <h1>
            Portail de Gestion ATEA
          </h1>

        </div>


        <div
          className="header-right"
          style={{
            display:
              'flex',
            alignItems:
              'center',
            gap:
              '15px'
          }}
        >

          <div
            className="user-info"
            style={{
              display:
                'flex',
              flexDirection:
                'column',
              alignItems:
                'flex-end',
              textAlign:
                'right'
            }}
          >

            <span
              className="user-name"
              style={{
                fontWeight:
                  'bold',
                color:
                  '#2d3748'
              }}
            >
              {user.name ||
                user.fullName ||
                user.email}
            </span>


            <span
              className={
                'role-badge ' +
                user.role
              }
              style={{
                fontSize:
                  '11px',
                marginTop:
                  '2px',
                textTransform:
                  'uppercase'
              }}
            >
              {displayRole}
            </span>

          </div>


          <button
            onClick={onLogout}
            className="logout-btn"
          >
            Déconnexion
          </button>

        </div>

      </header>


      {/* ==================================================== */}
      {/* MAIN                                                 */}
      {/* ==================================================== */}

      <main className="dashboard-content">

        {/* ================================================== */}
        {/* ADMIN                                              */}
        {/* ================================================== */}

        {user.role === 'admin' ? (

          <div className="admin-section">

            <div className="section-title">

              <h2>
                Tableau Récapitulatif Global des Besoins
              </h2>

              <p>
                Vue centralisée et interactive des demandes et du personnel.
              </p>

            </div>


            {/* ================================================= */}
            {/* ADMIN FORM                                        */}
            {/* ================================================= */}

            <form
              onSubmit={
                handleAddRequest
              }
              className="besoins-form"
              style={{
                background:
                  '#fff',
                padding:
                  '20px',
                borderRadius:
                  '8px',
                marginBottom:
                  '25px',
                boxShadow:
                  '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >

              <h3>
                Ajouter une demande pour moi-même
              </h3>


              <div
                style={{
                  display:
                    'grid',
                  gridTemplateColumns:
                    '1fr 1fr',
                  gap:
                    '15px',
                  marginTop:
                    '15px'
                }}
              >

                {/* CATEGORY */}

                <div>

                  <label
                    style={{
                      display:
                        'block',
                      marginBottom:
                        '5px',
                      fontWeight:
                        '600'
                    }}
                  >
                    Catégorie
                  </label>


                  <select
                    value={
                      selectedCategory
                    }
                    onChange={
                      (e) => {

                        setSelectedCategory(
                          e.target.value
                        );

                        setSelectedArticle(
                          ''
                        );

                        setCustomItem(
                          ''
                        );

                      }
                    }
                    style={{
                      width:
                        '100%',
                      padding:
                        '10px',
                      borderRadius:
                        '6px',
                      border:
                        '1px solid #cbd5e0'
                    }}
                  >

                    <option value="">
                      -- Sélectionnez une catégorie --
                    </option>


                    {categories.map(
                      (cat) => (

                        <option
                          key={
                            cat._id
                          }
                          value={
                            cat._id
                          }
                        >
                          {cat.name}
                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* ARTICLE / CUSTOM ITEM */}

                <div>

                  <label
                    style={{
                      display:
                        'block',
                      marginBottom:
                        '5px',
                      fontWeight:
                        '600'
                    }}
                  >
                    Article / Précision
                  </label>


                  {isMaintenance ? (

                    <input
                      type="text"
                      placeholder="Tapez votre besoin de maintenance..."
                      value={
                        customItem
                      }
                      onChange={
                        (e) => {

                          setCustomItem(
                            e.target.value
                          );

                          setSelectedArticle(
                            ''
                          );

                        }
                      }
                      maxLength={
                        200
                      }
                      style={{
                        width:
                          '100%',
                        padding:
                          '10px',
                        borderRadius:
                          '6px',
                        border:
                          '1px solid #cbd5e0'
                      }}
                    />

                  ) : (

                    <div
                      style={{
                        display:
                          'flex',
                        flexDirection:
                          'column',
                        gap:
                          '8px'
                      }}
                    >

                      <select
                        value={
                          selectedArticle
                        }
                        onChange={
                          (e) => {

                            setSelectedArticle(
                              e.target.value
                            );

                            if (
                              e.target
                                .value
                            ) {

                              setCustomItem(
                                ''
                              );

                            }

                          }
                        }
                        style={{
                          width:
                            '100%',
                          padding:
                            '10px',
                          borderRadius:
                            '6px',
                          border:
                            '1px solid #cbd5e0'
                        }}
                      >

                        <option value="">
                          -- Sélectionnez un article --
                        </option>


                        {categoryArticles.map(
                          (article) => (

                            <option
                              key={
                                article._id
                              }
                              value={
                                article._id
                              }
                            >
                              {article.name}
                            </option>

                          )
                        )}

                      </select>


                      <input
                        type="text"
                        placeholder="Ou tapez un article personnalisé..."
                        value={
                          customItem
                        }
                        onChange={
                          (e) => {

                            setCustomItem(
                              e.target.value
                            );

                            if (
                              e.target
                                .value
                                .trim()
                            ) {

                              setSelectedArticle(
                                ''
                              );

                            }

                          }
                        }
                        maxLength={
                          200
                        }
                        style={{
                          width:
                            '100%',
                          padding:
                            '8px 10px',
                          borderRadius:
                            '6px',
                          border:
                            '1px solid #cbd5e0',
                          fontSize:
                            '13px'
                        }}
                      />

                    </div>

                  )}

                </div>


                {/* QUANTITY */}

                <div>

                  <label
                    style={{
                      display:
                        'block',
                      marginBottom:
                        '5px',
                      fontWeight:
                        '600'
                    }}
                  >
                    Quantité
                  </label>


                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      quantity
                    }
                    onChange={
                      (e) =>
                        setQuantity(
                          e.target.value
                        )
                    }
                    style={{
                      width:
                        '100%',
                      padding:
                        '10px',
                      borderRadius:
                        '6px',
                      border:
                        '1px solid #cbd5e0'
                    }}
                  />

                </div>

              </div>


              <button
                type="submit"
                className="submit-besoins-btn"
                disabled={
                  loading
                }
                style={{
                  marginTop:
                    '15px',
                  padding:
                    '10px 20px',
                  background:
                    '#3182ce',
                  color:
                    '#fff',
                  border:
                    'none',
                  borderRadius:
                    '6px',
                  cursor:
                    'pointer'
                }}
              >
                {loading
                  ? 'Enregistrement...'
                  : '+ Ajouter la demande'}
              </button>

            </form>


            {/* ================================================= */}
            {/* SEARCH + EXCEL                                    */}
            {/* ================================================= */}

            <div
              className="search-bar-container"
              style={{
                marginBottom:
                  '20px',
                display:
                  'flex',
                gap:
                  '10px',
                alignItems:
                  'center'
              }}
            >

              <input
                type="text"
                placeholder="Rechercher un employé ou un équipement..."
                value={
                  searchTerm
                }
                onChange={
                  (e) =>
                    setSearchTerm(
                      e.target.value
                    )
                }
                className="search-input"
                style={{
                  flex:
                    1,
                  padding:
                    '10px',
                  borderRadius:
                    '6px',
                  border:
                    '1px solid #cbd5e0'
                }}
              />


              {/* EXPORT EXCEL */}

              <button
                type="button"
                onClick={
                  exportRequestsToExcel
                }
                disabled={
                  auditLoading
                }
                style={{
                  padding:
                    '10px 16px',
                  background:
                    '#38a169',
                  color:
                    '#fff',
                  border:
                    'none',
                  borderRadius:
                    '6px',
                  cursor:
                    auditLoading
                      ? 'not-allowed'
                      : 'pointer',
                  fontWeight:
                    '600',
                  whiteSpace:
                    'nowrap',
                  opacity:
                    auditLoading
                      ? 0.7
                      : 1
                }}
              >
                {auditLoading
                  ? 'Exportation...'
                  : '📥 Exporter Excel'}
              </button>

            </div>


            {/* ================================================= */}
            {/* ADMIN REQUEST GROUPS                              */}
            {/* ================================================= */}

            <div
              className="grouped-admin-list"
              style={{
                display:
                  'flex',
                flexDirection:
                  'column',
                gap:
                  '20px'
              }}
            >

              {Object.keys(
                groupedRequests
              ).length === 0 ? (

                <div
                  style={{
                    background:
                      '#fff',
                    padding:
                      '30px',
                    textAlign:
                      'center',
                    borderRadius:
                      '8px',
                    color:
                      '#a0aec0'
                  }}
                >
                  Aucun employé trouvé.
                </div>

              ) : (

                Object.entries(
                  groupedRequests
                ).map(
                  ([
                    empName,
                    { subs }
                  ]) => (

                    <div
                      key={
                        empName
                      }
                      style={{
                        background:
                          '#fff',
                        borderRadius:
                          '8px',
                        boxShadow:
                          '0 2px 4px rgba(0,0,0,0.05)',
                        overflow:
                          'hidden',
                        border:
                          '1px solid #e2e8f0'
                      }}
                    >

                      <div
                        style={{
                          background:
                            '#f7fafc',
                          padding:
                            '15px 20px',
                          borderBottom:
                            '1px solid #e2e8f0',
                          display:
                            'flex',
                          justifyContent:
                            'space-between',
                          alignItems:
                            'center'
                        }}
                      >

                        <h3
                          style={{
                            margin:
                              0,
                            color:
                              '#2d3748',
                            fontSize:
                              '16px'
                          }}
                        >
                          👤 {empName}
                        </h3>


                        <span
                          style={{
                            background:
                              '#e2e8f0',
                            color:
                              '#4a5568',
                            padding:
                              '4px 10px',
                            borderRadius:
                              '12px',
                            fontSize:
                              '12px',
                            fontWeight:
                              'bold'
                          }}
                        >
                          {subs.length} demande(s)
                        </span>

                      </div>


                      <div
                        style={{
                          padding:
                            '0 20px 15px 20px'
                        }}
                      >

                        <table
                          style={{
                            width:
                              '100%',
                            borderCollapse:
                              'collapse',
                            marginTop:
                              '10px'
                          }}
                        >

                          <thead>

                            <tr
                              style={{
                                textAlign:
                                  'left',
                                color:
                                  '#718096',
                                fontSize:
                                  '13px',
                                borderBottom:
                                  '1px solid #edf2f7'
                              }}
                            >

                              <th
                                style={{
                                  padding:
                                    '10px'
                                }}
                              >
                                Catégorie
                              </th>

                              <th
                                style={{
                                  padding:
                                    '10px'
                                }}
                              >
                                Article demandé
                              </th>

                              <th
                                style={{
                                  padding:
                                    '10px'
                                }}
                              >
                                Quantité
                              </th>

                              <th
                                style={{
                                  padding:
                                    '10px'
                                }}
                              >
                                Statut
                              </th>

                              <th
                                style={{
                                  padding:
                                    '10px'
                                }}
                              >
                                Actions
                              </th>

                            </tr>

                          </thead>


                          <tbody>

                            {subs.map(
                              (sub) => {

                                const normalizedStatus =
                                  String(
                                    sub.status ||
                                    ''
                                  )
                                    .trim()
                                    .toLowerCase();


                                const isDelivered =
                                  normalizedStatus ===
                                  'livré';


                                return (

                                  <tr
                                    key={
                                      sub._id
                                    }
                                    style={{
                                      borderBottom:
                                        '1px solid #edf2f7'
                                    }}
                                  >

                                    <td
                                      style={{
                                        padding:
                                          '10px',
                                        color:
                                          '#4a5568',
                                        fontSize:
                                          '13px'
                                      }}
                                    >
                                      {getCategoryName(
                                        sub.category
                                      )}
                                    </td>


                                    <td
                                      style={{
                                        padding:
                                          '10px',
                                        fontWeight:
                                          '600'
                                      }}
                                    >
                                      {getRequestItem(
                                        sub
                                      )}
                                    </td>


                                    <td
                                      style={{
                                        padding:
                                          '10px',
                                        fontWeight:
                                          '600'
                                      }}
                                    >
                                      {sub.quantity ?? 1}
                                    </td>


                                    <td
                                      style={{
                                        padding:
                                          '10px'
                                      }}
                                    >

                                      <span
                                        style={{
                                          padding:
                                            '4px 8px',
                                          borderRadius:
                                            '12px',
                                          fontSize:
                                            '11px',
                                          fontWeight:
                                            'bold',
                                          background:
                                            isDelivered
                                              ? '#c6f6d5'
                                              : normalizedStatus ===
                                                  'validé'
                                                ? '#bee3f8'
                                                : '#feebc8',
                                          color:
                                            isDelivered
                                              ? '#22543d'
                                              : normalizedStatus ===
                                                  'validé'
                                                ? '#2c5282'
                                                : '#c05621'
                                        }}
                                      >
                                        {
                                          sub.status
                                        }
                                      </span>

                                    </td>


                                    <td
                                      style={{
                                        padding:
                                          '10px',
                                        display:
                                          'flex',
                                        gap:
                                          '8px',
                                        alignItems:
                                          'center'
                                      }}
                                    >

                                      {renderStatusActions(
                                        sub
                                      )}


                                      {canDelete(
                                        sub
                                      ) && (

                                        <button
                                          onClick={() =>
                                            setDeleteTargetId(
                                              sub._id
                                            )
                                          }
                                          style={{
                                            padding:
                                              '6px 10px',
                                            background:
                                              '#e53e3e',
                                            color:
                                              '#fff',
                                            border:
                                              'none',
                                            borderRadius:
                                              '4px',
                                            cursor:
                                              'pointer',
                                            fontSize:
                                              '12px'
                                          }}
                                        >
                                          Supprimer
                                        </button>

                                      )}

                                    </td>

                                  </tr>

                                );

                              }
                            )}

                          </tbody>

                        </table>

                      </div>

                    </div>

                  )
                )

              )}

            </div>

          </div>

        ) : (

          /* ================================================= */
          /* EMPLOYEE                                          */
          /* ================================================= */

          <div className="employee-section">

            <div className="section-title">

              <h2>
                Formulaire d'Expression des Besoins
              </h2>

              <p>
                Ajoutez ou complétez vos requêtes à tout moment.
              </p>

            </div>


            {/* ================================================= */}
            {/* EMPLOYEE FORM                                     */}
            {/* ================================================= */}

            <form
              onSubmit={
                handleAddRequest
              }
              className="besoins-form"
              style={{
                background:
                  '#fff',
                padding:
                  '20px',
                borderRadius:
                  '8px',
                marginBottom:
                  '30px',
                boxShadow:
                  '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >

              <h3>
                Ajouter un nouveau besoin
              </h3>


              <div
                style={{
                  display:
                    'grid',
                  gridTemplateColumns:
                    '1fr 1fr',
                  gap:
                    '15px',
                  marginTop:
                    '15px'
                }}
              >

                {/* CATEGORY */}

                <div>

                  <label
                    style={{
                      display:
                        'block',
                      marginBottom:
                        '5px',
                      fontWeight:
                        '600'
                    }}
                  >
                    Catégorie
                  </label>


                  <select
                    value={
                      selectedCategory
                    }
                    onChange={
                      (e) => {

                        setSelectedCategory(
                          e.target.value
                        );

                        setSelectedArticle(
                          ''
                        );

                        setCustomItem(
                          ''
                        );

                      }
                    }
                    style={{
                      width:
                        '100%',
                      padding:
                        '10px',
                      borderRadius:
                        '6px',
                      border:
                        '1px solid #cbd5e0'
                    }}
                  >

                    <option value="">
                      -- Sélectionnez une catégorie --
                    </option>


                    {categories.map(
                      (cat) => (

                        <option
                          key={
                            cat._id
                          }
                          value={
                            cat._id
                          }
                        >
                          {cat.name}
                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* ARTICLE */}

                <div>

                  <label
                    style={{
                      display:
                        'block',
                      marginBottom:
                        '5px',
                      fontWeight:
                        '600'
                    }}
                  >
                    Article / Précision
                  </label>


                  {isMaintenance ? (

                    <input
                      type="text"
                      placeholder="Tapez votre besoin de maintenance..."
                      value={
                        customItem
                      }
                      onChange={
                        (e) => {

                          setCustomItem(
                            e.target.value
                          );

                          setSelectedArticle(
                            ''
                          );

                        }
                      }
                      maxLength={
                        200
                      }
                      style={{
                        width:
                          '100%',
                        padding:
                          '10px',
                        borderRadius:
                          '6px',
                        border:
                          '1px solid #cbd5e0'
                      }}
                    />

                  ) : (

                    <div
                      style={{
                        display:
                          'flex',
                        flexDirection:
                          'column',
                        gap:
                          '8px'
                      }}
                    >

                      <select
                        value={
                          selectedArticle
                        }
                        onChange={
                          (e) => {

                            setSelectedArticle(
                              e.target.value
                            );

                            if (
                              e.target
                                .value
                            ) {

                              setCustomItem(
                                ''
                              );

                            }

                          }
                        }
                        style={{
                          width:
                            '100%',
                          padding:
                            '10px',
                          borderRadius:
                            '6px',
                          border:
                            '1px solid #cbd5e0'
                        }}
                      >

                        <option value="">
                          -- Sélectionnez un article --
                        </option>


                        {categoryArticles.map(
                          (article) => (

                            <option
                              key={
                                article._id
                              }
                              value={
                                article._id
                              }
                            >
                              {article.name}
                            </option>

                          )
                        )}

                      </select>


                      <input
                        type="text"
                        placeholder="Ou tapez un article personnalisé..."
                        value={
                          customItem
                        }
                        onChange={
                          (e) => {

                            setCustomItem(
                              e.target.value
                            );

                            if (
                              e.target
                                .value
                                .trim()
                            ) {

                              setSelectedArticle(
                                ''
                              );

                            }

                          }
                        }
                        maxLength={
                          200
                        }
                        style={{
                          width:
                            '100%',
                          padding:
                            '8px 10px',
                          borderRadius:
                            '6px',
                          border:
                            '1px solid #cbd5e0',
                          fontSize:
                            '13px'
                        }}
                      />

                    </div>

                  )}

                </div>


                {/* QUANTITY */}

                <div>

                  <label
                    style={{
                      display:
                        'block',
                      marginBottom:
                        '5px',
                      fontWeight:
                        '600'
                    }}
                  >
                    Quantité
                  </label>


                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      quantity
                    }
                    onChange={
                      (e) =>
                        setQuantity(
                          e.target.value
                        )
                    }
                    style={{
                      width:
                        '100%',
                      padding:
                        '10px',
                      borderRadius:
                        '6px',
                      border:
                        '1px solid #cbd5e0'
                    }}
                  />

                </div>

              </div>


              <button
                type="submit"
                className="submit-besoins-btn"
                disabled={
                  loading
                }
                style={{
                  marginTop:
                    '15px',
                  padding:
                    '10px 20px',
                  background:
                    '#3182ce',
                  color:
                    '#fff',
                  border:
                    'none',
                  borderRadius:
                    '6px',
                  cursor:
                    'pointer'
                }}
              >
                {loading
                  ? 'Enregistrement...'
                  : '+ Ajouter à mes demandes'}
              </button>

            </form>


            {/* ================================================= */}
            {/* EMPLOYEE REQUESTS                                 */}
            {/* ================================================= */}

            <div
              className="card list-card"
              style={{
                background:
                  '#fff',
                padding:
                  '20px',
                borderRadius:
                  '8px',
                boxShadow:
                  '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >

              <h3>
                Mes demandes enregistrées dans le système
              </h3>


              {submissions.length ===
              0 ? (

                <p
                  style={{
                    color:
                      '#a0aec0',
                    padding:
                      '20px 0'
                  }}
                >
                  Aucune demande enregistrée pour le moment.
                </p>

              ) : (

                <table
                  style={{
                    width:
                      '100%',
                    marginTop:
                      '15px',
                    borderCollapse:
                      'collapse'
                  }}
                >

                  <thead>

                    <tr
                      style={{
                        background:
                          '#f7fafc',
                        textAlign:
                          'left'
                      }}
                    >

                      <th style={{ padding: '10px' }}>
                        Catégorie
                      </th>

                      <th style={{ padding: '10px' }}>
                        Article
                      </th>

                      <th style={{ padding: '10px' }}>
                        Quantité
                      </th>

                      <th style={{ padding: '10px' }}>
                        Statut
                      </th>

                      <th style={{ padding: '10px' }}>
                        Actions
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {submissions.map(
                      (sub) => {

                        const normalizedStatus =
                          String(
                            sub.status ||
                            ''
                          )
                            .trim()
                            .toLowerCase();


                        const isDelivered =
                          normalizedStatus ===
                          'livré';


                        return (

                          <tr
                            key={
                              sub._id
                            }
                            style={{
                              borderBottom:
                                '1px solid #edf2f7'
                            }}
                          >

                            <td
                              style={{
                                padding:
                                  '10px',
                                fontSize:
                                  '13px',
                                color:
                                  '#4a5568'
                              }}
                            >
                              {getCategoryName(
                                sub.category
                              )}
                            </td>


                            <td
                              style={{
                                padding:
                                  '10px',
                                fontWeight:
                                  '600'
                              }}
                            >
                              {getRequestItem(
                                sub
                              )}
                            </td>


                            <td
                              style={{
                                padding:
                                  '10px',
                                fontWeight:
                                  '600'
                              }}
                            >
                              {sub.quantity ?? 1}
                            </td>


                            <td
                              style={{
                                padding:
                                  '10px'
                              }}
                            >

                              <span
                                style={{
                                  padding:
                                    '3px 8px',
                                  borderRadius:
                                    '12px',
                                  fontSize:
                                    '11px',
                                  fontWeight:
                                    'bold',
                                  background:
                                    isDelivered
                                      ? '#c6f6d5'
                                      : normalizedStatus ===
                                          'validé'
                                        ? '#bee3f8'
                                        : '#feebc8',
                                  color:
                                    isDelivered
                                      ? '#22543d'
                                      : normalizedStatus ===
                                          'validé'
                                        ? '#2c5282'
                                        : '#c05621'
                                }}
                              >
                                {
                                  sub.status
                                }
                              </span>

                            </td>


                            <td
                              style={{
                                padding:
                                  '10px',
                                display:
                                  'flex',
                                gap:
                                  '8px',
                                alignItems:
                                  'center'
                              }}
                            >

                              {renderStatusActions(
                                sub
                              )}


                              {canDelete(
                                sub
                              ) && (

                                <button
                                  onClick={() =>
                                    setDeleteTargetId(
                                      sub._id
                                    )
                                  }
                                  style={{
                                    padding:
                                      '6px 10px',
                                    background:
                                      '#e53e3e',
                                    color:
                                      '#fff',
                                    border:
                                      'none',
                                    borderRadius:
                                      '4px',
                                    cursor:
                                      'pointer',
                                    fontSize:
                                      '12px'
                                  }}
                                >
                                  Supprimer
                                </button>

                              )}

                            </td>

                          </tr>

                        );

                      }
                    )}

                  </tbody>

                </table>

              )}

            </div>

          </div>

        )}

      </main>


      {/* ==================================================== */}
      {/* DELETE CONFIRMATION MODAL                            */}
      {/* ==================================================== */}

      {deleteTargetId && (

        <div
          style={{
            position:
              'fixed',
            top:
              0,
            left:
              0,
            width:
              '100%',
            height:
              '100%',
            background:
              'rgba(0,0,0,0.5)',
            display:
              'flex',
            justifyContent:
              'center',
            alignItems:
              'center',
            zIndex:
              1000
          }}
        >

          <div
            style={{
              background:
                '#fff',
              padding:
                '25px',
              borderRadius:
                '8px',
              width:
                '350px',
              textAlign:
                'center',
              boxShadow:
                '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >

            <h3
              style={{
                margin:
                  '0 0 10px 0',
                color:
                  '#2d3748'
              }}
            >
              Confirmation
            </h3>


            <p
              style={{
                color:
                  '#4a5568',
                fontSize:
                  '14px',
                marginBottom:
                  '20px'
              }}
            >
              Voulez-vous vraiment supprimer cette demande ?
            </p>


            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'center',
                gap:
                  '10px'
              }}
            >

              <button
                onClick={() =>
                  setDeleteTargetId(
                    null
                  )
                }
                style={{
                  padding:
                    '8px 16px',
                  background:
                    '#e2e8f0',
                  color:
                    '#2d3748',
                  border:
                    'none',
                  borderRadius:
                    '4px',
                  cursor:
                    'pointer'
                }}
              >
                Annuler
              </button>


              <button
                onClick={() =>
                  confirmDelete(
                    deleteTargetId
                  )
                }
                style={{
                  padding:
                    '8px 16px',
                  background:
                    '#e53e3e',
                  color:
                    '#fff',
                  border:
                    'none',
                  borderRadius:
                    '4px',
                  cursor:
                    'pointer'
                }}
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