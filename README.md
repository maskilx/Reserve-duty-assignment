# מערכת ניהול ושיבוץ ימי יציאה מהבסיס

מערכת מתקדמת לניהול ושיבוץ ימי יציאה מהבסיס לחיילי מחלקה במילואים, עם התחשבות בחגים עבריים, ימי ביקוש גבוה, והבטחת הוגנות בין החיילים.

## 🚀 תכונות עיקריות

### 📋 ניהול חיילים
- רישום חיילים עם פרטים מלאים
- ניהול בקשות יציאה עם עדיפויות
- תורניות חירום לחיילים המתגוררים קרוב לבסיס
- מעקב אחר ימי בית וסטטיסטיקות

### ⚙️ קונפיגורציה מתקדמת
- הגדרת טווח תאריכים לשיבוץ
- קביעת מינימום חיילים בבסיס
- הגדרת משקלי עדיפויות
- ניהול ימי ביקוש גבוה (חגים, סופי שבוע)

### 🧠 אלגוריתם שיבוץ חכם
- עיבוד בקשות חובה ראשונות
- התחשבות בימי ביקוש גבוה
- אופטימיזציה להוגנות בין חיילים
- פתרון קונפליקטים אוטומטי

### 📊 ממשק מנהל
- דשבורד עם סקירה כללית
- ניהול קונפליקטים ידני
- סטטיסטיקות מתקדמות
- ייצוא נתונים ל-Excel ו-TXT

### 📅 לוח שנה עברי
- זיהוי חגים עבריים אוטומטי
- תמיכה בימי שישי ושבת
- ייצוא לוח שנה מלא

## 🛠️ טכנולוגיות

### Backend
- **Node.js** עם Express
- **Moment.js** לניהול תאריכים
- **XLSX** לייצוא קבצי Excel
- **CORS** ו-Helmet לאבטחה

### Frontend
- **React** עם Hooks
- **React Router** לניווט
- **Styled Components** לעיצוב
- **Axios** לתקשורת עם השרת
- **React Toastify** להתראות

## 📦 התקנה והפעלה

### דרישות מקדימות
- Node.js (גרסה 14 ומעלה)
- npm או yarn

### התקנה

1. **שכפול הפרויקט**
```bash
git clone <repository-url>
cd military-leave-scheduler
```

2. **התקנת תלויות**
```bash
# התקנת תלויות ראשיות
npm install

# התקנת תלויות השרת
cd server
npm install

# התקנת תלויות הקליינט
cd ../client
npm install
```

3. **הפעלת המערכת**

**בטרמינל ראשון (שרת):**
```bash
cd server
npm run dev
```

**בטרמינל שני (קליינט):**
```bash
cd client
npm start
```

המערכת תיפתח אוטומטית בדפדפן בכתובת: `http://localhost:3000`

**הערה:** השרת פועל על פורט 5001 והקליינט על פורט 3000.

## 🎯 שימוש במערכת

### 1. הגדרת קונפיגורציה
- עבור לטאב "שיבוץ"
- הגדר טווח תאריכים
- קבע מינימום חיילים בבסיס
- הגדר משקלי עדיפויות

### 2. הוספת חיילים
- עבור לטאב "חיילים"
- הוסף חיילים חדשים
- הגדר תורניות חירום
- הוסף בקשות יציאה

### 3. יצירת שיבוץ
- עבור לטאב "שיבוץ"
- לחץ על "יצירת שיבוץ חדש"
- סקור את התוצאות
- פתור קונפליקטים אם יש

### 4. ניהול מתקדם
- עבור לטאב "מנהל"
- סקור סטטיסטיקות
- פתור קונפליקטים ידנית
- ייצא נתונים

## 📊 מבנה הנתונים

### חייל (Soldier)
```javascript
{
  id: 1,
  name: "יוסי כהן",
  rank: "רב\"ט",
  phone: "050-1234567",
  email: "yossi@example.com",
  distanceFromBase: 25,
  isEmergencyReserve: false,
  requests: [...],
  scheduledDays: [...],
  totalHomeDays: 0
}
```

### בקשה (Request)
```javascript
{
  id: 123,
  date: "2025-07-14",
  priority: "חובה", // חובה, מועדף, גמיש
  reason: "חג תשעה באב",
  status: "pending" // pending, approved, rejected
}
```

### קונפיגורציה (Configuration)
```javascript
{
  startDate: "2025-07-01",
  endDate: "2025-07-14",
  maxConsecutiveDaysInOneTrip: 5,
  soldiersInBase: 2,
  minConsecutiveDays: 2,
  weights: {
    soldierRequest: 10,
    highDemandDay: 5,
    fairness: 3,
    emergencyReserve: 8
  }
}
```

## 🔧 API Endpoints

### חיילים
- `GET /api/soldiers` - קבלת כל החיילים
- `POST /api/soldiers` - הוספת חייל חדש
- `PUT /api/soldiers/:id` - עדכון חייל
- `DELETE /api/soldiers/:id` - מחיקת חייל
- `POST /api/soldiers/:id/requests` - הוספת בקשה

### שיבוץ
- `GET /api/scheduling/configuration` - קבלת קונפיגורציה
- `PUT /api/scheduling/configuration` - עדכון קונפיגורציה
- `POST /api/scheduling/generate` - יצירת שיבוץ
- `GET /api/scheduling/current` - קבלת שיבוץ נוכחי
- `GET /api/scheduling/export/excel` - ייצוא ל-Excel

### מנהל
- `GET /api/admin/dashboard` - נתוני דשבורד
- `GET /api/admin/soldiers-overview` - סקירת חיילים
- `GET /api/admin/conflicts` - ניהול קונפליקטים
- `POST /api/admin/resolve-conflict` - פתרון קונפליקט

### לוח עברי
- `GET /api/hebrew-calendar/holidays` - רשימת חגים
- `GET /api/hebrew-calendar/high-demand/range` - ימי ביקוש גבוה
- `GET /api/hebrew-calendar/date-info/:date` - מידע על תאריך

## 🎨 עיצוב ו-UX

המערכת מעוצבת עם:
- **עיצוב רספונסיבי** - עובד על כל המכשירים
- **ממשק בעברית** - תמיכה מלאה בעברית
- **אנימציות חלקות** - חוויית משתמש משופרת
- **התראות אינטראקטיביות** - משוב מיידי למשתמש

## ✅ סטטוס נוכחי

המערכת **פועלת במלואה** עם כל התכונות:

- ✅ שרת Node.js פועל על פורט 5001
- ✅ קליינט React פועל על פורט 3000
- ✅ כל ה-API endpoints עובדים
- ✅ ממשק משתמש מלא בעברית
- ✅ אלגוריתם שיבוץ מתקדם
- ✅ לוח שנה עברי עם חגים
- ✅ ייצוא נתונים ל-Excel ו-TXT
- ✅ ניהול קונפליקטים
- ✅ סטטיסטיקות מתקדמות

## 🚨 פתרון בעיות

### אם הפורט 5001 תפוס:
```bash
lsof -ti:5001 | xargs kill -9
```

### אם הפורט 3000 תפוס:
```bash
lsof -ti:3000 | xargs kill -9
```

### אם יש שגיאות בהתקנה:
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📞 תמיכה

לשאלות ותמיכה, אנא פנה לצוות הפיתוח.

## 🤝 תרומה לפרויקט

1. Fork את הפרויקט
2. צור branch חדש (`git checkout -b feature/amazing-feature`)
3. Commit את השינויים (`git commit -m 'Add amazing feature'`)
4. Push ל-branch (`git push origin feature/amazing-feature`)
5. פתח Pull Request

## 📝 רישיון

פרויקט זה מוגן תחת רישיון MIT. ראה קובץ `LICENSE` לפרטים.

## 📞 תמיכה

לשאלות ותמיכה:
- פתח Issue ב-GitHub
- פנה לצוות הפיתוח

---

**בהצלחה עם השיבוץ! 🎯** 