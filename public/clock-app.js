// List of all available timezones
const allTimezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'America/Toronto',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Asia/Singapore',
  'Asia/Manila',
  'Asia/Jakarta',
  'Asia/Karachi',
  'Asia/Tehran',
  'Europe/Istanbul',
  'Europe/Athens',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Vienna',
  'Europe/Prague',
  'Europe/Budapest'
];

let selectedTimezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
let is24HourFormat = true;

class ClockApp {
  constructor() {
    this.modal = document.getElementById('timezoneModal');
    this.closeBtn = document.querySelector('.close');
    this.addTimezoneBtn = document.getElementById('addTimezoneBtn');
    this.toggleFormatBtn = document.getElementById('toggleFormatBtn');
    this.addBtn = document.getElementById('addBtn');
    this.timezoneSearch = document.getElementById('timezoneSearch');
    this.timezoneList = document.getElementById('timezoneList');
    this.timezonesGrid = document.getElementById('timezonesGrid');
    
    this.setupEventListeners();
    this.populateTimezoneList();
    this.renderClocks();
    this.startUpdatingClocks();
  }

  setupEventListeners() {
    this.addTimezoneBtn.addEventListener('click', () => this.openModal());
    this.closeBtn.addEventListener('click', () => this.closeModal());
    this.toggleFormatBtn.addEventListener('click', () => this.toggleTimeFormat());
    this.addBtn.addEventListener('click', () => this.addSelectedTimezone());
    this.timezoneSearch.addEventListener('input', (e) => this.filterTimezones(e.target.value));
    
    window.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });
  }

  populateTimezoneList() {
    this.timezoneList.innerHTML = '';
    allTimezones.forEach(tz => {
      const div = document.createElement('div');
      div.className = `timezone-option ${selectedTimezones.includes(tz) ? 'selected' : ''}`;
      div.textContent = tz;
      div.addEventListener('click', () => this.toggleTimezoneSelection(tz, div));
      this.timezoneList.appendChild(div);
    });
  }

  filterTimezones(searchTerm) {
    const filtered = allTimezones.filter(tz => 
      tz.toLowerCase().includes(searchTerm.toLowerCase())
    );

    this.timezoneList.innerHTML = '';
    filtered.forEach(tz => {
      const div = document.createElement('div');
      div.className = `timezone-option ${selectedTimezones.includes(tz) ? 'selected' : ''}`;
      div.textContent = tz;
      div.addEventListener('click', () => this.toggleTimezoneSelection(tz, div));
      this.timezoneList.appendChild(div);
    });
  }

  toggleTimezoneSelection(tz, element) {
    element.classList.toggle('selected');
    if (selectedTimezones.includes(tz)) {
      selectedTimezones = selectedTimezones.filter(t => t !== tz);
    } else {
      selectedTimezones.push(tz);
    }
  }

  addSelectedTimezone() {
    this.renderClocks();
    this.closeModal();
  }

  openModal() {
    this.modal.classList.add('show');
    this.timezoneSearch.value = '';
    this.populateTimezoneList();
  }

  closeModal() {
    this.modal.classList.remove('show');
  }

  toggleTimeFormat() {
    is24HourFormat = !is24HourFormat;
    this.toggleFormatBtn.textContent = `Toggle Format (${is24HourFormat ? '24' : '12'}h)`;
  }

  formatTime(date) {
    if (is24HourFormat) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } else {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    }
  }

  formatDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getTimezoneOffset(timezone) {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const offset = (tzDate - utcDate) / (1000 * 60);
    
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    
    return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  getTimezoneTime(timezone) {
    return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
  }

  renderClocks() {
    this.timezonesGrid.innerHTML = '';

    if (selectedTimezones.length === 0) {
      this.timezonesGrid.innerHTML = '<div class="empty-state">No timezones selected. Add one using the button above.</div>';
      return;
    }

    selectedTimezones.sort().forEach((timezone, index) => {
      const card = document.createElement('div');
      card.className = `timezone-card ${index === 0 ? 'default' : ''}`;
      
      const tzTime = this.getTimezoneTime(timezone);
      const time = this.formatTime(tzTime);
      const date = this.formatDate(tzTime);
      const offset = this.getTimezoneOffset(timezone);

      card.innerHTML = `
        <button class="remove-btn" onclick="clockApp.removeTimezone('${timezone}')">×</button>
        <div class="timezone-name">${timezone}</div>
        <div class="timezone-time">${time}</div>
        <div class="timezone-date">${date}</div>
        <div class="timezone-offset">${offset}</div>
      `;

      this.timezonesGrid.appendChild(card);
    });
  }

  removeTimezone(timezone) {
    selectedTimezones = selectedTimezones.filter(tz => tz !== timezone);
    this.renderClocks();
  }

  updateClocks() {
    const cards = document.querySelectorAll('.timezone-card');
    let index = 0;

    selectedTimezones.sort().forEach((timezone) => {
      if (index < cards.length) {
        const card = cards[index];
        const tzTime = this.getTimezoneTime(timezone);
        const time = this.formatTime(tzTime);
        const date = this.formatDate(tzTime);
        const offset = this.getTimezoneOffset(timezone);

        card.querySelector('.timezone-time').textContent = time;
        card.querySelector('.timezone-date').textContent = date;
        card.querySelector('.timezone-offset').textContent = offset;
      }
      index++;
    });
  }

  startUpdatingClocks() {
    setInterval(() => this.updateClocks(), 1000);
  }
}

// Initialize the clock app
const clockApp = new ClockApp();
