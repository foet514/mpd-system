// Dashboard functionality

let clockStartTime = null;
let clockPaused = false;
let pausedTime = 0;
let clockInterval = null;
let currentUser = null;

// Initialize dashboard on page load
window.addEventListener('DOMContentLoaded', function() {
    const user = checkAuth();
    if (!user) return;
    
    currentUser = user;
    initializeDashboard();
    populateUserDatabase();
});

function initializeDashboard() {
    // Set user info in topbar
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRankDisplay').textContent = currentUser.rank + ' | ' + currentUser.division;
    document.getElementById('userRole').textContent = currentUser.rank;
    
    // Set user avatar initials
    const initials = currentUser.name.split(' ').map(n => n[0]).join('');
    document.getElementById('userAvatar').textContent = initials;
    
    // Show/hide admin-only menu items
    const adminMenuItems = document.querySelectorAll('.admin-only');
    if (currentUser.loginType === 'administrator') {
        adminMenuItems.forEach(item => item.style.display = 'block');
    } else {
        adminMenuItems.forEach(item => item.style.display = 'none');
    }
    
    // Show/hide clock management section
    if (canManageClock(currentUser)) {
        document.getElementById('clockManagementSection').style.display = 'block';
    }
    
    // Setup menu navigation
    setupMenuNavigation();
    
    // Populate tables
    populateUsersTable();
}

function setupMenuNavigation() {
    const menuLinks = document.querySelectorAll('.menu-link');
    
    menuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            menuLinks.forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            this.classList.add('active');
            
            // Get section name
            const sectionName = this.getAttribute('data-section');
            
            // Hide all sections
            const sections = document.querySelectorAll('.section');
            sections.forEach(s => s.classList.remove('active'));
            
            // Show selected section
            const selectedSection = document.getElementById(sectionName);
            if (selectedSection) {
                selectedSection.classList.add('active');
            }
        });
    });
}

// MODAL FUNCTIONS
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

function openAnnouncementModal() {
    openModal('announcementModal');
}

function openWarrantRequestModal() {
    openModal('warrantRequestModal');
}

function openClockManagementModal() {
    openModal('clockManagementModal');
}

function openKillSiteModal() {
    openModal('killSiteModal');
}

function openAddUserModal() {
    openModal('addUserModal');
}

function openAddRoleModal() {
    openModal('addRoleModal');
}

// Close modals when clicking outside
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

// ANNOUNCEMENT FUNCTIONS
function addAnnouncement() {
    const title = document.getElementById('announcementTitle').value;
    const content = document.getElementById('announcementContent').value;
    
    if (!title || !content) {
        alert('Please fill in all fields');
        return;
    }
    
    const table = document.getElementById('announcementsTable');
    const newRow = table.insertRow(0);
    newRow.innerHTML = `
        <td>${new Date().toLocaleDateString()}</td>
        <td>${title}</td>
        <td>${currentUser.name}</td>
        <td>${content.substring(0, 50)}...</td>
        <td><button class="btn btn-danger btn-small">Delete</button></td>
    `;
    
    // Clear form
    document.getElementById('announcementTitle').value = '';
    document.getElementById('announcementContent').value = '';
    
    closeModal('announcementModal');
    alert('Announcement posted successfully!');
}

// CLOCK IN/OUT FUNCTIONS
function clockIn() {
    if (clockStartTime) {
        alert('Already clocked in');
        return;
    }
    
    clockStartTime = Date.now() - pausedTime;
    pausedTime = 0;
    clockPaused = false;
    document.getElementById('clockStatus').textContent = 'Clocked In';
    document.getElementById('pauseBtn').style.display = 'inline-block';
    document.getElementById('resumeBtn').style.display = 'none';
    
    startClock();
    logEvent('Clock In', 'User clocked in for shift');
}

function clockOut() {
    if (!clockStartTime) {
        alert('Not clocked in');
        return;
    }
    
    const totalTime = calculateTotalTime();
    const clockOutTime = new Date();
    const clockInTime = new Date(clockStartTime);
    
    // Add to history
    const table = document.getElementById('clockHistoryTable');
    const newRow = table.insertRow(0);
    newRow.innerHTML = `
        <td>${clockInTime.toLocaleTimeString()}</td>
        <td>${clockOutTime.toLocaleTimeString()}</td>
        <td>${formatTime(totalTime)}</td>
        <td>0 min</td>
        <td><span class="badge badge-success">Complete</span></td>
    `;
    
    // Reset clock
    clockStartTime = null;
    pausedTime = 0;
    clearInterval(clockInterval);
    document.getElementById('clockStatus').textContent = 'Clocked Out';
    document.getElementById('clockDisplay').textContent = '00:00:00';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('resumeBtn').style.display = 'none';
    
    logEvent('Clock Out', 'User clocked out from shift');
}

function pauseShift() {
    if (!clockStartTime) return;
    clockPaused = true;
    clearInterval(clockInterval);
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('resumeBtn').style.display = 'inline-block';
    logEvent('Pause Shift', 'User paused their shift');
}

function resumeShift() {
    if (!clockStartTime) return;
    clockPaused = false;
    pausedTime += Date.now() - (clockStartTime + pausedTime);
    document.getElementById('pauseBtn').style.display = 'inline-block';
    document.getElementById('resumeBtn').style.display = 'none';
    startClock();
    logEvent('Resume Shift', 'User resumed their shift');
}

function startClock() {
    clockInterval = setInterval(function() {
        if (!clockPaused && clockStartTime) {
            const elapsed = Date.now() - clockStartTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            
            document.getElementById('clockDisplay').textContent = 
                String(hours).padStart(2, '0') + ':' +
                String(minutes % 60).padStart(2, '0') + ':' +
                String(seconds % 60).padStart(2, '0');
        }
    }, 1000);
}

function calculateTotalTime() {
    if (!clockStartTime) return 0;
    return Date.now() - clockStartTime - pausedTime;
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return `${hours}h ${minutes % 60}m`;
}

// WARRANT FUNCTIONS
function switchWarrantTab(tab) {
    // Hide all tabs
    document.getElementById('warrantActiveTab').style.display = 'none';
    document.getElementById('warrantRequestsTab').style.display = 'none';
    document.getElementById('warrantPendingTab').style.display = 'none';
    document.getElementById('warrantHistoryTab').style.display = 'none';
    
    // Show selected tab
    if (tab === 'active') document.getElementById('warrantActiveTab').style.display = 'block';
    else if (tab === 'requests') document.getElementById('warrantRequestsTab').style.display = 'block';
    else if (tab === 'pending') document.getElementById('warrantPendingTab').style.display = 'block';
    else if (tab === 'history') document.getElementById('warrantHistoryTab').style.display = 'block';
}

function createWarrantRequest() {
    const suspectName = document.getElementById('suspectName').value;
    const charge = document.getElementById('warrantCharge').value;
    const reason = document.getElementById('warrantReason').value;
    
    if (!suspectName || !charge || !reason) {
        alert('Please fill in all fields');
        return;
    }
    
    const table = document.getElementById('warrantRequestsTable');
    const newRow = table.insertRow(0);
    const requestId = 'WR' + String(Math.floor(Math.random() * 10000)).padStart(3, '0');
    
    newRow.innerHTML = `
        <td>${requestId}</td>
        <td>${currentUser.name}</td>
        <td>${suspectName}</td>
        <td>${reason}</td>
        <td>${new Date().toLocaleDateString()}</td>
        <td>
            <button class="btn btn-primary btn-small" onclick="submitWarrantRequest('${requestId}')">Submit</button>
        </td>
    `;
    
    // Clear form
    document.getElementById('suspectName').value = '';
    document.getElementById('suspectID').value = '';
    document.getElementById('warrantCharge').value = '';
    document.getElementById('warrantReason').value = '';
    
    closeModal('warrantRequestModal');
    alert('Warrant request created!');
}

function submitWarrantRequest(requestId) {
    const table = document.getElementById('warrantRequestsTable');
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        if (row.cells[0].textContent === requestId) {
            const suspect = row.cells[2].textContent;
            const reason = row.cells[3].textContent;
            
            // Move to pending
            const pendingTable = document.getElementById('warrantPendingTable');
            const newRow = pendingTable.insertRow(0);
            const warrantId = 'W' + String(Math.floor(Math.random() * 10000)).padStart(3, '0');
            
            newRow.innerHTML = `
                <td>${warrantId}</td>
                <td>${suspect}</td>
                <td>${currentUser.name}</td>
                <td>${new Date().toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-success btn-small" onclick="approveWarrant('${warrantId}')">Approve</button>
                    <button class="btn btn-danger btn-small" onclick="rejectWarrant('${warrantId}')">Reject</button>
                </td>
            `;
            
            // Remove from requests
            row.remove();
        }
    });
    
    logEvent('Warrant Submitted', 'Warrant request submitted for approval');
}

function approveWarrant(warrantId) {
    if (!hasAccessToFeature('hq')) {
        alert('You do not have permission to approve warrants');
        return;
    }
    
    const table = document.getElementById('warrantPendingTable');
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        if (row.cells[0].textContent === warrantId) {
            const suspect = row.cells[1].textContent;
            
            // Move to active
            const activeTable = document.getElementById('activeWarrantsTable');
            const newRow = activeTable.insertRow(0);
            
            newRow.innerHTML = `
                <td>${warrantId}</td>
                <td>${suspect}</td>
                <td>Felony Charge</td>
                <td>${new Date().toLocaleDateString()}</td>
                <td><span class="badge badge-danger">Active</span></td>
                <td>
                    <button class="btn btn-success btn-small" onclick="markWarrantServed('${warrantId}')">Mark Served</button>
                </td>
            `;
            
            // Remove from pending
            row.remove();
        }
    });
    
    alert('Warrant approved!');
    logEvent('Warrant Approved', `Warrant ${warrantId} approved`);
}

function rejectWarrant(warrantId) {
    const table = document.getElementById('warrantPendingTable');
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        if (row.cells[0].textContent === warrantId) {
            row.remove();
        }
    });
    
    alert('Warrant rejected');
    logEvent('Warrant Rejected', `Warrant ${warrantId} rejected`);
}

function markWarrantServed(warrantId) {
    const table = document.getElementById('activeWarrantsTable');
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        if (row.cells[0].textContent === warrantId) {
            const suspect = row.cells[1].textContent;
            
            // Move to history
            const historyTable = document.getElementById('warrantHistoryTable');
            const newRow = historyTable.insertRow(0);
            
            newRow.innerHTML = `
                <td>${warrantId}</td>
                <td>${suspect}</td>
                <td>${new Date().toLocaleDateString()}</td>
                <td>${new Date().toLocaleDateString()}</td>
                <td><span class="badge badge-success">Served</span></td>
            `;
            
            // Remove from active
            row.remove();
        }
    });
    
    alert('Warrant marked as served');
    logEvent('Warrant Served', `Warrant ${warrantId} marked as served`);
}

// CLOCK MANAGEMENT (For Managers)
function editEmployeeClock(employeeId) {
    openClockManagementModal();
    document.getElementById('clockAction').value = 'edit';
}

function voidEmployeeClock(employeeId) {
    if (confirm('Are you sure you want to void this shift?')) {
        alert('Shift voided');
        logEvent('Clock Voided', `Employee clock voided by ${currentUser.name}`);
    }
}

function applyClockManagement() {
    const action = document.getElementById('clockAction').value;
    const time = document.getElementById('clockTime').value;
    const reason = document.getElementById('clockReason').value;
    
    if (!time || !reason) {
        alert('Please fill in all fields');
        return;
    }
    
    alert(`Clock ${action} applied: ${time} (${reason})`);
    logEvent('Clock Management', `Manager applied clock ${action}: ${time}`);
    closeModal('clockManagementModal');
}

// KILL SITE FUNCTIONS
function submitKillSiteReport() {
    const date = document.getElementById('incidentDate').value;
    const officer = document.getElementById('officerName').value;
    const location = document.getElementById('killSiteLocation').value;
    const description = document.getElementById('killSiteDescription').value;
    
    if (!date || !officer || !location || !description) {
        alert('Please fill in all fields');
        return;
    }
    
    const table = document.getElementById('killSiteTable');
    const newRow = table.insertRow(0);
    const reportId = 'KS' + String(Math.floor(Math.random() * 10000)).padStart(3, '0');
    
    newRow.innerHTML = `
        <td>${reportId}</td>
        <td>${date}</td>
        <td>${location}</td>
        <td>${officer}</td>
        <td><span class="badge badge-warning">Under Review</span></td>
        <td><button class="btn btn-primary btn-small">View</button></td>
    `;
    
    // Clear form
    document.getElementById('incidentDate').value = '';
    document.getElementById('officerName').value = '';
    document.getElementById('killSiteLocation').value = '';
    document.getElementById('killSiteDescription').value = '';
    
    closeModal('killSiteModal');
    alert('Kill site report submitted');
    logEvent('Kill Site Report', 'New kill site report submitted');
}

// USER MANAGEMENT FUNCTIONS
function populateUsersTable() {
    const table = document.getElementById('usersTable');
    table.innerHTML = '';
    
    USERS_DB.forEach(user => {
        const row = table.insertRow();
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.name}</td>
            <td>${user.rank}</td>
            <td>${user.department}</td>
            <td>${user.division}</td>
            <td><span class="badge badge-info">${user.loginType}</span></td>
            <td>
                <button class="btn btn-primary btn-small" onclick="editUser(${user.id})">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteUser(${user.id})">Delete</button>
            </td>
        `;
    });
}

function createNewUser() {
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const name = document.getElementById('newName').value;
    const rank = document.getElementById('newRank').value;
    const department = document.getElementById('newDepartment').value;
    const division = document.getElementById('newDivision').value;
    const loginType = document.getElementById('newLoginType').value;
    
    if (!username || !password || !name || !rank) {
        alert('Please fill in all required fields');
        return;
    }
    
    const newUser = {
        id: USERS_DB.length + 1,
        username: username,
        password: password,
        name: name,
        rank: rank,
        role: loginType,
        department: department,
        division: division,
        loginType: loginType
    };
    
    USERS_DB.push(newUser);
    populateUsersTable();
    
    // Clear form
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('newName').value = '';
    
    closeModal('addUserModal');
    alert('User created successfully');
    logEvent('User Created', `New user ${username} created`);
}

function editUser(userId) {
    alert('Edit user: ' + userId);
    logEvent('User Edited', `User ${userId} edited`);
}

function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        const index = USERS_DB.findIndex(u => u.id === userId);
        if (index > -1) {
            USERS_DB.splice(index, 1);
            populateUsersTable();
            alert('User deleted');
            logEvent('User Deleted', `User ${userId} deleted`);
        }
    }
}

// ROLE MANAGEMENT FUNCTIONS
function createNewRole() {
    const roleName = document.getElementById('roleName').value;
    const roleID = document.getElementById('roleID').value;
    const description = document.getElementById('roleDescription').value;
    
    if (!roleName || !roleID || !description) {
        alert('Please fill in all fields');
        return;
    }
    
    alert('Role created: ' + roleName);
    closeModal('addRoleModal');
    logEvent('Role Created', `New role ${roleName} created`);
}

// LOGGING FUNCTIONS
function logEvent(eventType, description) {
    const timestamp = new Date().toLocaleString();
    const table = document.getElementById('eventLogTable');
    const row = table.insertRow(0);
    
    row.innerHTML = `
        <td>${timestamp}</td>
        <td>${currentUser.name}</td>
        <td>${eventType}</td>
        <td>${description}</td>
        <td><span class="badge badge-success">Success</span></td>
    `;
    
    // Also log to admin logs if in admin section
    const adminTable = document.getElementById('adminLogsTable');
    if (adminTable) {
        const adminRow = adminTable.insertRow(0);
        adminRow.innerHTML = `
            <td>${timestamp}</td>
            <td>${currentUser.name}</td>
            <td>${eventType}</td>
            <td>${description}</td>
            <td><span class="badge badge-success">Success</span></td>
        `;
    }
}

// HELPER: Populate user database in global scope
function populateUserDatabase() {
    window.USERS_DB = USERS_DB;
}