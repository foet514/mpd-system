import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { v4 as uuidv4 } from 'uuid';
import bcryptjs from 'bcryptjs';
import { initializeDatabase, getQuery, allQuery, runQuery } from './database.js';
import { 
  generateToken, 
  verifyToken, 
  checkRole, 
  checkRank,
  clockManagementRanks,
  rankHierarchy
} from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: true
}));

// Initialize database on startup
await initializeDatabase();

// ==================== AUTH ROUTES ====================

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await getQuery('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const passwordMatch = await bcryptjs.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Log the login event
    await runQuery(
      `INSERT INTO event_logs (id, user_id, action, description) 
       VALUES (?, ?, ?, ?)`,
      [uuidv4(), user.id, 'LOGIN', `User ${username} logged in`]
    );

    const token = generateToken(user.id, user.username, user.role_id, user.rank_id);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        badge_number: user.badge_number,
        role_id: user.role_id,
        rank_id: user.rank_id,
        rank_name: rankHierarchy[user.rank_id]
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', verifyToken, async (req, res) => {
  try {
    await runQuery(
      `INSERT INTO event_logs (id, user_id, action, description) 
       VALUES (?, ?, ?, ?)`,
      [uuidv4(), req.user.userId, 'LOGOUT', `User logged out`]
    );

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ==================== DASHBOARD ROUTES ====================

app.get('/api/dashboard', verifyToken, async (req, res) => {
  try {
    const stats = {
      total_active_warrants: 0,
      total_announcements: 0,
      active_employees: 0,
      today_clock_ins: 0
    };

    const warrants = await getQuery('SELECT COUNT(*) as count FROM warrants WHERE status = ?', ['active']);
    const announcements = await getQuery('SELECT COUNT(*) as count FROM announcements WHERE expires_at IS NULL OR expires_at > datetime("now")');
    const employees = await getQuery('SELECT COUNT(*) as count FROM users WHERE status = ?', ['active']);
    const clockIns = await getQuery(
      'SELECT COUNT(*) as count FROM clock_records WHERE DATE(clock_in_time) = DATE("now")'
    );

    stats.total_active_warrants = warrants?.count || 0;
    stats.total_announcements = announcements?.count || 0;
    stats.active_employees = employees?.count || 0;
    stats.today_clock_ins = clockIns?.count || 0;

    res.json(stats);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ==================== ANNOUNCEMENTS ROUTES ====================

// Get all announcements
app.get('/api/announcements', verifyToken, async (req, res) => {
  try {
    const announcements = await allQuery(
      `SELECT a.*, u.first_name, u.last_name FROM announcements a
       LEFT JOIN users u ON a.author_id = u.id
       WHERE a.expires_at IS NULL OR a.expires_at > datetime("now")
       ORDER BY a.created_at DESC`
    );

    res.json(announcements || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load announcements' });
  }
});

// Create announcement
app.post('/api/announcements', verifyToken, async (req, res) => {
  try {
    const { title, content, expires_at } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content required' });
    }

    const announcementId = uuidv4();

    await runQuery(
      `INSERT INTO announcements (id, title, content, author_id, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [announcementId, title, content, req.user.userId, expires_at || null]
    );

    res.json({ id: announcementId, message: 'Announcement created' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// ==================== CLOCK-IN/OUT ROUTES ====================

// Clock in
app.post('/api/clock/in', verifyToken, async (req, res) => {
  try {
    const clockId = uuidv4();
    const now = new Date().toISOString();

    await runQuery(
      `INSERT INTO clock_records (id, user_id, clock_in_time)
       VALUES (?, ?, ?)`,
      [clockId, req.user.userId, now]
    );

    await runQuery(
      `INSERT INTO event_logs (id, user_id, action, description)
       VALUES (?, ?, ?, ?)`,
      [uuidv4(), req.user.userId, 'CLOCK_IN', `User clocked in`]
    );

    res.json({ id: clockId, clock_in_time: now });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

// Clock out
app.post('/api/clock/out', verifyToken, async (req, res) => {
  try {
    const now = new Date().toISOString();

    // Get the latest clock-in record without clock-out
    const activeRecord = await getQuery(
      `SELECT * FROM clock_records 
       WHERE user_id = ? AND clock_out_time IS NULL AND shift_voided = 0
       ORDER BY clock_in_time DESC LIMIT 1`,
      [req.user.userId]
    );

    if (!activeRecord) {
      return res.status(400).json({ error: 'No active clock-in found' });
    }

    // Calculate total minutes
    const clockInTime = new Date(activeRecord.clock_in_time);
    const clockOutTime = new Date(now);
    let totalMinutes = Math.floor((clockOutTime - clockInTime) / (1000 * 60));

    // Subtract pause time if any
    if (activeRecord.pause_time && activeRecord.resume_time) {
      const pauseTime = new Date(activeRecord.pause_time);
      const resumeTime = new Date(activeRecord.resume_time);
      const pauseDuration = Math.floor((resumeTime - pauseTime) / (1000 * 60));
      totalMinutes -= pauseDuration;
    }

    await runQuery(
      `UPDATE clock_records 
       SET clock_out_time = ?, total_minutes = ?
       WHERE id = ?`,
      [now, totalMinutes, activeRecord.id]
    );

    await runQuery(
      `INSERT INTO event_logs (id, user_id, action, description)
       VALUES (?, ?, ?, ?)`,
      [uuidv4(), req.user.userId, 'CLOCK_OUT', `User clocked out. Total: ${totalMinutes} minutes`]
    );

    res.json({
      clock_out_time: now,
      total_minutes: totalMinutes
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

// Pause shift
app.post('/api/clock/pause', verifyToken, async (req, res) => {
  try {
    const now = new Date().toISOString();

    const activeRecord = await getQuery(
      `SELECT * FROM clock_records 
       WHERE user_id = ? AND clock_out_time IS NULL AND shift_voided = 0
       ORDER BY clock_in_time DESC LIMIT 1`,
      [req.user.userId]
    );

    if (!activeRecord) {
      return res.status(400).json({ error: 'No active shift found' });
    }

    await runQuery(
      `UPDATE clock_records SET pause_time = ? WHERE id = ?`,
      [now, activeRecord.id]
    );

    res.json({ pause_time: now });
  } catch (error) {
    res.status(500).json({ error: 'Failed to pause shift' });
  }
});

// Resume shift
app.post('/api/clock/resume', verifyToken, async (req, res) => {
  try {
    const now = new Date().toISOString();

    const activeRecord = await getQuery(
      `SELECT * FROM clock_records 
       WHERE user_id = ? AND clock_out_time IS NULL AND shift_voided = 0
       ORDER BY clock_in_time DESC LIMIT 1`,
      [req.user.userId]
    );

    if (!activeRecord) {
      return res.status(400).json({ error: 'No active shift found' });
    }

    await runQuery(
      `UPDATE clock_records SET resume_time = ? WHERE id = ?`,
      [now, activeRecord.id]
    );

    res.json({ resume_time: now });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resume shift' });
  }
});

// Get user's clock records
app.get('/api/clock/records', verifyToken, async (req, res) => {
  try {
    const records = await allQuery(
      `SELECT * FROM clock_records WHERE user_id = ? ORDER BY clock_in_time DESC`,
      [req.user.userId]
    );

    res.json(records || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load clock records' });
  }
});

// Manage clock records (Admin/Management functionality)
app.post('/api/clock/manage/:recordId', verifyToken, async (req, res) => {
  try {
    // Check if user has permission to manage clocks
    if (!clockManagementRanks.includes(req.user.rank)) {
      return res.status(403).json({ error: 'Insufficient rank to manage clocks' });
    }

    const { action, minutes, notes } = req.body;
    const { recordId } = req.params;

    const record = await getQuery('SELECT * FROM clock_records WHERE id = ?', [recordId]);

    if (!record) {
      return res.status(404).json({ error: 'Clock record not found' });
    }

    if (action === 'add_time') {
      await runQuery(
        `UPDATE clock_records SET total_minutes = total_minutes + ?, edited_by = ?, notes = ?
         WHERE id = ?`,
        [minutes, req.user.userId, notes || null, recordId]
      );

      await runQuery(
        `INSERT INTO admin_logs (id, admin_id, action, target_user_id, description, changes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), req.user.userId, 'CLOCK_ADD_TIME', record.user_id, `Added ${minutes} minutes`, `Added ${minutes} minutes`]
      );
    } else if (action === 'subtract_time') {
      await runQuery(
        `UPDATE clock_records SET total_minutes = total_minutes - ?, edited_by = ?, notes = ?
         WHERE id = ?`,
        [minutes, req.user.userId, notes || null, recordId]
      );

      await runQuery(
        `INSERT INTO admin_logs (id, admin_id, action, target_user_id, description, changes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), req.user.userId, 'CLOCK_SUBTRACT_TIME', record.user_id, `Subtracted ${minutes} minutes`, `Subtracted ${minutes} minutes`]
      );
    } else if (action === 'void') {
      await runQuery(
        `UPDATE clock_records SET shift_voided = 1, edited_by = ?, notes = ?
         WHERE id = ?`,
        [req.user.userId, notes || null, recordId]
      );

      await runQuery(
        `INSERT INTO admin_logs (id, admin_id, action, target_user_id, description)
         VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), req.user.userId, 'CLOCK_VOID', record.user_id, 'Shift voided']
      );
    }

    res.json({ message: 'Clock record updated' });
  } catch (error) {
    console.error('Clock management error:', error);
    res.status(500).json({ error: 'Failed to manage clock record' });
  }
});

// ==================== WARRANT ROUTES ====================

// Get all active warrants
app.get('/api/warrants', verifyToken, async (req, res) => {
  try {
    const warrants = await allQuery(
      `SELECT w.*, u.first_name, u.last_name FROM warrants w
       LEFT JOIN users u ON w.issued_by = u.id
       WHERE w.status = ?
       ORDER BY w.issued_date DESC`,
      ['active']
    );

    res.json(warrants || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load warrants' });
  }
});

// Get warrant requests (pending approval)
app.get('/api/warrant-requests', verifyToken, async (req, res) => {
  try {
    const requests = await allQuery(
      `SELECT wr.*, u1.first_name as requester_first, u1.last_name as requester_last,
              u2.first_name as approver_first, u2.last_name as approver_last
       FROM warrant_requests wr
       LEFT JOIN users u1 ON wr.requester_id = u1.id
       LEFT JOIN users u2 ON wr.approved_by = u2.id
       ORDER BY wr.requested_date DESC`
    );

    res.json(requests || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load warrant requests' });
  }
});

// Submit warrant request
app.post('/api/warrant-requests', verifyToken, async (req, res) => {
  try {
    const { suspect_name, warrant_type, description } = req.body;

    if (!suspect_name || !warrant_type) {
      return res.status(400).json({ error: 'Suspect name and warrant type required' });
    }

    const requestId = uuidv4();

    await runQuery(
      `INSERT INTO warrant_requests (id, requester_id, suspect_name, warrant_type, description)
       VALUES (?, ?, ?, ?, ?)`,
      [requestId, req.user.userId, suspect_name, warrant_type, description || null]
    );

    await runQuery(
      `INSERT INTO event_logs (id, user_id, action, description)
       VALUES (?, ?, ?, ?)`,
      [uuidv4(), req.user.userId, 'WARRANT_REQUEST_SUBMITTED', `Warrant request for ${suspect_name}`]
    );

    res.json({ id: requestId, message: 'Warrant request submitted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit warrant request' });
  }
});

// Approve warrant request
app.post('/api/warrant-requests/:requestId/approve', verifyToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { notes } = req.body;

    const request = await getQuery('SELECT * FROM warrant_requests WHERE id = ?', [requestId]);

    if (!request) {
      return res.status(404).json({ error: 'Warrant request not found' });
    }

    const warrantId = uuidv4();
    const warrantNumber = `WRT-${Date.now()}`;

    // Create warrant
    await runQuery(
      `INSERT INTO warrants (id, warrant_number, suspect_name, warrant_type, description, issued_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [warrantId, warrantNumber, request.suspect_name, request.warrant_type, request.description, req.user.userId]
    );

    // Update request status
    await runQuery(
      `UPDATE warrant_requests SET status = ?, warrant_id = ?, approved_by = ?, approved_date = ?, notes = ?
       WHERE id = ?`,
      ['approved', warrantId, req.user.userId, new Date().toISOString(), notes || null, requestId]
    );

    await runQuery(
      `INSERT INTO admin_logs (id, admin_id, action, description)
       VALUES (?, ?, ?, ?)`,
      [uuidv4(), req.user.userId, 'WARRANT_APPROVED', `Warrant ${warrantNumber} approved`]
    );

    res.json({ warrant_id: warrantId, warrant_number: warrantNumber });
  } catch (error) {
    console.error('Warrant approval error:', error);
    res.status(500).json({ error: 'Failed to approve warrant' });
  }
});

// Deny warrant request
app.post('/api/warrant-requests/:requestId/deny', verifyToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { notes } = req.body;

    await runQuery(
      `UPDATE warrant_requests SET status = ?, approved_by = ?, approved_date = ?, notes = ?
       WHERE id = ?`,
      ['denied', req.user.userId, new Date().toISOString(), notes || null, requestId]
    );

    await runQuery(
      `INSERT INTO admin_logs (id, admin_id, action, description)
       VALUES (?, ?, ?, ?)`,
      [uuidv4(), req.user.userId, 'WARRANT_DENIED', `Warrant request denied`]
    );

    res.json({ message: 'Warrant request denied' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deny warrant request' });
  }
});

// ==================== EVENT LOGS ROUTES ====================

app.get('/api/event-logs', verifyToken, checkRole(['role_admin']), async (req, res) => {
  try {
    const logs = await allQuery(
      `SELECT el.*, u.username FROM event_logs el
       LEFT JOIN users u ON el.user_id = u.id
       ORDER BY el.created_at DESC
       LIMIT 500`
    );

    res.json(logs || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load event logs' });
  }
});

// ==================== ADMIN LOGS ROUTES ====================

app.get('/api/admin-logs', verifyToken, checkRole(['role_admin']), async (req, res) => {
  try {
    const logs = await allQuery(
      `SELECT al.*, u1.username as admin_name, u2.username as target_name
       FROM admin_logs al
       LEFT JOIN users u1 ON al.admin_id = u1.id
       LEFT JOIN users u2 ON al.target_user_id = u2.id
       ORDER BY al.created_at DESC
       LIMIT 500`
    );

    res.json(logs || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load admin logs' });
  }
});

// ==================== OVERSIGHT LOGS ROUTES ====================

app.get('/api/oversight-logs', verifyToken, async (req, res) => {
  try {
    const logs = await allQuery(
      `SELECT ol.*, u1.username as overseer_name, u2.username as user_name
       FROM oversight_logs ol
       LEFT JOIN users u1 ON ol.overseer_id = u1.id
       LEFT JOIN users u2 ON ol.user_id = u2.id
       ORDER BY ol.created_at DESC
       LIMIT 500`
    );

    res.json(logs || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load oversight logs' });
  }
});

// ==================== USER MANAGEMENT ROUTES ====================

// Get all users
app.get('/api/users', verifyToken, async (req, res) => {
  try {
    const users = await allQuery(
      `SELECT u.*, r.role_name, rk.rank_name FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN ranks rk ON u.rank_id = rk.id
       ORDER BY u.created_at DESC`
    );

    res.json(users || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// Get single user
app.get('/api/users/:userId', verifyToken, async (req, res) => {
  try {
    const user = await getQuery(
      `SELECT u.*, r.role_name, rk.rank_name FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN ranks rk ON u.rank_id = rk.id
       WHERE u.id = ?`,
      [req.params.userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load user' });
  }
});

// Create user
app.post('/api/users', verifyToken, checkRole(['role_admin']), async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, badge_number, role_id, rank_id, division_id, unit_id } = req.body;

    if (!username || !email || !password || !first_name || !last_name || !rank_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);
    const userId = uuidv4();

    await runQuery(
      `INSERT INTO users (id, username, password, email, first_name, last_name, badge_number, role_id, rank_id, division_id, unit_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, username, hashedPassword, email, first_name, last_name, badge_number || null, role_id || 'role_employee', rank_id, division_id || null, unit_id || null]
    );

    await runQuery(
      `INSERT INTO admin_logs (id, admin_id, action, target_user_id, description)
       VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), req.user.userId, 'USER_CREATED', userId, `Created user ${username}`]
    );

    res.json({ id: userId, message: 'User created successfully' });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
app.put('/api/users/:userId', verifyToken, checkRole(['role_admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, first_name, last_name, role_id, rank_id, status, division_id, unit_id } = req.body;

    let updateQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
    const params = [];

    if (email) {
      updateQuery += ', email = ?';
      params.push(email);
    }
    if (first_name) {
      updateQuery += ', first_name = ?';
      params.push(first_name);
    }
    if (last_name) {
      updateQuery += ', last_name = ?';
      params.push(last_name);
    }
    if (role_id) {
      updateQuery += ', role_id = ?';
      params.push(role_id);
    }
    if (rank_id) {
      updateQuery += ', rank_id = ?';
      params.push(rank_id);
    }
    if (status) {
      updateQuery += ', status = ?';
      params.push(status);
    }
    if (division_id !== undefined) {
      updateQuery += ', division_id = ?';
      params.push(division_id);
    }
    if (unit_id !== undefined) {
      updateQuery += ', unit_id = ?';
      params.push(unit_id);
    }

    updateQuery += ' WHERE id = ?';
    params.push(userId);

    await runQuery(updateQuery, params);

    await runQuery(
      `INSERT INTO admin_logs (id, admin_id, action, target_user_id, description)
       VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), req.user.userId, 'USER_UPDATED', userId, 'User updated']
    );

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ==================== ROLE MANAGEMENT ROUTES ====================

// Get all roles
app.get('/api/roles', verifyToken, async (req, res) => {
  try {
    const roles = await allQuery('SELECT * FROM roles ORDER BY created_at DESC');
    res.json(roles || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load roles' });
  }
});

// ==================== DIVISION & UNIT ROUTES ====================

// Get all divisions
app.get('/api/divisions', verifyToken, async (req, res) => {
  try {
    const divisions = await allQuery('SELECT * FROM divisions ORDER BY division_name');
    res.json(divisions || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load divisions' });
  }
});

// Get units by division
app.get('/api/divisions/:divisionId/units', verifyToken, async (req, res) => {
  try {
    const units = await allQuery(
      'SELECT * FROM units WHERE division_id = ? ORDER BY unit_name',
      [req.params.divisionId]
    );
    res.json(units || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load units' });
  }
});

// ==================== KILL SITE ROUTES ====================

// Get all kill sites
app.get('/api/kill-sites', verifyToken, async (req, res) => {
  try {
    const sites = await allQuery(
      `SELECT ks.*, u.first_name, u.last_name FROM kill_sites ks
       LEFT JOIN users u ON ks.reported_by = u.id
       ORDER BY ks.date_reported DESC`
    );
    res.json(sites || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load kill sites' });
  }
});

// Create kill site report
app.post('/api/kill-sites', verifyToken, async (req, res) => {
  try {
    const { location, description } = req.body;

    if (!location) {
      return res.status(400).json({ error: 'Location required' });
    }

    const siteId = uuidv4();

    await runQuery(
      `INSERT INTO kill_sites (id, location, description, reported_by)
       VALUES (?, ?, ?, ?)`,
      [siteId, location, description || null, req.user.userId]
    );

    await runQuery(
      `INSERT INTO event_logs (id, user_id, action, description)
       VALUES (?, ?, ?, ?)`,
      [uuidv4(), req.user.userId, 'KILL_SITE_REPORTED', `Kill site reported at ${location}`]
    );

    res.json({ id: siteId, message: 'Kill site reported' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to report kill site' });
  }
});

// ==================== CHAIN OF COMMAND ROUTES ====================

app.get('/api/chain-of-command', verifyToken, async (req, res) => {
  try {
    const ranks = await allQuery(
      `SELECT r.id, r.rank_name, r.rank_order, COUNT(u.id) as officer_count
       FROM ranks r
       LEFT JOIN users u ON r.id = u.rank_id
       GROUP BY r.id
       ORDER BY r.rank_order ASC`
    );

    res.json(ranks || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load chain of command' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`MPD System server running on port ${PORT}`);
  console.log('Administrator credentials:');
  console.log('Username: foet514');
  console.log('Password: Khamod21');
});
