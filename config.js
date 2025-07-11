// config.js
const BASE_URL = 'http://127.0.0.1:5000';
const ADMIN_USER_ID_REFERENCE = 1;

let currentUserId = null;
let currentUserRole = null;

// Додайте ці рядки:
let allWorkoutTemplates = [];
let currentFilteredTemplates = [];
let currentCalendarDate = new Date(); // Ініціалізуємо тут
let userProgressData = {};
let userWorkoutsByDate = {};

// Ініціалізація initialProfileData (переміщена сюди)
let initialProfileData = {
    username: '',
    email: '',
    role: ''
};

console.log('DEBUG: config.js loaded, BASE_URL:', BASE_URL);
console.log('DEBUG: ADMIN_USER_ID_REFERENCE:', ADMIN_USER_ID_REFERENCE);