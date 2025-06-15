import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from 'react-toastify';

const Container = styled.div`
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  color: #2c3e50;
  margin-bottom: 30px;
  text-align: center;
  font-size: 2rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 1rem;
  opacity: 0.9;
`;

const Section = styled.div`
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
`;

const SectionTitle = styled.h3`
  color: #2c3e50;
  margin-bottom: 20px;
  font-size: 1.5rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
`;

const Th = styled.th`
  background: #e9ecef;
  padding: 12px;
  text-align: right;
  border: 1px solid #dee2e6;
  font-weight: 600;
`;

const Td = styled.td`
  padding: 12px;
  border: 1px solid #dee2e6;
  text-align: right;
`;

const FileInput = styled.input`
  display: none;
`;

const FileInputLabel = styled.label`
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
  margin: 5px;

  &:hover {
    transform: translateY(-2px);
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
  margin: 5px;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ConflictItem = styled.div`
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  padding: 15px;
  margin: 10px 0;
  border-radius: 8px;
  color: #856404;
`;

const ConflictActions = styled.div`
  margin-top: 10px;
  display: flex;
  gap: 10px;
`;

const ResolveButton = styled(Button)`
  background: #28a745;
  font-size: 0.8rem;
  padding: 8px 16px;
`;

const RejectButton = styled(Button)`
  background: #dc3545;
  font-size: 0.8rem;
  padding: 8px 16px;
`;

const ChartContainer = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  margin-top: 20px;
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 40px;
  color: #6c757d;
`;

function Admin() {
  const [dashboardData, setDashboardData] = useState(null);
  const [soldiersOverview, setSoldiersOverview] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadSoldiersOverview();
    loadConflicts();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await axios.get('/api/admin/dashboard');
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      console.error('שגיאה בטעינת נתוני דשבורד:', error);
      toast.error('שגיאה בטעינת נתוני הדשבורד');
    }
  };

  const loadSoldiersOverview = async () => {
    try {
      const response = await axios.get('/api/admin/soldiers-overview');
      if (response.data.success) {
        setSoldiersOverview(response.data.data);
      }
    } catch (error) {
      console.error('שגיאה בטעינת סקירת חיילים:', error);
      toast.error('שגיאה בטעינת סקירת חיילים');
    }
  };

  const loadConflicts = async () => {
    try {
      const response = await axios.get('/api/admin/conflicts');
      if (response.data.success) {
        setConflicts(response.data.data || []);
      } else {
        setConflicts([]);
      }
    } catch (error) {
      console.error('שגיאה בטעינת קונפליקטים:', error);
      toast.error('שגיאה בטעינת קונפליקטים');
      setConflicts([]);
    } finally {
      setLoading(false);
    }
  };

  const resolveConflict = async (conflictId, resolution) => {
    try {
      const response = await axios.post('/api/admin/resolve-conflict', {
        conflictId,
        resolution
      });
      
      if (response.data.success) {
        toast.success('קונפליקט נפתר בהצלחה');
        loadConflicts(); // רענון רשימת הקונפליקטים
      } else {
        toast.error('שגיאה בפתרון קונפליקט');
      }
    } catch (error) {
      toast.error('שגיאה בפתרון קונפליקט');
      console.error(error);
    }
  };

  const exportData = async (type) => {
    try {
      const response = await axios.get(`/api/admin/export/${type}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `admin-report-${type}.${type === 'excel' ? 'xlsx' : 'txt'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`דוח ${type === 'excel' ? 'Excel' : 'TXT'} יוצא בהצלחה`);
    } catch (error) {
      toast.error(`שגיאה בייצוא דוח ${type}`);
      console.error(error);
    }
  };

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.warn('יש לבחור קובץ תחילה');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    setUploading(true);

    try {
      const response = await axios.post('/api/admin/import/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success('הקובץ יובא בהצלחה! היסטוריית החיילים עודכנה.');
        // Refresh data after import
        loadSoldiersOverview();
        loadDashboardData();
      } else {
        toast.error(response.data.message || 'שגיאה בייבוא הקובץ');
      }
    } catch (error) {
      toast.error('שגיאה חמורה בייבוא הקובץ');
      console.error(error);
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>טוען נתונים...</LoadingSpinner>
      </Container>
    );
  }

  return (
    <Container>
      <Title>ממשק מנהל</Title>

      <Section>
        <SectionTitle>ייבוא וייצוא נתונים</SectionTitle>
        <div>
          <Button onClick={() => exportData('excel')}>ייצוא שיבוץ והיסטוריה (Excel)</Button>
        </div>
        <div style={{ marginTop: '20px' }}>
            <FileInput
                id="file-upload"
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileSelect}
            />
            <FileInputLabel htmlFor="file-upload">
                {selectedFile ? selectedFile.name : 'בחר קובץ היסטוריה'}
            </FileInputLabel>
            <Button onClick={handleFileUpload} disabled={!selectedFile || uploading}>
                {uploading ? 'מעלה...' : 'ייבא היסטוריה מקובץ'}
            </Button>
        </div>
      </Section>

      {dashboardData && (
        <StatsGrid>
          <StatCard>
            <StatNumber>{dashboardData.totalSoldiers}</StatNumber>
            <StatLabel>סה"כ חיילים</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>{dashboardData.activeRequests}</StatNumber>
            <StatLabel>בקשות פעילות</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>{dashboardData.pendingConflicts}</StatNumber>
            <StatLabel>קונפליקטים ממתינים</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>{dashboardData.commandersCount}</StatNumber>
            <StatLabel>מפקדים</StatLabel>
          </StatCard>
        </StatsGrid>
      )}

      <Section>
        <SectionTitle>סקירת חיילים</SectionTitle>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <Button onClick={() => exportData('excel')}>ייצוא ל-Excel</Button>
          <Button onClick={() => exportData('txt')}>ייצוא ל-TXT</Button>
        </div>
        
        <Table>
          <thead>
            <tr>
              <Th>שם</Th>
              <Th>דרגה</Th>
              <Th>ימי בית</Th>
              <Th>ימי בית היסטוריים</Th>
              <Th>בקשות</Th>
              <Th>מרחק מהבסיס</Th>
            </tr>
          </thead>
          <tbody>
            {soldiersOverview.map((soldier) => (
              <tr key={soldier.id}>
                <Td>{soldier.name}</Td>
                <Td>{soldier.rank}</Td>
                <Td>{soldier.homeDays}</Td>
                <Td>{soldier.totalHomeDaysHistory || 0}</Td>
                <Td>{soldier.requestsCount}</Td>
                <Td>{soldier.distanceFromBase} ק"מ</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section>
        <SectionTitle>ניהול קונפליקטים</SectionTitle>
        {Array.isArray(conflicts) && conflicts.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6c757d' }}>אין קונפליקטים ממתינים</p>
        ) : (
          Array.isArray(conflicts) && conflicts.map((conflict) => (
            <ConflictItem key={conflict.id}>
              <div>
                <strong>תאריך:</strong> {new Date(conflict.date).toLocaleDateString('he-IL')}
              </div>
              <div>
                <strong>חייל:</strong> {conflict.soldierName}
              </div>
              <div>
                <strong>סיבה:</strong> {conflict.reason}
              </div>
              <div>
                <strong>בקשה:</strong> {conflict.requestDetails}
              </div>
              <ConflictActions>
                <ResolveButton onClick={() => resolveConflict(conflict.id, 'approve')}>
                  אישור
                </ResolveButton>
                <RejectButton onClick={() => resolveConflict(conflict.id, 'reject')}>
                  דחייה
                </RejectButton>
              </ConflictActions>
            </ConflictItem>
          ))
        )}
      </Section>

      <Section>
        <SectionTitle>סטטיסטיקות מתקדמות</SectionTitle>
        <ChartContainer>
          <h4>התפלגות ימי בית</h4>
          <p>כאן יוצג גרף התפלגות ימי הבית בין החיילים</p>
        </ChartContainer>
        
        <ChartContainer>
          <h4>בקשות לפי עדיפות</h4>
          <p>כאן יוצג גרף בקשות לפי רמת עדיפות</p>
        </ChartContainer>
        
        <ChartContainer>
          <h4>קונפליקטים לאורך זמן</h4>
          <p>כאן יוצג גרף קונפליקטים לאורך זמן</p>
        </ChartContainer>
      </Section>
    </Container>
  );
}

export default Admin; 