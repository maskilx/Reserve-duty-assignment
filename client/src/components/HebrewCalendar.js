import React, { useState, useEffect, useCallback } from 'react';
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

const Controls = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  justify-content: center;
  flex-wrap: wrap;
`;

const Input = styled.input`
  padding: 10px;
  border: 2px solid #e1e8ed;
  border-radius: 6px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const CalendarSection = styled.div`
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
`;

const SectionTitle = styled.h3`
  color: #2c3e50;
  margin-bottom: 15px;
  font-size: 1.3rem;
  text-align: center;
`;

const HolidayList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const HolidayItem = styled.li`
  background: white;
  padding: 12px;
  margin: 8px 0;
  border-radius: 6px;
  border-left: 4px solid #3498db;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const HolidayDate = styled.div`
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 4px;
`;

const HolidayName = styled.div`
  color: #34495e;
  font-size: 0.9rem;
`;

const HebrewDate = styled.div`
  color: #7f8c8d;
  font-size: 0.8rem;
  font-style: italic;
`;

const WeekendItem = styled(HolidayItem)`
  border-left-color: #e74c3c;
`;

const HighDemandItem = styled(HolidayItem)`
  border-left-color: #f39c12;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  opacity: 0.9;
`;

const ExportSection = styled.div`
  text-align: center;
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 40px;
  color: #6c757d;
`;

function HebrewCalendar() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [weekends, setWeekends] = useState([]);
  const [highDemandDays, setHighDemandDays] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // הגדרת תאריכים ברירת מחדל - החודש הנוכחי
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  const loadCalendarData = useCallback(async () => {
    if (!startDate || !endDate) return;
    
    try {
      setLoading(true);
      
      // טעינת חגים
      const holidaysResponse = await axios.get(`/api/hebrew-calendar/holidays/range?startDate=${startDate}&endDate=${endDate}`);
      if (holidaysResponse.data.success) {
        setHolidays(holidaysResponse.data.data);
      }
      
      // טעינת סופי שבוע
      const weekendsResponse = await axios.get(`/api/hebrew-calendar/weekends/range?startDate=${startDate}&endDate=${endDate}`);
      if (weekendsResponse.data.success) {
        setWeekends(weekendsResponse.data.data);
      }
      
      // טעינת ימי ביקוש גבוה
      const highDemandResponse = await axios.get(`/api/hebrew-calendar/high-demand/range?startDate=${startDate}&endDate=${endDate}`);
      if (highDemandResponse.data.success) {
        setHighDemandDays(highDemandResponse.data.data);
      }
      
    } catch (error) {
      console.error('שגיאה בטעינת נתוני לוח:', error);
      toast.error('שגיאה בטעינת נתוני לוח');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      loadCalendarData();
    }
  }, [startDate, endDate, loadCalendarData]);

  const exportCalendar = async (type) => {
    try {
      const response = await axios.get(`/api/hebrew-calendar/export/${type}?startDate=${startDate}&endDate=${endDate}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `hebrew-calendar.${type === 'excel' ? 'xlsx' : 'txt'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`לוח עברי יוצא בהצלחה`);
    } catch (error) {
      toast.error('שגיאה בייצוא לוח עברי');
      console.error(error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>טוען נתוני לוח שנה...</LoadingSpinner>
      </Container>
    );
  }

  return (
    <Container>
      <Title>לוח שנה עברי</Title>

      <Controls>
        <div>
          <label>תאריך התחלה: </label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label>תאריך סיום: </label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <Button onClick={loadCalendarData}>רענון נתונים</Button>
      </Controls>

      <StatsGrid>
        <StatCard>
          <StatNumber>{holidays.length}</StatNumber>
          <StatLabel>חגים</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{weekends.length}</StatNumber>
          <StatLabel>סופי שבוע</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{highDemandDays.length}</StatNumber>
          <StatLabel>ימי ביקוש גבוה</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{holidays.length + weekends.length}</StatNumber>
          <StatLabel>סה"כ ימי יציאה</StatLabel>
        </StatCard>
      </StatsGrid>

      <CalendarGrid>
        <CalendarSection>
          <SectionTitle>חגים עבריים</SectionTitle>
          {holidays.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6c757d' }}>אין חגים בטווח התאריכים</p>
          ) : (
            <HolidayList>
              {holidays.map((holiday, index) => (
                <HolidayItem key={index}>
                  <HolidayDate>{formatDate(holiday.date)}</HolidayDate>
                  <HolidayName>{holiday.name}</HolidayName>
                  <HebrewDate>{holiday.hebrewDate}</HebrewDate>
                </HolidayItem>
              ))}
            </HolidayList>
          )}
        </CalendarSection>

        <CalendarSection>
          <SectionTitle>סופי שבוע</SectionTitle>
          {weekends.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6c757d' }}>אין סופי שבוע בטווח התאריכים</p>
          ) : (
            <HolidayList>
              {weekends.map((weekend, index) => (
                <WeekendItem key={index}>
                  <HolidayDate>{formatDate(weekend.date)}</HolidayDate>
                  <HolidayName>{weekend.name}</HolidayName>
                  <HebrewDate>{weekend.hebrewDate}</HebrewDate>
                </WeekendItem>
              ))}
            </HolidayList>
          )}
        </CalendarSection>

        <CalendarSection>
          <SectionTitle>ימי ביקוש גבוה</SectionTitle>
          {highDemandDays.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6c757d' }}>אין ימי ביקוש גבוה בטווח התאריכים</p>
          ) : (
            <HolidayList>
              {highDemandDays.map((day, index) => (
                <HighDemandItem key={index}>
                  <HolidayDate>{formatDate(day.date)}</HolidayDate>
                  <HolidayName>{day.name}</HolidayName>
                  <HebrewDate>{day.hebrewDate}</HebrewDate>
                </HighDemandItem>
              ))}
            </HolidayList>
          )}
        </CalendarSection>
      </CalendarGrid>

      <ExportSection>
        <h3>ייצוא לוח שנה</h3>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '15px' }}>
          <Button onClick={() => exportCalendar('excel')}>ייצוא ל-Excel</Button>
          <Button onClick={() => exportCalendar('txt')}>ייצוא ל-TXT</Button>
        </div>
      </ExportSection>
    </Container>
  );
}

export default HebrewCalendar; 