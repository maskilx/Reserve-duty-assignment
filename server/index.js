const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const soldiersRouter = require('./routes/soldiers');
const schedulingRouter = require('./routes/scheduling');
const adminRouter = require('./routes/admin');
const hebrewCalendarRouter = require('./routes/hebrewCalendar');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/soldiers', soldiersRouter);
app.use('/api/scheduling', schedulingRouter);
app.use('/api/admin', adminRouter);
app.use('/api/hebrew-calendar', hebrewCalendarRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'מערכת פעילה' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'שגיאה פנימית בשרת',
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 השרת פועל על פורט ${PORT}`);
  console.log(`📅 מערכת שיבוץ ימי יציאה מהבסיס`);
}); 