# 🎯 מערכת שיבוץ ימי יציאה מהבסיס לחיילי מילואים

מערכת מתקדמת לניהול ושיבוץ ימי יציאה מהבסיס לחיילי מילואים, המאפשרת שיבוץ אוטומטי תוך שמירה על דרישות מבצעיות והוגנות בין החיילים.

## ✨ תכונות עיקריות

- **שיבוץ אוטומטי** - אלגוריתם מתקדם ליצירת שיבוץ אופטימלי
- **מגבלות מבצעיות** - שמירה על מספר מדויק של חיילים בבסיס
- **מגבלת רצף** - מניעת יציאות ארוכות מדי (גג ימים ביציאה אחת)
- **מינימום רצף** - הבטחת יציאות של מינימום ימים רצופים
- **הוגנות** - חלוקה הוגנת של ימי יציאה בין החיילים
- **לוח עברי** - תמיכה מלאה בחגים וימי ביקוש גבוה
- **ניהול בקשות** - מערכת בקשות יציאה עם עדיפויות
- **ייצוא נתונים** - ייצוא ל-Excel ו-TXT
- **ממשק בעברית** - תמיכה מלאה בעברית

## 🚀 התקנה והפעלה

### דרישות מקדימות
- Node.js (גרסה 14 ומעלה)
- npm או yarn

### 1. **שכפול הפרויקט**
```bash
git clone https://github.com/maskilx/Reserve-duty-assignment.git
cd Reserve-duty-assignment
```

### 2. **התקנת תלויות**
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

### 3. **הפעלת המערכת**

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
- קבע **מספר חיילים בבסיס** (לא מינימום!)
- הגדר **גג ימים ביציאה אחת** (מקסימום רצף)
- הגדר מינימום ימים רצופים

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
  rank: "מפקד",
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
  maxConsecutiveDaysInOneTrip: 7, // גג ימים ביציאה אחת
  soldiersInBase: 2, // מספר מדויק של חיילים בבסיס
  minConsecutiveDays: 3, // מינימום ימים רצופים
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
- ✅ אלגוריתם שיבוץ מתקדם עם לוגיקה מתוקנת
- ✅ לוח שנה עברי עם חגים
- ✅ ייצוא נתונים ל-Excel ו-TXT
- ✅ ניהול קונפליקטים
- ✅ סטטיסטיקות מתקדמות
- ✅ זיהוי שגיאות ברור במקרים של אי עמידה בדרישות

## 🔧 שינויים אחרונים

### תיקון לוגיקת השיבוץ:
- שינוי `minSoldiersInBase` ל-`soldiersInBase` (מספר מדויק)
- שינוי `maxHomeDaysPerWeek` ל-`maxConsecutiveDaysInOneTrip` (גג ימים ביציאה אחת)
- תיקון הלוגיקה כך שבכל יום יהיה בדיוק מספר החיילים הנדרש בבסיס
- הוספת זיהוי שגיאות ברור כאשר אין מספיק מועמדים

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

לשאלות ותמיכה, אנא פנה לצוות הפיתוח או פתח Issue ב-GitHub.

## 🤝 תרומה לפרויקט

1. Fork את הפרויקט
2. צור branch חדש (`git checkout -b feature/amazing-feature`)
3. Commit את השינויים (`git commit -m 'Add amazing feature'`)
4. Push ל-branch (`git push origin feature/amazing-feature`)
5. פתח Pull Request

## 📝 רישיון

פרויקט זה מוגן תחת רישיון MIT. ראה קובץ `LICENSE` לפרטים.

---

**בהצלחה עם השיבוץ! 🎯**

*פרויקט זה פותח עבור מערכת הביטחון בישראל* 