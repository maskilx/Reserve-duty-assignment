const express = require('express');
const router = express.Router();
const Soldier = require('../models/Soldier');
const Configuration = require('../models/Configuration');
const Scheduler = require('../services/Scheduler');
const soldiers = require('../soldiersData');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const multer = require('multer');

// Multer setup for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// נתונים זמניים
let currentConfiguration = Configuration;
let currentSchedule = null;

// פונקציה לעדכון השיבוץ הנוכחי
function updateCurrentSchedule(schedule) {
  currentSchedule = schedule;
}

// נתיב בסיסי - מידע כללי על המערכת
router.get('/', (req, res) => {
  try {
    const commandersCount = soldiers.filter(s => s.rank === 'מפקד').length;
    const regularSoldiersCount = soldiers.filter(s => s.rank === 'לא מפקד').length;
    const hasCurrentSchedule = !!(currentSchedule || global.currentSchedule);
    
    const response = {
      success: true,
      data: {
        systemInfo: {
          totalSoldiers: soldiers.length,
          commandersCount: commandersCount,
          regularSoldiersCount: regularSoldiersCount,
          hasActiveSchedule: hasCurrentSchedule,
          lastUpdate: new Date().toISOString()
        },
        availableEndpoints: [
          '/api/admin/dashboard',
          '/api/admin/soldiers-overview', 
          '/api/admin/emergency-reserve',
          '/api/admin/current-schedule'
        ]
      },
      message: 'מערכת ניהול פעילה'
    };
    
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת מידע המערכת',
      message: error.message
    });
  }
});

// דשבורד מנהל - סקירה כללית
router.get('/dashboard', (req, res) => {
  try {
    console.log('Dashboard request received');
    console.log('Soldiers:', soldiers.length);
    
    // וידוא שכל החיילים מאותחלים נכון
    soldiers.forEach((soldier, index) => {
      console.log(`Soldier ${index}:`, {
        id: soldier.id,
        name: soldier.name,
        requests: soldier.requests,
        hasGetHighPriorityRequests: typeof soldier.getHighPriorityRequests === 'function'
      });
      
      if (!soldier.requests) soldier.requests = [];
      if (!soldier.scheduledDays) soldier.scheduledDays = [];
      if (!soldier.totalHomeDays) soldier.totalHomeDays = 0;
      if (!soldier.lastUpdate) soldier.lastUpdate = new Date();
    });

    const commandersCount = soldiers.filter(s => s.rank === 'מפקד').length;
    const regularSoldiersCount = soldiers.filter(s => s.rank === 'לא מפקד').length;

    // חישוב ימי בית מהשיבוץ הנוכחי
    let totalHomeDays = 0;
    if ((currentSchedule && currentSchedule.schedule) || (global.currentSchedule && global.currentSchedule.schedule)) {
      const scheduleToUse = currentSchedule || global.currentSchedule;
      Object.values(scheduleToUse.schedule).forEach(daySchedule => {
        totalHomeDays += daySchedule.home.length;
      });
    }

    const dashboardData = {
      totalSoldiers: soldiers.length,
      commandersCount: commandersCount,
      regularSoldiersCount: regularSoldiersCount,
      activeRequests: soldiers.reduce((sum, s) => sum + (s.requests ? s.requests.filter(r => r.status === 'pending').length : 0), 0),
      pendingConflicts: (currentSchedule && currentSchedule.conflicts ? currentSchedule.conflicts.length : 0) || 
                        (global.currentSchedule && global.currentSchedule.conflicts ? global.currentSchedule.conflicts.length : 0),
      totalRequests: soldiers.reduce((sum, s) => sum + (s.requests ? s.requests.length : 0), 0),
      averageHomeDays: soldiers.length > 0 ? totalHomeDays / soldiers.length : 0,
      totalHomeDays: totalHomeDays
    };

    console.log('Dashboard data created successfully');
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת נתוני הדשבורד',
      message: error.message
    });
  }
});

// קבלת השיבוץ הנוכחי לדשבורד
router.get('/current-schedule', (req, res) => {
  try {
    const scheduleToUse = currentSchedule || global.currentSchedule;
    
    if (!scheduleToUse) {
      return res.status(404).json({
        success: false,
        error: 'אין שיבוץ נוכחי'
      });
    }

    // חישוב סטטיסטיקות נוספות
    const scheduleStats = {
      totalDays: Object.keys(scheduleToUse.schedule).length,
      totalHomeDays: 0,
      averageHomeDaysPerDay: 0,
      daysWithMinSoldiers: 0,
      daysWithoutCommander: 0
    };

    Object.values(scheduleToUse.schedule).forEach(daySchedule => {
      scheduleStats.totalHomeDays += daySchedule.home.length;
      
      // בדיקה אם יש מספר מדויק של חיילים בבסיס
      if (daySchedule.base.length >= (currentConfiguration.soldiersInBase || 2)) {
        scheduleStats.daysWithMinSoldiers++;
      }
      
      // בדיקה אם יש מפקד בבסיס
      const hasCommander = daySchedule.base.some(soldierId => {
        const soldier = soldiers.find(s => s.id === soldierId);
        return soldier && soldier.rank === 'מפקד';
      });
      
      if (!hasCommander) {
        scheduleStats.daysWithoutCommander++;
      }
    });

    scheduleStats.averageHomeDaysPerDay = scheduleStats.totalHomeDays / scheduleStats.totalDays;

    res.json({
      success: true,
      data: {
        schedule: scheduleToUse.schedule,
        conflicts: scheduleToUse.conflicts,
        stats: scheduleToUse.stats,
        scheduleStats: scheduleStats,
        configuration: currentConfiguration.toJSON()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת השיבוץ הנוכחי',
      message: error.message
    });
  }
});

// סקירת כל החיילים עם סטטיסטיקות
router.get('/soldiers-overview', (req, res) => {
  try {
    const overview = soldiers.map(soldier => ({
      id: soldier.id,
      name: soldier.name,
      rank: soldier.rank,
      homeDays: soldier.totalHomeDays,
      totalHomeDaysHistory: soldier.totalHomeDaysHistory || 0,
      requestsCount: soldier.requests ? soldier.requests.length : 0,
      distanceFromBase: soldier.distanceFromBase || 0,
      stats: {
        lastUpdate: soldier.lastUpdate
      }
    }));

    res.json({
      success: true,
      data: overview,
      summary: {
        totalSoldiers: soldiers.length,
        commandersCount: soldiers.filter(s => s.rank === 'מפקד').length,
        regularSoldiersCount: soldiers.filter(s => s.rank === 'לא מפקד').length,
        totalRequests: soldiers.reduce((sum, s) => sum + (s.requests ? s.requests.length : 0), 0),
        averageHomeDays: soldiers.reduce((sum, s) => sum + (s.totalHomeDays || 0), 0) / soldiers.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת סקירת החיילים',
      message: error.message
    });
  }
});

// ניהול חיילי תורניות חירום
router.get('/emergency-reserve', (req, res) => {
  try {
    const emergencyReserve = soldiers.filter(s => s.isEmergencyReserve);
    const nonEmergencyReserve = soldiers.filter(s => !s.isEmergencyReserve);

    res.json({
      success: true,
      data: {
        emergencyReserve: emergencyReserve.map(s => ({
          id: s.id,
          name: s.name,
          rank: s.rank,
          distanceFromBase: s.distanceFromBase,
          totalRequests: s.requests ? s.requests.length : 0,
          scheduledDays: s.totalHomeDays || 0
        })),
        availableSoldiers: nonEmergencyReserve.map(s => ({
          id: s.id,
          name: s.name,
          rank: s.rank,
          distanceFromBase: s.distanceFromBase
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת נתוני תורניות חירום',
      message: error.message
    });
  }
});

// הוספת חייל לתורניות חירום
router.post('/emergency-reserve/:soldierId', (req, res) => {
  try {
    const soldierId = parseInt(req.params.soldierId);
    const soldier = soldiers.find(s => s.id === soldierId);

    if (!soldier) {
      return res.status(404).json({
        success: false,
        error: 'חייל לא נמצא'
      });
    }

    if (soldier.isEmergencyReserve) {
      return res.status(400).json({
        success: false,
        error: 'החייל כבר בתורניות חירום'
      });
    }

    soldier.isEmergencyReserve = true;
    currentConfiguration.addEmergencyReserve(soldierId);

    res.json({
      success: true,
      data: {
        id: soldier.id,
        name: soldier.name,
        isEmergencyReserve: soldier.isEmergencyReserve
      },
      message: 'חייל נוסף לתורניות חירום בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בהוספת חייל לתורניות חירום',
      message: error.message
    });
  }
});

// הסרת חייל מתורניות חירום
router.delete('/emergency-reserve/:soldierId', (req, res) => {
  try {
    const soldierId = parseInt(req.params.soldierId);
    const soldier = soldiers.find(s => s.id === soldierId);

    if (!soldier) {
      return res.status(404).json({
        success: false,
        error: 'חייל לא נמצא'
      });
    }

    if (!soldier.isEmergencyReserve) {
      return res.status(400).json({
        success: false,
        error: 'החייל לא בתורניות חירום'
      });
    }

    soldier.isEmergencyReserve = false;
    currentConfiguration.removeEmergencyReserve(soldierId);

    res.json({
      success: true,
      data: {
        id: soldier.id,
        name: soldier.name,
        isEmergencyReserve: soldier.isEmergencyReserve
      },
      message: 'חייל הוסר מתורניות חירום בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בהסרת חייל מתורניות חירום',
      message: error.message
    });
  }
});

// ניהול קונפליקטים
router.get('/conflicts', (req, res) => {
  try {
    if (!currentSchedule) {
      return res.json({
        success: true,
        data: {
          conflicts: [],
          summary: {
            total: 0,
            byType: {},
            byDate: {}
          }
        }
      });
    }

    const conflicts = currentSchedule.conflicts;
    const conflictsByType = {};
    const conflictsByDate = {};

    conflicts.forEach(conflict => {
      // סיווג לפי סוג
      const type = conflict.reason.split(':')[0];
      conflictsByType[type] = (conflictsByType[type] || 0) + 1;

      // סיווג לפי תאריך
      conflictsByDate[conflict.date] = (conflictsByDate[conflict.date] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        conflicts: conflicts,
        summary: {
          total: conflicts.length,
          byType: conflictsByType,
          byDate: conflictsByDate
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת נתוני הקונפליקטים',
      message: error.message
    });
  }
});

// פתרון קונפליקט ידני
router.post('/resolve-conflict', (req, res) => {
  try {
    const { conflictId, action, soldierId, newDate } = req.body;

    if (!currentSchedule) {
      return res.status(404).json({
        success: false,
        error: 'אין שיבוץ נוכחי'
      });
    }

    const conflict = currentSchedule.conflicts.find(c => c.id === conflictId);
    if (!conflict) {
      return res.status(404).json({
        success: false,
        error: 'קונפליקט לא נמצא'
      });
    }

    const soldier = soldiers.find(s => s.id === soldierId);
    if (!soldier) {
      return res.status(404).json({
        success: false,
        error: 'חייל לא נמצא'
      });
    }

    if (action === 'approve') {
      // אישור הבקשה - שיבוץ החייל ליום המבוקש
      const scheduler = new Scheduler(soldiers, currentConfiguration);
      scheduler.schedule = currentSchedule.schedule;
      scheduler.conflicts = currentSchedule.conflicts;
      scheduler.stats = currentSchedule.stats;

      const success = scheduler.assignSoldierToDate(soldierId, conflict.date, conflict.request);
      
      if (success) {
        // הסרת הקונפליקט
        currentSchedule.conflicts = currentSchedule.conflicts.filter(c => c.id !== conflictId);
        currentSchedule.schedule = scheduler.schedule;
        currentSchedule.stats = scheduler.stats;
      }

    } else if (action === 'reassign') {
      // שיבוץ מחדש ליום אחר
      if (!newDate) {
        return res.status(400).json({
          success: false,
          error: 'חובה לציין תאריך חדש'
        });
      }

      const scheduler = new Scheduler(soldiers, currentConfiguration);
      scheduler.schedule = currentSchedule.schedule;
      scheduler.conflicts = currentSchedule.conflicts;
      scheduler.stats = currentSchedule.stats;

      const success = scheduler.assignSoldierToDate(soldierId, newDate, conflict.request);
      
      if (success) {
        // הסרת הקונפליקט
        currentSchedule.conflicts = currentSchedule.conflicts.filter(c => c.id !== conflictId);
        currentSchedule.schedule = scheduler.schedule;
        currentSchedule.stats = scheduler.stats;
      }

    } else if (action === 'reject') {
      // דחיית הבקשה
      if (conflict.request) {
        conflict.request.status = 'rejected';
      }
      // הסרת הקונפליקט
      currentSchedule.conflicts = currentSchedule.conflicts.filter(c => c.id !== conflictId);
    }

    res.json({
      success: true,
      data: {
        schedule: currentSchedule.schedule,
        conflicts: currentSchedule.conflicts,
        stats: currentSchedule.stats
      },
      message: 'קונפליקט נפתר בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בפתרון הקונפליקט',
      message: error.message
    });
  }
});

// ניהול ימי ביקוש גבוה
router.get('/high-demand-days', (req, res) => {
  try {
    const highDemandDays = currentConfiguration.highDemandDays;
    const holidays = currentConfiguration.holidays;

    res.json({
      success: true,
      data: {
        highDemandDays: highDemandDays,
        holidays: holidays,
        total: highDemandDays.length + holidays.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת נתוני ימי ביקוש גבוה',
      message: error.message
    });
  }
});

// הוספת יום ביקוש גבוה
router.post('/high-demand-days', (req, res) => {
  try {
    const { date, reason } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'חובה לציין תאריך'
      });
    }

    currentConfiguration.addHighDemandDay(date, reason || '');

    res.json({
      success: true,
      data: currentConfiguration.highDemandDays,
      message: 'יום ביקוש גבוה נוסף בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בהוספת יום ביקוש גבוה',
      message: error.message
    });
  }
});

// הוספת חג
router.post('/holidays', (req, res) => {
  try {
    const { date, name } = req.body;

    if (!date || !name) {
      return res.status(400).json({
        success: false,
        error: 'חובה לציין תאריך ושם החג'
      });
    }

    currentConfiguration.addHoliday(date, name);

    res.json({
      success: true,
      data: currentConfiguration.holidays,
      message: 'חג נוסף בהצלחה'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בהוספת חג',
      message: error.message
    });
  }
});

// סטטיסטיקות מתקדמות
router.get('/advanced-stats', (req, res) => {
  try {
    if (!currentSchedule) {
      return res.status(404).json({
        success: false,
        error: 'אין שיבוץ לניתוח'
      });
    }

    const scheduler = new Scheduler(soldiers, currentConfiguration);
    scheduler.schedule = currentSchedule.schedule;
    scheduler.conflicts = currentSchedule.conflicts;
    scheduler.stats = currentSchedule.stats;

    const soldierStats = scheduler.calculateSoldierStats();
    
    // ניתוח הוגנות
    const homeDaysArray = soldierStats.map(s => s.homeDays);
    const minHomeDays = Math.min(...homeDaysArray);
    const maxHomeDays = Math.max(...homeDaysArray);
    const variance = scheduler.calculateVariance(homeDaysArray);

    // ניתוח ימי ביקוש גבוה
    const highDemandStats = Object.keys(currentSchedule.schedule).map(date => {
      const dateSchedule = currentSchedule.schedule[date];
      return {
        date: date,
        isHighDemand: currentConfiguration.isHighDemandDay(date),
        soldiersAtHome: dateSchedule.home.length,
        soldiersInBase: dateSchedule.base.length,
        conflicts: dateSchedule.conflicts.length
      };
    });

    const highDemandDays = highDemandStats.filter(stat => stat.isHighDemand);
    const regularDays = highDemandStats.filter(stat => !stat.isHighDemand);

    const advancedStats = {
      fairness: {
        minHomeDays: minHomeDays,
        maxHomeDays: maxHomeDays,
        variance: variance,
        fairnessScore: currentSchedule.stats.fairnessScore,
        distribution: homeDaysArray.sort((a, b) => a - b)
      },
      highDemandDays: {
        total: highDemandDays.length,
        averageSoldiersAtHome: highDemandDays.reduce((sum, day) => sum + day.soldiersAtHome, 0) / highDemandDays.length,
        averageSoldiersInBase: highDemandDays.reduce((sum, day) => sum + day.soldiersInBase, 0) / highDemandDays.length,
        totalConflicts: highDemandDays.reduce((sum, day) => sum + day.conflicts, 0)
      },
      regularDays: {
        total: regularDays.length,
        averageSoldiersAtHome: regularDays.reduce((sum, day) => sum + day.soldiersAtHome, 0) / regularDays.length,
        averageSoldiersInBase: regularDays.reduce((sum, day) => sum + day.soldiersInBase, 0) / regularDays.length,
        totalConflicts: regularDays.reduce((sum, day) => sum + day.conflicts, 0)
      },
      emergencyReserve: {
        total: soldiers.filter(s => s.isEmergencyReserve).length,
        averageHomeDays: soldiers.filter(s => s.isEmergencyReserve).reduce((sum, s) => sum + s.totalHomeDays, 0) / soldiers.filter(s => s.isEmergencyReserve).length
      }
    };

    res.json({
      success: true,
      data: advancedStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת הסטטיסטיקות המתקדמות',
      message: error.message
    });
  }
});

// ייצוא נתונים למנהל
router.get('/export/admin-report', (req, res) => {
  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.utils.book_new();

    // דף סקירה כללית
    const overviewData = [
      {
        'סטטיסטיקה': 'סה"כ חיילים',
        'ערך': soldiers.length
      },
      {
        'סטטיסטיקה': 'תורניות חירום',
        'ערך': soldiers.filter(s => s.isEmergencyReserve).length
      },
      {
        'סטטיסטיקה': 'סה"כ בקשות',
        'ערך': soldiers.reduce((sum, s) => sum + s.requests.length, 0)
      },
      {
        'סטטיסטיקה': 'בקשות חובה',
        'ערך': soldiers.reduce((sum, s) => sum + s.getHighPriorityRequests().length, 0)
      }
    ];

    if (currentSchedule) {
      overviewData.push(
        {
          'סטטיסטיקה': 'ימי שיבוץ',
          'ערך': Object.keys(currentSchedule.schedule).length
        },
        {
          'סטטיסטיקה': 'קונפליקטים',
          'ערך': currentSchedule.conflicts.length
        },
        {
          'סטטיסטיקה': 'ציון הוגנות',
          'ערך': currentSchedule.stats.fairnessScore
        }
      );
    }

    const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'סקירה כללית');

    // דף חיילים מפורט
    const soldiersData = soldiers.map(soldier => ({
      'מזהה': soldier.id,
      'שם': soldier.name,
      'דרגה': soldier.rank,
      'טלפון': soldier.phone,
      'אימייל': soldier.email,
      'מרחק מהבסיס': soldier.distanceFromBase,
      'תורניות חירום': soldier.isEmergencyReserve ? 'כן' : 'לא',
      'סה"כ בקשות': soldier.requests.length,
      'בקשות חובה': soldier.getHighPriorityRequests().length,
      'בקשות מאושרות': soldier.requests.filter(r => r.status === 'approved').length,
      'בקשות ממתינות': soldier.requests.filter(r => r.status === 'pending').length,
      'ימים משובצים': soldier.totalHomeDays,
      'עדכון אחרון': soldier.lastUpdate
    }));

    const soldiersSheet = XLSX.utils.json_to_sheet(soldiersData);
    XLSX.utils.book_append_sheet(workbook, soldiersSheet, 'חיילים מפורט');

    // דף קונפליקטים
    if (currentSchedule && currentSchedule.conflicts.length > 0) {
      const conflictsData = currentSchedule.conflicts.map(conflict => ({
        'תאריך': conflict.date,
        'מזהה חייל': conflict.soldierId || 'N/A',
        'סיבה': conflict.reason,
        'זמן יצירה': conflict.timestamp
      }));

      const conflictsSheet = XLSX.utils.json_to_sheet(conflictsData);
      XLSX.utils.book_append_sheet(workbook, conflictsSheet, 'קונפליקטים');
    }

    const fileName = `admin_report_${new Date().toISOString().split('T')[0]}.xlsx`;
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
      error: 'שגיאה בייצוא דוח המנהל',
      message: error.message
    });
  }
});

const readData = (fileName) => {
    const filePath = path.join(__dirname, '..', 'data', fileName);
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        try {
            return JSON.parse(fileContent);
        } catch (e) {
            console.error(`Error parsing JSON from ${fileName}:`, e);
            return null;
        }
    }
    return null;
};

router.get('/export/excel', async (req, res) => {
  try {
    const scheduleData = readData('schedule.json');
    if (!scheduleData || !scheduleData.schedule) {
      return res.status(404).send('Schedule data not found or is empty.');
    }

    const soldiersData = readData('soldiers.json');
    if (!soldiersData) {
      return res.status(404).send('Soldiers data not found.');
    }

    const config = Configuration.get();
    const startDate = new Date(config.startDate);
    const endDate = new Date(config.endDate);

    // 1. Sort soldiers: commanders first, then by name
    const sortedSoldiers = [...soldiersData].sort((a, b) => {
      if (a.rank === 'מפקד' && b.rank !== 'מפקד') return -1;
      if (a.rank !== 'מפקד' && b.rank === 'מפקד') return 1;
      return a.name.localeCompare(b.name, 'he');
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('שיבוץ');
    
    // Set worksheet to right-to-left
    worksheet.views = [
      { rightToLeft: true }
    ];

    // 2. Create header row
    const header = ['שם החייל', 'דרגה'];
    const dates = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split('T')[0];
      dates.push(dateString);
      header.push(dateString);
    }
    header.push('סה"כ ימי בית');
    header.push('סה"כ ימי בסיס');
    worksheet.addRow(header);

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: 'center' };
    worksheet.getRow(1).eachCell(cell => {
        cell.fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FFD3D3D3'}
        };
        cell.border = {
            top: {style:'thin'},
            left: {style:'thin'},
            bottom: {style:'thin'},
            right: {style:'thin'}
        };
    });


    // 3. Populate data for each soldier
    sortedSoldiers.forEach(soldier => {
      const row = [soldier.name, soldier.rank];
      let homeDays = 0;
      let baseDays = 0;

      dates.forEach(date => {
        const daySchedule = scheduleData.schedule[date];
        if (daySchedule) {
          if (daySchedule.base.includes(soldier.id)) {
            row.push(1);
            baseDays++;
          } else if (daySchedule.home.includes(soldier.id)) {
            row.push(0);
            homeDays++;
          } else {
            row.push(''); // Soldier not scheduled for this day
          }
        } else {
          row.push(''); // Date not in schedule
        }
      });

      row.push(homeDays);
      row.push(baseDays);
      const addedRow = worksheet.addRow(row);
      
      // Style data rows
      addedRow.eachCell(cell => {
        cell.alignment = { horizontal: 'center' };
        cell.border = {
            top: {style:'thin'},
            left: {style:'thin'},
            bottom: {style:'thin'},
            right: {style:'thin'}
        };
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
            let columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = maxLength < 12 ? 12 : maxLength;
    });
    
    worksheet.getColumn(1).width = 20; // Soldier name
    worksheet.getColumn(2).width = 15; // Rank


    // Prepare response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="schedule_export.xlsx"');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Failed to export schedule to Excel:', error);
    res.status(500).send('Error exporting to Excel');
  }
});

router.get('/export/text', async (req, res) => {
  try {
    const schedule = readData('schedule.json');
    const soldiersData = readData('soldiers.json');

    if (!schedule || !soldiersData) {
      return res.status(404).send('Schedule or soldiers data not found.');
    }

    const dates = Object.keys(schedule).sort();
    let textOutput = 'שיבוץ יציאות:\n\n';
    
    soldiersData.forEach(soldier => {
      textOutput += `==== ${soldier.name} ====\n`;
      let homeDaysCount = 0;
      dates.forEach(date => {
        const day = schedule[date];
         if (day && day.soldiersAtHome && day.soldiersAtHome.some(s => s.id === soldier.id)) {
          textOutput += `  ${date}: בית\n`;
          homeDaysCount++;
        }
      });
      textOutput += `\nסך הכל ימי בית בתקופה: ${homeDaysCount}\n\n`;
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `schedule-${new Date().toISOString().split('T')[0]}.txt`
    );
    res.send(textOutput);

  } catch (error) {
    console.error('Error exporting to Text:', error);
    res.status(500).send('Error exporting to Text');
  }
});

router.post('/import/excel', upload.single('scheduleFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const soldiersFilePath = path.join(__dirname, '..', 'data', 'soldiers.json');
    const soldiers = readData('soldiers.json');
    if (!soldiers) {
      return res.status(500).send('Could not read soldiers data.');
    }
    
    const soldierMap = soldiers.reduce((map, s) => {
      map[s.name] = s;
      return map;
    }, {});

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return res.status(400).send('No worksheet found in the Excel file.');
    }

    const headerRow = worksheet.getRow(1).values;
    const dates = Array.isArray(headerRow) ? headerRow.slice(1) : [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const rowValues = row.values;
      const soldierName = Array.isArray(rowValues) && rowValues.length > 1 ? rowValues[1] : null;
      const soldier = soldierName ? soldierMap[soldierName] : null;

      if (soldier) {
        if (!soldier.history) {
          soldier.history = [];
        }

        dates.forEach((date, index) => {
          if (date) {
            const status = Array.isArray(rowValues) && rowValues.length > index + 1 ? rowValues[index + 2] : null;
            if (status === 'בית') {
              const isoDate = new Date(date).toISOString().split('T')[0];
              if (!soldier.history.some(h => h.date === isoDate)) {
                soldier.history.push({
                  date: isoDate,
                  type: 'home'
                });
              }
            } 
          }
        });
      }
    });
    
    fs.writeFileSync(soldiersFilePath, JSON.stringify(soldiers, null, 2), 'utf8');

    res.status(200).json({ success: true, message: 'Schedule imported and soldier history updated successfully.' });

  } catch (error) {
    console.error('Error importing from Excel:', error);
    res.status(500).json({ success: false, message: 'Error importing from Excel: ' + error.message });
  }
});

module.exports = router;