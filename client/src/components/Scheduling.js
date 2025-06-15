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

const Form = styled.form`
  display: grid;
  gap: 20px;
  max-width: 600px;
  margin: 0 auto;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-weight: 600;
  color: #34495e;
  font-size: 1rem;
`;

const Input = styled.input`
  padding: 12px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

// const Select = styled.select`
//   padding: 12px;
//   border: 2px solid #e1e8ed;
//   border-radius: 8px;
//   font-size: 1rem;
//   background: white;
//   transition: border-color 0.2s ease;
//   
//   &:focus {
//     outline: none;
//     border-color: #3498db;
//   }
// `;

const Button = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ScheduleResult = styled.div`
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
`;

const ScheduleTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
`;

const Th = styled.th`
  background: #e9ecef;
  padding: 12px;
  text-align: right;
  border: 1px solid #dee2e6;
`;

const Td = styled.td`
  padding: 12px;
  border: 1px solid #dee2e6;
  text-align: right;
`;

const ConflictsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 15px 0;
`;

const ConflictItem = styled.li`
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  padding: 10px;
  margin: 5px 0;
  border-radius: 4px;
  color: #856404;
`;

function Scheduling() {
  const [configuration, setConfiguration] = useState({
    startDate: '',
    endDate: '',
    maxConsecutiveDaysInOneTrip: 7,
    soldiersInBase: 2,
    minConsecutiveDays: 2
  });

  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [soldiers, setSoldiers] = useState([]);

  useEffect(() => {
    loadConfiguration();
    fetchSoldiers();
  }, []);

  const fetchSoldiers = async () => {
    try {
      const response = await axios.get('/api/soldiers');
      if (response.data.success) {
        setSoldiers(response.data.data);
      }
    } catch (error) {
      toast.error('שגיאה בטעינת רשימת החיילים');
    }
  };

  const loadConfiguration = async () => {
    try {
      const response = await axios.get('/api/scheduling/configuration');
      if (response.data.success) {
        setConfiguration(response.data.data);
      }
    } catch (error) {
      console.error('שגיאה בטעינת קונפיגורציה:', error);
      toast.error('שגיאה בטעינת קונפיגורציה');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfiguration(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const updateConfiguration = async (newConfig) => {
    try {
      const response = await axios.put('/api/scheduling/configuration', configuration);
      if (response.data.success) {
        toast.success('קונפיגורציה עודכנה בהצלחה');
        setConfiguration(response.data.data);
      }
    } catch (error) {
      console.error('שגיאה בעדכון קונפיגורציה:', error);
      toast.error('שגיאה בעדכון קונפיגורציה');
    }
  };

  const generateSchedule = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/scheduling/generate', configuration);
      if (response.data.success) {
        setSchedule(response.data.data);
        toast.success('שיבוץ נוצר בהצלחה');
      }
    } catch (error) {
      console.error('שגיאה ביצירת שיבוץ:', error);
      if (error.response && error.response.data && error.response.data.details) {
        // הצגת שגיאות תקינות
        const errors = error.response.data.details;
        errors.forEach(errorMsg => {
          toast.error(errorMsg);
        });
      } else {
        toast.error('שגיאה ביצירת שיבוץ');
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteSchedule = async () => {
    try {
      setLoading(true);
      const response = await axios.delete('/api/scheduling/current');
      if (response.data.success) {
        setSchedule(null);
        toast.success('השיבוץ נמחק בהצלחה');
      }
    } catch (error) {
      console.error('שגיאה במחיקת שיבוץ:', error);
      toast.error('שגיאה במחיקת שיבוץ');
    } finally {
      setLoading(false);
    }
  };

  const exportSchedule = async (type) => {
    try {
      const response = await axios.get('/api/scheduling/export/excel', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `schedule.${type === 'excel' ? 'xlsx' : 'txt'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`שיבוץ יוצא בהצלחה`);
    } catch (error) {
      toast.error('שגיאה בייצוא שיבוץ');
      console.error(error);
    }
  };

  const getSoldierName = (id) => {
    const soldier = soldiers.find(s => s.id === id);
    return soldier ? soldier.name : id;
  };

  return (
    <Container>
      <Title>הגדרת שיבוץ</Title>
      
      <Form>
        <FormGroup>
          <Label>תאריך התחלה:</Label>
          <Input
            type="date"
            name="startDate"
            value={configuration.startDate}
            onChange={handleInputChange}
          />
        </FormGroup>

        <FormGroup>
          <Label>תאריך סיום:</Label>
          <Input
            type="date"
            name="endDate"
            value={configuration.endDate}
            onChange={handleInputChange}
          />
        </FormGroup>

        <FormGroup>
          <Label>גג ימים ביציאה אחת:</Label>
          <Input
            type="number"
            name="maxConsecutiveDaysInOneTrip"
            value={configuration.maxConsecutiveDaysInOneTrip}
            onChange={handleInputChange}
            min="1"
            max="7"
          />
        </FormGroup>

        <FormGroup>
          <Label>חיילים בבסיס:</Label>
          <Input
            type="number"
            name="soldiersInBase"
            value={configuration.soldiersInBase}
            onChange={handleInputChange}
            min="0"
          />
        </FormGroup>

        <FormGroup>
          <Label>מינימום ימים רצופים:</Label>
          <Input
            type="number"
            name="minConsecutiveDays"
            value={configuration.minConsecutiveDays}
            onChange={handleInputChange}
            min="1"
            max="7"
          />
        </FormGroup>

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <Button type="button" onClick={() => updateConfiguration(configuration)} disabled={loading}>
            שמירת הגדרות
          </Button>
          <Button type="button" onClick={generateSchedule} disabled={loading}>
            יצירת שיבוץ
          </Button>
          {schedule && (
            <Button type="button" onClick={() => exportSchedule('excel')} disabled={loading}>
              ייצוא ל-Excel
            </Button>
          )}
          <Button type="button" onClick={deleteSchedule} disabled={loading}>
            מחיקת שיבוץ
          </Button>
        </div>
      </Form>

      {schedule && (
        <ScheduleResult>
          <h3>תוצאות השיבוץ</h3>
          
          <div>
            <strong>סטטיסטיקות:</strong>
            <ul>
              <li>סה"כ ימים: {schedule.stats.totalDays}</li>
              <li>ממוצע ימי בית: {schedule.stats.averageHomeDays}</li>
              <li>ציון הוגנות: {schedule.stats.fairnessScore}</li>
              <li>קונפליקטים שנפתרו: {schedule.stats.conflictsResolved}</li>
            </ul>
          </div>

          {schedule.conflicts.length > 0 && (
            <div>
              <strong>קונפליקטים:</strong>
              <ConflictsList>
                {schedule.conflicts.map((conflict, index) => (
                  <ConflictItem key={index}>
                    {conflict.date}: {conflict.soldierName} - {conflict.reason}
                  </ConflictItem>
                ))}
              </ConflictsList>
            </div>
          )}

          <div>
            <strong>לוח שיבוץ מפורט:</strong>
            <ScheduleTable>
              <thead>
                <tr>
                  <Th>תאריך</Th>
                  <Th>בבית</Th>
                  <Th>בבסיס</Th>
                  <Th>פירוט</Th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(schedule.schedule).map(([date, daySchedule]) => (
                  <tr key={date}>
                    <Td>{new Date(date).toLocaleDateString('he-IL')}</Td>
                    <Td style={{ color: '#28a745', fontWeight: 'bold' }}>
                      {daySchedule.home.length} חיילים
                    </Td>
                    <Td style={{ color: '#dc3545', fontWeight: 'bold' }}>
                      {daySchedule.base.length} חיילים
                    </Td>
                    <Td>
                      <div style={{ fontSize: '0.9em' }}>
                        <div style={{ color: '#28a745' }}>
                          <strong>בבית:</strong> {daySchedule.home.map(id => getSoldierName(id)).join(', ')}
                        </div>
                        <div style={{ color: '#dc3545' }}>
                          <strong>בבסיס:</strong> {daySchedule.base.map(id => getSoldierName(id)).join(', ')}
                        </div>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </ScheduleTable>
          </div>
        </ScheduleResult>
      )}
    </Container>
  );
}

export default Scheduling; 