const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Soldier = require('../models/Soldier');
const soldiers = require('../soldiersData');

const soldiersDataPath = path.join(__dirname, '../soldiersData.js');

function saveSoldiers() {
  const data = `module.exports = ${JSON.stringify(soldiers.map(s => s.toJSON()), null, 2)};`;
  fs.writeFileSync(soldiersDataPath, data, 'utf8');
}

// קבלת כל החיילים
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      data: soldiers.map(soldier => soldier.toJSON()),
      count: soldiers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת רשימת החיילים',
      message: error.message
    });
  }
});

// קבלת חייל לפי מזהה
router.get('/:id', (req, res) => {
  try {
    const soldierId = parseInt(req.params.id);
    const soldier = soldiers.find(s => s.id === soldierId);
    
    if (!soldier) {
      return res.status(404).json({
        success: false,
        error: 'חייל לא נמצא'
      });
    }
    
    res.json({
      success: true,
      data: soldier.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת פרטי החייל',
      message: error.message
    });
  }
});

// הוספת חייל חדש
router.post('/', (req, res) => {
  try {
    const { name, rank, phone, email, distanceFromBase, isEmergencyReserve } = req.body;
    
    if (!name || !rank || !phone) {
      return res.status(400).json({
        success: false,
        error: 'חובה למלא שם, דרגה וטלפון'
      });
    }
    
    const newId = Math.max(...soldiers.map(s => s.id)) + 1;
    const newSoldier = new Soldier(
      newId,
      name,
      rank,
      phone,
      email || '',
      distanceFromBase || 0,
      isEmergencyReserve || false
    );
    
    soldiers.push(newSoldier);
    saveSoldiers();
    
    res.status(201).json({
      success: true,
      data: newSoldier.toJSON(),
      message: 'חייל נוסף בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בהוספת חייל',
      message: error.message
    });
  }
});

// עדכון חייל
router.put('/:id', (req, res) => {
  try {
    const soldierId = parseInt(req.params.id);
    const soldierIndex = soldiers.findIndex(s => s.id === soldierId);
    
    if (soldierIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'חייל לא נמצא'
      });
    }
    
    const { name, rank, phone, email, distanceFromBase, isEmergencyReserve } = req.body;
    
    if (name) soldiers[soldierIndex].name = name;
    if (rank) soldiers[soldierIndex].rank = rank;
    if (phone) soldiers[soldierIndex].phone = phone;
    if (email !== undefined) soldiers[soldierIndex].email = email;
    if (distanceFromBase !== undefined) soldiers[soldierIndex].distanceFromBase = distanceFromBase;
    if (isEmergencyReserve !== undefined) soldiers[soldierIndex].isEmergencyReserve = isEmergencyReserve;
    
    soldiers[soldierIndex].lastUpdate = new Date();
    saveSoldiers();
    
    res.json({
      success: true,
      data: soldiers[soldierIndex].toJSON(),
      message: 'חייל עודכן בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בעדכון חייל',
      message: error.message
    });
  }
});

// מחיקת חייל
router.delete('/:id', (req, res) => {
  try {
    const soldierId = parseInt(req.params.id);
    const soldierIndex = soldiers.findIndex(s => s.id === soldierId);
    
    if (soldierIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'חייל לא נמצא'
      });
    }
    
    const deletedSoldier = soldiers.splice(soldierIndex, 1)[0];
    saveSoldiers();
    
    res.json({
      success: true,
      data: deletedSoldier.toJSON(),
      message: 'חייל נמחק בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה במחיקת חייל',
      message: error.message
    });
  }
});

// הוספת בקשה לחייל
router.post('/:id/requests', (req, res) => {
  try {
    const soldierId = parseInt(req.params.id);
    const soldier = soldiers.find(s => s.id === soldierId);
    
    if (!soldier) {
      return res.status(404).json({
        success: false,
        error: 'חייל לא נמצא'
      });
    }
    
    const { date, priority, reason } = req.body;
    
    if (!date || !priority) {
      return res.status(400).json({
        success: false,
        error: 'חובה למלא תאריך ועדיפות'
      });
    }
    
    if (!['חובה', 'מועדף', 'גמיש'].includes(priority)) {
      return res.status(400).json({
        success: false,
        error: 'עדיפות חייבת להיות: חובה, מועדף או גמיש'
      });
    }
    
    const request = soldier.addRequest(date, priority, reason || '');
    saveSoldiers();
    
    res.status(201).json({
      success: true,
      data: request,
      message: 'בקשה נוספה בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בהוספת בקשה',
      message: error.message
    });
  }
});

// קבלת בקשות חייל
router.get('/:id/requests', (req, res) => {
  try {
    const soldierId = parseInt(req.params.id);
    const soldier = soldiers.find(s => s.id === soldierId);
    
    if (!soldier) {
      return res.status(404).json({
        success: false,
        error: 'חייל לא נמצא'
      });
    }
    
    res.json({
      success: true,
      data: soldier.requests,
      count: soldier.requests.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת בקשות החייל',
      message: error.message
    });
  }
});

// מחיקת בקשה
router.delete('/:id/requests/:requestId', (req, res) => {
  try {
    const soldierId = parseInt(req.params.id);
    const requestId = parseInt(req.params.requestId);
    const soldier = soldiers.find(s => s.id === soldierId);
    
    if (!soldier) {
      return res.status(404).json({
        success: false,
        error: 'חייל לא נמצא'
      });
    }
    
    const requestIndex = soldier.requests.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'בקשה לא נמצאה'
      });
    }
    
    const deletedRequest = soldier.requests.splice(requestIndex, 1)[0];
    saveSoldiers();
    
    res.json({
      success: true,
      data: deletedRequest,
      message: 'בקשה נמחקה בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה במחיקת בקשה',
      message: error.message
    });
  }
});

// קבלת סטטיסטיקות חייל
router.get('/:id/stats', (req, res) => {
  try {
    const soldierId = parseInt(req.params.id);
    const soldier = soldiers.find(s => s.id === soldierId);
    
    if (!soldier) {
      return res.status(404).json({
        success: false,
        error: 'חייל לא נמצא'
      });
    }
    
    const stats = {
      soldierId: soldier.id,
      name: soldier.name,
      homeDays: soldier.totalHomeDays,
      requestedDays: soldier.getTotalRequestedDays(),
      highPriorityRequests: soldier.getHighPriorityRequests().length,
      isEmergencyReserve: soldier.isEmergencyReserve,
      lastUpdate: soldier.lastUpdate
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת סטטיסטיקות החייל',
      message: error.message
    });
  }
});

module.exports = router; 