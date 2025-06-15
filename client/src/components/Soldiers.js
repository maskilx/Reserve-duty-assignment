import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import axios from 'axios';

const SoldiersContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  
  .flex-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .mb-3 {
    margin-bottom: 1rem;
  }
  
  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }
  
  .btn-danger {
    background: #e74c3c;
    color: white;
  }
  
  .btn-success {
    background: #27ae60;
    color: white;
  }
  
  .btn:hover {
    transform: translateY(-2px);
  }
  
  .soldiers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 20px;
  }
  
  .soldier-card {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
    border: 1px solid #e9ecef;
  }
  
  .soldier-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }
  
  .soldier-name {
    font-size: 1.2rem;
    font-weight: 600;
    color: #2c3e50;
  }
  
  .soldier-rank {
    background: #3498db;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
  }
  
  .soldier-details {
    margin-bottom: 15px;
  }
  
  .soldier-detail {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    font-size: 0.9rem;
  }
  
  .soldier-actions {
    display: flex;
    gap: 8px;
  }
`;

const SoldierCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border-left: 4px solid ${props => props.isEmergencyReserve ? '#e74c3c' : '#3498db'};
  
  .soldier-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  
  .soldier-name {
    font-size: 1.2rem;
    font-weight: 600;
    color: #2c3e50;
  }
  
  .soldier-rank {
    color: #7f8c8d;
    font-size: 0.9rem;
  }
  
  .soldier-info {
    margin-bottom: 12px;
    
    .info-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      
      .label {
        font-weight: 500;
        color: #7f8c8d;
      }
      
      .value {
        color: #2c3e50;
      }
    }
  }
  
  .soldier-stats {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    
    .stat {
      text-align: center;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 6px;
      
      .stat-number {
        font-size: 1.1rem;
        font-weight: 600;
        color: #3498db;
      }
      
      .stat-label {
        font-size: 0.8rem;
        color: #7f8c8d;
      }
    }
  }
  
  .soldier-actions {
    display: flex;
    gap: 8px;
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  
  .modal-content {
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    .modal-title {
      font-size: 1.3rem;
      font-weight: 600;
      color: #2c3e50;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #7f8c8d;
      
      &:hover {
        color: #e74c3c;
      }
    }
  }
`;

function Soldiers() {
  const [soldiers, setSoldiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedSoldier, setSelectedSoldier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    rank: '',
    phone: '',
    email: '',
    distanceFromBase: '',
    isEmergencyReserve: false
  });
  const [requestData, setRequestData] = useState({
    date: '',
    priority: 'גמיש',
    reason: ''
  });

  useEffect(() => {
    fetchSoldiers();
  }, []);

  const fetchSoldiers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/soldiers');
      if (response.data.success) {
        setSoldiers(response.data.data);
      }
    } catch (error) {
      console.error('שגיאה בקבלת החיילים:', error);
      toast.error('שגיאה בטעינת רשימת החיילים');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSoldier = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/soldiers', formData);
      if (response.data.success) {
        toast.success('חייל נוסף בהצלחה!');
        setShowAddForm(false);
        setFormData({
          name: '',
          rank: '',
          phone: '',
          email: '',
          distanceFromBase: '',
          isEmergencyReserve: false
        });
        fetchSoldiers();
      }
    } catch (error) {
      console.error('שגיאה בהוספת חייל:', error);
      toast.error('שגיאה בהוספת החייל');
    }
  };

  const handleAddRequest = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`/api/soldiers/${selectedSoldier.id}/requests`, requestData);
      if (response.data.success) {
        toast.success('בקשה נוספה בהצלחה!');
        setShowRequestForm(false);
        setRequestData({
          date: '',
          priority: 'גמיש',
          reason: ''
        });
        setSelectedSoldier(null);
        fetchSoldiers();
      }
    } catch (error) {
      console.error('שגיאה בהוספת בקשה:', error);
      toast.error('שגיאה בהוספת הבקשה');
    }
  };

  const handleDeleteSoldier = async (soldierId) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק חייל זה?')) {
      try {
        const response = await axios.delete(`/api/soldiers/${soldierId}`);
        if (response.data.success) {
          toast.success('חייל נמחק בהצלחה!');
          fetchSoldiers();
        }
      } catch (error) {
        console.error('שגיאה במחיקת חייל:', error);
        toast.error('שגיאה במחיקת החייל');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRequestInputChange = (e) => {
    const { name, value } = e.target;
    setRequestData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>טוען חיילים...</p>
      </div>
    );
  }

  return (
    <SoldiersContainer>
      <div className="flex-between mb-3">
        <h1>ניהול חיילים</h1>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          הוספת חייל חדש
        </button>
      </div>

      <div className="soldiers-grid">
        {soldiers.map(soldier => (
          <SoldierCard key={soldier.id} isEmergencyReserve={soldier.isEmergencyReserve}>
            <div className="soldier-header">
              <div>
                <div className="soldier-name">{soldier.name}</div>
                <div className="soldier-rank">{soldier.rank}</div>
              </div>
              {soldier.isEmergencyReserve && (
                <span className="badge badge-danger">תורניות חירום</span>
              )}
            </div>

            <div className="soldier-info">
              <div className="info-item">
                <span className="label">טלפון:</span>
                <span className="value">{soldier.phone}</span>
              </div>
              <div className="info-item">
                <span className="label">אימייל:</span>
                <span className="value">{soldier.email || 'לא צוין'}</span>
              </div>
              <div className="info-item">
                <span className="label">מרחק מהבסיס:</span>
                <span className="value">{soldier.distanceFromBase} ק"מ</span>
              </div>
            </div>

            <div className="soldier-stats">
              <div className="stat">
                <div className="stat-number">{soldier.requests.length}</div>
                <div className="stat-label">בקשות</div>
              </div>
              <div className="stat">
                <div className="stat-number">{soldier.totalHomeDays}</div>
                <div className="stat-label">ימי בית</div>
              </div>
              <div className="stat">
                <div className="stat-number">
                  {soldier.requests.filter(r => r.priority === 'חובה').length}
                </div>
                <div className="stat-label">חובה</div>
              </div>
            </div>

            <div className="soldier-actions">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setSelectedSoldier(soldier);
                  setShowRequestForm(true);
                }}
              >
                הוספת בקשה
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => handleDeleteSoldier(soldier.id)}
              >
                מחיקה
              </button>
            </div>
          </SoldierCard>
        ))}
      </div>

      {/* Modal להוספת חייל */}
      {showAddForm && (
        <Modal>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">הוספת חייל חדש</h2>
              <button 
                className="close-btn"
                onClick={() => setShowAddForm(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddSoldier}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">שם מלא *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">דרגה *</label>
                  <select
                    className="form-control"
                    name="rank"
                    value={formData.rank}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">בחר דרגה</option>
                    <option value="מפקד">מפקד</option>
                    <option value="לא מפקד">לא מפקד</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">טלפון *</label>
                  <input
                    type="tel"
                    className="form-control"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">אימייל</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">מרחק מהבסיס (ק"מ)</label>
                  <input
                    type="number"
                    className="form-control"
                    name="distanceFromBase"
                    value={formData.distanceFromBase}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    <input
                      type="checkbox"
                      name="isEmergencyReserve"
                      checked={formData.isEmergencyReserve}
                      onChange={handleInputChange}
                    />
                    תורניות חירום
                  </label>
                </div>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  הוספה
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Modal להוספת בקשה */}
      {showRequestForm && selectedSoldier && (
        <Modal>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">הוספת בקשה ל{selectedSoldier.name}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowRequestForm(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddRequest}>
              <div className="form-group">
                <label className="form-label">תאריך *</label>
                <input
                  type="date"
                  className="form-control"
                  name="date"
                  value={requestData.date}
                  onChange={handleRequestInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">עדיפות *</label>
                <select
                  className="form-control"
                  name="priority"
                  value={requestData.priority}
                  onChange={handleRequestInputChange}
                  required
                >
                  <option value="גמיש">גמיש</option>
                  <option value="מועדף">מועדף</option>
                  <option value="חובה">חובה</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">סיבה</label>
                <textarea
                  className="form-control"
                  name="reason"
                  value={requestData.reason}
                  onChange={handleRequestInputChange}
                  rows="3"
                  placeholder="הסבר לבקשה (אופציונלי)"
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  הוספת בקשה
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowRequestForm(false)}
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </SoldiersContainer>
  );
}

export default Soldiers; 