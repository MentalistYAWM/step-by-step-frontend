// dashboard.js
// Це буде основний файл JavaScript для вашої панелі керування.

console.log('DEBUG: dashboard.js script started.');

// --- Змінні, які тепер оголошені у config.js, тому тут їх не повторюємо ---
// const BASE_URL;
// const ADMIN_USER_ID_REFERENCE;
// let currentUserId;
// let currentUserRole;
// let allWorkoutTemplates;
// let currentFilteredTemplates;
// let currentCalendarDate;
// let userProgressData;
// let userWorkoutsByDate;
// let initialProfileData;

// --- Змінні для таймера тренування (залишаються тут, бо локальні для dashboard.js) ---
let workoutTimerInterval;
let workoutTimerSeconds = 0;
let currentActiveWorkout = null;

// --- Змінні для 2D м'язового атласу (залишаються тут, бо локальні для dashboard.js) ---
let currentView = 'front'; // 'front' або 'back'
let activeMuscleGroup = null; // Зберігає назву поточної вибраної м'язової групи (після кліку)
let hoveredMuscleGroup = null; // Зберігає назву м'язової групи, на яку наведено курсор (тимчасово)

// Оголошуємо ці змінні глобально для dashboard.js, щоб вони були доступні до того, як DOMContentLoaded повністю виконається
let muscleMapSvg;
let highlightImages;
let selectedMuscleGroupSpan;
let filteredWorkoutTemplatesList;
let themeToggleBtn;
let body;

// Змінні для елементів фільтрації
let filterGoalSelect;
let filterDifficultySelect;
let filterEquipmentCheckboxes;
let filterDurationSelect;
let applyFiltersButton;
let resetFiltersButton;


// --- Функції для таймера тренування ---
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => num.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function startTimer() {
    if (workoutTimerInterval) return; // Запобігаємо повторному запуску
    workoutTimerInterval = setInterval(() => {
        workoutTimerSeconds++;
        document.getElementById('workoutTimerDisplay').textContent = formatTime(workoutTimerSeconds);
    }, 1000);
    document.getElementById('startTimerBtn').disabled = true;
    document.getElementById('pauseTimerBtn').disabled = false;
    document.getElementById('resetTimerBtn').disabled = false;
}

function pauseTimer() {
    clearInterval(workoutTimerInterval);
    workoutTimerInterval = null;
    document.getElementById('startTimerBtn').disabled = false;
    document.getElementById('pauseTimerBtn').disabled = true;
}

function stopTimer() {
    clearInterval(workoutTimerInterval);
    workoutTimerInterval = null;
    workoutTimerSeconds = 0; // Зазвичай, stop також скидає час
    document.getElementById('workoutTimerDisplay').textContent = formatTime(workoutTimerSeconds);
    document.getElementById('startTimerBtn').disabled = false;
    document.getElementById('pauseTimerBtn').disabled = true;
    document.getElementById('resetTimerBtn').disabled = true;
}

function resetTimer() {
    clearInterval(workoutTimerInterval);
    workoutTimerInterval = null;
    workoutTimerSeconds = 0;
    document.getElementById('workoutTimerDisplay').textContent = formatTime(workoutTimerSeconds);
    document.getElementById('startTimerBtn').disabled = false;
    document.getElementById('pauseTimerBtn').disabled = true;
    document.getElementById('resetTimerBtn').disabled = true;
}
console.log('DEBUG: Timer functions defined and loaded successfully.');

// --- Функції для кастомних модальних вікон ---

/**
 * Показує кастомне модальне вікно для повідомлень (замість alert()).
 * @param {string} message Повідомлення для відображення.
 */
function showAlert(message) {
    const modal = document.getElementById('customAlertModal');
    const messageElement = document.getElementById('customAlertMessage');
    const okBtn = document.getElementById('customAlertOkBtn');
    const closeBtn = document.getElementById('customAlertClose');

    messageElement.textContent = message;
    modal.style.display = 'block';
    modal.classList.add('show-modal');

    const closeHandler = () => {
        modal.classList.remove('show-modal');
        modal.style.display = 'none';
        okBtn.removeEventListener('click', closeHandler);
        closeBtn.removeEventListener('click', closeHandler);
        modal.removeEventListener('click', onClickOutside);
    };

    const onClickOutside = (event) => {
        if (event.target === modal) {
            closeHandler();
        }
    };

    okBtn.addEventListener('click', closeHandler);
    closeBtn.addEventListener('click', closeHandler);
    modal.addEventListener('click', onClickOutside);
}

/**
 * Показує кастомне модальне вікно для підтверджень (замість confirm()).
 * @param {string} message Повідомлення для підтвердження.
 * @returns {Promise<boolean>} Проміс, який вирішується в true, якщо користувач натиснув "Так", і false, якщо "Ні".
 */
function showConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        const messageElement = document.getElementById('customConfirmMessage');
        const yesBtn = document.getElementById('customConfirmYesBtn');
        const noBtn = document.getElementById('customConfirmNoBtn');
        const closeBtn = document.getElementById('customConfirmClose');

        messageElement.textContent = message;
        modal.style.display = 'block';
        modal.classList.add('show-modal');

        const cleanup = () => {
            modal.classList.remove('show-modal');
            modal.style.display = 'none';
            yesBtn.removeEventListener('click', onYes);
            noBtn.removeEventListener('click', onNo);
            closeBtn.removeEventListener('click', onNo);
            modal.removeEventListener('click', onClickOutside);
        };

        const onYes = () => {
            cleanup();
            resolve(true);
        };

        const onNo = () => {
            cleanup();
            resolve(false);
        };

        const onClickOutside = (event) => {
            if (event.target === modal) {
                onNo();
            }
        };

        yesBtn.addEventListener('click', onYes);
        noBtn.addEventListener('click', onNo);
        closeBtn.addEventListener('click', onNo);
        modal.addEventListener('click', onClickOutside);
    });
}

/**
 * Показує модальне вікно для вибору дати тренування.
 * @param {string} templateId ID шаблону тренування.
 * @param {string} templateName Назва шаблону тренування.
 * @returns {Promise<string|null>} Проміс, який вирішується в обрану дату (YYYY-MM-DD) або null, якщо скасовано.
 */
function showDatePickerModal(templateId, templateName) {
    console.log(`DEBUG: showDatePickerModal викликано для шаблону ID: ${templateId}, Name: ${templateName}`);
    return new Promise((resolve) => {
        const modal = document.getElementById('selectDateModal');
        const dateInput = document.getElementById('workoutDateInput');
        const confirmBtn = document.getElementById('confirmDateSelectionBtn');
        const closeBtn = modal.querySelector('.close-button');
        const messageElement = document.getElementById('dateSelectionMessage');

        messageElement.textContent = '';

        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
        dateInput.value = today;

        modal.style.display = 'block';
        modal.classList.add('show-modal');
        console.log('DEBUG: selectDateModal display set to block.');

        const confirmHandler = () => {
            console.log('DEBUG: confirmHandler викликано.');
            const selectedDate = dateInput.value;
            if (selectedDate) {
                cleanup();
                resolve(selectedDate);
            } else {
                messageElement.textContent = 'Будь ласка, виберіть дату.';
                messageElement.style.color = 'red';
                console.log('DEBUG: Дата не обрана в selectDateModal.');
            }
        };

        const cancelHandler = () => {
            console.log('DEBUG: cancelHandler викликано.');
            cleanup();
            resolve(null);
        };

        const cleanup = () => {
            console.log('DEBUG: selectDateModal cleanup викликано. Приховуємо модалку.');
            modal.classList.remove('show-modal');
            modal.style.display = 'none';
            confirmBtn.removeEventListener('click', confirmHandler);
            closeBtn.removeEventListener('click', cancelHandler);
            modal.removeEventListener('click', onClickOutside);
        };

        const onClickOutside = (event) => {
            if (event.target === modal) {
                console.log('DEBUG: Клік поза selectDateModal. Викликаємо cancelHandler.');
                cancelHandler();
            }
        };

        confirmBtn.addEventListener('click', confirmHandler);
        closeBtn.addEventListener('click', cancelHandler);
        modal.addEventListener('click', onClickOutside);
    });
}


// --- Централізована функція для Fetch-запитів з авторизацією та обробкою помилок ---
async function authorizedFetch(url, options = {}) {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        console.error('Токен не знайдено. Перенаправлення на сторінку входу.');
        showAlert('Сесія закінчилася. Будь ласка, увійдіть знову.');
        window.location.href = 'login.html';
        throw new Error('No authentication token found.');
    }

    const headers = {
        'x-access-token': token,
        'Content-Type': 'application/json', // Додаємо Content-Type за замовчуванням
        ...options.headers // Дозволяємо перевизначити Content-Type
    };

    try {
        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('jwt_token');
            showAlert('Сесія закінчилася або немає доступу. Будь ласка, увійдіть знову.');
            setTimeout(() => window.location.href = 'login.html', 1500);
            throw new Error('Unauthorized or Forbidden.');
        }

        return response; // Повертаємо відповідь, щоб викликаюча функція могла її обробити
    } catch (error) {
        console.error('Помилка мережі при запиті:', error);
        showAlert('Помилка підключення до сервера. Спробуйте пізніше.');
        throw error; // Перекидаємо помилку далі
    }
}


// --- Функції для отримання та оновлення даних профілю та прогресу ---

async function getUserProfileData() {
    console.log('DEBUG: getUserProfileData started.');
    try {
        const response = await authorizedFetch(`${BASE_URL}/my_profile_data`, { method: 'GET' });
        const data = await response.json();

        if (response.ok) {
            console.log('DEBUG: Дані користувача отримано:', data);
            currentUserId = data.id;
            currentUserRole = data.role;
            console.log(`DEBUG: currentUserId встановлено на: ${currentUserId}, currentUserRole: ${currentUserRole}`);

            const usernameElement = document.querySelector('.main-header h1');
            if (usernameElement) {
                usernameElement.textContent = `Привіт, ${data.username}!`;
            }

            const profileUsernameInput = document.getElementById('profileUsername');
            const profileEmailInput = document.getElementById('profileEmail');
            const profileRoleInput = document.getElementById('profileRole');

            if (profileUsernameInput) {
                profileUsernameInput.value = data.username;
                initialProfileData.username = data.username;
            }
            if (profileEmailInput) {
                profileEmailInput.value = data.email;
                initialProfileData.email = data.email;
            }
            if (profileRoleInput) {
                profileRoleInput.value = data.role;
                initialProfileData.role = data.role;
            }

            const addWorkoutTemplateSection = document.getElementById('addWorkoutTemplateSection');
            if (addWorkoutTemplateSection) {
                console.log(`DEBUG: Перевірка ролі для відображення форми створення шаблонів. currentUserRole: ${currentUserRole}`);
                if (currentUserRole === 'admin') {
                    addWorkoutTemplateSection.style.display = 'block';
                    console.log('DEBUG: Форма створення шаблонів показана (користувач - адмін).');
                } else {
                    addWorkoutTemplateSection.style.display = 'none';
                    console.log('DEBUG: Форма створення шаблонів прихована (користувач - не адмін).');
                }
            } else {
                console.warn('DEBUG: Елемент #addWorkoutTemplateSection не знайдено.');
            }

        } else {
            console.error('Помилка отримання даних профілю:', data.message);
            // authorizedFetch вже обробить 401/403
        }
    } catch (error) {
        // authorizedFetch вже виводить showAlert і log. Тут можна додати специфічну обробку, якщо потрібно.
        console.error('Помилка при завантаженні профілю:', error);
    }
}

async function updateProfileData(username, email) {
    console.log('DEBUG: updateProfileData started.');
    const profileMessage = document.getElementById('profileMessage');

    try {
        const response = await authorizedFetch(`${BASE_URL}/my_profile_data`, {
            method: 'PUT',
            body: JSON.stringify({ username, email })
        });

        const result = await response.json();

        if (response.ok) {
            profileMessage.textContent = result.message || 'Профіль успішно оновлено!';
            profileMessage.style.color = 'green';
            initialProfileData.username = username;
            initialProfileData.email = email;
            const usernameElement = document.querySelector('.main-header h1');
            if (usernameElement) {
                usernameElement.textContent = `Привіт, ${username}!`;
            }
            toggleProfileEditMode(false);
        } else {
            profileMessage.textContent = result.message || 'Помилка при оновленні профілю.';
            profileMessage.style.color = 'red';
            // authorizedFetch вже обробить 401
        }
    } catch (error) {
        console.error('Помилка при оновленні профілю:', error);
        profileMessage.textContent = 'Помилка підключення до сервера. Спробуйте пізніше.';
        profileMessage.style.color = 'red';
    }
}

function toggleProfileEditMode(isEditing) {
    const profileUsernameInput = document.getElementById('profileUsername');
    const profileEmailInput = document.getElementById('profileEmail');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const profileEditActions = document.querySelector('.profile-edit-actions');
    const profileMessage = document.getElementById('profileMessage');

    if (isEditing) {
        profileUsernameInput.removeAttribute('readonly');
        profileEmailInput.removeAttribute('readonly');
        editProfileBtn.style.display = 'none';
        profileEditActions.style.display = 'flex';
        profileMessage.textContent = '';
    } else {
        profileUsernameInput.setAttribute('readonly', true);
        profileEmailInput.setAttribute('readonly', true);
        editProfileBtn.style.display = 'block';
        profileEditActions.style.display = 'none';
    }
}


async function getUserProgressData() {
    console.log('DEBUG: getUserProgressData started.');
    try {
        const response = await authorizedFetch(`${BASE_URL}/my_progress`, { method: 'GET' });

        if (response.ok) {
            const data = await response.json();
            console.log('DEBUG: Дані прогресу, отримані з бекенду (raw):', data);

            userProgressData = {};
            data.forEach(entry => {
                userProgressData[entry.date] = entry;
            });
            console.log('DEBUG: userProgressData (згруповані за датою):', userProgressData);

            if (Array.isArray(data) && data.length > 0) {
                const latestProgress = data[0];
                console.log('DEBUG: latestProgress (найновіший запис):', latestProgress);

                const weightValueElement = document.getElementById('weightValue');
                if (weightValueElement) {
                    weightValueElement.textContent = `${latestProgress.weight} кг`;

                    const weightChangeElement = document.getElementById('weightChange');
                    if (weightChangeElement) {
                        if (data.length > 1) {
                            const previousProgress = data[1];
                            console.log('DEBUG: previousProgress (передостанній запис):', previousProgress);
                            const change = latestProgress.weight - previousProgress.weight;
                            console.log('DEBUG: Розрахована зміна ваги (change):', change);

                            if (change > 0) { // Вага збільшилась
                                weightChangeElement.textContent = `↑ ${change.toFixed(1)} кг`;
                                weightChangeElement.className = 'change positive'; // Зробимо "positive" для збільшення ваги
                            } else if (change < 0) { // Вага зменшилась
                                weightChangeElement.textContent = `↓ ${Math.abs(change).toFixed(1)} кг`;
                                weightChangeElement.className = 'change negative'; // Зробимо "negative" для зменшення ваги
                            } else {
                                weightChangeElement.textContent = 'Без змін';
                                weightChangeElement.className = 'change neutral';
                            }
                        } else {
                            weightChangeElement.textContent = 'Перший запис';
                            weightChangeElement.className = 'change neutral';
                        }
                    }
                }

                const workoutsValueElement = document.getElementById('workoutsValue');
                if (workoutsValueElement) {
                    let totalCompletedWorkouts = 0;
                    for (const date in userWorkoutsByDate) {
                        if (userWorkoutsByDate.hasOwnProperty(date)) {
                            totalCompletedWorkouts += userWorkoutsByDate[date].filter(w => w.status === 'completed').length;
                        }
                    }
                    workoutsValueElement.textContent = `${totalCompletedWorkouts} тренувань`;
                    const workoutsChangeElement = document.getElementById('workoutsChange');
                    if (workoutsChangeElement) {
                        workoutsChangeElement.textContent = '';
                        workoutsChangeElement.className = 'change neutral';
                    }
                }

                const caloriesValueElement = document.getElementById('caloriesValue');
                const caloriesChangeElement = document.getElementById('caloriesChange');
                if (caloriesValueElement) {
                    // Якщо ваш бекенд не має поля 'calories_average' або ви його не передаєте,
                    // цей блок не оновлюватиметься. Залиште його статичним або доповніть бекенд.
                }

            } else {
                console.warn('Дані прогресу порожні або мають невірний формат. Встановлення значень за замовчуванням.');
                document.getElementById('weightValue').textContent = '-- кг';
                document.getElementById('workoutsValue').textContent = '0 тренувань';
                document.getElementById('caloriesValue').textContent = '-- ккал';
                const weightChangeElement = document.getElementById('weightChange');
                if (weightChangeElement) {
                    weightChangeElement.textContent = '--';
                    weightChangeElement.className = 'change neutral';
                }
                const workoutsChangeElement = document.getElementById('workoutsChange');
                if (workoutsChangeElement) {
                    workoutsChangeElement.textContent = '--';
                    workoutsChangeElement.className = 'change neutral';
                }
                const caloriesChangeElement = document.getElementById('caloriesChange');
                if (caloriesChangeElement) {
                    caloriesChangeElement.textContent = '--';
                    caloriesChangeElement.className = 'change neutral';
                }
            }
            renderCalendar(); // Оновлюємо календар після отримання даних прогресу
        } else {
            const errorData = await response.json();
            console.error('Помилка отримання даних прогресу:', errorData.message);
            // authorizedFetch вже обробить 401
        }
    } catch (error) {
        // authorizedFetch вже виводить showAlert і log.
        console.error('Помилка при завантаженні прогресу:', error);
    }
}

async function addNewProgress(weight) {
    const progressMessage = document.getElementById('progressMessage');

    if (isNaN(parseFloat(weight))) {
        showAlert('Будь ласка, введіть коректну вагу (число).');
        progressMessage.textContent = 'Будь ласка, введіть коректну вагу (число).';
        progressMessage.style.color = 'red';
        return;
    }

    try {
        const response = await authorizedFetch(`${BASE_URL}/my_progress`, {
            method: 'POST',
            body: JSON.stringify({
                weight: parseFloat(weight)
            })
        });

        const result = await response.json();

        if (response.ok) {
            progressMessage.textContent = result.message || 'Прогрес успішно додано!';
            progressMessage.style.color = 'green';
            document.getElementById('updateProgressForm').reset();
            getUserProgressData();
        } else {
            progressMessage.textContent = result.message || 'Помилка при додаванні прогресу.';
            progressMessage.style.color = 'red';
            // authorizedFetch вже обробить 401
        }
    } catch (error) {
        console.error('Помилка при додаванні прогресу:', error);
        progressMessage.textContent = 'Помилка підключення до сервера. Спробуйте пізніше.';
        progressMessage.style.color = 'red';
    }
}

// --- Функції для роботи з ШАБЛОНАМИ тренувань ---

function addExerciseField() {
    const exercisesContainer = document.getElementById('exercisesContainer');
    const newExerciseItem = document.createElement('div');
    newExerciseItem.className = 'exercise-item';
    newExerciseItem.innerHTML = `
        <div class="form-group">
            <label>Назва вправи:</label>
            <input type="text" class="exercise-name" placeholder="Наприклад, Жим лежачи" required>
        </div>
        <div class="form-group">
            <label>Підходи:</label>
            <input type="number" class="exercise-sets" value="3" min="1">
        </div>
        <div class="form-group">
            <label>Повторення:</label>
            <input type="text" class="exercise-reps" placeholder="Наприклад, 8-12" required>
        </div>
        <button type="button" class="btn btn-delete btn-remove-exercise">Видалити вправу</button>
    `;
    exercisesContainer.appendChild(newExerciseItem);

    newExerciseItem.querySelector('.btn-remove-exercise').addEventListener('click', function() {
        newExerciseItem.remove();
    });
}

function addEditExerciseField(exercise = {}) {
    const editExercisesContainer = document.getElementById('editExercisesContainer');
    const newExerciseItem = document.createElement('div');
    newExerciseItem.className = 'exercise-item';
    newExerciseItem.innerHTML = `
        <div class="form-group">
            <label>Назва вправи:</label>
            <input type="text" class="exercise-name" placeholder="Наприклад, Жим лежачи" value="${exercise.name || ''}" required>
        </div>
        <div class="form-group">
            <label>Підходи:</label>
            <input type="number" class="exercise-sets" value="${exercise.sets || 3}" min="1">
        </div>
        <div class="form-group">
            <label>Повторення:</label>
            <input type="text" class="exercise-reps" placeholder="Наприклад, 8-12" value="${exercise.reps || ''}" required>
        </div>
        <button type="button" class="btn btn-delete btn-remove-exercise">Видалити вправу</button>
    `;
    editExercisesContainer.appendChild(newExerciseItem);

    newExerciseItem.querySelector('.btn-remove-exercise').addEventListener('click', function() {
        newExerciseItem.remove();
    });
}


/**
 * Рендерить шаблони тренувань у вказаний контейнер.
 * @param {Array} templates Масив об'єктів шаблонів тренувань.
 * @param {HTMLElement} containerDiv Елемент DOM, куди рендерити картки.
 * @param {boolean} isFilteredList Чи це список для відфільтрованих тренувань (без кнопок адміна).
 */
function renderWorkoutTemplates(templates, containerDiv, isFilteredList = false) {
    console.log(`DEBUG: renderWorkoutTemplates started for container: ${containerDiv.id}, isFilteredList: ${isFilteredList}`);
    containerDiv.innerHTML = '';

    if (containerDiv.id === 'workoutTemplatesList') {
        allWorkoutTemplates = templates;
    } else if (containerDiv.id === 'filteredWorkoutTemplatesList') {
        currentFilteredTemplates = templates;
    }


    if (templates.length === 0) {
        containerDiv.innerHTML = '<p>Немає доступних шаблонів тренувань для цієї категорії.</p>';
        return;
    }

    templates.forEach(template => {
        const templateCard = document.createElement('div');
        templateCard.className = 'workout-card';

        let exercisesHtml = '';
        if (template.exercises && template.exercises.length > 0) {
            exercisesHtml = '<h4>Вправи:</h4><ul>';
            template.exercises.forEach(exercise => {
                exercisesHtml += `<li><strong>${exercise.name}</strong>: ${exercise.sets} підходів по ${exercise.reps} повторень</li>`;
            });
            exercisesHtml += '</ul>';
        } else {
            exercisesHtml = '<p>Вправи не додано.</p>';
        }

        let globalBadge = '';
        if (template.is_global) {
            globalBadge = '<span class="global-badge">Глобальний</span>';
        } else {
            globalBadge = '<span class="personal-badge">Особистий</span>';
        }

        // Відображаємо м'язові групи
        let muscleGroupsHtml = '';
        if (template.muscle_groups && template.muscle_groups.length > 0) {
            muscleGroupsHtml = `<p><strong>М'язи:</strong> ${template.muscle_groups.join(', ')}</p>`;
        }

        // Відображаємо додаткові поля
        let additionalInfoHtml = '';
        if (template.goal) {
            additionalInfoHtml += `<p><strong>Ціль:</strong> ${template.goal}</p>`;
        }
        if (template.difficulty) {
            additionalInfoHtml += `<p><strong>Складність:</strong> ${template.difficulty}</p>`;
        }
        if (template.equipment && template.equipment.length > 0) {
            additionalInfoHtml += `<p><strong>Обладнання:</strong> ${template.equipment.join(', ')}</p>`;
        }
        if (template.duration_category) {
            additionalInfoHtml += `<p><strong>Тривалість:</strong> ${template.duration_category}</p>`;
        }


        let actionButtonsHtml = '';
        if (!isFilteredList) {
            if (currentUserRole === 'admin') {
                actionButtonsHtml += `
                    <button type="button" class="btn btn-secondary btn-edit-template" data-template-id="${template.id}">Редагувати</button>
                    <button type="button" class="btn btn-delete btn-delete-template" data-template-id="${template.id}" data-template-name="${template.name}">Видалити</button>
                `;
            }
        }

        templateCard.innerHTML = `
            <h3>${template.name} ${globalBadge}</h3>
            <p>${template.description || 'Без опису.'}</p>
            ${muscleGroupsHtml}
            ${additionalInfoHtml} ${exercisesHtml}
            <div class="template-actions">
                <button type="button" class="btn btn-primary btn-use-template" data-template-id="${template.id}" data-template-name="${template.name}">Додати тренування у графік</button>
                <button type="button" class="btn btn-info btn-view-details" data-template-id="${template.id}">Деталі</button>
                ${actionButtonsHtml}
            </div>
        `;
        containerDiv.appendChild(templateCard);
    });

    // Додаємо обробники подій для кнопок
    containerDiv.querySelectorAll('.btn-use-template').forEach(button => {
        button.addEventListener('click', async (e) => {
            console.log('DEBUG: Кнопка "Додати тренування у графік" була КЛІКНУТА.');
            const selectedTemplateIdForDate = e.target.dataset.templateId;
            const selectedTemplateNameForDate = e.target.dataset.templateName;

            console.log(`DEBUG: Кнопка "Додати тренування у графік" натиснута. Template ID: ${selectedTemplateIdForDate}, Template Name: ${selectedTemplateNameForDate}`);

            const selectedDate = await showDatePickerModal(selectedTemplateIdForDate, selectedTemplateNameForDate);

            if (selectedDate) {
                console.log(`DEBUG: Дата обрана: ${selectedDate}. Викликаємо useWorkoutTemplate.`);
                await useWorkoutTemplate(selectedTemplateIdForDate, selectedDate);
            } else {
                console.log('DEBUG: Вибір дати скасовано.');
                showAlert('Додавання тренування скасовано.');
            }
        });
    });

    containerDiv.querySelectorAll('.btn-view-details').forEach(button => {
        button.addEventListener('click', (e) => {
            console.log('DEBUG: View Details button clicked.');
            const templateId = e.target.dataset.templateId;
            const templateToView = (containerDiv.id === 'workoutTemplatesList' ? allWorkoutTemplates : currentFilteredTemplates).find(t => t.id === templateId);
            if (templateToView) {
                showWorkoutDetailsModal(templateToView);
            } else {
                showAlert('Помилка: Шаблон для перегляду не знайдено.');
            }
        });
    });

    // Обробники для кнопок редагування/видалення тільки якщо це не відфільтрований список
    if (!isFilteredList) {
        containerDiv.querySelectorAll('.btn-edit-template').forEach(button => {
            button.addEventListener('click', (e) => {
                console.log('DEBUG: Edit button clicked.');
                const templateId = e.target.dataset.templateId;
                const templateToEdit = allWorkoutTemplates.find(t => t.id === templateId);
                if (templateToEdit) {
                    openEditWorkoutTemplateModal(templateToEdit);
                } else {
                    showAlert('Помилка: Шаблон для редагування не знайдено.');
                }
            });
        });

        containerDiv.querySelectorAll('.btn-delete-template').forEach(button => {
            button.addEventListener('click', async (e) => {
                console.log('DEBUG: Delete button clicked.');
                const templateId = e.target.dataset.templateId;
                const templateName = e.target.dataset.templateName;
                const confirmDelete = await showConfirm(`Ви впевнені, що хочете видалити шаблон "${templateName}"?`);
                if (confirmDelete) {
                    await deleteWorkoutTemplate(templateId);
                }
            });
        });
    }
}


/**
 * Отримує шаблони тренувань з бекенду.
 * @param {string|null} muscleGroup Фільтр за м'язовою групою (наприклад, 'Груди'). Якщо null, повертає всі.
 * @param {HTMLElement} containerDiv Елемент DOM, куди рендерити картки.
 * @param {boolean} isFilteredList Чи це список для відфільтрованих тренувань.
 * @param {object} filters Додаткові фільтри (goal, difficulty, equipment, duration_category).
 */
async function getWorkoutTemplatesData(muscleGroup = null, containerDiv = document.getElementById('workoutTemplatesList'), isFilteredList = false, filters = {}) {
    console.log(`DEBUG: getWorkoutTemplatesData started with muscleGroup: ${muscleGroup}, containerDiv: ${containerDiv.id}, filters:`, filters);

    let url = new URL(`${BASE_URL}/workout_templates`);
    if (muscleGroup) {
        url.searchParams.append('muscle_group', muscleGroup);
    }
    // Додаємо фільтри до URL
    if (filters.goal && filters.goal !== '') {
        url.searchParams.append('goal', filters.goal);
    }
    if (filters.difficulty && filters.difficulty !== '') {
        url.searchParams.append('difficulty', filters.difficulty);
    }
    if (filters.equipment && filters.equipment.length > 0) {
        // Якщо обладнання є масивом, передаємо кожен елемент окремим параметром
        filters.equipment.forEach(eq => url.searchParams.append('equipment', eq));
    }
    if (filters.duration_category && filters.duration_category !== '') {
        url.searchParams.append('duration_category', filters.duration_category);
    }


    try {
        const response = await authorizedFetch(url.toString(), { method: 'GET' });

        if (response.ok) {
            const data = await response.json();
            console.log('DEBUG: RAW data from /workout_templates:', data);
            renderWorkoutTemplates(data, containerDiv, isFilteredList);
        } else {
            const errorData = await response.json();
            console.error('Помилка отримання даних шаблонів тренувань:', errorData.message);
            containerDiv.innerHTML = '<p style="color: red;">Помилка завантаження шаблонів тренувань.</p>';
            // authorizedFetch вже обробить 401/403
        }
    }
    catch (error) {
        console.error('Помилка при отриманні шаблонів тренувань:', error);
        containerDiv.innerHTML = '<p style="color: red;">Помилка завантаження шаблонів тренувань. Перевірте підключення до сервера.</p>';
        // authorizedFetch вже виводить showAlert і log.
    }
}

async function addNewWorkoutTemplate(name, description, exercises, isGlobal, muscleGroups, goal, difficulty, equipment, durationCategory) {
    const workoutTemplateMessage = document.getElementById('workoutTemplateMessage');
    try {
        const response = await authorizedFetch(`${BASE_URL}/workout_templates`, {
            method: 'POST',
            body: JSON.stringify({
                name,
                description,
                exercises,
                is_global: isGlobal,
                muscle_groups: muscleGroups,
                goal: goal,
                difficulty: difficulty,
                equipment: equipment,
                duration_category: durationCategory
            })
        });

        const result = await response.json();

        if (response.ok) {
            workoutTemplateMessage.textContent = result.message || 'Шаблон тренування успішно додано!';
            workoutTemplateMessage.style.color = 'green';
            document.getElementById('addWorkoutTemplateForm').reset();
            document.getElementById('exercisesContainer').innerHTML = '';
            addExerciseField();
            // Скидаємо значення нових select/checkbox полів після успішного додавання
            document.getElementById('templateGoal').value = '';
            document.getElementById('templateDifficulty').value = '';
            document.querySelectorAll('#templateEquipment input[type="checkbox"]').forEach(cb => cb.checked = false);
            document.getElementById('templateDuration').value = '';

            getWorkoutTemplatesData();
        } else {
            workoutTemplateMessage.textContent = result.message || 'Помилка при додаванні шаблону тренування.';
            workoutTemplateMessage.style.color = 'red';
            // authorizedFetch вже обробить 401
        }
    } catch (error) {
        console.error('Помилка при додаванні шаблону тренування:', error);
        workoutTemplateMessage.textContent = 'Помилка підключення до сервера. Спробуйте пізніше.';
        workoutTemplateMessage.style.color = 'red';
    }
}

async function updateWorkoutTemplate(templateId, name, description, exercises, isGlobal, muscleGroups, goal, difficulty, equipment, durationCategory) {
    const editWorkoutTemplateMessage = document.getElementById('editWorkoutTemplateMessage');
    try {
        const response = await authorizedFetch(`${BASE_URL}/workout_templates/${templateId}`, {
            method: 'PUT',
            body: JSON.stringify({
                name,
                description,
                exercises,
                is_global: isGlobal,
                muscle_groups: muscleGroups,
                goal: goal,
                difficulty: difficulty,
                equipment: equipment,
                duration_category: durationCategory
            })
        });

        const result = await response.json();

        if (response.ok) {
            editWorkoutTemplateMessage.textContent = result.message || 'Шаблон тренування успішно оновлено!';
            editWorkoutTemplateMessage.style.color = 'green';
            // Оновлюємо список шаблонів після успішного оновлення
            getWorkoutTemplatesData();
            setTimeout(() => {
                document.getElementById('editWorkoutTemplateModal').classList.remove('show-modal');
                document.getElementById('editWorkoutTemplateModal').style.display = 'none';
            }, 1000);
        } else {
            editWorkoutTemplateMessage.textContent = result.message || 'Помилка при оновленні шаблону тренування.';
            editWorkoutTemplateMessage.style.color = 'red';
            // authorizedFetch вже обробить 401
        }
    } catch (error) {
        console.error('Помилка при оновленні шаблону тренування:', error);
        editWorkoutTemplateMessage.textContent = 'Помилка підключення до сервера. Спробуйте пізніше.';
        editWorkoutTemplateMessage.style.color = 'red';
    }
}

async function deleteWorkoutTemplate(templateId) {
    try {
        const response = await authorizedFetch(`${BASE_URL}/workout_templates/${templateId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (response.ok) {
            showAlert(result.message || 'Шаблон тренування успішно видалено.');
            getWorkoutTemplatesData(); // Оновлюємо список
        } else {
            showAlert(result.message || 'Помилка при видаленні шаблону тренування.');
            // authorizedFetch вже обробить 401
        }
    } catch (error) {
        console.error('Помилка при видаленні шаблону тренування:', error);
        // authorizedFetch вже виводить showAlert і log.
    }
}

function openEditWorkoutTemplateModal(template) {
    console.log('DEBUG: openEditWorkoutTemplateModal called with template:', template);
    const modal = document.getElementById('editWorkoutTemplateModal');
    document.getElementById('editTemplateId').value = template.id;
    document.getElementById('editTemplateName').value = template.name;
    document.getElementById('editTemplateDescription').value = template.description || '';
    document.getElementById('editIsGlobalTemplate').checked = template.is_global || false;
    document.getElementById('editTemplateMuscleGroups').value = template.muscle_groups ? template.muscle_groups.join(', ') : '';

    // Заповнюємо значення нових полів
    document.getElementById('editTemplateGoal').value = template.goal || '';
    document.getElementById('editTemplateDifficulty').value = template.difficulty || '';

    // Для чекбоксів обладнання: спочатку знімаємо всі, потім ставимо потрібні
    document.querySelectorAll('#editTemplateEquipment input[type="checkbox"]').forEach(cb => {
        cb.checked = false; // Знімаємо всі
        if (template.equipment && template.equipment.includes(cb.value)) {
            cb.checked = true; // Ставимо, якщо значення є в масиві шаблону
        }
    });
    document.getElementById('editTemplateDuration').value = template.duration_category || '';


    const editExercisesContainer = document.getElementById('editExercisesContainer');
    editExercisesContainer.innerHTML = ''; // Очищаємо попередні вправи
    if (template.exercises && template.exercises.length > 0) {
        template.exercises.forEach(exercise => addEditExerciseField(exercise));
    } else {
        addEditExerciseField(); // Додаємо хоча б одне порожнє поле
    }
    modal.style.display = 'block';
    modal.classList.add('show-modal');
}

function showWorkoutDetailsModal(template) {
    const modal = document.getElementById('workoutDetailsModal');
    document.getElementById('workoutDetailsTitle').textContent = template.name;
    document.getElementById('workoutDetailsDescription').textContent = template.description || 'Без опису.';

    const workoutDetailsMuscleGroups = document.getElementById('workoutDetailsMuscleGroups');
    if (workoutDetailsMuscleGroups) {
        workoutDetailsMuscleGroups.textContent = template.muscle_groups ? template.muscle_groups.join(', ') : 'Не вказано';
    } else {
        console.warn('Елемент #workoutDetailsMuscleGroups не знайдено в DOM.');
    }

    // Відображаємо нові поля в модальному вікні деталей
    const workoutDetailsGoal = document.getElementById('workoutDetailsGoal');
    const workoutDetailsDifficulty = document.getElementById('workoutDetailsDifficulty');
    const workoutDetailsEquipment = document.getElementById('workoutDetailsEquipment');
    const workoutDetailsDuration = document.getElementById('workoutDetailsDuration');

    if (workoutDetailsGoal) workoutDetailsGoal.textContent = template.goal || 'Не вказано';
    if (workoutDetailsDifficulty) workoutDetailsDifficulty.textContent = template.difficulty || 'Не вказано';
    if (workoutDetailsEquipment) workoutDetailsEquipment.textContent = (template.equipment && template.equipment.length > 0) ? template.equipment.join(', ') : 'Не вказано';
    if (workoutDetailsDuration) workoutDetailsDuration.textContent = template.duration_category || 'Не вказано';


    const exercisesList = document.getElementById('workoutDetailsExercises');
    exercisesList.innerHTML = '';
    if (template.exercises && template.exercises.length > 0) {
        template.exercises.forEach(exercise => {
            const li = document.createElement('li');
            li.textContent = `${exercise.name}: ${exercise.sets} підходів по ${exercise.reps} повторень`;
            exercisesList.appendChild(li);
        });
    } else {
        exercisesList.innerHTML = '<li>Вправи не додано.</li>';
    }
    modal.style.display = 'block';
    modal.classList.add('show-modal');
}


// --- Функції для роботи з ЩОДЕННИМИ тренуваннями ---

async function getDailyWorkoutsData() {
    console.log('DEBUG: getDailyWorkoutsData started.');
    try {
        const response = await authorizedFetch(`${BASE_URL}/daily_workouts`, { method: 'GET' });

        if (response.ok) {
            const data = await response.json();
            console.log('DEBUG: RAW data from /daily_workouts:', data);
            userWorkoutsByDate = {}; // Очищаємо перед заповненням
            data.forEach(workout => {
                if (!userWorkoutsByDate[workout.date]) {
                    userWorkoutsByDate[workout.date] = [];
                }
                userWorkoutsByDate[workout.date].push(workout);
            });
            console.log('DEBUG: userWorkoutsByDate (згруповані за датою, після заповнення):', userWorkoutsByDate);
            renderDailyWorkouts(data); // Передаємо всі дані для рендерингу
            // renderCalendar(); // Цей виклик тепер відбувається в getUserProgressData або handleSectionChange
        } else {
            const errorData = await response.json();
            console.error('Помилка отримання щоденних тренувань:', errorData.message);
            // authorizedFetch вже обробить 401
        }
    } catch (error) {
        console.error('Помилка при отриманні щоденних тренувань:', error);
        // authorizedFetch вже виводить showAlert і log.
    }
}

function renderDailyWorkouts(workouts) {
    console.log('DEBUG: renderDailyWorkouts started.');
    const dailyWorkoutList = document.getElementById('dailyWorkoutList');
    dailyWorkoutList.innerHTML = ''; // Очищаємо список

    if (workouts.length === 0) {
        dailyWorkoutList.innerHTML = '<p>Немає запланованих тренувань.</p>';
        return;
    }

    // Сортуємо тренування за датою (від найновіших до найстаріших)
    workouts.sort((a, b) => new Date(b.date) - new Date(a.date));

    workouts.forEach(workout => {
        const workoutCard = document.createElement('div');
        workoutCard.className = 'workout-card';

        const statusClass = workout.status === 'completed' ? 'completed' : 'upcoming';
        const statusText = workout.status === 'completed' ? 'Завершено' : 'Заплановано';

        let exercisesHtml = '';
        if (workout.exercises && workout.exercises.length > 0) {
            exercisesHtml = '<h4>Вправи:</h4><ul>';
            workout.exercises.forEach(exercise => {
                exercisesHtml += `<li><strong>${exercise.name}</strong>: ${exercise.sets} підходів по ${exercise.reps} повторень`;
                if (exercise.actual_weight) {
                    exercisesHtml += ` (Факт. вага: ${exercise.actual_weight} кг)`;
                }
                if (exercise.actual_sets_reps) {
                    exercisesHtml += ` (Факт. підходи/повторення: ${exercise.actual_sets_reps})`;
                    }
                    exercisesHtml += `</li>`;
            });
            exercisesHtml += '</ul>';
        } else {
            exercisesHtml = '<p>Вправи не додано.</p>';
        }

        workoutCard.innerHTML = `
            <h3>${workout.template_name}</h3>
            <p><strong>Дата:</strong> ${workout.date}</p>
            <p><strong>Опис:</strong> ${workout.description || 'Без опису.'}</p>
            ${exercisesHtml}
            <div class="daily-workout-actions">
                <span class="workout-status ${statusClass}">${statusText}</span>
                ${workout.status !== 'completed' ? `<button type="button" class="btn btn-primary btn-start-workout" data-workout-id="${workout.id}">Розпочати тренування</button>` : ''}
                ${workout.status === 'completed' ? `<button type="button" class="btn btn-secondary btn-reset-status" data-workout-id="${workout.id}">Скинути статус</button>` : ''}
                <button type="button" class="btn btn-delete btn-delete-daily-workout" data-workout-id="${workout.id}" data-workout-name="${workout.template_name}">Видалити</button>
            </div>
        `;
        dailyWorkoutList.appendChild(workoutCard);
    });

    dailyWorkoutList.querySelectorAll('.btn-start-workout').forEach(button => {
        button.addEventListener('click', (e) => {
            const workoutId = e.target.dataset.workoutId;
            openStartWorkoutModal(workoutId);
        });
    });

    dailyWorkoutList.querySelectorAll('.btn-reset-status').forEach(button => {
        button.addEventListener('click', async (e) => {
            const workoutId = e.target.dataset.workoutId;
            const confirmed = await showConfirm('Ви впевнені, що хочете скинути статус цього тренування?');
            if (confirmed) {
                await resetDailyWorkoutStatus(workoutId);
            }
        });
    });

    dailyWorkoutList.querySelectorAll('.btn-delete-daily-workout').forEach(button => {
        button.addEventListener('click', async (e) => {
            const workoutId = e.target.dataset.workoutId;
            const workoutName = e.target.dataset.workoutName;
            const confirmed = await showConfirm(`Ви впевнені, що хочете видалити тренування "${workoutName}"?`);
            if (confirmed) {
                await deleteDailyWorkout(workoutId);
            }
        });
    });
}

async function useWorkoutTemplate(templateId, selectedDate) {
    console.log(`DEBUG: useWorkoutTemplate started for template ID: ${templateId}, date: ${selectedDate}`);
    try {
        const response = await authorizedFetch(`${BASE_URL}/daily_workouts`, {
            method: 'POST',
            body: JSON.stringify({
                template_id: templateId,
                date: selectedDate
            })
        });

        const result = await response.json();
        if (response.ok) {
            showAlert(result.message || 'Тренування успішно додано до графіку!');
            getDailyWorkoutsData(); // Оновлюємо список щоденних тренувань
        } else {
            showAlert(result.message || 'Помилка при додаванні тренування до графіку.');
            // authorizedFetch вже обробить 401
        }
    } catch (error) {
        console.error('Помилка при додаванні тренування до графіку:', error);
        // authorizedFetch вже виводить showAlert і log.
    }
}

async function deleteDailyWorkout(workoutId) {
    try {
        const response = await authorizedFetch(`${BASE_URL}/daily_workouts/${workoutId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (response.ok) {
            showAlert(result.message || 'Тренування успішно видалено з графіку.');
            getDailyWorkoutsData(); // Оновлюємо список
        } else {
            showAlert(result.message || 'Помилка при видаленні тренування з графіку.');
            // authorizedFetch вже обробить 401
        }
    } catch (error) {
        console.error('Помилка при видаленні щоденного тренування:', error);
        // authorizedFetch вже виводить showAlert і log.
    }
}

async function resetDailyWorkoutStatus(workoutId) {
    try {
        const response = await authorizedFetch(`${BASE_URL}/daily_workouts/${workoutId}/reset_status`, {
            method: 'POST', // Або PUT, залежить від реалізації бекенду
        });

        const result = await response.json();
        if (response.ok) {
            showAlert(result.message || 'Статус тренування успішно скинуто.');
            getDailyWorkoutsData(); // Оновлюємо список
        } else {
            showAlert(result.message || 'Помилка при скиданні статусу тренування.');
            // authorizedFetch вже обробить 401
        }
    } catch (error) {
        console.error('Помилка при скиданні статусу тренування:', error);
        // authorizedFetch вже виводить showAlert і log.
    }
}

async function openStartWorkoutModal(workoutId) {
    console.log('DEBUG: openStartWorkoutModal called for workoutId:', workoutId);
    try {
        const response = await authorizedFetch(`${BASE_URL}/daily_workouts/${workoutId}`, { method: 'GET' });

        if (response.ok) {
            currentActiveWorkout = await response.json();
            console.log('DEBUG: Отримано дані для активного тренування:', currentActiveWorkout);

            const modal = document.getElementById('startWorkoutModal');
            document.getElementById('startWorkoutTitle').textContent = currentActiveWorkout.template_name;
            document.getElementById('startWorkoutDate').textContent = currentActiveWorkout.date;
            document.getElementById('currentWorkoutId').value = currentActiveWorkout.id;

            const exercisesContainer = document.getElementById('startWorkoutExercisesContainer');
            exercisesContainer.innerHTML = ''; // Очищаємо попередні вправи

            if (currentActiveWorkout.exercises && currentActiveWorkout.exercises.length > 0) {
                currentActiveWorkout.exercises.forEach((exercise, index) => {
                    const exerciseDiv = document.createElement('div');
                    exerciseDiv.className = 'exercise-item';
                    exerciseDiv.innerHTML = `
                        <h4>${exercise.name} (${exercise.sets}x${exercise.reps})</h4>
                        <div class="form-group">
                            <label for="exerciseWeight_${index}">Вага (кг):</label>
                            <input type="number" id="exerciseWeight_${index}" class="exercise-weight" data-index="${index}" step="0.1" min="0" placeholder="Введіть вагу" value="${exercise.actual_weight || ''}">
                        </div>
                        <div class="form-group">
                            <label for="exerciseSetsReps_${index}">Фактичні підходи/повторення:</label>
                            <input type="text" id="exerciseSetsReps_${index}" class="exercise-sets-reps" data-index="${index}" placeholder="Наприклад, 3x10" value="${exercise.actual_sets_reps || ''}">
                        </div>
                    `;
                    exercisesContainer.appendChild(exerciseDiv);
                });
            } else {
                exercisesContainer.innerHTML = '<p>Немає вправ для цього тренування.</p>';
            }

            modal.style.display = 'block';
            modal.classList.add('show-modal');
            startTimer(); // Запускаємо таймер при відкритті модального вікна
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || 'Помилка завантаження даних тренування.');
            // authorizedFetch вже обробить 401
        }
    } catch (error) {
        console.error('Помилка при відкритті модального вікна тренування:', error);
        // authorizedFetch вже виводить showAlert і log.
    }
}

async function completeWorkout() {
    console.log('DEBUG: completeWorkout started.');
    if (!currentActiveWorkout) {
        console.error('DEBUG: Активне тренування відсутнє.');
        showAlert('Помилка: Немає активного тренування.');
        return;
    }

    const workoutId = currentActiveWorkout.id;
    const actualExercises = [];
    document.querySelectorAll('#startWorkoutExercisesContainer .exercise-item').forEach((item, index) => {
        const weightInput = item.querySelector('.exercise-weight');
        const setsRepsInput = item.querySelector('.exercise-sets-reps');
        actualExercises.push({
            name: currentActiveWorkout.exercises[index].name, // Використовуємо назву з шаблону
            sets: currentActiveWorkout.exercises[index].sets,
            reps: currentActiveWorkout.exercises[index].reps,
            actual_weight: parseFloat(weightInput.value) || null,
            actual_sets_reps: setsRepsInput.value || null
        });
    });

    const requestBody = {
        exercises: actualExercises,
        duration_seconds: workoutTimerSeconds // Додаємо тривалість тренування
    };

    console.log('DEBUG: Відправка запиту на завершення тренування...');
    console.log('DEBUG: URL:', `${BASE_URL}/daily_workouts/${workoutId}/complete`);
    console.log('DEBUG: Метод:', 'POST');
    console.log('DEBUG: Тіло запиту:', JSON.stringify(requestBody, null, 2));

    try {
        const response = await authorizedFetch(`${BASE_URL}/daily_workouts/${workoutId}/complete`, {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });

        console.log('DEBUG: Отримано відповідь від сервера. Статус:', response.status);
        const responseText = await response.text(); // Отримуємо сирий текст відповіді
        console.log('DEBUG: Сирий текст відповіді від сервера:', responseText);

        let result = {};
        try {
            if (responseText) {
                result = JSON.parse(responseText);
            }
        } catch (jsonError) {
            console.warn('DEBUG: Помилка парсингу JSON відповіді. Використовуємо сирий текст як повідомлення.', jsonError);
            result.message = responseText || 'Невідома помилка відповіді сервера.';
        }

        console.log('DEBUG: Розпаршене/оброблене тіло відповіді від сервера:', result);
        console.log('DEBUG: Attempting to call stopTimer(). Typeof stopTimer:', typeof stopTimer);

        if (response.ok) {
            showAlert(result.message || 'Тренування успішно завершено!');
            stopTimer(); // Зупиняємо таймер
            document.getElementById('startWorkoutModal').classList.remove('show-modal');
            document.getElementById('startWorkoutModal').style.display = 'none'; // Встановлюємо display: none негайно
            getDailyWorkoutsData(); // Оновлюємо список щоденних тренувань
            getUserProgressData(); // Оновлюємо дані прогресу
        } else {
            const errorMessage = result.message || 'Помилка при завершенні тренування.';
            console.error('DEBUG: Помилка відповіді сервера при завершенні тренування:', errorMessage);
            showAlert(errorMessage);
            // authorizedFetch вже обробить 401
        }
    } catch (error) {
        console.error('DEBUG: Помилка мережі при завершенні тренування:', error);
        // authorizedFetch вже виводить showAlert і log.
    }
}


// --- Календар ---
function renderCalendar() {
    console.log('DEBUG: renderCalendar started.');
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthYear = document.getElementById('currentMonthYear');
    calendarGrid.innerHTML = ''; // Очищаємо календар

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth(); // 0-11

    currentMonthYear.textContent = new Date(year, month).toLocaleString('uk-UA', { month: 'long', year: 'numeric' });

    // Отримуємо перший день місяця та останній день місяця
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // День тижня першого дня місяця (0 - неділя, 1 - понеділок)
    let startDay = firstDayOfMonth.getDay();
    if (startDay === 0) startDay = 7; // Змінюємо неділю з 0 на 7
    startDay -= 1; // Коригуємо, щоб понеділок був 0-м індексом

    // Додаємо порожні дні перед першим днем місяця
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDay);
    }

    // Заповнюємо дні місяця
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.innerHTML = `<span class="day-number">${day}</span>`;
        dayElement.dataset.date = dateString; // Зберігаємо дату в data-атрибуті

        // Перевіряємо, чи є дані про вагу за цей день
        if (userProgressData[dateString] && userProgressData[dateString].weight) {
            const weightDisplay = document.createElement('span');
            weightDisplay.className = 'weight-display';
            weightDisplay.textContent = `${userProgressData[dateString].weight} кг`;
            dayElement.appendChild(weightDisplay);
        }

        // Перевіряємо, чи є тренування за цей день
        if (userWorkoutsByDate[dateString] && userWorkoutsByDate[dateString].length > 0) {
            const workoutsForDay = userWorkoutsByDate[dateString];
            const completedWorkouts = workoutsForDay.filter(w => w.status === 'completed').length;
            const totalWorkouts = workoutsForDay.length;

            const indicator = document.createElement('span');
            indicator.className = `workout-status-indicator ${completedWorkouts > 0 ? 'completed' : 'upcoming'}`;
            dayElement.appendChild(indicator);

            const workoutsCount = document.createElement('span');
            workoutsCount.className = 'workouts-count';
            workoutsCount.textContent = `${completedWorkouts}/${totalWorkouts}`;
            dayElement.appendChild(workoutsCount);
        }

        dayElement.addEventListener('click', () => showDailyWorkoutsForDate(dateString));
        calendarGrid.appendChild(dayElement);
    }
}

async function showDailyWorkoutsForDate(dateString) {
    console.log(`DEBUG: showDailyWorkoutsForDate called for date: ${dateString}`);
    const modal = document.getElementById('dailyWorkoutsModal');
    const modalTitle = document.getElementById('dailyWorkoutsModalTitle');
    const workoutsListInModal = document.getElementById('dailyWorkoutsListInModal');

    modalTitle.innerHTML = `Тренування на <span id="dailyWorkoutsDate"></span>`;
    document.getElementById('dailyWorkoutsDate').textContent = dateString;
    workoutsListInModal.innerHTML = '';

    const workouts = userWorkoutsByDate[dateString] || [];
    console.log(`DEBUG: Workouts for ${dateString}:`, workouts);

    if (workouts.length === 0) {
        workoutsListInModal.innerHTML = '<p>На цю дату немає запланованих тренувань.</p>';
        // Якщо немає тренувань, все одно показуємо модальне вікно, щоб відобразити повідомлення.
    } else {
        workouts.forEach(workout => {
            const workoutItem = document.createElement('div');
            workoutItem.className = 'workout-item-in-modal';
            const statusClass = workout.status === 'completed' ? 'completed' : 'upcoming';
            const statusText = workout.status === 'completed' ? 'Завершено' : 'Заплановано';

            let exercisesHtml = '';
            if (workout.exercises && workout.exercises.length > 0) {
                exercisesHtml = '<h4>Вправи:</h4><ul>';
                workout.exercises.forEach(exercise => {
                    exercisesHtml += `<li><strong>${exercise.name}</strong>: ${exercise.sets} підходів по ${exercise.reps} повторень`;
                    if (exercise.actual_weight) {
                        exercisesHtml += ` (Факт. вага: ${exercise.actual_weight} кг)`;
                    }
                    if (exercise.actual_sets_reps) {
                        exercisesHtml += ` (Факт. підходи/повторення: ${exercise.actual_sets_reps})`;
                    }
                    exercisesHtml += `</li>`;
                });
                exercisesHtml += '</ul>';
            } else {
                exercisesHtml = '<p>Вправи не додано.</p>';
            }

            workoutItem.innerHTML = `
                <h4>${workout.template_name}</h4>
                <p><strong>Дата:</strong> ${workout.date}</p>
                <p><strong>Опис:</strong> ${workout.description || 'Без опису.'}</p>
                <p><strong>Статус:</strong> <span class="workout-status ${statusClass}">${statusText}</span></p>
                <div class="daily-workout-actions">
                    ${workout.status !== 'completed' ? `<button type="button" class="btn btn-primary btn-start-workout" data-workout-id="${workout.id}">Розпочати тренування</button>` : ''}
                    ${workout.status === 'completed' ? `<button type="button" class="btn btn-secondary btn-reset-status" data-workout-id="${workout.id}">Скинути статус</button>` : ''}
                    <button type="button" class="btn btn-delete btn-delete-daily-workout" data-workout-id="${workout.id}" data-workout-name="${workout.template_name}">Видалити</button>
                </div>
            `;
            workoutsListInModal.appendChild(workoutItem);
        });

        // Додаємо слухачів подій для кнопок у модальному вікні
        workoutsListInModal.querySelectorAll('.btn-start-workout').forEach(button => {
            button.addEventListener('click', (e) => {
                // Закриваємо поточне модальне вікно перед відкриттям нового
                modal.classList.remove('show-modal');
                modal.style.display = 'none';
                openStartWorkoutModal(e.target.dataset.workoutId);
            });
        });
        workoutsListInModal.querySelectorAll('.btn-reset-status').forEach(button => {
            button.addEventListener('click', async (e) => {
                // Закриваємо поточне модальне вікно перед підтвердженням
                modal.classList.remove('show-modal');
                modal.style.display = 'none';
                const confirmed = await showConfirm('Ви впевнені, що хочете скинути статус цього тренування?');
                if (confirmed) {
                    await resetDailyWorkoutStatus(e.target.dataset.workoutId);
                }
            });
        });
        workoutsListInModal.querySelectorAll('.btn-delete-daily-workout').forEach(button => {
            button.addEventListener('click', async (e) => {
                // Закриваємо поточне модальне вікно перед підтвердженням
                modal.classList.remove('show-modal');
                modal.style.display = 'none';
                const confirmed = await showConfirm(`Ви впевнені, що хочете видалити тренування "${e.target.dataset.workoutName}"?`);
                if (confirmed) {
                    await deleteDailyWorkout(e.target.dataset.workoutId);
                }
            });
        });
    }

    modal.style.display = 'block';
    modal.classList.add('show-modal');
    console.log('DEBUG: dailyWorkoutsModal should now be visible.');
}


// --- Перемикання секцій ---
// Зроблено асинхронною, щоб дочекатися завантаження даних
async function handleSectionChange(sectionId) {
    console.log(`DEBUG: handleSectionChange called for section: ${sectionId}`);
    // Приховуємо всі секції
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active-section');
        section.classList.add('hidden-section');
    });

    // Показуємо вибрану секцію
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.remove('hidden-section');
        activeSection.classList.add('active-section');
    }

    // Оновлюємо активний клас у сайдбарі
    document.querySelectorAll('.sidebar-nav li').forEach(item => {
        item.classList.remove('active');
    });
    const activeMenuItem = document.querySelector(`.sidebar-nav li[data-section="${sectionId.replace('-section', '')}"]`);
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }

    // Додаткові дії при зміні секції
    if (sectionId === 'progress-section') {
        console.log('DEBUG: Entering progress-section. Fetching daily workouts and progress data.');
        await getDailyWorkoutsData(); // Спочатку завантажуємо щоденні тренування
        getUserProgressData(); // Потім завантажуємо прогрес, який оновить календар
    } else if (sectionId === 'workout-templates-section') {
        // При переході до шаблонів, завантажуємо їх з поточними фільтрами
        applyWorkoutTemplateFilters();
    } else if (sectionId === 'daily-workouts-section') {
        getDailyWorkoutsData();
    } else if (sectionId === 'profile-section') {
        getUserProfileData();
    } else if (sectionId === 'muscle-atlas-section') {
        // При переході до атласу скидаємо фільтр і відображаємо початкове повідомлення
        if (selectedMuscleGroupSpan && filteredWorkoutTemplatesList) {
            selectedMuscleGroupSpan.textContent = 'вибраної м\'язової групи';
            filteredWorkoutTemplatesList.innerHTML = '<p>Наведіть курсор або натисніть на м\'язову групу на зображенні, щоб побачити відповідні тренування.</p>';
        }
        activeMuscleGroup = null; // Скидаємо активну групу
        hoveredMuscleGroup = null; // Скидаємо наведену групу
        clearMuscleHighlight(); // Очищаємо всі підсвічування

        // Встановлюємо початковий вид на "спереду" і оновлюємо зображення
        currentView = 'front';
        updateMuscleAtlasImages(localStorage.getItem('theme') || 'light');
        // Активуємо кнопку "Вид спереду"
        document.getElementById('showFrontViewBtn').classList.add('active');
        document.getElementById('showBackViewBtn').classList.remove('active');
    }
}


// --- М'язовий атлас: логіка підсвічування та фільтрації ---

/**
 * Функція для нормалізації українських назв м'язів до англомовних відповідників,
 * які використовуються в ID зображень підсвічування.
 * @param {string} muscleName Українська назва м'яза.
 * @returns {string} Нормалізована назва м'яза.
 */
function getNormalizedMuscleName(muscleName) {
    const map = {
        'Груди': 'chest',
        'Біцепс': 'biceps',
        'Прес': 'abs',
        'Спина': 'back',
        'Трицепс': 'triceps',
        'Ноги': 'legs',
        'Плечі': 'shoulders',
        'Кардіо': 'cardio'
    };
    return map[muscleName] || muscleName.toLowerCase().replace(/\s/g, '');
}

// Функція для оновлення зображень атласу відповідно до теми та поточного виду
function updateMuscleAtlasImages(theme) {
    if (!body || !themeToggleBtn) {
        console.warn('DEBUG: updateMuscleAtlasImages: Body or themeToggleBtn not initialized. Skipping atlas image update.');
        return;
    }

    // Приховуємо всі базові зображення спочатку
    document.querySelectorAll('.base-image').forEach(img => {
        img.classList.remove('active-view');
        img.classList.add('hidden-view'); // Забезпечуємо, що вони приховані
    });

    // Показуємо лише те базове зображення, яке відповідає поточній темі ТА поточному виду
    const activeBaseImageId = `${currentView}BaseImage${theme === 'dark' ? 'Dark' : 'Light'}`;
    const activeBaseImage = document.getElementById(activeBaseImageId);
    if (activeBaseImage) {
        activeBaseImage.classList.add('active-view');
        activeBaseImage.classList.remove('hidden-view');
    } else {
        console.warn(`DEBUG: updateMuscleAtlasImages: Active base image not found for ID: ${activeBaseImageId}`);
    }

    // Оновлюємо видимість SVG-шляхів
    document.querySelectorAll('.front-view-svg').forEach(el => {
        el.style.display = currentView === 'front' ? 'block' : 'none';
    });
    document.querySelectorAll('.back-view-svg').forEach(el => {
        el.style.display = currentView === 'back' ? 'block' : 'none';
    });

    // Оновлюємо видимість підсвічувань м'язів
    updateHighlightImagesVisibility();
}

// Функція для оновлення видимості highlight-зображень
function updateHighlightImagesVisibility() {
    if (!highlightImages) {
        console.warn('DEBUG: updateHighlightImagesVisibility: highlightImages not initialized. Skipping update.');
        return;
    }

    // Приховуємо всі highlight-зображення спочатку
    highlightImages.forEach(img => img.classList.remove('active'));

    // Якщо є активна (клікнута) м'язова група, показуємо її підсвічування
    if (activeMuscleGroup) {
        const normalizedMuscleName = getNormalizedMuscleName(activeMuscleGroup);
        const highlightId = `highlight_${currentView}_${normalizedMuscleName}`;
        const activeHighlightImage = document.getElementById(highlightId);
        if (activeHighlightImage) {
            activeHighlightImage.classList.add('active');
        }
    }
    // Якщо є м'язова група, на яку наведено курсор (і вона не є клікнута), показуємо її підсвічування
    else if (hoveredMuscleGroup) {
        const normalizedMuscleName = getNormalizedMuscleName(hoveredMuscleGroup);
        const highlightId = `highlight_${currentView}_${normalizedMuscleName}`;
        const hoveredHighlightImage = document.getElementById(highlightId);
        if (hoveredHighlightImage) {
            hoveredHighlightImage.classList.add('active');
        }
    }
}


// Функція для підсвічування м'яза та фільтрації тренувань (при кліку)
async function highlightMuscle(muscleName) {
    activeMuscleGroup = muscleName; // Зберігаємо активну (клікнуту) м'язову групу
    hoveredMuscleGroup = null; // Скидаємо hovered, оскільки тепер це клікнута група

    // Оновлюємо видимість підсвічувань
    updateHighlightImagesVisibility();

    if (selectedMuscleGroupSpan) {
        selectedMuscleGroupSpan.textContent = muscleName;
    }
    if (filteredWorkoutTemplatesList) {
        // При фільтрації через атлас, скидаємо інші фільтри
        resetFilterUI();
        getWorkoutTemplatesData(muscleName, filteredWorkoutTemplatesList, true);
    }
}

// Функція для очищення підсвічування м'язів (використовується для hover та reset)
function clearMuscleHighlight() {
    if (highlightImages) {
        highlightImages.forEach(img => img.classList.remove('active'));
    }
}

// Додаємо функцію resetFilteredWorkouts
function resetFilteredWorkouts() {
    if (filteredWorkoutTemplatesList) {
        filteredWorkoutTemplatesList.innerHTML = '<p>Наведіть курсор або натисніть на м\'язову групу на зображенні, щоб побачити відповідні тренування.</p>';
    }
    if (selectedMuscleGroupSpan) {
        selectedMuscleGroupSpan.textContent = 'вибраної м\'язової групи';
    }
    activeMuscleGroup = null; // Скидаємо активну групу
    hoveredMuscleGroup = null; // Скидаємо наведену групу
    clearMuscleHighlight(); // Переконаємося, що всі підсвічування вимкнені
}

// Функції перемикання теми (світла/темна)
function loadTheme() {
    if (!body || !themeToggleBtn) {
        console.warn('DEBUG: loadTheme: Body or themeToggleBtn not initialized. Skipping theme loading.');
        return;
    }
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.classList.add(savedTheme + '-mode');
    if (savedTheme === 'dark') {
        themeToggleBtn.classList.replace('fa-moon', 'fa-sun');
    } else {
        themeToggleBtn.classList.replace('fa-sun', 'fa-moon');
    }
    updateMuscleAtlasImages(savedTheme); // Оновлюємо зображення атласу при завантаженні теми
}

function toggleTheme() {
    if (!body || !themeToggleBtn) {
        console.warn('DEBUG: toggleTheme: Body or themeToggleBtn not initialized. Skipping theme toggle.');
        return;
    }
    if (body.classList.contains('light-mode')) {
        body.classList.replace('light-mode', 'dark-mode');
        themeToggleBtn.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'dark');
        updateMuscleAtlasImages('dark');
    } else {
        body.classList.replace('dark-mode', 'light-mode');
        themeToggleBtn.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'light');
        updateMuscleAtlasImages('light');
    }
}

// Функція для збору та застосування фільтрів
function applyWorkoutTemplateFilters() {
    console.log('DEBUG: applyWorkoutTemplateFilters called.');
    const filters = {
        goal: filterGoalSelect.value,
        difficulty: filterDifficultySelect.value,
        equipment: Array.from(filterEquipmentCheckboxes).filter(cb => cb.checked).map(cb => cb.value),
        duration_category: filterDurationSelect.value
    };
    // Скидаємо активну м'язову групу, якщо застосовуються інші фільтри
    activeMuscleGroup = null;
    getWorkoutTemplatesData(null, document.getElementById('workoutTemplatesList'), false, filters);
}

// Функція для скидання фільтрів
function resetWorkoutTemplateFilters() {
    console.log('DEBUG: resetWorkoutTemplateFilters called.');
    resetFilterUI(); // Скидаємо UI фільтрів
    activeMuscleGroup = null; // Скидаємо активну м'язову групу
    getWorkoutTemplatesData(); // Завантажуємо всі шаблони без фільтрів
}

// Функція для скидання UI елементів фільтрів
function resetFilterUI() {
    if (filterGoalSelect) filterGoalSelect.value = '';
    if (filterDifficultySelect) filterDifficultySelect.value = '';
    if (filterEquipmentCheckboxes) {
        filterEquipmentCheckboxes.forEach(cb => cb.checked = false);
    }
    if (filterDurationSelect) filterDurationSelect.value = '';
}

/**
 * Функція для скидання всіх даних користувача (прогрес, тренування).
 */
async function resetAllUserData() {
    console.log('DEBUG: resetAllUserData started.');
    const confirmed = await showConfirm('Ви впевнені, що хочете скинути ВСІ ваші дані (прогрес, заплановані/виконані тренування)? Цю дію не можна скасувати!');

    if (confirmed) {
        try {
            const response = await authorizedFetch(`${BASE_URL}/reset_my_data`, {
                method: 'DELETE'
            });

            const result = await response.json();
            if (response.ok) {
                showAlert(result.message || 'Всі ваші дані успішно скинуто. Дашборд буде оновлено.');
                // Оновлюємо дані на дашборді, не виходячи з системи
                getUserProgressData(); // Оновити прогрес (має показати нульові значення)
                getDailyWorkoutsData(); // Оновити щоденні тренування (має бути порожнім)
                // Можливо, також оновити статистику на головній сторінці
                handleSectionChange('dashboard-section'); // Перенаправити на головну для візуального підтвердження
            } else {
                showAlert(result.message || 'Помилка при скиданні ваших даних.');
                // authorizedFetch вже обробить 401
            }
        } catch (error) {
            console.error('Помилка при скиданні даних:', error);
            // authorizedFetch вже виводить showAlert і log.
        }
    } else {
        showAlert('Скидання даних скасовано.');
    }
}


// --- Ініціалізація слухачів подій DOM та початкове завантаження даних ---
document.addEventListener('DOMContentLoaded', async () => { // <--- ЗРОБИЛИ АСИНХРОННОЮ
    console.log('DEBUG: DOMContentLoaded event fired.');

    // Присвоюємо значення DOM-елементів після завантаження DOM
    muscleMapSvg = document.getElementById('muscleMapSvg');
    highlightImages = document.querySelectorAll('.highlight-image');
    selectedMuscleGroupSpan = document.getElementById('selectedMuscleGroup');
    filteredWorkoutTemplatesList = document.getElementById('filteredWorkoutTemplatesList');
    themeToggleBtn = document.getElementById('themeToggleBtn');
    body = document.body;

    // Отримання посилань на елементи фільтрації
    filterGoalSelect = document.getElementById('filterGoal');
    filterDifficultySelect = document.getElementById('filterDifficulty');
    filterEquipmentCheckboxes = document.querySelectorAll('#filterEquipment input[type="checkbox"]');
    filterDurationSelect = document.getElementById('filterDuration');
    applyFiltersButton = document.getElementById('applyFiltersBtn');
    resetFiltersButton = document.getElementById('resetFiltersBtn');


    // Перевірка токена при завантаженні сторінки
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        console.log('DEBUG: Токен JWT відсутній, перенаправлення на login.html');
        window.location.href = 'login.html';
        return;
    }

    // ВИКЛИК getUserProfileData() одразу при завантаженні дашборду для негайного оновлення імені
    await getUserProfileData();

    // Початкове відображення секції "Головна"
    handleSectionChange('dashboard-section');

    // Навігація по сайдбару
    document.querySelectorAll('.sidebar-nav li').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.dataset.section + '-section';
            handleSectionChange(sectionId);
            // Закриваємо сайдбар на мобільних пристроях при виборі пункту меню
            const sidebar = document.querySelector('.sidebar');
            const backdrop = document.getElementById('mobileSidebarBackdrop');
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                backdrop.classList.remove('active');
            }
        });
    });

    // НОВЕ: Обробники для кнопок "Швидкі дії"
    document.querySelectorAll('.quick-actions .btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.dataset.sectionTarget;
            if (targetSection) {
                handleSectionChange(targetSection + '-section');
            }
        });
    });

    // Обробники для кнопок профілю
    document.getElementById('editProfileBtn')?.addEventListener('click', () => toggleProfileEditMode(true));
    document.getElementById('cancelEditProfileBtn')?.addEventListener('click', () => {
        // Відновлюємо початкові значення
        document.getElementById('profileUsername').value = initialProfileData.username;
        document.getElementById('profileEmail').value = initialProfileData.email;
        toggleProfileEditMode(false);
    });
    document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
        const username = document.getElementById('profileUsername').value;
        const email = document.getElementById('profileEmail').value;
        updateProfileData(username, email);
    });

    // Обробник для форми оновлення прогресу
    document.getElementById('updateProgressForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const weightInput = document.getElementById('currentWeight');
        const weight = weightInput.value;
        if (weight) {
            addNewProgress(weight);
        } else {
            showAlert('Будь ласка, введіть вагу.');
        }
    });

    // Обробник для кнопки скидання всіх даних
    document.getElementById('resetAllDataBtn')?.addEventListener('click', resetAllUserData);


    // Обробник для виходу з системи
    document.querySelector('.logout-link')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const confirmed = await showConfirm('Ви впевнені, що хочете вийти?');
        if (confirmed) {
            localStorage.removeItem('jwt_token');
            window.location.href = 'login.html';
        }
    });

    // Обробники для кнопок календаря
    document.getElementById('prevMonthBtn')?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonthBtn')?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });

    // Обробники для форми додавання шаблону тренування
    document.getElementById('addWorkoutTemplateForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('templateName').value;
        const description = document.getElementById('templateDescription').value;
        // Додаємо перевірку на існування елемента isGlobalTemplate
        const isGlobalCheckbox = document.getElementById('isGlobalTemplate');
        const isGlobal = isGlobalCheckbox ? isGlobalCheckbox.checked : false;

        const muscleGroups = document.getElementById('templateMuscleGroups').value.split(',').map(mg => mg.trim()).filter(mg => mg.length > 0);
        // Отримуємо значення нових полів
        const goal = document.getElementById('templateGoal').value;
        const difficulty = document.getElementById('templateDifficulty').value;
        // Для чекбоксів: збираємо значення всіх відмічених чекбоксів
        const equipment = Array.from(document.querySelectorAll('#templateEquipment input:checked')).map(cb => cb.value);
        const durationCategory = document.getElementById('templateDuration').value;


        const exercises = [];
        document.querySelectorAll('#exercisesContainer .exercise-item').forEach(item => {
            const exerciseName = item.querySelector('.exercise-name').value;
            const exerciseSets = parseInt(item.querySelector('.exercise-sets').value);
            const exerciseReps = item.querySelector('.exercise-reps').value;
            if (exerciseName && !isNaN(exerciseSets) && exerciseReps) { // Додана перевірка на isNaN для sets
                exercises.push({ name: exerciseName, sets: exerciseSets, reps: exerciseReps });
            } else {
                showAlert('Будь ласка, заповніть всі поля для вправи коректно.');
                return; // Зупиняємо відправку форми, якщо є порожні або некоректні поля
            }
        });
        // Додаткова перевірка, якщо exercises порожній
        if (exercises.length === 0) {
            showAlert('Будь ласка, додайте хоча б одну вправу.');
            return;
        }

        addNewWorkoutTemplate(name, description, exercises, isGlobal, muscleGroups, goal, difficulty, equipment, durationCategory);
    });

    document.getElementById('addExerciseBtn')?.addEventListener('click', addExerciseField);
    addExerciseField(); // Додаємо одне поле вправи за замовчуванням

    // Обробники для форми редагування шаблону тренування
    document.getElementById('editWorkoutTemplateForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const templateId = document.getElementById('editTemplateId').value;
        const name = document.getElementById('editTemplateName').value;
        const description = document.getElementById('editTemplateDescription').value;
        const isGlobal = document.getElementById('editIsGlobalTemplate').checked;
        const muscleGroups = document.getElementById('editTemplateMuscleGroups').value.split(',').map(mg => mg.trim()).filter(mg => mg.length > 0);
        // Отримуємо значення нових полів
        const goal = document.getElementById('editTemplateGoal').value;
        const difficulty = document.getElementById('editTemplateDifficulty').value;
        // Для чекбоксів: збираємо значення всіх відмічених чекбоксів
        const equipment = Array.from(document.querySelectorAll('#editTemplateEquipment input:checked')).map(cb => cb.value);
        const durationCategory = document.getElementById('editTemplateDuration').value;

        const exercises = [];
        document.querySelectorAll('#editExercisesContainer .exercise-item').forEach(item => {
            const exerciseName = item.querySelector('.exercise-name').value;
            const exerciseSets = parseInt(item.querySelector('.exercise-sets').value);
            const exerciseReps = item.querySelector('.exercise-reps').value;
            if (exerciseName && !isNaN(exerciseSets) && exerciseReps) { // Додана перевірка на isNaN для sets
                exercises.push({ name: exerciseName, sets: exerciseSets, reps: exerciseReps });
            } else {
                showAlert('Будь ласка, заповніть всі поля для вправи коректно.');
                return;
            }
        });
        // Додаткова перевірка, якщо exercises порожній
        if (exercises.length === 0) {
            showAlert('Будь ласка, додайте хоча б одну вправу.');
            return;
        }
        updateWorkoutTemplate(templateId, name, description, exercises, isGlobal, muscleGroups, goal, difficulty, equipment, durationCategory);
    });

    document.getElementById('addEditExerciseBtn')?.addEventListener('click', addEditExerciseField);


    // Обробники для таймера тренування
    document.getElementById('startTimerBtn')?.addEventListener('click', startTimer);
    document.getElementById('pauseTimerBtn')?.addEventListener('click', pauseTimer);
    document.getElementById('resetTimerBtn')?.addEventListener('click', resetTimer);

    // Обробник для завершення тренування
    document.getElementById('startWorkoutForm')?.addEventListener('submit', async (e) => {
        e.preventDefault(); // Запобігаємо стандартній відправці форми
        const startWorkoutModal = document.getElementById('startWorkoutModal');

        // Приховуємо модальне вікно "Розпочати тренування" перед показом підтвердження
        startWorkoutModal.classList.remove('show-modal');
        startWorkoutModal.style.display = 'none';

        const confirmed = await showConfirm('Ви впевнені, що хочете завершити це тренування?');

        if (confirmed) {
            await completeWorkout();
        } else {
            // Якщо користувач скасував, знову показуємо модальне вікно "Розпочати тренування"
            startWorkoutModal.style.display = 'block';
            startWorkoutModal.classList.add('show-modal');
        }
    });

    // Закриття модальних вікон при кліку на хрестик або поза вікном
    document.querySelectorAll('.modal .close-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            modal.classList.remove('show-modal');
            modal.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        document.querySelectorAll('.modal').forEach(modal => {
            // Перевіряємо, чи клік був на фоні модального вікна, і чи воно активне
            if (event.target === modal && modal.classList.contains('show-modal')) {
                modal.classList.remove('show-modal');
                modal.style.display = 'none';
            }
        });
    });

    // Перемикання теми (світла/темна)
    themeToggleBtn?.addEventListener('click', toggleTheme);
    loadTheme(); // Завантажуємо тему при завантаженні DOM


    // Слухачі подій для SVG-шляхів (клік та наведення)
    if (muscleMapSvg) {
        muscleMapSvg.addEventListener('click', (e) => {
            const target = e.target.closest('.muscle-group');
            if (target) {
                const muscleName = target.dataset.muscle;
                if (muscleName) {
                    highlightMuscle(muscleName); // Клік встановлює activeMuscleGroup
                }
            } else {
                activeMuscleGroup = null; // Скидаємо вибраний м'яз при кліку поза зонами
                resetFilteredWorkouts();
                clearMuscleHighlight(); // Очищаємо всі підсвічування
            }
        });

        muscleMapSvg.addEventListener('mouseover', (e) => {
            const target = e.target.closest('.muscle-group');
            if (target) {
                const muscleName = target.dataset.muscle;
                if (muscleName) {
                    hoveredMuscleGroup = muscleName; // Зберігаємо наведений м'яз
                    updateHighlightImagesVisibility(); // Оновлюємо, щоб показати наведений
                    if (selectedMuscleGroupSpan) {
                        selectedMuscleGroupSpan.textContent = muscleName;
                    }
                }
            }
        });

        muscleMapSvg.addEventListener('mouseout', (e) => {
            const target = e.target.closest('.muscle-group');
            if (target) {
                hoveredMuscleGroup = null; // Скидаємо наведений м'яз
                updateHighlightImagesVisibility(); // Оновлюємо, щоб прибрати наведений і показати клікнутий (якщо є)
                if (selectedMuscleGroupSpan) {
                    if (!activeMuscleGroup) { // Якщо немає клікнутого м'яза
                        selectedMuscleGroupSpan.textContent = 'вибраної м\'язової групи';
                    } else { // Якщо є клікнутий м'яз, повертаємо його назву
                        selectedMuscleGroupSpan.textContent = activeMuscleGroup;
                    }
                }
            }
        });
    } else {
        console.warn('DEBUG: Елемент #muscleMapSvg не знайдено. Функціонал м\'язового атласу може не працювати.');
    }


    // Логіка перемикання виду (спереду/ззаду)
    document.getElementById('showFrontViewBtn')?.addEventListener('click', () => {
        currentView = 'front';
        updateMuscleAtlasImages(localStorage.getItem('theme') || 'light');
        document.getElementById('showFrontViewBtn').classList.add('active');
        document.getElementById('showBackViewBtn').classList.remove('active');
        activeMuscleGroup = null; // Скидаємо активну групу при зміні виду
        hoveredMuscleGroup = null; // Скидаємо наведену групу при зміні виду
        resetFilteredWorkouts(); // Скидаємо фільтр і очищаємо підсвічування
    });

    document.getElementById('showBackViewBtn')?.addEventListener('click', () => {
        currentView = 'back';
        updateMuscleAtlasImages(localStorage.getItem('theme') || 'light');
        document.getElementById('showBackViewBtn').classList.add('active');
        document.getElementById('showFrontViewBtn').classList.remove('active');
        activeMuscleGroup = null; // Скидаємо активну групу при зміні виду
        hoveredMuscleGroup = null; // Скидаємо наведену групу при зміні виду
        resetFilteredWorkouts(); // Скидаємо фільтр і очищаємо підсвічування
    });


    // --- Гамбургер-меню логіка ---
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const sidebar = document.querySelector('.sidebar');
    const mobileSidebarBackdrop = document.getElementById('mobileSidebarBackdrop');

    hamburgerMenu?.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        mobileSidebarBackdrop.classList.toggle('active');
    });

    mobileSidebarBackdrop?.addEventListener('click', () => {
        sidebar.classList.remove('open');
        mobileSidebarBackdrop.classList.remove('active');
    });

    // Закриваємо сайдбар, якщо розширюємо екран за межі мобільного
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('open');
            mobileSidebarBackdrop.classList.remove('active');
        }
    });

    // Обробники подій для кнопок фільтрації
    applyFiltersButton?.addEventListener('click', applyWorkoutTemplateFilters);
    resetFiltersButton?.addEventListener('click', resetWorkoutTemplateFilters);
});