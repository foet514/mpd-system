# MPD System - Metropolitan Police Department Management System

## Overview
MPD System is a comprehensive web-based management system designed for the Metropolitan Police Department. It provides role-based access, shift management, warrant tracking, and administrative oversight.

## Features

### Authentication & Access Control
- **Administrator Login**: Full system access
- **MPD HQ Login**: For Chief of Police, Deputy Chief of Police, Police Administrator
- **High Command Login**: For Police Commander, Deputy Police Commander
- **Unit Command Login**: For Police Inspector, Captain
- **Unit Staff Login**: For Lieutenant, Staff Sergeant, Sergeant
- **Employee Login**: For Police Officers and staff

### Core Modules

#### 1. Dashboard
- Real-time overview of system status
- Quick statistics (users, announcements, warrants, clocked-in staff)
- Recent activity log

#### 2. Clock In/Out System
- Clock in and out functionality
- Time tracking with pause/resume features
- Total hours calculation
- Clock management for authorized personnel (Edit, Void, Add/Subtract time)

**Clock Management Authorized Ranks:**
- Chief of Police
- Deputy Chief of Police
- Police Administrator
- Police Commander
- Deputy Police Commander
- Police Inspector
- Captain

#### 3. Warrant System
- **Active Warrants**: View all current active warrants
- **Warrant Requests**: Submit new warrant requests
- **Pending Approval**: Review warrants awaiting approval
- **Warrant History**: View completed warrants

#### 4. Announcements
- Post system announcements
- View all announcements
- Manage announcement lifecycle

#### 5. Chain of Command
- Organizational structure
- Department hierarchy
- Division organization

#### 6. Event Log
- All system and user activities logged
- Timestamp tracking
- Status tracking

#### 7. Kill Site Reports
- Officer-involved shooting documentation
- Report submission and tracking
- Status monitoring

#### 8. User Management (Admin Only)
- Create new users
- Edit user information
- Delete users
- Assign ranks and departments

#### 9. Role Management (Admin Only)
- Create custom roles
- Define permissions
- Manage access levels

#### 10. Administrator Logs
- Track all admin actions
- Audit trail
- Activity monitoring

#### 11. Oversight Logs
- System compliance tracking
- Oversight records
- Approval documentation

## Organizational Structure

### Main Divisions

#### Patrol Services Division
- Patrol Services - North
- Patrol Services - South

#### Investigation Office Division
- Investigation Unit
- Turnover Affairs Bureau

#### MPD Academy
- Office of Integrated Training
- Office of Leadership & Management

#### Administration
- Administration Division

## Default Credentials

**Administrator Account:**
- Username: `foet514`
- Password: `Khamod21`

Additional demo accounts are available in the system for testing different roles.

## User Roles and Access Levels

### Administrator (Role Level: 10)
- Full system access
- All features available
- User and role management
- Access to all logs

### MPD HQ (Role Level: 8)
- Warrant approval
- System oversight
- All officer views
- Announcement creation

### High Command (Role Level: 6)
- Warrant review
- Clock management
- Division management
- Limited admin access

### Unit Command (Role Level: 4)
- Unit management
- Clock editing
- Warrant submission
- Staff monitoring

### Unit Staff (Role Level: 2)
- Limited access
- Warrant requests
- Clock in/out
- Event viewing

### Employee (Role Level: 1)
- Clock in/out
- View announcements
- Submit warrant requests
- Basic event viewing

## Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Browser LocalStorage for data persistence
- **Authentication**: Session-based with role verification
- **Styling**: Custom CSS with responsive design

## File Structure

```
mpd-system/
├── index.html          # Login page
├── dashboard.html      # Main dashboard
├── styles.css         # Global styles
├── auth.js            # Authentication system
├── dashboard.js       # Dashboard functionality
└── README.md          # Documentation
```

## Usage

1. Open `index.html` in a web browser
2. Enter credentials
3. Select appropriate login type based on rank
4. Access dashboard and modules

## Security Notes

- User data is stored in browser localStorage
- Passwords are stored in plaintext (demo only - use proper hashing in production)
- All session data is cleared on logout
- Role-based access control enforced on UI and function levels

## Features Highlights

### Time Tracking
- Automatic time calculation
- Pause/resume functionality
- Manager override capabilities
- Historical records

### Warrant Management
- Multi-stage workflow
- Approval process
- Status tracking
- Complete audit trail

### Access Control
- 6 distinct login types
- Role-based feature visibility
- Permission-based functionality
- Hierarchical access levels

### Logging & Compliance
- Comprehensive event logging
- Administrative action tracking
- Oversight documentation
- Timestamp verification

## Future Enhancements

- Database backend integration
- Real API endpoints
- Enhanced security (password hashing, JWT tokens)
- Export functionality (PDF, CSV)
- Email notifications
- Mobile app
- Advanced reporting
- Integration with external systems

## Support

For issues or questions, contact the system administrator.

---

**Version**: 1.0  
**Last Updated**: January 2024  
**Status**: Production Ready (Demo Mode)
