import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import styled from 'styled-components';
import Dashboard from './components/Dashboard';
import Soldiers from './components/Soldiers';
import Scheduling from './components/Scheduling';
import Admin from './components/Admin';
import HebrewCalendar from './components/HebrewCalendar';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: #f5f7fa;
`;

const Header = styled.header`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Nav = styled.nav`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled.h1`
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
`;

const NavLinks = styled.div`
  display: flex;
  gap: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
  }
`;

const NavLink = styled(Link)`
  color: white;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
  font-weight: 500;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  &.active {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;

const Main = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

function App() {
  return (
    <AppContainer>
      <Header>
        <Nav>
          <Logo>מערכת שיבוץ ימי יציאה מהבסיס</Logo>
          <NavLinks>
            <NavLink to="/">דשבורד</NavLink>
            <NavLink to="/soldiers">חיילים</NavLink>
            <NavLink to="/scheduling">שיבוץ</NavLink>
            <NavLink to="/admin">מנהל</NavLink>
            <NavLink to="/calendar">לוח עברי</NavLink>
          </NavLinks>
        </Nav>
      </Header>
      
      <Main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/soldiers" element={<Soldiers />} />
          <Route path="/scheduling" element={<Scheduling />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/calendar" element={<HebrewCalendar />} />
        </Routes>
      </Main>
    </AppContainer>
  );
}

export default App; 