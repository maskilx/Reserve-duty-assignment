import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import axios from 'axios';

const DashboardContainer = styled.div`
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
  }
`;

const StatCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
  
  .stat-number {
    font-size: 2.5rem;
    font-weight: 700;
    color: #3498db;
    margin-bottom: 8px;
  }
  
  .stat-label {
    font-size: 1rem;
    color: #7f8c8d;
    font-weight: 500;
  }
  
  .stat-icon {
    font-size: 3rem;
    margin-bottom: 16px;
    opacity: 0.7;
  }
`;

const QuickActions = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
`;

const ActionButton = styled.button`
  background: ${props => props.variant === 'primary' ? '#3498db' : 
                     props.variant === 'success' ? '#27ae60' : 
                     props.variant === 'warning' ? '#f39c12' : 
                     props.variant === 'danger' ? '#e74c3c' : '#95a5a6'};
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin: 0 8px 8px 0;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const RecentActivity = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const ActivityItem = styled.div`
  padding: 12px 0;
  border-bottom: 1px solid #e1e8ed;
  
  &:last-child {
    border-bottom: none;
  }
  
  .activity-time {
    font-size: 12px;
    color: #7f8c8d;
  }
  
  .activity-text {
    font-weight: 500;
    color: #2c3e50;
  }
`;

function Dashboard() {
  const [stats, setStats] = useState({
    totalSoldiers: 0,
    activeRequests: 0,
    pendingConflicts: 0,
    fairnessScore: 0,
    commandersCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // קבלת נתוני דשבורד
      const dashboardResponse = await axios.get('/api/admin/dashboard');
      if (dashboardResponse.data.success) {
        const data = dashboardResponse.data.data;
        setStats({
          totalSoldiers: data.totalSoldiers,
          activeRequests: data.activeRequests,
          pendingConflicts: data.pendingConflicts,
          fairnessScore: data.fairnessScore || 0,
          commandersCount: data.commandersCount || 0
        });
      }

      // קבלת פעילות אחרונה
      const activityResponse = await axios.get('/api/admin/soldiers-overview');
      if (activityResponse.data.success) {
        const soldiers = activityResponse.data.data;
        const activity = soldiers
          .filter(s => s.stats.lastUpdate)
          .sort((a, b) => new Date(b.stats.lastUpdate) - new Date(a.stats.lastUpdate))
          .slice(0, 5)
          .map(s => ({
            time: new Date(s.stats.lastUpdate).toLocaleString('he-IL'),
            text: `עדכון חייל: ${s.name}`
          }));
        setRecentActivity(activity);
      }
    } catch (error) {
      console.error('שגיאה בקבלת נתוני הדשבורד:', error);
      toast.error('שגיאה בטעינת נתוני הדשבורד');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action) => {
    try {
      switch (action) {
        case 'generate':
          const response = await axios.post('/api/scheduling/generate');
          if (response.data.success) {
            toast.success('שיבוץ נוצר בהצלחה!');
            fetchDashboardData();
          }
          break;
        case 'export':
          window.open('/api/scheduling/export/excel', '_blank');
          break;
        case 'optimize':
          const optimizeResponse = await axios.post('/api/scheduling/optimize');
          if (optimizeResponse.data.success) {
            toast.success('שיבוץ אופטימז בהצלחה!');
            fetchDashboardData();
          }
          break;
        case 'delete':
          const deleteResponse = await axios.delete('/api/scheduling/current');
          if (deleteResponse.data.success) {
            toast.success('השיבוץ נמחק בהצלחה!');
            fetchDashboardData();
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('שגיאה בפעולה מהירה:', error);
      if (error.response && error.response.data && error.response.data.details) {
        // הצגת שגיאות תקינות
        const errors = error.response.data.details;
        errors.forEach(errorMsg => {
          toast.error(errorMsg);
        });
      } else {
        toast.error('שגיאה בביצוע הפעולה');
      }
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>טוען נתונים...</p>
      </div>
    );
  }

  return (
    <DashboardContainer>
      <h1>דשבורד - סקירה כללית</h1>
      
      <div className="grid">
        <StatCard>
          <div className="stat-icon">👥</div>
          <div className="stat-number">{stats.totalSoldiers}</div>
          <div className="stat-label">חיילים במערכת</div>
        </StatCard>
        
        <StatCard>
          <div className="stat-icon">📋</div>
          <div className="stat-number">{stats.activeRequests}</div>
          <div className="stat-label">בקשות פעילות</div>
        </StatCard>
        
        <StatCard>
          <div className="stat-icon">⚠️</div>
          <div className="stat-number">{stats.pendingConflicts}</div>
          <div className="stat-label">קונפליקטים ממתינים</div>
        </StatCard>
        
        <StatCard>
          <div className="stat-icon">⚖️</div>
          <div className="stat-number">{stats.fairnessScore.toFixed(1)}</div>
          <div className="stat-label">ציון הוגנות</div>
        </StatCard>
        <StatCard>
          <div className="stat-icon">🧑‍✈️</div>
          <div className="stat-number">{stats.commandersCount}</div>
          <div className="stat-label">מפקדים</div>
        </StatCard>
      </div>

      <QuickActions>
        <h2>פעולות מהירות</h2>
        <div>
          <ActionButton 
            variant="primary" 
            onClick={() => handleQuickAction('generate')}
          >
            יצירת שיבוץ חדש
          </ActionButton>
          <ActionButton 
            variant="success" 
            onClick={() => handleQuickAction('optimize')}
          >
            אופטימיזציה
          </ActionButton>
          <ActionButton 
            variant="warning" 
            onClick={() => handleQuickAction('export')}
          >
            ייצוא ל-Excel
          </ActionButton>
          <ActionButton 
            variant="danger" 
            onClick={() => handleQuickAction('delete')}
          >
            מחיקת שיבוץ
          </ActionButton>
        </div>
      </QuickActions>

      <RecentActivity>
        <h2>פעילות אחרונה</h2>
        {recentActivity.length > 0 ? (
          recentActivity.map((activity, index) => (
            <ActivityItem key={index}>
              <div className="activity-text">{activity.text}</div>
              <div className="activity-time">{activity.time}</div>
            </ActivityItem>
          ))
        ) : (
          <p>אין פעילות אחרונה</p>
        )}
      </RecentActivity>
    </DashboardContainer>
  );
}

export default Dashboard; 