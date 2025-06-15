const fs = require('fs');
const path = require('path');

class Configuration {
  constructor() {
    this.startDate = null;
    this.endDate = null;
    this.maxConsecutiveDaysInOneTrip = 7; // מקסימום 7 ימים ביציאה אחת
    this.soldiersInBase = 2; // מספר מדויק של חיילים בבסיס
    this.highDemandDays = []; // ימי שישי, שבת, חגים
    this.minConsecutiveDays = 3; // מינימום 3 ימים רצופים
    this.holidays = []; // רשימת חגים
    this.emergencyReserveList = []; // רשימת חיילי תורניות חירום
    
    // טעינת קונפיגורציה מקובץ
    this.loadFromFile();
  }

  loadFromFile() {
    try {
      const configPath = path.join(__dirname, '../data/configuration.json');
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        
        this.startDate = config.startDate;
        this.endDate = config.endDate;
        this.maxConsecutiveDaysInOneTrip = config.maxConsecutiveDaysInOneTrip || 7;
        this.soldiersInBase = config.soldiersInBase || 2;
        this.highDemandDays = config.highDemandDays || [];
        this.minConsecutiveDays = config.minConsecutiveDays || 3;
        this.holidays = config.holidays || [];
        this.emergencyReserveList = config.emergencyReserveList || [];
        
        console.log('Configuration loaded from file:', this.toJSON());
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  }

  saveToFile() {
    try {
      const configPath = path.join(__dirname, '../data/configuration.json');
      const configDir = path.dirname(configPath);
      
      // יצירת תיקייה אם לא קיימת
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(configPath, JSON.stringify(this.toJSON(), null, 2));
      console.log('Configuration saved to file');
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  }

  setDateRange(startDate, endDate) {
    this.startDate = startDate;
    this.endDate = endDate;
  }

  setBasicParameters(maxConsecutiveDaysInOneTrip, soldiersInBase, minConsecutive) {
    this.maxConsecutiveDaysInOneTrip = maxConsecutiveDaysInOneTrip;
    this.soldiersInBase = soldiersInBase;
    this.minConsecutiveDays = minConsecutive;
  }

  addHighDemandDay(date, reason = '') {
    this.highDemandDays.push({
      date: date,
      reason: reason,
      weight: 5
    });
  }

  addHoliday(date, name) {
    this.holidays.push({
      date: date,
      name: name,
      weight: 7.5 // חגים מקבלים משקל גבוה יותר
    });
  }

  addEmergencyReserve(soldierId) {
    if (!this.emergencyReserveList.includes(soldierId)) {
      this.emergencyReserveList.push(soldierId);
    }
  }

  removeEmergencyReserve(soldierId) {
    this.emergencyReserveList = this.emergencyReserveList.filter(id => id !== soldierId);
  }

  isHighDemandDay(date) {
    return this.highDemandDays.some(day => day.date === date) ||
           this.holidays.some(holiday => holiday.date === date);
  }

  getDayWeight(date) {
    const highDemand = this.highDemandDays.find(day => day.date === date);
    const holiday = this.holidays.find(holiday => holiday.date === date);
    
    if (holiday) return holiday.weight;
    if (highDemand) return highDemand.weight;
    return 1; // משקל רגיל
  }

  validate() {
    const errors = [];
    
    if (!this.startDate || !this.endDate) {
      errors.push('חובה להגדיר טווח תאריכים');
    }
    
    if (this.maxConsecutiveDaysInOneTrip <= 0) {
      errors.push('חובה להגדיר מספר ימים מקסימלי ביציאה אחת חיובי');
    }
    
    if (this.soldiersInBase < 0) {
      errors.push('מספר חיילים בבסיס לא יכול להיות שלילי');
    }
    
    if (this.minConsecutiveDays < 1) {
      errors.push('מינימום ימים רצופים חייב להיות לפחות 1');
    }
    
    return errors;
  }

  toJSON() {
    return {
      startDate: this.startDate,
      endDate: this.endDate,
      maxConsecutiveDaysInOneTrip: this.maxConsecutiveDaysInOneTrip,
      soldiersInBase: this.soldiersInBase,
      highDemandDays: this.highDemandDays,
      minConsecutiveDays: this.minConsecutiveDays,
      holidays: this.holidays,
      emergencyReserveList: this.emergencyReserveList
    };
  }
}

// ייצוא אובייקט יחיד (Singleton) במקום המחלקה
module.exports = new Configuration(); 