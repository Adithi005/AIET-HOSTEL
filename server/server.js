const express = require('express');
const cors = require('cors');
const { readDb, writeDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'AIETNEST Hostel Management Backend API',
    version: '1.0.0',
  });
});

// 2. User Profile
app.get('/api/profile', (req, res) => {
  const db = readDb();
  res.json(db.profile);
});

app.put('/api/profile', (req, res) => {
  const db = readDb();
  db.profile = { ...db.profile, ...req.body };
  writeDb(db);
  res.json(db.profile);
});

// 3. Outings
app.get('/api/outings', (req, res) => {
  const db = readDb();
  const usn = req.query.usn || db.profile.usn;
  const filtered = db.outings.filter((o) => o.usn === usn);
  res.json(filtered);
});

app.get('/api/outings/active', (req, res) => {
  const db = readDb();
  const usn = req.query.usn || db.profile.usn;
  const active = db.outings.find(
    (o) => o.usn === usn && (o.status === 'Outpass Generated' || o.status === 'Exited Gate')
  ) || null;
  res.json(active);
});

app.post('/api/outings', (req, res) => {
  const db = readDb();
  const profile = db.profile;

  if (profile.isOutingBlocked) {
    return res.status(403).json({
      error: `Outing privileges suspended: ${profile.outingBlockReason || 'Curfew violation'}`,
    });
  }

  const {
    outingType = 'Regular Outing',
    outDate = new Date().toISOString().split('T')[0],
    outTime = '09:00 AM',
    expectedInTime = req.body.isGovtHolidayOuting ? '02:00 PM' : '04:00 PM',
    destination = 'Local City Center',
    purpose = 'General outing',
    contactNumber = profile.contactNumber,
    emergencyContact = profile.guardianContact,
    isGovtHolidayOuting = false,
  } = req.body;

  const idNum = Math.floor(1000 + Math.random() * 9000);
  const outingId = `OUT-${idNum}`;
  const regId = `REG-OUT-${profile.usn}-${idNum}`;

  const newOuting = {
    id: outingId,
    registrationId: regId,
    barcode: `*${regId}*`,
    usn: profile.usn,
    studentName: profile.name,
    roomNumber: profile.roomNumber,
    hostelBlock: profile.hostelBlock,
    outingType: isGovtHolidayOuting ? 'Govt Holiday Outing' : outingType,
    outDate,
    outTime,
    expectedInTime: isGovtHolidayOuting ? '02:00 PM' : expectedInTime,
    destination,
    purpose,
    contactNumber,
    emergencyContact,
    appliedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'Outpass Generated',
    outpassToken: `OP-${Math.floor(10000 + Math.random() * 90000)}`,
    qrCodeValue: `AIETNEST-OP-${idNum}-${profile.usn}`,
    isGovtHolidayOuting,
    movementHistory: [],
  };

  db.outings.unshift(newOuting);

  // Add confirmation notification
  db.notifications.unshift({
    id: `NOTIF-${Date.now()}`,
    usn: profile.usn,
    title: 'Outpass Approved & Generated',
    message: `Your ${isGovtHolidayOuting ? 'Holiday' : 'Hostel'} Outpass #${newOuting.outpassToken} is ready for gate scan. Return by ${newOuting.expectedInTime}.`,
    timestamp: 'Just now',
    read: false,
  });

  writeDb(db);
  res.status(201).json(newOuting);
});

// Outing Gate Exit Scan
app.put('/api/outings/:id/exit', (req, res) => {
  const db = readDb();
  const outing = db.outings.find((o) => o.id === req.params.id);
  if (!outing) return res.status(404).json({ error: 'Outing not found' });

  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  outing.status = 'Exited Gate';
  outing.checkOutTime = nowTime;
  outing.checkOutGate = req.body.gate || 'Campus Main Gate 1';
  outing.checkOutGuard = req.body.guard || 'Security Guard Ramu';

  outing.movementHistory.push({
    id: `EVT-OUT-${Date.now()}`,
    action: 'Check Out',
    timestamp: `Today ${nowTime}`,
    gate: outing.checkOutGate,
    guardName: outing.checkOutGuard,
    remarks: 'Outpass barcode verified. Student exited campus.',
    barcode: outing.barcode,
    usn: outing.usn,
  });

  if (!db.gateLogs) db.gateLogs = [];
  db.gateLogs.unshift({
    id: `GLOG-${Date.now()}`,
    registrationId: outing.registrationId || `REG-${outing.id}`,
    barcode: outing.barcode || `*REG-${outing.id}*`,
    usn: outing.usn,
    studentName: outing.studentName,
    roomNumber: outing.roomNumber,
    type: 'Outing',
    destination: outing.destination,
    action: 'Check Out',
    timestamp: `${new Date().toISOString().split('T')[0]} ${nowTime}`,
    station: outing.checkOutGate,
    guardName: outing.checkOutGuard,
    remarks: 'Outpass barcode verified at gate. Student exited campus.',
  });

  writeDb(db);
  res.json(outing);
});

// Outing Gate Return Scan
app.put('/api/outings/:id/return', (req, res) => {
  const db = readDb();
  const outing = db.outings.find((o) => o.id === req.params.id);
  if (!outing) return res.status(404).json({ error: 'Outing not found' });

  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  outing.status = 'Returned & Closed';
  outing.checkInTime = nowTime;
  outing.checkInGate = req.body.gate || 'Campus Main Gate 1';
  outing.checkInGuard = req.body.guard || 'Security Guard Ramu';

  outing.movementHistory.push({
    id: `EVT-OUT-${Date.now()}`,
    action: 'Check In',
    timestamp: `Today ${nowTime}`,
    gate: outing.checkInGate,
    guardName: outing.checkInGuard,
    remarks: 'Return barcode scanned. Hosteller checked in safely.',
    barcode: outing.barcode,
    usn: outing.usn,
  });

  if (!db.gateLogs) db.gateLogs = [];
  db.gateLogs.unshift({
    id: `GLOG-${Date.now()}`,
    registrationId: outing.registrationId || `REG-${outing.id}`,
    barcode: outing.barcode || `*REG-${outing.id}*`,
    usn: outing.usn,
    studentName: outing.studentName,
    roomNumber: outing.roomNumber,
    type: 'Outing',
    destination: outing.destination,
    action: 'Check In',
    timestamp: `${new Date().toISOString().split('T')[0]} ${nowTime}`,
    station: outing.checkInGate,
    guardName: outing.checkInGuard,
    remarks: 'Return barcode scanned. Hosteller checked in safely before curfew.',
  });

  writeDb(db);
  res.json(outing);
});

// 4. Leaves & Homepasses
app.get('/api/leaves', (req, res) => {
  const db = readDb();
  const usn = req.query.usn || db.profile.usn;
  const filtered = db.leaves.filter((l) => l.usn === usn);
  res.json(filtered);
});

app.post('/api/leaves', (req, res) => {
  const db = readDb();
  const profile = db.profile;

  const {
    leaveType = 'Home Visit',
    startDate,
    endDate,
    startSession = 'Morning',
    returnSession = 'Evening',
    totalDays = 1,
    reason = 'Visiting home',
    destination = 'Home',
    isGovtHoliday = false,
    holidayName = '',
    isEmergency = false,
  } = req.body;

  const idNum = Math.floor(1000 + Math.random() * 9000);
  const leaveId = `LV-${idNum}`;
  const regId = `REG-LV-${profile.usn}-${idNum}`;

  const isAutoApproved = isGovtHoliday || isEmergency;
  const status = isAutoApproved ? 'Approved' : 'Pending';
  const gateToken = isAutoApproved ? `TK-${Math.floor(10000 + Math.random() * 90000)}` : undefined;

  const newLeave = {
    id: leaveId,
    registrationId: regId,
    barcode: `*${regId}*`,
    usn: profile.usn,
    studentName: profile.name,
    roomNumber: profile.roomNumber,
    leaveType,
    startDate,
    endDate,
    startSession,
    returnSession,
    totalDays: Number(totalDays),
    reason,
    destination,
    appliedDate: new Date().toISOString().split('T')[0],
    status,
    gateToken,
    tokenGeneratedAt: isAutoApproved ? new Date().toISOString() : undefined,
    isGovtHoliday: !!isGovtHoliday,
    holidayName,
    chargedDays: isGovtHoliday ? 0 : Number(totalDays),
    isAutoApproved,
    isEmergency: !!isEmergency,
    movementHistory: [],
  };

  if (!isGovtHoliday && isAutoApproved) {
    profile.leavesCount = (profile.leavesCount || 0) + Number(totalDays);
  }

  db.leaves.unshift(newLeave);

  db.notifications.unshift({
    id: `NOTIF-${Date.now()}`,
    usn: profile.usn,
    title: isGovtHoliday ? 'Holiday Homepass Approved' : 'Leave Application Submitted',
    message: isGovtHoliday
      ? `Your Holiday Homepass has been auto-sanctioned with 0 quota days used.`
      : `Your leave request for ${startDate} to ${endDate} has been forwarded for approval.`,
    timestamp: 'Just now',
    read: false,
  });

  writeDb(db);
  res.status(201).json(newLeave);
});

// Leave Gate Return Scan
app.put('/api/leaves/:id/return', (req, res) => {
  const db = readDb();
  const leave = db.leaves.find((l) => l.id === req.params.id);
  if (!leave) return res.status(404).json({ error: 'Leave not found' });

  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  leave.checkInTime = `${nowTime} (${new Date().toISOString().split('T')[0]})`;
  leave.checkInGate = req.body.gate || 'Campus Main Gate 2';
  leave.checkInGuard = req.body.guard || 'Head Guard Somanna';

  leave.movementHistory.push({
    id: `EVT-LV-${Date.now()}`,
    action: 'Check In',
    timestamp: `${new Date().toISOString().split('T')[0]} ${nowTime}`,
    gate: leave.checkInGate,
    guardName: leave.checkInGuard,
    remarks: 'Student checked in from leave. Outpass closed.',
    barcode: leave.barcode,
    usn: leave.usn,
  });

  writeDb(db);
  res.json(leave);
});

// 5. Notifications
app.get('/api/notifications', (req, res) => {
  const db = readDb();
  res.json(db.notifications);
});

app.put('/api/notifications/mark-read', (req, res) => {
  const db = readDb();
  db.notifications.forEach((n) => { n.read = true; });
  writeDb(db);
  res.json({ success: true });
});

// 6. Grievances
app.get('/api/grievances', (req, res) => {
  const db = readDb();
  res.json(db.grievances || []);
});

app.post('/api/grievances', (req, res) => {
  const db = readDb();
  if (!db.grievances) db.grievances = [];
  const profile = db.profile || {};
  const newTicket = {
    id: `GRV-${Math.floor(200 + Math.random() * 800)}`,
    usn: req.body.usn || profile.usn || '1RV22CS089',
    roomNumber: req.body.roomNumber || profile.roomNumber || 'B-304',
    category: req.body.category || 'General',
    description: req.body.description || '',
    photoUri: req.body.photoUri || undefined,
    urgency: req.body.urgency || 'Medium',
    status: 'Submitted',
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    adminRemark: 'Ticket lodged with live photo verification. Dispatched to maintenance.',
  };
  db.grievances.unshift(newTicket);
  writeDb(db);
  res.status(201).json(newTicket);
});

// 7. Mess Food Ratings & Live Photo Inspections
app.get('/api/mess/ratings', (req, res) => {
  const db = readDb();
  res.json(db.messRatings || []);
});

app.post('/api/mess/ratings', (req, res) => {
  const db = readDb();
  if (!db.messRatings) db.messRatings = [];
  const profile = db.profile || {};
  const newRating = {
    id: `MESS-${Date.now()}`,
    usn: req.body.usn || profile.usn || '1RV22CS089',
    studentName: req.body.studentName || profile.name || 'Aditya Sharma',
    roomNumber: req.body.roomNumber || profile.roomNumber || 'B-304',
    mealType: req.body.mealType || 'Lunch',
    rating: Number(req.body.rating) || 5,
    feedback: req.body.feedback || '',
    photoUri: req.body.photoUri || undefined,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
  };
  db.messRatings.unshift(newRating);
  writeDb(db);
  res.status(201).json(newRating);
});

// 8. Gate Movement Check-In & Check-Out Logs
app.get('/api/gate-logs', (req, res) => {
  const db = readDb();
  let logs = db.gateLogs || [];
  if (req.query.usn) {
    logs = logs.filter((l) => l.usn.toLowerCase() === req.query.usn.toLowerCase());
  }
  res.json(logs);
});

app.post('/api/gate-logs', (req, res) => {
  const db = readDb();
  if (!db.gateLogs) db.gateLogs = [];
  const profile = db.profile || {};
  const newLog = {
    id: `GLOG-${Date.now()}`,
    registrationId: req.body.registrationId || `REG-${Date.now()}`,
    barcode: req.body.barcode || `*REG-${Date.now()}*`,
    usn: req.body.usn || profile.usn || '1RV22CS089',
    studentName: req.body.studentName || profile.name || 'Aditya Sharma',
    roomNumber: req.body.roomNumber || profile.roomNumber || 'B-304',
    type: req.body.type || 'Outing',
    destination: req.body.destination || '',
    action: req.body.action || 'Check Out',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    station: req.body.station || 'Campus Main Gate 1',
    guardName: req.body.guardName || 'Security Guard Ramu',
    remarks: req.body.remarks || 'Barcode scan logged.',
    isLate: !!req.body.isLate,
  };
  db.gateLogs.unshift(newLog);
  writeDb(db);
  res.status(201).json(newLog);
});

// 9. AO Special Petitions (Fees Delay, Mess Bill Reduction, Study Certificate, Marks Card)
// Only Administrative Officer (AO) has executive authority to approve
app.get('/api/ao/petitions', (req, res) => {
  const db = readDb();
  let list = db.aoPetitions || [];
  if (req.query.usn) {
    list = list.filter((p) => p.usn.toUpperCase() === req.query.usn.trim().toUpperCase());
  }
  res.json(list);
});

app.post('/api/ao/petitions', (req, res) => {
  const db = readDb();
  if (!db.aoPetitions) db.aoPetitions = [];

  const newPetition = {
    id: `AO-PET-${Date.now().toString().slice(-5)}`,
    usn: req.body.usn || db.profile?.usn || '1RV22CS089',
    studentName: req.body.studentName || db.profile?.name || 'Aditya Sharma',
    roomNumber: req.body.roomNumber || db.profile?.roomNumber || 'B-304',
    hostelBlock: req.body.hostelBlock || 'Cauvery Block B-3',
    type: req.body.type || 'Fees Delay Permission',
    reason: req.body.reason || '',
    requestedDate: new Date().toISOString().split('T')[0],
    expectedPaymentDate: req.body.expectedPaymentDate || undefined,
    reductionDays: req.body.reductionDays ? Number(req.body.reductionDays) : undefined,
    purpose: req.body.purpose || undefined,
    targetSemester: req.body.targetSemester ? Number(req.body.targetSemester) : undefined,
    status: 'Pending AO Approval',
  };

  db.aoPetitions.unshift(newPetition);

  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `NOTIF-${Date.now()}`,
    usn: newPetition.usn,
    title: `Petition Submitted: ${newPetition.type}`,
    message: `Your application (${newPetition.id}) for ${newPetition.type} has been forwarded to the Administrative Officer (AO Desk). Only the AO can review and sanction this request.`,
    timestamp: 'Just now',
    read: false,
  });

  writeDb(db);
  res.status(201).json(newPetition);
});

app.put('/api/ao/petitions/:id/approve', (req, res) => {
  const db = readDb();
  if (!db.aoPetitions) return res.status(404).json({ error: 'No petitions found' });

  const petition = db.aoPetitions.find((p) => p.id === req.params.id);
  if (!petition) return res.status(404).json({ error: 'Petition not found' });

  const refNumber = req.body.certificateRefNumber || `AIET/AO/${Date.now().toString().slice(-6)}`;
  const aoRemarks = req.body.aoRemarks || 'Approved by Administrative Officer with institutional compliance.';

  petition.status = 'Approved by AO';
  petition.aoRemarks = aoRemarks;
  petition.approvedDate = new Date().toISOString().split('T')[0];
  petition.certificateRefNumber = refNumber;
  petition.dispatchedDocumentTitle =
    petition.type === 'Study Certificate'
      ? `Official_Study_Certificate_${petition.usn}.pdf`
      : petition.type === 'Marks Card / Grade Transcript'
      ? `Verified_Transcript_Sem${petition.targetSemester || 4}_${petition.usn}.pdf`
      : undefined;

  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `NOTIF-${Date.now()}`,
    usn: petition.usn,
    title: `AO Approved: ${petition.type}`,
    message: `Your request for ${petition.type} (Ref: ${refNumber}) has been sanctioned by the Administrative Officer. Official document/permission is now live.`,
    timestamp: 'Just now',
    read: false,
  });

  writeDb(db);
  res.json({ success: true, petition });
});

app.put('/api/ao/petitions/:id/reject', (req, res) => {
  const db = readDb();
  if (!db.aoPetitions) return res.status(404).json({ error: 'No petitions found' });

  const petition = db.aoPetitions.find((p) => p.id === req.params.id);
  if (!petition) return res.status(404).json({ error: 'Petition not found' });

  const aoRemarks = req.body.aoRemarks || 'Declined by Administrative Officer after institutional compliance review.';
  petition.status = 'Rejected by AO';
  petition.aoRemarks = aoRemarks;
  petition.approvedDate = new Date().toISOString().split('T')[0];

  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `NOTIF-${Date.now()}`,
    usn: petition.usn,
    title: `Petition Rejected: ${petition.type}`,
    message: `Your request for ${petition.type} was declined by the Administrative Officer.\nReason: "${aoRemarks}"`,
    timestamp: 'Just now',
    read: false,
  });

  writeDb(db);
  res.json({ success: true, petition });
});

// 10. Admin Leaves Management (Warden <=5d, SWO 5-8d, HOD 8-10d, AO Emergency/Coupon)
app.get('/api/admin/leaves', (req, res) => {
  const db = readDb();
  res.json(db.leaves || []);
});

app.put('/api/admin/leaves/:id/approve', (req, res) => {
  const db = readDb();
  const leave = db.leaves.find((l) => l.id === req.params.id);
  if (!leave) return res.status(404).json({ error: 'Leave not found' });

  const { approverRole = 'Warden', approverName = 'Hostel Authority', remarks = 'Sanctioned' } = req.body;
  const token = `TK-${Math.floor(10000 + Math.random() * 90000)}`;

  leave.status = 'Approved';
  leave.gateToken = token;
  leave.tokenGeneratedAt = new Date().toISOString();

  if (!leave.approvalSteps) leave.approvalSteps = [];
  leave.approvalSteps.push({
    role: approverRole,
    status: 'Approved',
    approverName,
    timestamp: new Date().toISOString(),
    remarks,
  });

  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `NOTIF-${Date.now()}`,
    usn: leave.usn,
    title: `Leave Sanctioned by ${approverRole}`,
    message: `Your leave application (${leave.id}) has been approved by ${approverName}.\nGate Pass Token: ${token}.\nRemarks: "${remarks}"`,
    timestamp: 'Just now',
    read: false,
  });

  writeDb(db);
  res.json({ success: true, leave });
});

app.put('/api/admin/leaves/:id/reject', (req, res) => {
  const db = readDb();
  const leave = db.leaves.find((l) => l.id === req.params.id);
  if (!leave) return res.status(404).json({ error: 'Leave not found' });

  const { approverRole = 'Authority', approverName = 'Admin', remarks = 'Rejected' } = req.body;
  leave.status = 'Rejected';

  if (!leave.approvalSteps) leave.approvalSteps = [];
  leave.approvalSteps.push({
    role: approverRole,
    status: 'Rejected',
    approverName,
    timestamp: new Date().toISOString(),
    remarks,
  });

  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `NOTIF-${Date.now()}`,
    usn: leave.usn,
    title: `Leave Declined by ${approverRole}`,
    message: `Your leave application (${leave.id}) was declined.\nReason: "${remarks}"`,
    timestamp: 'Just now',
    read: false,
  });

  writeDb(db);
  res.json({ success: true, leave });
});

// AO Emergency Leave Grant
app.post('/api/admin/leaves/emergency', (req, res) => {
  const db = readDb();
  const { usn, reason, startDate, endDate, totalDays, destination, remarks } = req.body;

  const idNum = Math.floor(1000 + Math.random() * 9000);
  const leaveId = `LV-EMG-${idNum}`;
  const regId = `REG-EMG-${usn}-${idNum}`;
  const gateToken = `TK-EMG-${Math.floor(10000 + Math.random() * 90000)}`;

  const emergencyLeave = {
    id: leaveId,
    registrationId: regId,
    barcode: `*${regId}*`,
    usn,
    studentName: req.body.studentName || 'Hosteller',
    roomNumber: req.body.roomNumber || 'Hostel Room',
    leaveType: 'Emergency Leave (AO Sanctioned)',
    startDate,
    endDate,
    totalDays: Number(totalDays) || 1,
    reason,
    destination,
    appliedDate: new Date().toISOString().split('T')[0],
    status: 'Approved',
    gateToken,
    tokenGeneratedAt: new Date().toISOString(),
    isEmergency: true,
    chargedDays: Number(totalDays) || 1,
    isAutoApproved: true,
    remarks: remarks || 'Sanctioned under AO emergency discretionary powers.',
    movementHistory: [],
  };

  if (!db.leaves) db.leaves = [];
  db.leaves.unshift(emergencyLeave);

  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `NOTIF-${Date.now()}`,
    usn,
    title: 'Emergency Leave Granted by AO',
    message: `Immediate Gate Pass Token: ${gateToken}. Departure authorized for ${destination}.`,
    timestamp: 'Just now',
    read: false,
  });

  writeDb(db);
  res.status(201).json(emergencyLeave);
});

// AO Duplicate / Compensation Pass
app.post('/api/admin/leaves/duplicate-coupon', (req, res) => {
  const db = readDb();
  const { usn, startDate, startSession, departureTime, endDate, returnSession, expectedReturnTime, leaveType, reason, destination, remarks } = req.body;

  const idNum = Math.floor(1000 + Math.random() * 9000);
  const couponNum = `AO-CUP-${Date.now().toString().slice(-5)}`;
  const regId = `REG-CUP-${usn}-${idNum}`;
  const gateToken = `TK-CUP-${Math.floor(10000 + Math.random() * 90000)}`;

  const couponPass = {
    id: `LV-CUP-${idNum}`,
    duplicateCouponNumber: couponNum,
    compensationPassNumber: couponNum,
    registrationId: regId,
    barcode: `*${regId}*`,
    usn,
    studentName: req.body.studentName || 'Hosteller',
    roomNumber: req.body.roomNumber || 'Hostel Room',
    leaveType: leaveType || 'Home Visit',
    startDate,
    endDate,
    startSession: startSession || 'Evening',
    departureTime: departureTime || '05:00 PM',
    returnSession: returnSession || 'Morning',
    expectedReturnTime: expectedReturnTime || '08:30 AM',
    totalDays: 2,
    chargedDays: 2,
    reason,
    destination: destination || 'Home',
    appliedDate: new Date().toISOString().split('T')[0],
    status: 'Approved',
    gateToken,
    tokenGeneratedAt: new Date().toISOString(),
    isDuplicateCoupon: true,
    isCompensationPass: true,
    remarks: remarks || 'AO compensation pass overriding 2-day cutoff.',
    movementHistory: [],
  };

  if (!db.leaves) db.leaves = [];
  db.leaves.unshift(couponPass);

  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `NOTIF-${Date.now()}`,
    usn,
    title: 'AO Duplicate / Compensation Pass Sanctioned',
    message: `Coupon #${couponNum} issued. Gate Pass Token: ${gateToken}. Departure permitted.`,
    timestamp: 'Just now',
    read: false,
  });

  writeDb(db);
  res.status(201).json(couponPass);
});

// 11. SWO Outpass Privilege Controls (Lock Latecomers, Unlock Blocked Students)
app.get('/api/admin/swo/blocked-students', (req, res) => {
  const db = readDb();
  res.json(db.blockedStudents || []);
});

app.post('/api/admin/swo/lock-outing', (req, res) => {
  const db = readDb();
  const { usn, reason } = req.body;
  const cleanUsn = usn.trim().toUpperCase();

  if (!db.blockedStudents) db.blockedStudents = [];
  const existing = db.blockedStudents.find((b) => b.usn === cleanUsn);

  const blockedRecord = {
    usn: cleanUsn,
    name: req.body.name || cleanUsn,
    roomNumber: req.body.roomNumber || 'Hostel Room',
    hostelBlock: req.body.hostelBlock || 'Hostel Block',
    branch: req.body.branch || 'Engg',
    reason: reason || 'Late return curfew breach (overdue check-in)',
    blockedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
  };

  if (!existing) {
    db.blockedStudents.unshift(blockedRecord);
  }

  if (db.profile && db.profile.usn === cleanUsn) {
    db.profile.isOutingBlocked = true;
    db.profile.outingBlockReason = blockedRecord.reason;
  }

  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `NOTIF-${Date.now()}`,
    usn: cleanUsn,
    title: 'Outpass Suspended by SWO',
    message: `Your outing generation privileges have been suspended.\nReason: "${blockedRecord.reason}". Report to SWO Desk for clearance.`,
    timestamp: 'Just now',
    read: false,
  });

  writeDb(db);
  res.json({ success: true, blockedStudent: blockedRecord });
});

app.put('/api/admin/swo/permit-outing/:usn', (req, res) => {
  const db = readDb();
  const cleanUsn = req.params.usn.trim().toUpperCase();

  if (db.blockedStudents) {
    db.blockedStudents = db.blockedStudents.filter((b) => b.usn.toUpperCase() !== cleanUsn);
  }

  if (db.profile && db.profile.usn.toUpperCase() === cleanUsn) {
    db.profile.isOutingBlocked = false;
    db.profile.outingBlockReason = null;
  }

  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `NOTIF-${Date.now()}`,
    usn: cleanUsn,
    title: 'Outpass Privileges Restored by SWO',
    message: 'Your disciplinary suspension has been cleared by the Student Welfare Officer. You may now generate outings.',
    timestamp: 'Just now',
    read: false,
  });

  writeDb(db);
  res.json({ success: true, message: `Outpass unlocked for ${cleanUsn}` });
});

// 12. HOD Academics & Attendance Management
app.get('/api/academics', (req, res) => {
  const db = readDb();
  res.json(db.academics || []);
});

app.put('/api/academics/update', (req, res) => {
  const db = readDb();
  const { semester, subjectCode, attendancePercentage, classesAttended, totalClasses, ia1, ia2, ia3 } = req.body;

  if (!db.academics) db.academics = [];
  const semRecord = db.academics.find((s) => s.semester === Number(semester));

  if (semRecord) {
    const sub = semRecord.subjects.find((s) => s.code === subjectCode);
    if (sub) {
      if (attendancePercentage !== undefined) sub.attendancePercentage = Number(attendancePercentage);
      if (classesAttended !== undefined) sub.classesAttended = Number(classesAttended);
      if (totalClasses !== undefined) sub.totalClasses = Number(totalClasses);
      if (ia1 !== undefined) sub.ia1 = Number(ia1);
      if (ia2 !== undefined) sub.ia2 = Number(ia2);
      if (ia3 !== undefined) sub.ia3 = Number(ia3);

      const totalPct = semRecord.subjects.reduce((sum, s) => sum + s.attendancePercentage, 0);
      semRecord.overallAttendance = Number((totalPct / semRecord.subjects.length).toFixed(1));
    }
  }

  writeDb(db);
  res.json({ success: true, academics: db.academics });
});

// 13. Warden Health Room Sick Bay Logging
app.get('/api/health-logs', (req, res) => {
  const db = readDb();
  res.json(db.healthLogs || []);
});

app.post('/api/health-logs', (req, res) => {
  const db = readDb();
  if (!db.healthLogs) db.healthLogs = [];

  const newLog = {
    id: `HLOG-${Date.now().toString().slice(-4)}`,
    usn: req.body.usn,
    studentName: req.body.studentName || 'Hosteller',
    roomNumber: req.body.roomNumber || 'B-304',
    hostelBlock: req.body.hostelBlock || 'Cauvery Block',
    date: req.body.date || new Date().toISOString().split('T')[0],
    status: req.body.status || 'Resting in Health Room',
    location: req.body.location || 'Hostel Health Room / Sick Bay',
    hospitalName: req.body.hospitalName,
    symptomsOrDiagnosis: req.body.symptomsOrDiagnosis,
    doctorName: req.body.doctorName || 'Dr. Preethi Rao (Hostel Physician)',
    prescribedMedicines: req.body.prescribedMedicines || 'Paracetamol, ORS',
    guardianIntimated: !!req.body.guardianIntimated,
    checkInTime: new Date().toISOString().replace('T', ' ').substring(0, 16),
    recordedByWarden: req.body.recordedByWarden || 'Hostel Warden',
    remarks: req.body.remarks || 'Resting in health room.',
  };

  db.healthLogs.unshift(newLog);
  writeDb(db);
  res.status(201).json(newLog);
});

app.put('/api/health-logs/:id/discharge', (req, res) => {
  const db = readDb();
  if (!db.healthLogs) return res.status(404).json({ error: 'No health logs found' });

  const log = db.healthLogs.find((h) => h.id === req.params.id);
  if (!log) return res.status(404).json({ error: 'Log not found' });

  log.status = 'Discharged / Recovered';
  log.checkOutTime = req.body.checkOutTime || new Date().toISOString().replace('T', ' ').substring(0, 16);
  if (req.body.remarks) log.remarks = `${log.remarks || ''} • Discharge Note: ${req.body.remarks}`;

  writeDb(db);
  res.json({ success: true, log });
});

// 14. Registered Students Directory
app.get('/api/admin/students', (req, res) => {
  const db = readDb();
  res.json(db.students || []);
});

// 15. Vehicle Bookings
app.get('/api/vehicle-bookings', (req, res) => {
  const db = readDb();
  res.json(db.vehicleBookings || []);
});

app.post('/api/vehicle-bookings', (req, res) => {
  const db = readDb();
  if (!db.vehicleBookings) db.vehicleBookings = [];

  const token = `VB-${req.body.destination === 'Vidyagiri' ? 'VID' : 'HLT'}-${Math.floor(1000 + Math.random() * 9000)}`;
  const newBooking = {
    id: `VB-ID-${Date.now()}`,
    bookingToken: token,
    usn: req.body.usn || db.profile?.usn || '1RV22CS089',
    studentName: req.body.studentName || db.profile?.name || 'Aditya Sharma',
    roomNumber: req.body.roomNumber || 'B-304',
    contactNumber: req.body.contactNumber || '+91 98765 43210',
    destination: req.body.destination || 'Health Center',
    vehicleType: req.body.vehicleType || 'Eeco',
    departureTime: req.body.departureTime || '09:15 AM',
    departureDate: req.body.departureDate || new Date().toISOString().split('T')[0],
    pickupPoint: req.body.pickupPoint || 'Hostel Care Porch',
    driverName: req.body.driverName || 'Campus Transport Pilot',
    driverContact: req.body.driverContact || '+91 98450 12345',
    vehiclePlate: req.body.vehiclePlate || 'KA-19-E-5511',
    seatNumber: db.vehicleBookings.length + 1,
    reason: req.body.reason || 'Medical / Exam Transit',
    status: 'Confirmed',
    bookedAt: 'Just now',
    isHealthCareEmergency: !!req.body.isHealthCareEmergency,
  };

  db.vehicleBookings.unshift(newBooking);
  writeDb(db);
  res.status(201).json(newBooking);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🚀 AIETNEST Backend API Server running on port ${PORT}`);
  console.log(`🔗 REST API URL: http://localhost:${PORT}/api`);
  console.log(`===============================================`);
});
