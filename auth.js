// auth.js
// Цей файл містить логіку реєстрації, входу та виходу.

console.log('DEBUG: auth.js script started.');

// BASE_URL тепер оголошується тут, щоб бути доступним для функцій автентифікації

/**
 * Функція для реєстрації користувача.
 * @param {string} username Ім'я користувача.
 * @param {string} email Електронна пошта.
 * @param {string} password Пароль.
 * @param {HTMLElement} messageElement Елемент для відображення повідомлень.
 */
async function registerUser(username, email, password, messageElement) {
    messageElement.textContent = ''; // Очищаємо попередні повідомлення

    try {
        const response = await fetch(`${BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            messageElement.textContent = data.message || 'Реєстрація успішна! Тепер ви можете увійти.';
            messageElement.className = 'message success';
            // Очистити форму після успішної реєстрації
            document.getElementById('registerForm').reset();
        } else {
            messageElement.textContent = data.message || 'Помилка реєстрації.';
            messageElement.className = 'message error';
        }
    } catch (error) {
        console.error('Помилка мережі при реєстрації:', error);
        messageElement.textContent = 'Помилка підключення до сервера. Спробуйте пізніше.';
        messageElement.className = 'message error';
    }
}

/**
 * Функція для входу користувача.
 * @param {string} email Електронна пошта.
 * @param {string} password Пароль.
 * @param {HTMLElement} messageElement Елемент для відображення повідомлень.
 */
async function loginUser(email, password) {
    const loginMessage = document.getElementById('loginMessage');
    loginMessage.textContent = ''; // Очистити попередні повідомлення

    try {
        const response = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('jwt_token', data.token);
            // ОПТИМІЗАЦІЯ ТУТ:
            // Зберігаємо ім'я користувача та роль у локальне сховище або глобальні змінні
            // щоб вони були доступні відразу після входу.
            // Припускаємо, що бекенд повертає username і role при вході
            if (data.username) {
                localStorage.setItem('username', data.username);
            }
            if (data.role) {
                localStorage.setItem('user_role', data.role);
            }
            // *** ЦЕ КЛЮЧОВИЙ МОМЕНТ ***
            // Перенаправляємо на дашборд. Дашборд тепер завантажить ці дані.
            window.location.href = 'dashboard.html';
        } else {
            loginMessage.textContent = data.message || 'Помилка входу.';
            loginMessage.style.color = 'red';
        }
    } catch (error) {
        console.error('Помилка мережі при вході:', error);
        loginMessage.textContent = 'Помилка підключення до сервера. Спробуйте пізніше.';
        loginMessage.style.color = 'red';
    }
}

/**
 * Функція для виходу користувача.
 */
function logout() {
    localStorage.removeItem('jwt_token'); // Видаляємо JWT токен
    console.log('DEBUG: Користувач вийшов. Токен видалено.');
    window.location.href = 'login.html'; // Перенаправляємо на сторінку входу
}


// Обробники подій для сторінок входу/реєстрації
document.addEventListener('DOMContentLoaded', () => {
    console.log('DEBUG: DOMContentLoaded event fired in auth.js.');
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

    if (registerForm) {
        const registerMessage = document.getElementById('registerMessage');
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('regUsername').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            await registerUser(username, email, password, registerMessage);
        });
    }

    if (loginForm) {
        const loginMessage = document.getElementById('loginMessage');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            await loginUser(email, password, loginMessage);
        });
    }
});
