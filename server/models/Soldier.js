class Soldier {
  constructor(id, name, rank, phone, email, distanceFromBase, isEmergencyReserve = false) {
    this.id = id;
    this.name = name;
    this.rank = rank;
    this.phone = phone;
    this.email = email;
    this.distanceFromBase = distanceFromBase; // קילומטרים מהבסיס
    this.isEmergencyReserve = isEmergencyReserve; // תורניות חירום
    this.requests = []; // בקשות יציאה
    this.scheduledDays = []; // ימים משובצים
    this.totalHomeDays = 0; // סך ימי הבית
    this.totalHomeDaysHistory = 0; // שדה חדש
    this.lastUpdate = new Date();
  }

  addRequest(date, priority, reason = '') {
    const request = {
      id: Date.now() + Math.random(),
      date: date,
      priority: priority, // 'חובה', 'מועדף', 'גמיש'
      reason: reason,
      status: 'pending' // 'pending', 'approved', 'rejected'
    };
    this.requests.push(request);
    return request;
  }

  removeRequest(requestId) {
    this.requests = this.requests.filter(req => req.id !== requestId);
  }

  getRequestsByDate(date) {
    return this.requests.filter(req => req.date === date);
  }

  getHighPriorityRequests() {
    return this.requests.filter(req => req.priority === 'חובה');
  }

  hasRequestForDate(date) {
    return this.requests.some(req => req.date === date);
  }

  getTotalRequestedDays() {
    return this.requests.length;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      rank: this.rank,
      phone: this.phone,
      email: this.email,
      distanceFromBase: this.distanceFromBase,
      isEmergencyReserve: this.isEmergencyReserve,
      requests: this.requests,
      scheduledDays: this.scheduledDays,
      totalHomeDays: this.totalHomeDays,
      totalHomeDaysHistory: this.totalHomeDaysHistory,
      lastUpdate: this.lastUpdate
    };
  }
}

module.exports = Soldier; 