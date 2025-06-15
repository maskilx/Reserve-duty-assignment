const path = require('path');
const soldiersData = require('../soldiersData');
const XLSX = require('xlsx');

class Scheduler {
  constructor(soldiers, config) {
    // בדיקה ותיקון של החיילים
    if (soldiers && Array.isArray(soldiers) && soldiers.length > 0) {
      this.soldiers = soldiers
        .filter(s => s && typeof s === 'object')
        .map(s => ({ ...s }));
    } else {
      if (!soldiersData || !Array.isArray(soldiersData)) {
        console.error('soldiersData is not valid:', soldiersData);
        throw new Error('Soldiers data is not available');
      }
      this.soldiers = soldiersData.map(s => ({ ...s }));
    }
    
    this.schedule = {};
    const defaultConfig = {
      soldiersInBase: 7,
      minConsecutiveDays: 3,
      maxConsecutiveDaysInOneTrip: 7,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    this.config = { ...defaultConfig, ...(config || {}) };
  }

  // אלגוריתם חדש ופשוט
  generateSchedule() {
    console.log('Starting new FAIR algorithm');
    // בדיקת תקינות חיילים
    let valid = true;
    this.soldiers.forEach((s, i) => {
      if (!s || typeof s !== 'object' || !s.id || !s.name || !s.rank) {
        console.error(`חייל לא תקין במיקום ${i}:`, s);
        valid = false;
      }
    });
    if (!valid) throw new Error('רשימת החיילים מכילה חיילים לא תקינים!');

    // עיבוד היסטוריה מיובאת
    this.processSoldierHistory();

    // בדיקת תקינות קונפיגורציה
    const numericFields = ['soldiersInBase', 'minConsecutiveDays', 'maxConsecutiveDaysInOneTrip'];
    numericFields.forEach(field => {
      if (typeof this.config[field] !== 'number') {
        const num = parseInt(this.config[field]);
        if (!isNaN(num)) {
          this.config[field] = num;
        } else {
          console.error(`ערך לא תקין בקונפיגורציה: ${field} =`, this.config[field]);
          valid = false;
        }
      }
    });
    if (!this.config.startDate || !this.config.endDate) {
      console.error('חסרים startDate או endDate בקונפיגורציה');
      valid = false;
    }
    if (!valid) throw new Error('הקונפיגורציה לא תקינה!');

    // המשך קוד קיים
    console.log('--- Soldiers List ---');
    this.soldiers.forEach(s => console.log(JSON.stringify(s)));
    console.log('--- Config ---');
    console.log(JSON.stringify(this.config));
    
    // טעינת חיילים (רק אם לא הועברו בקונסטרקטור)
    if (!this.soldiers || this.soldiers.length === 0) {
      this.loadSoldiers();
    }
    
    // יצירת לוח זמנים ריק
    this.initializeSchedule();
    
    // חישוב מספר ימי הבית הרצוי לכל חייל
    this.calculateTargetHomeDays();
    
    // שיבוץ מאוזן לפי מספר ימי הבית הרצוי
    this.assignHomeDaysFairly();
    
    // תיקון מספר חיילים בבסיס
    this.fixBaseCount();
    
    // חישוב סטטיסטיקות
    const stats = this.calculateStats();
    const validationResult = this.validateSchedule(this.schedule, this.config);
    
    // בניית אובייקט schedule בפורמט שהשרת מצפה לו
    const schedule = {};
    if (this.schedule && typeof this.schedule === 'object') {
      Object.entries(this.schedule).forEach(([date, day]) => {
        if (day && day.soldiersInBase && day.soldiersAtHome) {
          schedule[date] = {
            base: day.soldiersInBase,
            home: day.soldiersAtHome
          };
        }
      });
    } else {
      console.error('this.schedule is not valid:', this.schedule);
      throw new Error('Schedule is not initialized properly');
    }
    
    return {
      success: validationResult.isValid,
      schedule,
      stats,
      conflicts: validationResult,
      soldierStats: this.calculateSoldierStats()
    };
  }

  processSoldierHistory() {
    const today = new Date();
    console.log('Processing soldier history...');
    this.soldiers.forEach(soldier => {
        // Initialize stats if they don't exist
        if (!soldier.totalHomeDays) soldier.totalHomeDays = 0;
        if (!soldier.daysSinceLastLeave) soldier.daysSinceLastLeave = 999;

        if (soldier.history && Array.isArray(soldier.history)) {
            console.log(`Processing history for ${soldier.name}: ${soldier.history.length} entries.`);
            let lastLeaveDate = null;
            
            soldier.history.forEach(entry => {
                if (entry.type === 'home') {
                    // This logic assumes we are adding history to a baseline,
                    // so we increment totalHomeDays.
                    soldier.totalHomeDays++; 
                    
                    const leaveDate = new Date(entry.date);
                    if (!lastLeaveDate || leaveDate > lastLeaveDate) {
                        lastLeaveDate = leaveDate;
                    }
                }
            });
            
            if (lastLeaveDate) {
                 const timeDiff = today.getTime() - lastLeaveDate.getTime();
                 soldier.daysSinceLastLeave = Math.floor(timeDiff / (1000 * 3600 * 24));
            }
            console.log(`- After history: ${soldier.name}, totalHomeDays: ${soldier.totalHomeDays}, daysSinceLastLeave: ${soldier.daysSinceLastLeave}`);
            
            // It's better to keep the history for auditing, so we won't delete it.
        }
    });
    console.log('Finished processing soldier history.');
  }

  loadSoldiers() {
    if (!this.soldiers || this.soldiers.length === 0) {
      if (!soldiersData || !Array.isArray(soldiersData)) {
        console.error('soldiersData is not valid in loadSoldiers:', soldiersData);
        throw new Error('Soldiers data is not available');
      }
      this.soldiers = soldiersData.map(s => Object.assign({}, s));
      console.log(`Loaded ${this.soldiers.length} soldiers from soldiersData.js`);
    }
  }

  initializeSchedule() {
    if (!this.config.startDate || !this.config.endDate) {
      console.error('startDate או endDate לא מאותחלים! config:', this.config);
      throw new Error('startDate או endDate לא מאותחלים בקונפיגורציה');
    }
    
    if (!this.soldiers || !Array.isArray(this.soldiers) || this.soldiers.length === 0) {
      console.error('this.soldiers is not valid in initializeSchedule:', this.soldiers);
      throw new Error('Soldiers list is not initialized properly');
    }
    
    this.schedule = {};
    const startDate = new Date(this.config.startDate);
    const endDate = new Date(this.config.endDate);
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      this.schedule[dateStr] = {
        soldiersInBase: this.soldiers.map(s => s.id),
        soldiersAtHome: []
      };
    }
    
    // איפוס scheduledDays לכל חייל
    this.soldiers.forEach(soldier => {
      soldier.scheduledDays = [];
    });
  }

  calculateTargetHomeDays() {
    const dates = Object.keys(this.schedule).sort();
    const totalDays = dates.length;
    const totalSoldiers = this.soldiers.length;
    const soldiersInBase = parseInt(this.config.soldiersInBase, 10);

    if (totalSoldiers === 0 || isNaN(soldiersInBase)) {
      return;
    }

    const totalHomeSlots = totalDays * (totalSoldiers - soldiersInBase);

    // Calculate fairness weights based on history
    const totalHistory = this.soldiers.reduce((sum, s) => sum + (s.totalHomeDaysHistory || 0), 0);
    const averageHistory = totalHistory / totalSoldiers;

    let totalWeight = 0;
    this.soldiers.forEach(s => {
      const history = s.totalHomeDaysHistory || 0;
      // Inverse weight: soldiers with fewer past days get a higher weight
      s.fairnessWeight = averageHistory - history + 1; // +1 to avoid zero or negative weights
      if (s.fairnessWeight <= 0) s.fairnessWeight = 1;
      totalWeight += s.fairnessWeight;
    });

    // Distribute home days based on weight
    this.soldiers.forEach(soldier => {
      const share = soldier.fairnessWeight / totalWeight;
      soldier.targetHomeDays = Math.round(share * totalHomeSlots);
      soldier.currentHomeDays = 0;
      soldier.scheduledDays = [];
    });

    // Adjust to match totalHomeSlots exactly
    let distributedDays = this.soldiers.reduce((sum, s) => sum + s.targetHomeDays, 0);
    let diff = totalHomeSlots - distributedDays;

    this.soldiers.sort((a, b) => b.fairnessWeight - a.fairnessWeight);

    while (diff !== 0) {
      for (const soldier of this.soldiers) {
        if (diff === 0) break;
        if (diff > 0) {
          soldier.targetHomeDays++;
          diff--;
        } else {
          if (soldier.targetHomeDays > 0) {
            soldier.targetHomeDays--;
            diff++;
          }
        }
      }
    }
  }

  assignHomeDaysFairly() {
    if (!this.schedule || typeof this.schedule !== 'object') {
      console.error('this.schedule is not valid in assignHomeDaysFairly:', this.schedule);
      return;
    }
    
    const dates = Object.keys(this.schedule).sort();
    
    // מיון חיילים לפי מספר ימי הבית הנוכחי (פחות = קודם)
    const getSoldiersByPriority = () => {
      return [...this.soldiers]
        .filter(soldier => soldier.currentHomeDays < soldier.targetHomeDays)
        .sort((a, b) => {
          // Priority for requests
          const aRequest = a.requests.find(r => r.date === date && r.status !== 'rejected');
          const bRequest = b.requests.find(r => r.date === date && r.status !== 'rejected');

          if (aRequest && !bRequest) return -1;
          if (!aRequest && bRequest) return 1;
          if (aRequest && bRequest) {
            if (aRequest.priority === 'חובה' && bRequest.priority !== 'חובה') return -1;
            if (aRequest.priority !== 'חובה' && bRequest.priority === 'חובה') return 1;
            if (aRequest.priority === 'מועדף' && bRequest.priority !== 'מועדף') return -1;
            if (aRequest.priority !== 'מועדף' && bRequest.priority === 'מועדף') return 1;
          }

          // קודם מפקדים עם פחות ימי בית
          if (a.rank === 'מפקד' && b.rank !== 'מפקד') return -1;
          if (a.rank !== 'מפקד' && b.rank === 'מפקד') return 1;
          // אחר כך לפי מספר ימי הבית הנוכחי
          return a.currentHomeDays - b.currentHomeDays;
        });
    };
    
    // עבור כל יום
    for (const date of dates) {
      const soldiersInBase = this.schedule[date].soldiersInBase.length;
      const targetInBase = parseInt(this.config.soldiersInBase);
      const needToRemove = soldiersInBase - targetInBase;
      
      if (needToRemove <= 0) continue;
      
      // בחירת חיילים להוצאה לפי עדיפות
      const availableSoldiers = getSoldiersByPriority();
      const soldiersToRemove = availableSoldiers.slice(0, needToRemove);
      
      console.log(`יום ${date}: צריך להוציא ${needToRemove} חיילים`);
      
      // הוצאת החיילים הנבחרים
      for (const soldier of soldiersToRemove) {
        const soldierIndex = this.schedule[date].soldiersInBase.indexOf(soldier.id);
        if (soldierIndex !== -1) {
          this.schedule[date].soldiersInBase.splice(soldierIndex, 1);
          this.schedule[date].soldiersAtHome.push(soldier.id);
          
          soldier.currentHomeDays++;
          soldier.scheduledDays.push(date);
          
          console.log(`הוצאתי ${soldier.rank} ${soldier.name} מהבסיס (${soldier.currentHomeDays}/${soldier.targetHomeDays})`);
        }
      }
      
      // בדיקה שיש לפחות מפקד אחד בבסיס
      const commandersInBase = this.schedule[date].soldiersInBase.filter(id => {
        const soldier = this.soldiers.find(s => s.id === id);
        return soldier && soldier.rank === 'מפקד';
      });
      
      if (commandersInBase.length === 0) {
        console.log(`אזהרה: אין מפקדים בבסיס ביום ${date}`);
        // תיקון אוטומטי: החזר מפקד מהבית ולהוציא חייל רגיל
        const commandersAtHome = this.schedule[date].soldiersAtHome.map(id => {
          const s = this.soldiers.find(sol => sol.id === id);
          return s && s.rank === 'מפקד' ? s : null;
        }).filter(Boolean);
        const regularsInBase = this.schedule[date].soldiersInBase.map(id => {
          const s = this.soldiers.find(sol => sol.id === id);
          return s && s.rank !== 'מפקד' ? s : null;
        }).filter(Boolean);
        
        if (commandersAtHome.length > 0 && regularsInBase.length > 0) {
          const commander = commandersAtHome[0];
          const regular = regularsInBase[0];
          
          // הוצא חייל רגיל
          const idxRegular = this.schedule[date].soldiersInBase.indexOf(regular.id);
          if (idxRegular !== -1) {
            this.schedule[date].soldiersInBase.splice(idxRegular, 1);
            this.schedule[date].soldiersAtHome.push(regular.id);
            if (!regular.currentHomeDays) regular.currentHomeDays = 0;
            regular.currentHomeDays++;
            if (!regular.scheduledDays) regular.scheduledDays = [];
            regular.scheduledDays.push(date);
          }
          
          // החזר מפקד לבסיס
          const idxCommander = this.schedule[date].soldiersAtHome.indexOf(commander.id);
          if (idxCommander !== -1) {
            this.schedule[date].soldiersAtHome.splice(idxCommander, 1);
            this.schedule[date].soldiersInBase.push(commander.id);
            if (commander.currentHomeDays > 0) commander.currentHomeDays--;
            if (commander.scheduledDays) {
              const dateIndex = commander.scheduledDays.indexOf(date);
              if (dateIndex !== -1) {
                commander.scheduledDays.splice(dateIndex, 1);
              }
            }
          }
          console.log(`תיקון אוטומטי ב-assignHomeDaysFairly: הוחזר מפקד ${commander.name} לבסיס והוצא חייל רגיל ${regular.name}`);
        } else {
          console.log('אזהרה: לא ניתן לתקן ב-assignHomeDaysFairly - אין מפקד בבית או אין חייל רגיל בבסיס!');
        }
      }
    }
    
    // הדפסת סיכום
    console.log('\n=== סיכום ימי הבית ===');
    this.soldiers.forEach(soldier => {
      console.log(`${soldier.name} (${soldier.rank}): ${soldier.currentHomeDays}/${soldier.targetHomeDays} ימי בית`);
    });
  }

  ensureAllSoldiersGetHomeDays() {
    console.log('Ensuring all soldiers get home days');
    
    const soldiersWithNoHomeDays = this.soldiers.filter(soldier => 
      !soldier.scheduledDays || soldier.scheduledDays.length === 0
    );
    
    console.log(`Soldiers with no home days: ${soldiersWithNoHomeDays.length}`);
    
    if (soldiersWithNoHomeDays.length === 0) {
      console.log('All soldiers have home days');
      return;
    }
    
    const dates = Object.keys(this.schedule).sort();
    
    // שיבוץ חיילים שלא יצאו לתקופות קצרות
    for (const soldier of soldiersWithNoHomeDays) {
      // בחירת תאריך רנדומלי
      const randomDateIndex = Math.floor(Math.random() * dates.length);
      const startDate = dates[randomDateIndex];
      
      // תקופה של 3 ימים
      const periodLength = 3;
      
      for (let i = 0; i < periodLength && randomDateIndex + i < dates.length; i++) {
        const date = dates[randomDateIndex + i];
        
        // הוצאת החייל מהבסיס
        const soldierIndex = this.schedule[date].soldiersInBase.indexOf(soldier.id);
        if (soldierIndex !== -1) {
          this.schedule[date].soldiersInBase.splice(soldierIndex, 1);
          this.schedule[date].soldiersAtHome.push(soldier.id);
          
          if (!soldier.scheduledDays) soldier.scheduledDays = [];
          soldier.scheduledDays.push(date);
        }
      }
    }
  }

  fixBaseCount() {
    console.log('Fixing base count with new algorithm');
    
    if (!this.schedule || typeof this.schedule !== 'object') {
      console.error('this.schedule is not valid in fixBaseCount:', this.schedule);
      return;
    }
    
    const dates = Object.keys(this.schedule).sort();
    
    for (const date of dates) {
      let currentInBase = this.schedule[date].soldiersInBase.length;
      const targetInBase = parseInt(this.config.soldiersInBase);
      
      console.log(`יום ${date}: יש ${currentInBase} חיילים בבסיס, צריך ${targetInBase}`);
      
      if (currentInBase > targetInBase) {
        // יש יותר מדי חיילים בבסיס - צריך להוציא
        const toRemove = currentInBase - targetInBase;
        console.log(`צריך להוציא ${toRemove} חיילים מהבסיס`);
        
        // מיון חיילים בבסיס לפי עדיפות להוצאה
        const soldiersInBase = this.schedule[date].soldiersInBase.map(id => {
          const soldier = this.soldiers.find(s => s.id === id);
          return { id, soldier };
        }).filter(item => item.soldier);
        
        // מיון לפי עדיפות: קודם חיילים עם יותר ימי בית, אחר כך מפקדים
        soldiersInBase.sort((a, b) => {
          const aHomeDays = a.soldier.currentHomeDays || 0;
          const bHomeDays = b.soldier.currentHomeDays || 0;
          
          // קודם חיילים עם יותר ימי בית
          if (aHomeDays !== bHomeDays) {
            return bHomeDays - aHomeDays;
          }
          
          // אחר כך חיילים רגילים לפני מפקדים
          if (a.soldier.rank === 'מפקד' && b.soldier.rank !== 'מפקד') return 1;
          if (a.soldier.rank !== 'מפקד' && b.soldier.rank === 'מפקד') return -1;
          
          return 0;
        });
        
        // הוצאת החיילים לפי העדיפות
        let removed = 0;
        for (const { id, soldier } of soldiersInBase) {
          if (removed >= toRemove) break;
          
          // בדיקה שיש לפחות מפקד אחד בבסיס
          const commandersInBase = this.schedule[date].soldiersInBase.filter(sid => {
            const s = this.soldiers.find(sol => sol.id === sid);
            return s && s.rank === 'מפקד';
          });
          
          if (soldier.rank === 'מפקד' && commandersInBase.length <= 1) {
            console.log(`משאיר מפקד ${soldier.name} בבסיס (לפחות מפקד אחד נדרש)`);
            continue;
          }
          
          const idx = this.schedule[date].soldiersInBase.indexOf(id);
          if (idx !== -1) {
            this.schedule[date].soldiersInBase.splice(idx, 1);
            this.schedule[date].soldiersAtHome.push(id);
            
            // עדכון הסטטיסטיקות
            if (!soldier.currentHomeDays) soldier.currentHomeDays = 0;
            soldier.currentHomeDays++;
            if (!soldier.scheduledDays) soldier.scheduledDays = [];
            soldier.scheduledDays.push(date);
            
            removed++;
            console.log(`הוצאתי ${soldier.rank} ${soldier.name} מהבסיס (${soldier.currentHomeDays}/${soldier.targetHomeDays})`);
          }
        }
        
        console.log(`אחרי הוצאה: יש ${this.schedule[date].soldiersInBase.length} חיילים בבסיס`);
        
      } else if (currentInBase < targetInBase) {
        // יש פחות מדי חיילים בבסיס - צריך להחזיר
        const shortage = targetInBase - currentInBase;
        console.log(`צריך להחזיר ${shortage} חיילים לבסיס`);
        
        // מיון חיילים בבית לפי עדיפות להחזרה (פחות ימי בית = קודם)
        const soldiersAtHome = this.schedule[date].soldiersAtHome.map(id => {
          const soldier = this.soldiers.find(s => s.id === id);
          return { id, soldier };
        }).filter(item => item.soldier);
        
        soldiersAtHome.sort((a, b) => {
          const aHomeDays = a.soldier.currentHomeDays || 0;
          const bHomeDays = b.soldier.currentHomeDays || 0;
          
          // קודם חיילים עם פחות ימי בית
          if (aHomeDays !== bHomeDays) {
            return aHomeDays - bHomeDays;
          }
          
          // אחר כך מפקדים לפני חיילים רגילים
          if (a.soldier.rank === 'מפקד' && b.soldier.rank !== 'מפקד') return -1;
          if (a.soldier.rank !== 'מפקד' && b.soldier.rank === 'מפקד') return 1;
          
          return 0;
        });
        
        // החזרת החיילים לפי העדיפות
        let returned = 0;
        for (const { id, soldier } of soldiersAtHome) {
          if (returned >= shortage) break;
          
          const idx = this.schedule[date].soldiersAtHome.indexOf(id);
          if (idx !== -1) {
            this.schedule[date].soldiersAtHome.splice(idx, 1);
            this.schedule[date].soldiersInBase.push(id);
            
            // עדכון הסטטיסטיקות
            if (soldier.currentHomeDays > 0) soldier.currentHomeDays--;
            if (soldier.scheduledDays) {
              const dateIndex = soldier.scheduledDays.indexOf(date);
              if (dateIndex !== -1) {
                soldier.scheduledDays.splice(dateIndex, 1);
              }
            }
            
            returned++;
            console.log(`החזרתי ${soldier.rank} ${soldier.name} לבסיס (${soldier.currentHomeDays}/${soldier.targetHomeDays})`);
          }
        }
        
        console.log(`אחרי החזרה: יש ${this.schedule[date].soldiersInBase.length} חיילים בבסיס`);
      }
      
      // בדיקה סופית
      const finalInBase = this.schedule[date].soldiersInBase.length;
      const finalCommanders = this.schedule[date].soldiersInBase.filter(id => {
        const s = this.soldiers.find(s => s.id === id);
        return s && s.rank === 'מפקד';
      }).length;
      
      console.log(`יום ${date} - סופי: ${finalInBase} חיילים בבסיס (${finalCommanders} מפקדים)`);

      // תיקון אוטומטי: אם אין מפקד בבסיס, להחזיר מפקד ולהוציא חייל רגיל
      console.log(`בדיקת תיקון אוטומטי ליום ${date}: ${finalCommanders} מפקדים בבסיס`);
      if (finalCommanders === 0) {
        console.log(`מתחיל תיקון אוטומטי ליום ${date} - אין מפקדים בבסיס`);
        // חפש מפקד בבית
        const commandersAtHome = this.schedule[date].soldiersAtHome.map(id => {
          const s = this.soldiers.find(sol => sol.id === id);
          return s && s.rank === 'מפקד' ? s : null;
        }).filter(Boolean);
        // חפש חייל רגיל בבסיס
        const regularsInBase = this.schedule[date].soldiersInBase.map(id => {
          const s = this.soldiers.find(sol => sol.id === id);
          return s && s.rank !== 'מפקד' ? s : null;
        }).filter(Boolean);
        
        console.log(`מפקדים בבית: ${commandersAtHome.length}, חיילים רגילים בבסיס: ${regularsInBase.length}`);
        
        if (commandersAtHome.length > 0 && regularsInBase.length > 0) {
          const commander = commandersAtHome[0];
          const regular = regularsInBase[0];
          // הוצא חייל רגיל
          const idxRegular = this.schedule[date].soldiersInBase.indexOf(regular.id);
          if (idxRegular !== -1) {
            this.schedule[date].soldiersInBase.splice(idxRegular, 1);
            this.schedule[date].soldiersAtHome.push(regular.id);
            if (!regular.currentHomeDays) regular.currentHomeDays = 0;
            regular.currentHomeDays++;
            if (!regular.scheduledDays) regular.scheduledDays = [];
            regular.scheduledDays.push(date);
          }
          // החזר מפקד לבסיס
          const idxCommander = this.schedule[date].soldiersAtHome.indexOf(commander.id);
          if (idxCommander !== -1) {
            this.schedule[date].soldiersAtHome.splice(idxCommander, 1);
            this.schedule[date].soldiersInBase.push(commander.id);
            if (commander.currentHomeDays > 0) commander.currentHomeDays--;
            if (commander.scheduledDays) {
              const dateIndex = commander.scheduledDays.indexOf(date);
              if (dateIndex !== -1) {
                commander.scheduledDays.splice(dateIndex, 1);
              }
            }
          }
          console.log(`בוצע תיקון: הוחזר מפקד ${commander.name} לבסיס והוצא חייל רגיל ${regular.name}`);
        } else {
          console.log('אזהרה: לא ניתן לתקן - אין מפקד בבית או אין חייל רגיל בבסיס!');
        }
      } else if (finalCommanders === 1) {
        console.log(`יום ${date} - יש מפקד אחד בבסיס (מינימום נדרש)`);
      } else {
        console.log(`לא צריך תיקון ליום ${date} - יש ${finalCommanders} מפקדים בבסיס`);
      }
    }
  }

  // פונקציות קיימות שנשארות
  loadConfiguration() {
    try {
      const configPath = path.join(__dirname, '../data/configuration.json');
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        this.config = { ...this.config, ...JSON.parse(configData) };
        console.log('Configuration loaded:', this.config);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  }

  saveConfiguration() {
    try {
      const configPath = path.join(__dirname, '../data/configuration.json');
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
      console.log('Configuration saved');
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  }

  getCurrentSchedule() {
    return {
      schedule: this.schedule,
      soldiers: this.soldiers,
      config: this.config,
      soldierStats: this.calculateSoldierStats(),
      validationErrors: this.validateSchedule()
    };
  }

  calculateStats() {
    try {
      if (!this.schedule || typeof this.schedule !== 'object') {
        console.error('this.schedule is not valid in calculateStats:', this.schedule);
        return {
          totalDays: 0,
          totalSoldiers: this.soldiers.length,
          averageHomeDays: 0,
          fairnessScore: 0,
          conflictsResolved: 0,
          minHomeDays: 0,
          maxHomeDays: 0,
          variance: 0
        };
      }
      
      const dates = Object.keys(this.schedule).sort();
      const soldierStats = this.calculateSoldierStats();
      
      // חישוב ממוצע ימי בית
      const totalHomeDays = soldierStats.reduce((sum, soldier) => sum + soldier.homeDays, 0);
      const averageHomeDays = soldierStats.length > 0 ? totalHomeDays / soldierStats.length : 0;
      
      // חישוב ציון הוגנות (כמה אחידים ימי הבית בין החיילים)
      const homeDaysArray = soldierStats.map(s => s.homeDays);
      const minHomeDays = homeDaysArray.length > 0 ? Math.min(...homeDaysArray) : 0;
      const maxHomeDays = homeDaysArray.length > 0 ? Math.max(...homeDaysArray) : 0;
      const variance = this.calculateVariance(homeDaysArray);
      const fairnessScore = maxHomeDays > 0 ? (minHomeDays / maxHomeDays) * 100 : 100;
      
      // חישוב קונפליקטים שנפתרו
      const conflictsResolved = 0; // באלגוריתם החדש אין קונפליקטים
      
      return {
        totalDays: dates.length,
        totalSoldiers: this.soldiers.length,
        averageHomeDays: Math.round(averageHomeDays * 100) / 100,
        fairnessScore: Math.round(fairnessScore * 100) / 100,
        conflictsResolved,
        minHomeDays,
        maxHomeDays,
        variance: Math.round(variance * 100) / 100
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        totalDays: 0,
        totalSoldiers: this.soldiers.length,
        averageHomeDays: 0,
        fairnessScore: 0,
        conflictsResolved: 0,
        minHomeDays: 0,
        maxHomeDays: 0,
        variance: 0
      };
    }
  }

  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateSoldierStats() {
    if (!this.soldiers || !Array.isArray(this.soldiers)) {
      console.error('this.soldiers is not valid in calculateSoldierStats:', this.soldiers);
      return [];
    }
    
    return this.soldiers.map(soldier => ({
      id: soldier.id,
      name: soldier.name,
      homeDays: soldier.scheduledDays ? soldier.scheduledDays.length : 0,
      scheduledDays: soldier.scheduledDays || []
    }));
  }

  validateSchedule(schedule, config) {
    if (!schedule || typeof schedule !== 'object') {
      return { isValid: false, errors: ['Schedule object is invalid'], warnings: [], totalErrors: 1, totalWarnings: 0 };
    }

    const dates = Object.keys(schedule);
    if (dates.length === 0) {
      return { isValid: true, errors: [], warnings: [], totalErrors: 0, totalWarnings: 0 };
    }
      
    const errors = [];
    const warnings = [];

    // בדיקה 1: מספר חיילים בבסיס
    dates.forEach(date => {
      const day = schedule[date];
      if (!day || !Array.isArray(day.soldiersInBase)) {
        errors.push(`נתונים לא תקינים עבור יום ${date}`);
        return;
      }
      const soldiersInBaseCount = day.soldiersInBase.length;
      if (soldiersInBaseCount !== parseInt(config.soldiersInBase)) {
        errors.push(`ביום ${date}: יש ${soldiersInBaseCount} חיילים בבסיס במקום ${config.soldiersInBase}`);
      }
    });

    // בדיקה 2: לפחות מפקד אחד בבסיס
    dates.forEach(date => {
      const day = schedule[date];
       if (!day || !Array.isArray(day.soldiersInBase)) return;

      const commandersInBase = day.soldiersInBase.filter(soldierId => {
        const soldier = this.soldiers.find(s => s.id === soldierId);
        return soldier && soldier.rank === 'מפקד';
      });
      if (commandersInBase.length === 0) {
        errors.push(`ביום ${date}: אין מפקדים בבסיס`);
      }
    });

    // בדיקה 3: כל חייל קיבל לפחות יציאה אחת
    const soldiersWithHomeDays = new Set();
    dates.forEach(date => {
      const day = schedule[date];
      if (!day || !Array.isArray(day.soldiersAtHome)) return;
      day.soldiersAtHome.forEach(soldierId => soldiersWithHomeDays.add(soldierId));
    });

    this.soldiers.forEach(soldier => {
        if (!soldiersWithHomeDays.has(soldier.id)) {
            warnings.push(`חייל ${soldier.name} (id: ${soldier.id}) לא קיבל ימי בית כלל.`);
        }
    });


    // בדיקה 4: רציפות ימי יציאה (בדיקה בסיסית)
    this.soldiers.forEach(soldier => {
      let consecutiveHomeDays = 0;
      let trips = [];
      dates.forEach(date => {
        const day = schedule[date];
        if (!day || !Array.isArray(day.soldiersAtHome)) return;

        if (day.soldiersAtHome.includes(soldier.id)) {
          consecutiveHomeDays++;
        } else {
          if (consecutiveHomeDays > 0) {
            trips.push(consecutiveHomeDays);
          }
          consecutiveHomeDays = 0;
        }
      });
      if (consecutiveHomeDays > 0) {
        trips.push(consecutiveHomeDays);
      }
      
      trips.forEach(tripLength => {
          if (tripLength < config.minConsecutiveDays) {
              warnings.push(`חייל ${soldier.name} (id: ${soldier.id}) עם יציאה קצרה מדי (${tripLength} ימים)`);
          }
          if (tripLength > config.maxConsecutiveDaysInOneTrip) {
            warnings.push(`חייל ${soldier.name} (id: ${soldier.id}) עם יציאה ארוכה מדי (${tripLength} ימים)`);
          }
      });
    });

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      totalErrors: errors.length,
      totalWarnings: warnings.length
    };
  }

  deleteSchedule() {
    this.schedule = {};
    this.soldiers.forEach(soldier => {
      soldier.scheduledDays = [];
    });
    console.log('Schedule deleted');
    return { success: true };
  }

  // פונקציה לבדיקת הוגנות מפורטת
  analyzeFairness() {
    const soldierStats = this.calculateSoldierStats();
    const dates = Object.keys(this.schedule).sort();
    
    // חישוב בסיסי
    const homeDaysArray = soldierStats.map(s => s.homeDays);
    const minHomeDays = Math.min(...homeDaysArray);
    const maxHomeDays = Math.max(...homeDaysArray);
    const avgHomeDays = homeDaysArray.reduce((sum, days) => sum + days, 0) / homeDaysArray.length;
    
    // בדיקת פיזור ימי בית
    const variance = this.calculateVariance(homeDaysArray);
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = standardDeviation / avgHomeDays; // CV - ככל שקטן יותר, יותר הוגן
    
    // בדיקת רציפות ימי בית
    const consecutiveDaysAnalysis = this.analyzeConsecutiveDays(soldierStats);
    
    // בדיקת פיזור ימי בית לאורך הזמן
    const temporalDistribution = this.analyzeTemporalDistribution(soldierStats, dates);
    
    // בדיקת הוגנות בין מפקדים וחיילים רגילים
    const rankFairness = this.analyzeRankFairness(soldierStats);
    
    // ציון הוגנות כללי (0-100, 100 = הוגן לחלוטין)
    const fairnessScore = this.calculateOverallFairnessScore({
      coefficientOfVariation,
      consecutiveDaysAnalysis,
      temporalDistribution,
      rankFairness
    });
    
    return {
      basicStats: {
        minHomeDays,
        maxHomeDays,
        avgHomeDays: Math.round(avgHomeDays * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        standardDeviation: Math.round(standardDeviation * 100) / 100,
        coefficientOfVariation: Math.round(coefficientOfVariation * 100) / 100
      },
      consecutiveDaysAnalysis,
      temporalDistribution,
      rankFairness,
      fairnessScore: Math.round(fairnessScore * 100) / 100,
      recommendations: this.generateFairnessRecommendations({
        coefficientOfVariation,
        consecutiveDaysAnalysis,
        temporalDistribution,
        rankFairness
      })
    };
  }

  analyzeConsecutiveDays(soldierStats) {
    const analysis = {
      averageConsecutiveDays: 0,
      maxConsecutiveDays: 0,
      minConsecutiveDays: Infinity,
      soldiersWithShortTrips: 0,
      soldiersWithLongTrips: 0
    };
    
    let totalConsecutiveDays = 0;
    let totalTrips = 0;
    
    soldierStats.forEach(soldier => {
      const consecutiveDays = this.calculateConsecutiveDays(soldier.scheduledDays);
      if (consecutiveDays.length > 0) {
        const avgConsecutive = consecutiveDays.reduce((sum, days) => sum + days, 0) / consecutiveDays.length;
        totalConsecutiveDays += avgConsecutive;
        totalTrips += consecutiveDays.length;
        
        analysis.maxConsecutiveDays = Math.max(analysis.maxConsecutiveDays, Math.max(...consecutiveDays));
        analysis.minConsecutiveDays = Math.min(analysis.minConsecutiveDays, Math.min(...consecutiveDays));
        
        if (avgConsecutive < 3) analysis.soldiersWithShortTrips++;
        if (avgConsecutive > 7) analysis.soldiersWithLongTrips++;
      }
    });
    
    analysis.averageConsecutiveDays = totalTrips > 0 ? Math.round((totalConsecutiveDays / totalTrips) * 100) / 100 : 0;
    analysis.minConsecutiveDays = analysis.minConsecutiveDays === Infinity ? 0 : analysis.minConsecutiveDays;
    
    return analysis;
  }

  calculateConsecutiveDays(scheduledDays) {
    if (!scheduledDays || scheduledDays.length === 0) return [];
    
    const sortedDays = scheduledDays.sort();
    const consecutive = [];
    let currentStreak = 1;
    
    for (let i = 1; i < sortedDays.length; i++) {
      const prevDate = new Date(sortedDays[i - 1]);
      const currDate = new Date(sortedDays[i]);
      const diffTime = currDate.getTime() - prevDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        currentStreak++;
      } else {
        if (currentStreak > 0) consecutive.push(currentStreak);
        currentStreak = 1;
      }
    }
    
    if (currentStreak > 0) consecutive.push(currentStreak);
    return consecutive;
  }

  analyzeTemporalDistribution(soldierStats, dates) {
    const monthlyDistribution = {};
    const weeklyDistribution = {};
    
    // חלוקה חודשית
    dates.forEach(date => {
      const month = date.substring(0, 7); // YYYY-MM
      if (!monthlyDistribution[month]) monthlyDistribution[month] = 0;
      monthlyDistribution[month]++;
    });
    
    // חלוקה שבועית
    dates.forEach(date => {
      const weekStart = this.getWeekStart(date);
      if (!weeklyDistribution[weekStart]) weeklyDistribution[weekStart] = 0;
      weeklyDistribution[weekStart]++;
    });
    
    // חישוב פיזור
    const monthlyValues = Object.values(monthlyDistribution);
    const weeklyValues = Object.values(weeklyDistribution);
    
    return {
      monthlyVariance: this.calculateVariance(monthlyValues),
      weeklyVariance: this.calculateVariance(weeklyValues),
      monthlyDistribution,
      weeklyDistribution
    };
  }

  getWeekStart(dateStr) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(date.setDate(diff));
    return weekStart.toISOString().split('T')[0];
  }

  analyzeRankFairness(soldierStats) {
    const commanders = soldierStats.filter(s => {
      const soldier = this.soldiers.find(sol => sol.id === s.id);
      return soldier && soldier.rank === 'מפקד';
    });
    
    const regularSoldiers = soldierStats.filter(s => {
      const soldier = this.soldiers.find(sol => sol.id === s.id);
      return soldier && soldier.rank !== 'מפקד';
    });
    
    const commanderAvg = commanders.length > 0 ? 
      commanders.reduce((sum, s) => sum + s.homeDays, 0) / commanders.length : 0;
    const regularAvg = regularSoldiers.length > 0 ? 
      regularSoldiers.reduce((sum, s) => sum + s.homeDays, 0) / regularSoldiers.length : 0;
    
    return {
      commandersCount: commanders.length,
      regularSoldiersCount: regularSoldiers.length,
      commanderAvgHomeDays: Math.round(commanderAvg * 100) / 100,
      regularAvgHomeDays: Math.round(regularAvg * 100) / 100,
      difference: Math.round((commanderAvg - regularAvg) * 100) / 100,
      isFair: Math.abs(commanderAvg - regularAvg) <= 2 // הבדל של עד 2 ימים נחשב הוגן
    };
  }

  calculateOverallFairnessScore(metrics) {
    let score = 100;
    
    // הפחתה על בסיס מקדם השונות
    if (metrics.coefficientOfVariation > 0.3) score -= 20;
    else if (metrics.coefficientOfVariation > 0.2) score -= 10;
    else if (metrics.coefficientOfVariation > 0.1) score -= 5;
    
    // הפחתה על בסיס רציפות ימים
    if (metrics.consecutiveDaysAnalysis.soldiersWithShortTrips > 0) score -= 15;
    if (metrics.consecutiveDaysAnalysis.soldiersWithLongTrips > 0) score -= 10;
    
    // הפחתה על בסיס פיזור זמני
    if (metrics.temporalDistribution.monthlyVariance > 10) score -= 10;
    if (metrics.temporalDistribution.weeklyVariance > 5) score -= 5;
    
    // הפחתה על בסיס הוגנות דרגות
    if (!metrics.rankFairness.isFair) score -= 15;
    
    return Math.max(0, score);
  }

  generateFairnessRecommendations(metrics) {
    const recommendations = [];
    
    if (metrics.coefficientOfVariation > 0.2) {
      recommendations.push('יש פער גדול מדי בין מספר ימי הבית של החיילים. מומלץ לאזן יותר את השיבוץ.');
    }
    
    if (metrics.consecutiveDaysAnalysis.soldiersWithShortTrips > 0) {
      recommendations.push('יש חיילים עם יציאות קצרות מדי. מומלץ להאריך את היציאות.');
    }
    
    if (metrics.consecutiveDaysAnalysis.soldiersWithLongTrips > 0) {
      recommendations.push('יש חיילים עם יציאות ארוכות מדי. מומלץ לקצר את היציאות.');
    }
    
    if (metrics.temporalDistribution.monthlyVariance > 10) {
      recommendations.push('הפיזור החודשי של ימי הבית אינו אחיד. מומלץ לאזן יותר את השיבוץ לאורך הזמן.');
    }
    
    if (!metrics.rankFairness.isFair) {
      recommendations.push('יש פער בין מפקדים וחיילים רגילים בימי הבית. מומלץ לאזן יותר.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('השיבוץ הוגן ומאוזן היטב!');
    }
    
    return recommendations;
  }

  exportToExcel() {
    const wb = XLSX.utils.book_new();
    const ws_data = [];
    const dates = Object.keys(this.schedule).sort();

    // Header Row
    const header = ['מזהה', 'שם החייל', ...dates, 'סך ימי יציאה', 'סך ימים בבסיס'];
    ws_data.push(header);

    // Data Rows
    this.soldiers.forEach(soldier => {
      const row = [soldier.id, soldier.name];
      let homeDays = 0;
      let baseDays = 0;

      dates.forEach(date => {
        if (this.schedule[date].home.includes(soldier.id)) {
          row.push(0);
          homeDays++;
        } else {
          row.push(1);
          baseDays++;
        }
      });

      // Add totals to the row
      row.push(homeDays);
      row.push(baseDays);

      ws_data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'שיבוץ');

    return wb;
  }

  // פונקציה לבדיקת הוגנות עם הרבה מקרים שונים
  testMultipleScenarios() {
    const scenarios = [
      { name: 'בסיס קטן (4 חיילים)', soldiersInBase: 4 },
      { name: 'בסיס בינוני (6 חיילים)', soldiersInBase: 6 },
      { name: 'בסיס גדול (8 חיילים)', soldiersInBase: 8 },
      { name: 'בסיס גדול מאוד (10 חיילים)', soldiersInBase: 10 },
      { name: 'יציאות קצרות (3 ימים)', minConsecutiveDays: 3, maxConsecutiveDaysInOneTrip: 5 },
      { name: 'יציאות ארוכות (5 ימים)', minConsecutiveDays: 5, maxConsecutiveDaysInOneTrip: 10 },
      { name: 'יציאות גמישות (3-7 ימים)', minConsecutiveDays: 3, maxConsecutiveDaysInOneTrip: 7 }
    ];

    const results = [];

    scenarios.forEach(scenario => {
      try {
        // יצירת קונפיגורציה חדשה למקרה הנוכחי
        const testConfig = { ...this.config };
        if (scenario.soldiersInBase) testConfig.soldiersInBase = scenario.soldiersInBase;
        if (scenario.minConsecutiveDays) testConfig.minConsecutiveDays = scenario.minConsecutiveDays;
        if (scenario.maxConsecutiveDaysInOneTrip) testConfig.maxConsecutiveDaysInOneTrip = scenario.maxConsecutiveDaysInOneTrip;

        // יצירת שיבוץ חדש
        const testScheduler = new Scheduler(this.soldiers, testConfig);
        testScheduler.generateSchedule();

        // ניתוח הוגנות
        const fairnessAnalysis = testScheduler.analyzeFairness();
        
        // בדיקת תקינות בסיסית - התוצאה כבר קיימת מהקריאה ל-generateSchedule
        const validation = testScheduler.getCurrentSchedule().conflicts;
        
        results.push({
          scenario: scenario.name,
          config: testConfig,
          fairnessScore: fairnessAnalysis.fairnessScore,
          basicStats: fairnessAnalysis.basicStats,
          validation: validation,
          recommendations: fairnessAnalysis.recommendations,
          isSuccessful: validation.isValid && fairnessAnalysis.fairnessScore >= 70
        });

      } catch (error) {
        results.push({
          scenario: scenario.name,
          error: error.message,
          isSuccessful: false
        });
      }
    });

    return {
      totalScenarios: scenarios.length,
      successfulScenarios: results.filter(r => r.isSuccessful).length,
      averageFairnessScore: results
        .filter(r => r.fairnessScore !== undefined)
        .reduce((sum, r) => sum + r.fairnessScore, 0) / results.filter(r => r.fairnessScore !== undefined).length,
      results: results
    };
  }
}

module.exports = Scheduler; 