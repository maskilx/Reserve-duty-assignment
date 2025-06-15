const express = require('express');
const router = express.Router();
const Scheduler = require('../services/Scheduler');
const Configuration = require('../models/Configuration');
const Soldier = require('../models/Soldier');
const soldiers = require('../soldiersData');
const upload = require('../middleware/upload');

// נתונים זמניים
let currentConfiguration = new Configuration();
let currentSchedule = null;
let currentSoldiers = soldiers;

// הגדרת קונפיגורציה בסיסית
currentConfiguration.setDateRange('2025-06-15', '2025-07-15');
currentConfiguration.setBasicParameters(7, 2, 3); // מקסימום 7 ימי בית, מינימום 2 חיילים בבסיס, מינימום 3 ימים רצופים

// קבלת הקונפיגורציה הנוכחית
router.get('/configuration', (req, res) => {
  try {
    res.json({
      success: true,
      data: currentConfiguration.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת הקונפיגורציה',
      message: error.message
    });
  }
});

// עדכון הקונפיגורציה
router.put('/configuration', (req, res) => {
  try {
    const {
      startDate,
      endDate,
      maxConsecutiveDaysInOneTrip,
      soldiersInBase,
      minConsecutiveDays,
      highDemandDays,
      holidays,
      emergencyReserveList
    } = req.body;

    if (startDate && endDate) {
      currentConfiguration.setDateRange(startDate, endDate);
    }

    if (maxConsecutiveDaysInOneTrip !== undefined && soldiersInBase !== undefined && minConsecutiveDays !== undefined) {
      currentConfiguration.setBasicParameters(maxConsecutiveDaysInOneTrip, soldiersInBase, minConsecutiveDays);
    }

    if (highDemandDays) {
      currentConfiguration.highDemandDays = highDemandDays;
    }

    if (holidays) {
      currentConfiguration.holidays = holidays;
    }

    if (emergencyReserveList) {
      currentConfiguration.emergencyReserveList = emergencyReserveList;
    }

    // בדיקת תקינות
    const errors = currentConfiguration.validate();
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'שגיאות בקונפיגורציה',
        details: errors
      });
    }

    res.json({
      success: true,
      data: currentConfiguration.toJSON(),
      message: 'קונפיגורציה עודכנה בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בעדכון הקונפיגורציה',
      message: error.message
    });
  }
});

// יצירת שיבוץ חדש
router.post('/generate', (req, res) => {
  try {
    // בדיקת תקינות הקונפיגורציה
    const errors = currentConfiguration.validate();
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'קונפיגורציה לא תקינה',
        details: errors
      });
    }

    // בדיקה שיש חיילים
    if (currentSoldiers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'אין חיילים במערכת'
      });
    }

    // יצירת שיבוץ
    const scheduler = new Scheduler(currentSoldiers, currentConfiguration);
    const result = scheduler.generateSchedule();
    
    // בדיקה אם השיבוץ הצליח
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'לא ניתן ליצור שיבוץ עם הפרמטרים הנוכחיים',
        details: result.validationErrors
      });
    }
    
    currentSchedule = result;

    // עדכון נתוני החיילים עם השיבוץ החדש
    currentSoldiers.forEach(soldier => {
      // איפוס נתונים קודמים
      soldier.totalHomeDays = 0;
      soldier.scheduledDays = [];
      
      // עדכון עם השיבוץ החדש
      Object.keys(result.schedule).forEach(date => {
        const dateSchedule = result.schedule[date];
        if (dateSchedule.home.includes(soldier.id)) {
          soldier.totalHomeDays++;
          soldier.scheduledDays.push(date);
        }
      });
    });

    // עדכון השיבוץ הנוכחי בדשבורד
    global.currentSchedule = result;

    res.json({
      success: true,
      data: {
        schedule: result.schedule,
        conflicts: result.conflicts,
        stats: result.stats,
        soldierStats: scheduler.getSoldierStats()
      },
      message: 'שיבוץ נוצר בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה ביצירת השיבוץ',
      message: error.message
    });
  }
});

// קבלת השיבוץ הנוכחי
router.get('/current', (req, res) => {
  try {
    if (!currentSchedule) {
      return res.status(404).json({
        success: false,
        error: 'אין שיבוץ נוכחי'
      });
    }

    const scheduler = new Scheduler(currentSoldiers, currentConfiguration);
    
    res.json({
      success: true,
      data: {
        schedule: currentSchedule.schedule,
        conflicts: currentSchedule.conflicts,
        stats: currentSchedule.stats,
        soldierStats: scheduler.getSoldierStats()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת השיבוץ',
      message: error.message
    });
  }
});

// עדכון ידני של שיבוץ
router.put('/manual-update', (req, res) => {
  try {
    const { date, soldierId, action } = req.body; // action: 'add' או 'remove'

    if (!currentSchedule) {
      return res.status(404).json({
        success: false,
        error: 'אין שיבוץ נוכחי'
      });
    }

    if (!date || !soldierId || !action) {
      return res.status(400).json({
        success: false,
        error: 'חובה למלא תאריך, מזהה חייל ופעולה'
      });
    }

    const dateSchedule = currentSchedule.schedule[date];
    if (!dateSchedule) {
      return res.status(404).json({
        success: false,
        error: 'תאריך לא נמצא בשיבוץ'
      });
    }

    const soldier = currentSoldiers.find(s => s.id === soldierId);
    if (!soldier) {
      return res.status(404).json({
        success: false,
        error: 'חייל לא נמצא'
      });
    }

    if (action === 'add') {
      // הוספת חייל ליציאה
      if (dateSchedule.home.includes(soldierId)) {
        return res.status(400).json({
          success: false,
          error: 'החייל כבר משובץ ליציאה ביום זה'
        });
      }

      // בדיקת מינימום בבסיס
      if (dateSchedule.base.length <= currentConfiguration.soldiersInBase) {
        return res.status(400).json({
          success: false,
          error: 'לא ניתן להוסיף חייל - יפגע במספר החיילים בבסיס'
        });
      }

      dateSchedule.home.push(soldierId);
      dateSchedule.base = dateSchedule.base.filter(id => id !== soldierId);
      soldier.scheduledDays.push(date);
      soldier.totalHomeDays++;

    } else if (action === 'remove') {
      // הסרת חייל מהיציאה
      if (!dateSchedule.home.includes(soldierId)) {
        return res.status(400).json({
          success: false,
          error: 'החייל לא משובץ ליציאה ביום זה'
        });
      }

      dateSchedule.home = dateSchedule.home.filter(id => id !== soldierId);
      dateSchedule.base.push(soldierId);
      soldier.scheduledDays = soldier.scheduledDays.filter(d => d !== date);
      soldier.totalHomeDays--;
    }

    res.json({
      success: true,
      data: {
        schedule: currentSchedule.schedule,
        conflicts: currentSchedule.conflicts,
        stats: currentSchedule.stats
      },
      message: 'שיבוץ עודכן בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בעדכון השיבוץ',
      message: error.message
    });
  }
});

// ייצוא ל-Excel
router.get('/export/excel', (req, res) => {
  try {
    if (!currentSchedule) {
      return res.status(404).json({
        success: false,
        error: 'אין שיבוץ לייצוא'
      });
    }

    const scheduler = new Scheduler(currentSoldiers, currentConfiguration);
    scheduler.schedule = currentSchedule.schedule;
    scheduler.conflicts = currentSchedule.conflicts;
    scheduler.stats = currentSchedule.stats;

    const workbook = scheduler.exportToExcel();
    const XLSX = require('xlsx');
    
    // שמירה לקובץ זמני
    const fileName = `schedule_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filePath = `./temp/${fileName}`;
    
    XLSX.writeFile(workbook, filePath);

    res.download(filePath, fileName, (err) => {
      if (err) {
        res.status(500).json({
          success: false,
          error: 'שגיאה בהורדת הקובץ'
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בייצוא ל-Excel',
      message: error.message
    });
  }
});

// קריאת קובץ Excel קיים ושילוב עם שיבוץ חדש
router.post('/import-excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'לא נשלח קובץ'
      });
    }

    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(req.file.path);
    
    // קריאת טבלת השיבוץ המדויק
    const scheduleSheet = workbook.Sheets['שיבוץ מדויק'];
    if (!scheduleSheet) {
      return res.status(400).json({
        success: false,
        error: 'לא נמצאה טבלת "שיבוץ מדויק" בקובץ'
      });
    }

    const scheduleData = XLSX.utils.sheet_to_json(scheduleSheet);
    
    // עדכון היסטוריית ימי בית לכל חייל
    scheduleData.forEach(row => {
      const soldier = currentSoldiers.find(s => s.id === parseInt(row['מזהה']));
      if (soldier) {
        // עדכון היסטוריית ימי בית
        soldier.totalHomeDaysHistory = (soldier.totalHomeDaysHistory || 0) + (parseInt(row['סך ימי יציאה']) || 0);
        
        // עדכון היסטוריית ימי בבסיס
        soldier.totalDaysInBaseHistory = (soldier.totalDaysInBaseHistory || 0) + (parseInt(row['סך ימים בבסיס']) || 0);
      }
    });

    // מחיקת הקובץ הזמני
    const fs = require('fs');
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'קובץ Excel נקרא בהצלחה והיסטוריית החיילים עודכנה',
      data: {
        soldiersUpdated: scheduleData.length,
        totalHomeDaysHistory: currentSoldiers.reduce((sum, s) => sum + (s.totalHomeDaysHistory || 0), 0),
        totalDaysInBaseHistory: currentSoldiers.reduce((sum, s) => sum + (s.totalDaysInBaseHistory || 0), 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקריאת קובץ Excel',
      message: error.message
    });
  }
});

// ייצוא ל-TXT
router.get('/export/txt', (req, res) => {
  try {
    if (!currentSchedule) {
      return res.status(404).json({
        success: false,
        error: 'אין שיבוץ לייצוא'
      });
    }

    const scheduler = new Scheduler(currentSoldiers, currentConfiguration);
    scheduler.schedule = currentSchedule.schedule;
    scheduler.conflicts = currentSchedule.conflicts;
    scheduler.stats = currentSchedule.stats;

    const txtContent = scheduler.exportToTXT();
    const fileName = `schedule_${new Date().toISOString().split('T')[0]}.txt`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(txtContent);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בייצוא ל-TXT',
      message: error.message
    });
  }
});

// קבלת סטטיסטיקות שיבוץ
router.get('/stats', (req, res) => {
  try {
    if (!currentSchedule) {
      return res.status(404).json({
        success: false,
        error: 'אין שיבוץ נוכחי'
      });
    }

    const scheduler = new Scheduler(currentSoldiers, currentConfiguration);
    scheduler.schedule = currentSchedule.schedule;
    scheduler.conflicts = currentSchedule.conflicts;
    scheduler.stats = currentSchedule.stats;

    const stats = {
      general: currentSchedule.stats,
      soldiers: scheduler.getSoldierStats(),
      conflicts: currentSchedule.conflicts,
      highDemandDays: Object.keys(currentSchedule.schedule).filter(date => 
        currentConfiguration.isHighDemandDay(date)
      ),
      fairness: {
        score: currentSchedule.stats.fairnessScore,
        averageHomeDays: currentSchedule.stats.averageHomeDays,
        variance: scheduler.calculateVariance(scheduler.getSoldierStats().map(s => s.homeDays))
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת הסטטיסטיקות',
      message: error.message
    });
  }
});

// אופטימיזציה מחדש של השיבוץ
router.post('/optimize', (req, res) => {
  try {
    if (!currentSchedule) {
      return res.status(404).json({
        success: false,
        error: 'אין שיבוץ לאופטימיזציה'
      });
    }

    const scheduler = new Scheduler(currentSoldiers, currentConfiguration);
    scheduler.schedule = currentSchedule.schedule;
    scheduler.conflicts = currentSchedule.conflicts;
    scheduler.stats = currentSchedule.stats;

    // אופטימיזציה להוגנות
    scheduler.optimizeForFairness();
    scheduler.validateSchedule();
    scheduler.calculateStats();

    currentSchedule = {
      schedule: scheduler.schedule,
      conflicts: scheduler.conflicts,
      stats: scheduler.stats
    };

    res.json({
      success: true,
      data: {
        schedule: currentSchedule.schedule,
        conflicts: currentSchedule.conflicts,
        stats: currentSchedule.stats,
        soldierStats: scheduler.getSoldierStats()
      },
      message: 'שיבוץ אופטימז בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה באופטימיזציה',
      message: error.message
    });
  }
});

// מחיקת השיבוץ הנוכחי
router.delete('/current', (req, res) => {
  try {
    currentSchedule = null;
    global.currentSchedule = null;
    
    // איפוס נתוני החיילים
    currentSoldiers.forEach(soldier => {
      soldier.totalHomeDays = 0;
      soldier.scheduledDays = [];
    });
    
    res.json({
      success: true,
      message: 'השיבוץ נמחק בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה במחיקת השיבוץ',
      message: error.message
    });
  }
});

module.exports = router; 