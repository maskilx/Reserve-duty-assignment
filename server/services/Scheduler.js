const moment = require('moment');

class Scheduler {
  constructor(soldiers, configuration) {
    this.soldiers = soldiers;
    this.config = configuration;
    this.schedule = {}; // { date: { home: [soldierIds], base: [soldierIds] } }
    this.conflicts = [];
    this.stats = {
      totalDays: 0,
      averageHomeDays: 0,
      fairnessScore: 0,
      conflictsResolved: 0
    };
  }

  generateSchedule() {
    try {
      // בדיקת תקינות לפני יצירת השיבוץ
      const preValidationErrors = this.preValidateConfiguration();
      if (preValidationErrors.length > 0) {
        return {
          schedule: {},
          conflicts: [],
          stats: this.stats,
          validationErrors: preValidationErrors,
          success: false
        };
      }

      // אתחול השיבוץ
      this.initializeSchedule();
      
      // חישוב ימי בית לכל חייל
      this.calculateHomeDaysForEachSoldier();
      
      // בדיקת תקינות
      const validationErrors = this.validateSchedule();
      if (validationErrors.length > 0) {
        console.warn('שגיאות תקינות בשיבוץ:', validationErrors);
      }
      
      // חישוב סטטיסטיקות
      const stats = this.calculateStats();
      
      return {
        schedule: this.schedule,
        conflicts: this.conflicts,
        stats: stats,
        validationErrors: validationErrors,
        success: true
      };
    } catch (error) {
      console.error('שגיאה ביצירת השיבוץ:', error);
      throw error;
    }
  }

  preValidateConfiguration() {
    const errors = [];
    
    // בדיקה שיש מספיק חיילים למספר המדויק בבסיס
    if (this.soldiers.length < this.config.soldiersInBase) {
      errors.push(`אין מספיק חיילים במערכת. נדרשים לפחות ${this.config.soldiersInBase} חיילים, יש ${this.soldiers.length}`);
    }
    
    // בדיקה שיש מפקדים
    const commanders = this.soldiers.filter(s => s.rank === 'מפקד');
    if (commanders.length === 0) {
      errors.push('אין מפקדים במערכת. נדרש לפחות מפקד אחד');
    }
    
    // בדיקה שהתאריכים תקינים
    const startDate = moment(this.config.startDate);
    const endDate = moment(this.config.endDate);
    if (!startDate.isValid() || !endDate.isValid()) {
      errors.push('תאריכי התחלה או סיום לא תקינים');
    }
    
    if (startDate.isAfter(endDate)) {
      errors.push('תאריך התחלה צריך להיות לפני תאריך סיום');
    }
    
    // בדיקה שהפרמטרים הגיוניים
    if (this.config.maxConsecutiveDaysInOneTrip <= 0) {
      errors.push('מקסימום ימים ביציאה אחת צריך להיות גדול מ-0');
    }
    
    if (this.config.minConsecutiveDays <= 0) {
      errors.push('מינימום ימים רצופים צריך להיות גדול מ-0');
    }
    
    if (this.config.soldiersInBase <= 0) {
      errors.push('מספר חיילים בבסיס צריך להיות גדול מ-0');
    }
    
    // בדיקה שיש מספיק ימים לשיבוץ
    const totalDays = endDate.diff(startDate, 'days') + 1;
    if (totalDays < this.config.minConsecutiveDays) {
      errors.push(`תקופת השיבוץ קצרה מדי. נדרשים לפחות ${this.config.minConsecutiveDays} ימים, יש ${totalDays} ימים`);
    }
    
    return errors;
  }

  initializeSchedule() {
    const currentDate = moment(this.config.startDate);
    const endDate = moment(this.config.endDate);
    
    while (currentDate.isSameOrBefore(endDate)) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      this.schedule[dateStr] = {
        home: [],
        base: [],
        conflicts: []
      };
      currentDate.add(1, 'day');
    }
  }

  calculateHomeDaysForEachSoldier() {
    const dates = Object.keys(this.schedule).sort();
    const numSoldiers = this.soldiers.length;
    const soldiersInBase = this.config.soldiersInBase;
    const maxHomePerDay = numSoldiers - soldiersInBase;
    const maxConsecutive = this.config.maxConsecutiveDaysInOneTrip;

    // Reset soldier stats for the new schedule run
    this.soldiers.forEach(s => {
      s.totalHomeDays = 0;
      s.scheduledDays = [];
      s.currentHomeStreak = 0;
    });

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const prevDate = i > 0 ? dates[i - 1] : null;

      // 1. Identify soldiers who CANNOT go home today
      const unavailableForHomeIds = new Set();
      if (prevDate) {
        this.soldiers.forEach(s => {
          const wasHomeYesterday = this.schedule[prevDate].home.includes(s.id);
          // if soldier was home yesterday and their streak reached the max, they can't go home today
          if (wasHomeYesterday && s.currentHomeStreak >= maxConsecutive) {
            unavailableForHomeIds.add(s.id);
          }
        });
      }

      // 2. Get all available candidates for home
      let homeCandidates = this.soldiers.filter(s => !unavailableForHomeIds.has(s.id));

      // Sort candidates by fairness (least total home days)
      homeCandidates.sort((a, b) => {
        const aTotalHomeDays = (a.totalHomeDays + (a.totalHomeDaysHistory || 0));
        const bTotalHomeDays = (b.totalHomeDays + (b.totalHomeDaysHistory || 0));
        return aTotalHomeDays - bTotalHomeDays;
      });

      // Ensure we have enough candidates to fill home slots
      if (homeCandidates.length < maxHomePerDay) {
        throw new Error(`יום ${date}: לא ניתן לשבץ ${maxHomePerDay} חיילים לבית, יש רק ${homeCandidates.length} מועמדים בהתאם למגבלת רצף של ${maxConsecutive} ימים.`);
      }

      // 3. Select soldiers to be home today
      let homeTodaySoldiers = homeCandidates.slice(0, maxHomePerDay);
      let homeTodayIds = new Set(homeTodaySoldiers.map(s => s.id));

      // 4. Everyone else is tentatively in the base
      let baseTodaySoldiers = this.soldiers.filter(s => !homeTodayIds.has(s.id));

      // 5. Ensure there's a commander in the base
      let commandersInBase = baseTodaySoldiers.filter(s => s.rank === 'מפקד');
      if (commandersInBase.length === 0 && baseTodaySoldiers.length > 0) {
        // Find a commander at home to swap
        const commanderToSwap = homeTodaySoldiers
            .filter(s => s.rank === 'מפקד')
            .sort((a, b) => ((b.totalHomeDays + (b.totalHomeDaysHistory || 0)) - (a.totalHomeDays + (a.totalHomeDaysHistory || 0))))[0];

        if (commanderToSwap) {
          // Find a non-commander at base to swap with
           const soldierToSwap = baseTodaySoldiers
            .filter(s => s.rank !== 'מפקד')
            .sort((a, b) => ((a.totalHomeDays + (a.totalHomeDaysHistory || 0)) - (b.totalHomeDays + (b.totalHomeDaysHistory || 0))))[0];

            if (soldierToSwap) {
                // Perform swap
                homeTodayIds.delete(commanderToSwap.id);
                homeTodayIds.add(soldierToSwap.id);
            }
        }
      }
      
      // Finalize home and base for the day
      this.schedule[date].home = Array.from(homeTodayIds);
      this.schedule[date].base = this.soldiers.map(s => s.id).filter(id => !homeTodayIds.has(id));

      // 6. Update stats for all soldiers
      this.soldiers.forEach(s => {
        const isHomeToday = homeTodayIds.has(s.id);
        if (isHomeToday) {
          s.totalHomeDays++;
          s.scheduledDays.push(date);
          s.currentHomeStreak++;
        } else {
          s.currentHomeStreak = 0;
        }
      });
    }
  }

  validateSchedule() {
    const errors = [];
    const minConsecutive = this.config.minConsecutiveDays;

    for (const [date, dailySchedule] of Object.entries(this.schedule)) {
      // Check for correct number of soldiers in base
       if (dailySchedule.base.length !== this.config.soldiersInBase) {
        errors.push(`יום ${date}: מספר החיילים בבסיס אינו תקין. יש ${dailySchedule.base.length} במקום ${this.config.soldiersInBase}. הסיבה האפשרית היא שמגבלת הרצף מונעת מיותר מדי חיילים לצאת.`);
      }

      // Check for commander in base
      const commandersInBase = dailySchedule.base.filter(id => this.soldiers.find(s => s.id === id && s.rank === 'מפקד'));
      if (commandersInBase.length === 0 && dailySchedule.base.length > 0) {
        errors.push(`יום ${date}: אין מפקד בבסיס.`);
      }
    }

    // Check for minimum consecutive days for each soldier
    this.soldiers.forEach(soldier => {
        if (!soldier.scheduledDays || soldier.scheduledDays.length === 0) return;

        const homeDays = soldier.scheduledDays.sort();
        let longestStreak = 0;
        let currentStreak = 0;

        if (homeDays.length > 0) {
            currentStreak = 1;
            longestStreak = 1;
        }

        for(let i = 1; i < homeDays.length; i++) {
            const day1 = moment(homeDays[i-1]);
            const day2 = moment(homeDays[i]);
            if (day2.diff(day1, 'days') === 1) {
                currentStreak++;
            } else {
                longestStreak = Math.max(longestStreak, currentStreak);
                currentStreak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, currentStreak);
        
        // A soldier should have at least one streak of minConsecutive days IF they went home at all
        if (soldier.scheduledDays.length > 0 && soldier.scheduledDays.length >= minConsecutive && longestStreak < minConsecutive) {
             errors.push(`חייל ${soldier.name}: אין רצף של ${minConsecutive} ימים רצופים (הרצף הארוך ביותר: ${longestStreak})`);
        }
    });

    return errors;
  }

  addConflict(date, soldierId, reason, request = null) {
    this.conflicts.push({
      date: date,
      soldierId: soldierId,
      reason: reason,
      request: request,
      timestamp: new Date()
    });

    if (this.schedule[date]) {
      this.schedule[date].conflicts.push({
        soldierId: soldierId,
        reason: reason
      });
    }
  }

  getSoldierHomeDays(soldierId) {
    const soldier = this.soldiers.find(s => s.id === soldierId);
    return soldier ? soldier.totalHomeDays : 0;
  }

  getSoldierStats() {
    return this.soldiers.map(soldier => ({
      soldierId: soldier.id,
      name: soldier.name,
      homeDays: soldier.totalHomeDays,
      totalHomeDaysHistory: soldier.totalHomeDaysHistory || 0,
      totalHomeDaysCombined: soldier.totalHomeDays + (soldier.totalHomeDaysHistory || 0),
      requestedDays: soldier.getTotalRequestedDays(),
      highPriorityRequests: soldier.getHighPriorityRequests().length,
      isEmergencyReserve: soldier.isEmergencyReserve
    }));
  }

  calculateStats() {
    const soldierStats = this.getSoldierStats();
    
    this.stats.totalDays = Object.keys(this.schedule).length;
    this.stats.averageHomeDays = soldierStats.reduce((sum, stat) => sum + stat.homeDays, 0) / soldierStats.length;
    
    // חישוב ציון הוגנות משופר - כולל היסטוריה
    const combinedHomeDaysArray = soldierStats.map(stat => stat.totalHomeDaysCombined);
    const variance = this.calculateVariance(combinedHomeDaysArray);
    const maxPossibleVariance = Math.pow(this.stats.totalDays, 2) / 4; // המקסימום האפשרי
    const normalizedVariance = variance / maxPossibleVariance;
    this.stats.fairnessScore = Math.max(0, Math.round(100 - (normalizedVariance * 100))); // ציון 0-100
    
    this.stats.conflictsResolved = this.conflicts.length;

    return this.stats;
  }

  calculateVariance(numbers) {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  exportToExcel() {
    // יצירת קובץ Excel עם כל הנתונים
    const XLSX = require('xlsx');
    
    const workbook = XLSX.utils.book_new();
    
    // 1. טבלת שיבוץ מדויקת - תאריכים למעלה, חיילים בצד שמאל
    const dates = Object.keys(this.schedule).sort();
    const soldiersData = this.soldiers.map(soldier => {
      const row = {
        'מזהה': soldier.id,
        'שם': soldier.name,
        'דרגה': soldier.rank
      };
      
      // הוספת עמודה לכל תאריך
      dates.forEach(date => {
        const isInBase = this.schedule[date].base.includes(soldier.id);
        row[date] = isInBase ? 1 : 0;
      });
      
      // חישוב סך ימים בבסיס
      const totalDaysInBase = dates.reduce((sum, date) => {
        return sum + (this.schedule[date].base.includes(soldier.id) ? 1 : 0);
      }, 0);
      
      row['סך ימים בבסיס'] = totalDaysInBase;
      row['סך ימי יציאה'] = soldier.totalHomeDays;
      row['היסטוריית ימי יציאה'] = soldier.totalHomeDaysHistory || 0;
      row['סך כולל ימי יציאה'] = soldier.totalHomeDays + (soldier.totalHomeDaysHistory || 0);
      
      return row;
    });
    
    const scheduleSheet = XLSX.utils.json_to_sheet(soldiersData);
    
    // הגדרת רוחב עמודות
    const columnWidths = [
      { wch: 8 },  // מזהה
      { wch: 15 }, // שם
      { wch: 10 }, // דרגה
    ];
    
    // הוספת רוחב לעמודות התאריכים
    dates.forEach(() => {
      columnWidths.push({ wch: 6 });
    });
    
    // רוחב לעמודות הסכומים
    columnWidths.push({ wch: 15 }); // סך ימים בבסיס
    columnWidths.push({ wch: 15 }); // סך ימי יציאה
    columnWidths.push({ wch: 20 }); // היסטוריית ימי יציאה
    columnWidths.push({ wch: 20 }); // סך כולל ימי יציאה
    
    scheduleSheet['!cols'] = columnWidths;
    
    XLSX.utils.book_append_sheet(workbook, scheduleSheet, 'שיבוץ מדויק');
    
    // 2. טבלת בקשות יציאה
    const requestsData = [];
    this.soldiers.forEach(soldier => {
      if (soldier.requests && soldier.requests.length > 0) {
        soldier.requests.forEach(request => {
          requestsData.push({
            'מזהה חייל': soldier.id,
            'שם חייל': soldier.name,
            'תאריך בקשה': request.date,
            'עדיפות': request.priority,
            'סיבה': request.reason,
            'סטטוס': request.status
          });
        });
      } else {
        // חייל ללא בקשות
        requestsData.push({
          'מזהה חייל': soldier.id,
          'שם חייל': soldier.name,
          'תאריך בקשה': '',
          'עדיפות': '',
          'סיבה': 'אין בקשות',
          'סטטוס': ''
        });
      }
    });
    
    const requestsSheet = XLSX.utils.json_to_sheet(requestsData);
    XLSX.utils.book_append_sheet(workbook, requestsSheet, 'בקשות יציאה');
    
    // 3. סיכום יומי
    const dailySummary = dates.map(date => {
      const dateSchedule = this.schedule[date];
      const homeSoldiers = dateSchedule.home.map(id => {
        const soldier = this.soldiers.find(s => s.id === id);
        return soldier ? soldier.name : `חייל ${id}`;
      }).join(', ');
      
      const baseSoldiers = dateSchedule.base.map(id => {
        const soldier = this.soldiers.find(s => s.id === id);
        return soldier ? soldier.name : `חייל ${id}`;
      }).join(', ');
      
      return {
        'תאריך': date,
        'יוצאים הביתה': homeSoldiers || 'אין',
        'נשארים בבסיס': baseSoldiers || 'אין',
        'מספר בבסיס': dateSchedule.base.length,
        'מספר בבית': dateSchedule.home.length,
        'קונפליקטים': dateSchedule.conflicts.length > 0 ? 'כן' : 'לא'
      };
    });
    
    const summarySheet = XLSX.utils.json_to_sheet(dailySummary);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'סיכום יומי');
    
    // 4. סטטיסטיקות חיילים
    const statsData = this.soldiers.map(soldier => {
      const totalDaysInBase = dates.reduce((sum, date) => {
        return sum + (this.schedule[date].base.includes(soldier.id) ? 1 : 0);
      }, 0);
      
      return {
        'מזהה': soldier.id,
        'שם': soldier.name,
        'דרגה': soldier.rank,
        'טלפון': soldier.phone,
        'אימייל': soldier.email,
        'מרחק מהבסיס': soldier.distanceFromBase,
        'תורניות חירום': soldier.isEmergencyReserve ? 'כן' : 'לא',
        'בקשות יציאה': soldier.requests ? soldier.requests.length : 0,
        'ימי יציאה (נוכחי)': soldier.totalHomeDays,
        'ימי יציאה (היסטוריה)': soldier.totalHomeDaysHistory || 0,
        'ימי יציאה (כולל)': soldier.totalHomeDays + (soldier.totalHomeDaysHistory || 0),
        'ימי בבסיס': totalDaysInBase,
        'אחוז יציאה': soldier.totalHomeDays > 0 ? 
          Math.round((soldier.totalHomeDays / dates.length) * 100) + '%' : '0%'
      };
    });
    
    const statsSheet = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, statsSheet, 'סטטיסטיקות חיילים');
    
    return workbook;
  }

  exportToTXT() {
    let output = 'לוח שיבוץ ימי יציאה מהבסיס\n';
    output += '================================\n\n';
    
    Object.keys(this.schedule).forEach(date => {
      const dateSchedule = this.schedule[date];
      const homeSoldiers = dateSchedule.home.map(id => {
        const soldier = this.soldiers.find(s => s.id === id);
        return soldier ? soldier.name : `חייל ${id}`;
      });
      
      output += `תאריך: ${date}\n`;
      output += `יוצאים הביתה: ${homeSoldiers.length > 0 ? homeSoldiers.join(', ') : 'אין'}\n`;
      output += `נשארים בבסיס: ${dateSchedule.base.length} חיילים\n`;
      
      if (dateSchedule.conflicts.length > 0) {
        output += `⚠️  קונפליקטים: ${dateSchedule.conflicts.length}\n`;
      }
      output += '\n';
    });
    
    return output;
  }
}

module.exports = Scheduler; 