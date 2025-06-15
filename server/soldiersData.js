const Soldier = require('./models/Soldier');

const soldiers = [
  // מפקדים
  new Soldier(1, 'יוסי כהן', 'מפקד', '050-1234567', 'yossi@example.com', 25),
  new Soldier(4, 'אבי רוזן', 'מפקד', '050-4567890', 'avi@example.com', 30),
  new Soldier(5, 'דוד לוי', 'מפקד', '050-1111111', 'david@example.com', 20),
  new Soldier(6, 'מיכאל כהן', 'מפקד', '050-2222222', 'michael@example.com', 35),
  new Soldier(7, 'יוסי ישראלי', 'מפקד', '050-3333333', 'yossi2@example.com', 28),
  new Soldier(8, 'אבי שפירא', 'מפקד', '050-4444444', 'avi2@example.com', 32),
  
  // חיילים
  new Soldier(2, 'דני לוי', 'לא מפקד', '050-2345678', 'dani@example.com', 15),
  new Soldier(3, 'מיכאל ישראלי', 'לא מפקד', '050-3456789', 'michael2@example.com', 45),
  new Soldier(9, 'יוסי גולדברג', 'לא מפקד', '050-5555555', 'yossi3@example.com', 18),
  new Soldier(10, 'דני כהן', 'לא מפקד', '050-6666666', 'dani2@example.com', 22),
  new Soldier(11, 'מיכאל לוי', 'לא מפקד', '050-7777777', 'michael3@example.com', 40),
  new Soldier(12, 'יוסי שפירא', 'לא מפקד', '050-8888888', 'yossi4@example.com', 26),
  new Soldier(13, 'דני ישראלי', 'לא מפקד', '050-9999999', 'dani3@example.com', 33),
  new Soldier(14, 'מיכאל גולדברג', 'לא מפקד', '050-0000000', 'michael4@example.com', 29),
  new Soldier(15, 'יוסי כהן', 'לא מפקד', '050-1212121', 'yossi5@example.com', 24),
  new Soldier(16, 'דני רוזן', 'לא מפקד', '050-2323232', 'dani4@example.com', 31),
  new Soldier(17, 'מיכאל לוי', 'לא מפקד', '050-3434343', 'michael5@example.com', 27),
  new Soldier(18, 'יוסי שפירא', 'לא מפקד', '050-4545454', 'yossi6@example.com', 36),
  new Soldier(19, 'דני ישראלי', 'לא מפקד', '050-5656565', 'dani5@example.com', 23),
  new Soldier(20, 'מיכאל גולדברג', 'לא מפקד', '050-6767676', 'michael6@example.com', 38)
];

soldiers.forEach(s => {
  if (typeof s.totalHomeDaysHistory === 'undefined') {
    s.totalHomeDaysHistory = 0;
  }
});

module.exports = soldiers; 