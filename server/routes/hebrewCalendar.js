const express = require('express');
const router = express.Router();
const moment = require('moment');

// רשימת חגים עבריים לשנת 2025
const hebrewHolidays2025 = [
  { date: '2025-01-28', name: 'ט"ו בשבט', hebrewDate: 'ט"ו בשבט תשפ"ה' },
  { date: '2025-03-15', name: 'פורים', hebrewDate: 'י"ד באדר תשפ"ה' },
  { date: '2025-04-13', name: 'פסח - ליל הסדר', hebrewDate: 'ט"ו בניסן תשפ"ה' },
  { date: '2025-04-14', name: 'פסח - יום ראשון', hebrewDate: 'ט"ז בניסן תשפ"ה' },
  { date: '2025-04-15', name: 'פסח - יום שני', hebrewDate: 'י"ז בניסן תשפ"ה' },
  { date: '2025-04-16', name: 'פסח - יום שלישי', hebrewDate: 'י"ח בניסן תשפ"ה' },
  { date: '2025-04-17', name: 'פסח - יום רביעי', hebrewDate: 'י"ט בניסן תשפ"ה' },
  { date: '2025-04-18', name: 'פסח - יום חמישי', hebrewDate: 'כ\' בניסן תשפ"ה' },
  { date: '2025-04-19', name: 'פסח - יום שישי', hebrewDate: 'כ"א בניסן תשפ"ה' },
  { date: '2025-04-20', name: 'פסח - יום שביעי', hebrewDate: 'כ"ב בניסן תשפ"ה' },
  { date: '2025-04-21', name: 'פסח - יום שמיני', hebrewDate: 'כ"ג בניסן תשפ"ה' },
  { date: '2025-05-26', name: 'יום העצמאות', hebrewDate: 'ה\' באייר תשפ"ה' },
  { date: '2025-06-02', name: 'ל"ג בעומר', hebrewDate: 'ל"ג בעומר תשפ"ה' },
  { date: '2025-06-03', name: 'שבועות', hebrewDate: 'ו\' בסיוון תשפ"ה' },
  { date: '2025-07-14', name: 'תשעה באב', hebrewDate: 'ט\' באב תשפ"ה' },
  { date: '2025-09-23', name: 'ראש השנה - יום ראשון', hebrewDate: 'א\' בתשרי תשפ"ו' },
  { date: '2025-09-24', name: 'ראש השנה - יום שני', hebrewDate: 'ב\' בתשרי תשפ"ו' },
  { date: '2025-10-02', name: 'יום כיפור', hebrewDate: 'י\' בתשרי תשפ"ו' },
  { date: '2025-10-07', name: 'סוכות - יום ראשון', hebrewDate: 'ט"ו בתשרי תשפ"ו' },
  { date: '2025-10-08', name: 'סוכות - יום שני', hebrewDate: 'ט"ז בתשרי תשפ"ו' },
  { date: '2025-10-09', name: 'סוכות - יום שלישי', hebrewDate: 'י"ז בתשרי תשפ"ו' },
  { date: '2025-10-10', name: 'סוכות - יום רביעי', hebrewDate: 'י"ח בתשרי תשפ"ו' },
  { date: '2025-10-11', name: 'סוכות - יום חמישי', hebrewDate: 'י"ט בתשרי תשפ"ו' },
  { date: '2025-10-12', name: 'סוכות - יום שישי', hebrewDate: 'כ\' בתשרי תשפ"ו' },
  { date: '2025-10-13', name: 'סוכות - יום שביעי', hebrewDate: 'כ"א בתשרי תשפ"ו' },
  { date: '2025-10-14', name: 'שמיני עצרת', hebrewDate: 'כ"ב בתשרי תשפ"ו' },
  { date: '2025-10-15', name: 'שמחת תורה', hebrewDate: 'כ"ג בתשרי תשפ"ו' },
  { date: '2025-12-15', name: 'חנוכה - ליל ראשון', hebrewDate: 'כ"ה בכסלו תשפ"ו' },
  { date: '2025-12-16', name: 'חנוכה - יום ראשון', hebrewDate: 'כ"ו בכסלו תשפ"ו' },
  { date: '2025-12-17', name: 'חנוכה - יום שני', hebrewDate: 'כ"ז בכסלו תשפ"ו' },
  { date: '2025-12-18', name: 'חנוכה - יום שלישי', hebrewDate: 'כ"ח בכסלו תשפ"ו' },
  { date: '2025-12-19', name: 'חנוכה - יום רביעי', hebrewDate: 'כ"ט בכסלו תשפ"ו' },
  { date: '2025-12-20', name: 'חנוכה - יום חמישי', hebrewDate: 'א\' בטבת תשפ"ו' },
  { date: '2025-12-21', name: 'חנוכה - יום שישי', hebrewDate: 'ב\' בטבת תשפ"ו' },
  { date: '2025-12-22', name: 'חנוכה - יום שביעי', hebrewDate: 'ג\' בטבת תשפ"ו' },
  { date: '2025-12-23', name: 'חנוכה - יום שמיני', hebrewDate: 'ד\' בטבת תשפ"ו' }
];

// רשימת ימי שישי ושבת
const getWeekends = (startDate, endDate) => {
  const weekends = [];
  const current = moment(startDate);
  const end = moment(endDate);

  while (current.isSameOrBefore(end)) {
    const dayOfWeek = current.day(); // 0 = ראשון, 6 = שבת
    if (dayOfWeek === 5 || dayOfWeek === 6) { // שישי או שבת
      weekends.push({
        date: current.format('YYYY-MM-DD'),
        name: dayOfWeek === 5 ? 'יום שישי' : 'שבת',
        hebrewDate: getHebrewDate(current),
        type: 'weekend'
      });
    }
    current.add(1, 'day');
  }

  return weekends;
};

// המרה לתאריך עברי
const getHebrewDate = (date) => {
  const hebrewMonths = [
    'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר',
    'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול'
  ];

  const hebrewNumbers = [
    '', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט',
    'י', 'י"א', 'י"ב', 'י"ג', 'י"ד', 'ט"ו', 'ט"ז', 'י"ז', 'י"ח', 'י"ט',
    'כ', 'כ"א', 'כ"ב', 'כ"ג', 'כ"ד', 'כ"ה', 'כ"ו', 'כ"ז', 'כ"ח', 'כ"ט', 'ל'
  ];

  // פישוט - במקום חישוב מדויק נשתמש בקירוב
  const year = date.year();
  const month = date.month() + 1;
  const day = date.date();

  // קירוב פשוט לתאריך עברי
  const hebrewYear = year + 3760; // קירוב לשנה עברית
  const hebrewMonth = hebrewMonths[month - 1] || 'לא ידוע';
  const hebrewDay = hebrewNumbers[day] || day.toString();

  return `${hebrewDay} ב${hebrewMonth} ${hebrewYear}`;
};

// קבלת כל החגים
router.get('/holidays', (req, res) => {
  try {
    res.json({
      success: true,
      data: hebrewHolidays2025,
      count: hebrewHolidays2025.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת רשימת החגים',
      message: error.message
    });
  }
});

// קבלת חגים בטווח תאריכים
router.get('/holidays/range', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'חובה לציין תאריך התחלה ותאריך סיום'
      });
    }

    const start = moment(startDate);
    const end = moment(endDate);

    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        success: false,
        error: 'תאריכים לא תקינים'
      });
    }

    const holidaysInRange = hebrewHolidays2025.filter(holiday => {
      const holidayDate = moment(holiday.date);
      return holidayDate.isBetween(start, end, 'day', '[]'); // כולל התאריכים
    });

    res.json({
      success: true,
      data: holidaysInRange,
      count: holidaysInRange.length,
      range: {
        startDate: startDate,
        endDate: endDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת חגים בטווח',
      message: error.message
    });
  }
});

// קבלת ימי שישי ושבת בטווח תאריכים
router.get('/weekends/range', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'חובה לציין תאריך התחלה ותאריך סיום'
      });
    }

    const start = moment(startDate);
    const end = moment(endDate);

    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        success: false,
        error: 'תאריכים לא תקינים'
      });
    }

    const weekends = getWeekends(startDate, endDate);

    res.json({
      success: true,
      data: weekends,
      count: weekends.length,
      range: {
        startDate: startDate,
        endDate: endDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת ימי סוף שבוע',
      message: error.message
    });
  }
});

// קבלת כל ימי הביקוש הגבוה (חגים + סופי שבוע) בטווח
router.get('/high-demand/range', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'חובה לציין תאריך התחלה ותאריך סיום'
      });
    }

    const start = moment(startDate);
    const end = moment(endDate);

    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        success: false,
        error: 'תאריכים לא תקינים'
      });
    }

    // קבלת חגים בטווח
    const holidaysInRange = hebrewHolidays2025.filter(holiday => {
      const holidayDate = moment(holiday.date);
      return holidayDate.isBetween(start, end, 'day', '[]');
    });

    // קבלת סופי שבוע בטווח
    const weekends = getWeekends(startDate, endDate);

    // איחוד וסידור לפי תאריך
    const allHighDemandDays = [...holidaysInRange, ...weekends].sort((a, b) => {
      return moment(a.date).diff(moment(b.date));
    });

    // הסרת כפילויות (אם חג חל ביום שישי או שבת)
    const uniqueHighDemandDays = [];
    const seenDates = new Set();

    allHighDemandDays.forEach(day => {
      if (!seenDates.has(day.date)) {
        seenDates.add(day.date);
        uniqueHighDemandDays.push(day);
      }
    });

    res.json({
      success: true,
      data: uniqueHighDemandDays,
      count: uniqueHighDemandDays.length,
      breakdown: {
        holidays: holidaysInRange.length,
        weekends: weekends.length,
        total: uniqueHighDemandDays.length
      },
      range: {
        startDate: startDate,
        endDate: endDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת ימי ביקוש גבוה',
      message: error.message
    });
  }
});

// בדיקה אם תאריך הוא חג
router.get('/is-holiday/:date', (req, res) => {
  try {
    const { date } = req.params;

    if (!moment(date).isValid()) {
      return res.status(400).json({
        success: false,
        error: 'תאריך לא תקין'
      });
    }

    const holiday = hebrewHolidays2025.find(h => h.date === date);

    res.json({
      success: true,
      data: {
        date: date,
        isHoliday: !!holiday,
        holiday: holiday || null,
        hebrewDate: getHebrewDate(moment(date))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בבדיקת חג',
      message: error.message
    });
  }
});

// בדיקה אם תאריך הוא יום סוף שבוע
router.get('/is-weekend/:date', (req, res) => {
  try {
    const { date } = req.params;

    if (!moment(date).isValid()) {
      return res.status(400).json({
        success: false,
        error: 'תאריך לא תקין'
      });
    }

    const dateMoment = moment(date);
    const dayOfWeek = dateMoment.day();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

    res.json({
      success: true,
      data: {
        date: date,
        isWeekend: isWeekend,
        dayName: dayOfWeek === 5 ? 'יום שישי' : dayOfWeek === 6 ? 'שבת' : 'יום חול',
        hebrewDate: getHebrewDate(dateMoment)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בבדיקת סוף שבוע',
      message: error.message
    });
  }
});

// קבלת מידע על תאריך
router.get('/date-info/:date', (req, res) => {
  try {
    const { date } = req.params;

    if (!moment(date).isValid()) {
      return res.status(400).json({
        success: false,
        error: 'תאריך לא תקין'
      });
    }

    const dateMoment = moment(date);
    const dayOfWeek = dateMoment.day();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const holiday = hebrewHolidays2025.find(h => h.date === date);
    const isHoliday = !!holiday;
    const isHighDemand = isHoliday || isWeekend;

    res.json({
      success: true,
      data: {
        date: date,
        gregorianDate: dateMoment.format('DD/MM/YYYY'),
        hebrewDate: getHebrewDate(dateMoment),
        dayOfWeek: dayOfWeek,
        dayName: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][dayOfWeek],
        isWeekend: isWeekend,
        isHoliday: isHoliday,
        isHighDemand: isHighDemand,
        holiday: holiday || null,
        weight: isHighDemand ? (isHoliday ? 7.5 : 5) : 1 // משקל ליום זה
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת מידע על התאריך',
      message: error.message
    });
  }
});

// ייצוא לוח השנה העברי
router.get('/export/calendar', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'חובה לציין תאריך התחלה ותאריך סיום'
      });
    }

    const start = moment(startDate);
    const end = moment(endDate);

    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        success: false,
        error: 'תאריכים לא תקינים'
      });
    }

    // יצירת לוח שנה יומי
    const calendar = [];
    const current = start.clone();

    while (current.isSameOrBefore(end)) {
      const dateStr = current.format('YYYY-MM-DD');
      const dayOfWeek = current.day();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
      const holiday = hebrewHolidays2025.find(h => h.date === dateStr);
      const isHoliday = !!holiday;
      const isHighDemand = isHoliday || isWeekend;

      calendar.push({
        'תאריך לועזי': dateStr,
        'תאריך עברי': getHebrewDate(current),
        'יום בשבוע': ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][dayOfWeek],
        'חג': holiday ? holiday.name : '',
        'סוף שבוע': isWeekend ? 'כן' : 'לא',
        'ביקוש גבוה': isHighDemand ? 'כן' : 'לא',
        'משקל': isHighDemand ? (isHoliday ? 7.5 : 5) : 1
      });

      current.add(1, 'day');
    }

    const XLSX = require('xlsx');
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(calendar);
    XLSX.utils.book_append_sheet(workbook, sheet, 'לוח שנה עברי');

    const fileName = `hebrew_calendar_${startDate}_to_${endDate}.xlsx`;
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
      error: 'שגיאה בייצוא לוח השנה',
      message: error.message
    });
  }
});

module.exports = router; 