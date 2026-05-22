// Authentication system
const ADMIN_CREDENTIALS = {
    username: 'foet514',
    password: 'Khamod21'
};

// User database with roles
const USERS_DB = [
    {
        id: 1,
        username: 'foet514',
        password: 'Khamod21',
        name: 'Administrator',
        rank: 'Administrator',
        role: 'administrator',
        department: 'Administration',
        division: 'Administration',
        loginType: 'administrator'
    },
    {
        id: 2,
        username: 'chief.police',
        password: 'password123',
        name: 'Chief of Police',
        rank: 'Chief of Police',
        role: 'hq',
        department: 'MPD HQ',
        division: 'Command',
        loginType: 'hq'
    },
    {
        id: 3,
        username: 'deputy.chief',
        password: 'password123',
        name: 'Deputy Chief of Police',
        rank: 'Deputy Chief of Police',
        role: 'hq',
        department: 'MPD HQ',
        division: 'Command',
        loginType: 'hq'
    },
    {
        id: 4,
        username: 'police.admin',
        password: 'password123',
        name: 'Police Administrator',
        rank: 'Police Administrator',
        role: 'hq',
        department: 'MPD HQ',
        division: 'Administration',
        loginType: 'hq'
    },
    {
        id: 5,
        username: 'police.commander',
        password: 'password123',
        name: 'Police Commander',
        rank: 'Police Commander',
        role: 'hicomm',
        department: 'Patrol Services Division',
        division: 'Patrol Services - North',
        loginType: 'hicomm'
    },
    {
        id: 6,
        username: 'deputy.police.commander',
        password: 'password123',
        name: 'Deputy Police Commander',
        rank: 'Deputy Police Commander',
        role: 'hicomm',
        department: 'Patrol Services Division',
        division: 'Patrol Services - South',
        loginType: 'hicomm'
    },
    {
        id: 7,
        username: 'police.inspector',
        password: 'password123',
        name: 'Police Inspector',
        rank: 'Police Inspector',
        role: 'unitcommand',
        department: 'Patrol Services Division',
        division: 'Patrol Services - North',
        loginType: 'unitcommand'
    },
    {
        id: 8,
        username: 'captain.unit',
        password: 'password123',
        name: 'Captain',
        rank: 'Captain',
        role: 'unitcommand',
        department: 'Patrol Services Division',
        division: 'Patrol Services - South',
        loginType: 'unitcommand'
    },
    {
        id: 9,
        username: 'lieutenant.staff',
        password: 'password123',
        name: 'Lieutenant',
        rank: 'Lieutenant',
        role: 'unitstaff',
        department: 'Patrol Services Division',
        division: 'Patrol Services - North',
        loginType: 'unitstaff'
    },
    {
        id: 10,
        username: 'sergeant.unit',
        password: 'password123',
        name: 'Sergeant',
        rank: 'Sergeant',
        role: 'unitstaff',
        department: 'Investigation Office Division',
        division: 'Investigation Unit',
        loginType: 'unitstaff'
    },
    {
        id: 11,
        username: 'staff.sergeant',
        password: 'password123',
        name: 'Staff Sergeant',
        rank: 'Staff Sergeant',
        role: 'unitstaff',
        department: 'MPD Academy',
        division: 'Office of Integrated Training',
        loginType: 'unitstaff'
    },
    {
        id: 12,
        username: 'officer.employee',
        password: 'password123',
        name: 'Police Officer',
        rank: 'Police Officer',
        role: 'employee',
        department: 'Patrol Services Division',
        division: 'Patrol Services - North',
        loginType: 'employee'
    }
];

// Login form handler
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginType = document.getElementById('loginType').value;
    const errorDiv = document.getElementById('loginError');
    
    // Clear previous errors
    errorDiv.classList.remove('show');
    errorDiv.textContent = '';
    
    // Validate login type selection
    if (!loginType) {
        errorDiv.textContent = 'Please select a login type';
        errorDiv.classList.add('show');
        return;
    }
    
    // Find user
    const user = USERS_DB.find(u => u.username === username && u.password === password);
    
    if (!user) {
        errorDiv.textContent = 'Invalid username or password';
        errorDiv.classList.add('show');
        return;
    }
    
    // Validate login type access
    if (user.loginType !== loginType) {
        errorDiv.textContent = 'Your rank does not have access to this login type';
        errorDiv.classList.add('show');
        return;
    }
    
    // Valid login
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('loginTime', new Date().toISOString());
    window.location.href = 'dashboard.html';
});

// Check authentication on page load
function checkAuth() {
    const user = localStorage.getItem('currentUser');
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    return JSON.parse(user);
}

// Get current user
function getCurrentUser() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

// Logout function
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
    window.location.href = 'index.html';
}

// Check access level for features
function hasAccessToFeature(requiredRole) {
    const user = getCurrentUser();
    if (!user) return false;
    
    const roleHierarchy = {
        'administrator': 10,
        'hq': 8,
        'hicomm': 6,
        'unitcommand': 4,
        'unitstaff': 2,
        'employee': 1
    };
    
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

// Specific rank checks
function canManageClock(user = getCurrentUser()) {
    const managerRanks = [
        'Chief of Police',
        'Deputy Chief of Police',
        'Police Administrator',
        'Police Commander',
        'Deputy Police Commander',
        'Police Inspector',
        'Captain'
    ];
    return managerRanks.includes(user.rank);
}