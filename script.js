// Конфигурация
const SERVER_IP = '46.166.200.102';
const SERVER_PORT = '25566';
const REFRESH_INTERVAL = 120000; // 2 минуты

// Основные элементы DOM
let statusElement, playersElement, versionElement;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница загружена, инициализация...');
    
    // Находим элементы
    statusElement = document.getElementById('server-status');
    playersElement = document.getElementById('players');
    versionElement = document.getElementById('version');
    
    // Добавляем кнопку обновления
    addRefreshButton();
    
    // Первая проверка статуса
    fetchServerStatus();
    
    // Запускаем автоматическое обновление
    startAutoRefresh();
    
    // Инициализация других компонентов страницы
    initPageComponents();
});

// Основная функция получения статуса сервера
async function fetchServerStatus() {
    console.log('Проверка статуса сервера...');
    
    // Показываем индикатор загрузки
    showLoadingState();
    
    try {
        // Пробуем основной API (версия 3)
        let apiUrl = `https://api.mcsrvstat.us/3/${SERVER_IP}:${SERVER_PORT}`;
        console.log('Подключение к API:', apiUrl);
        
        const response = await fetchWithTimeout(apiUrl, 10000);
        
        if (!response.ok) {
            throw new Error(`HTTP ошибка! статус: ${response.status}`);
        }

        const data = await response.json();
        console.log('Данные получены:', data);
        
        updateServerStatus(data);
        
    } catch (error) {
        console.error('Ошибка основного API:', error);
        
        // Пробуем альтернативный API (версия 2)
        try {
            console.log('Пробуем альтернативный API v2...');
            const backupUrl = `https://api.mcsrvstat.us/2/${SERVER_IP}:${SERVER_PORT}`;
            const backupResponse = await fetchWithTimeout(backupUrl, 10000);
            
            if (backupResponse.ok) {
                const backupData = await backupResponse.json();
                console.log('Данные от альтернативного API:', backupData);
                updateServerStatus(backupData);
                return;
            }
        } catch (backupError) {
            console.error('Альтернативный API тоже не сработал:', backupError);
            
            // Пробуем третий вариант API
            try {
                console.log('Пробуем API mcstatus.io...');
                const thirdPartyResponse = await fetchWithTimeout(
                    `https://api.mcstatus.io/v2/status/java/${SERVER_IP}:${SERVER_PORT}`,
                    10000
                );
                
                if (thirdPartyResponse.ok) {
                    const thirdPartyData = await thirdPartyResponse.json();
                    console.log('Данные от mcstatus.io:', thirdPartyData);
                    updateServerStatusFromMcStatus(thirdPartyData);
                    return;
                }
            } catch (thirdError) {
                console.error('Все API не сработали:', thirdError);
            }
        }
        
        // Если все API не работают
        showErrorState();
    }
}

// Функция fetch с таймаутом
function fetchWithTimeout(url, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            reject(new Error('Таймаут запроса'));
        }, timeout);
        
        fetch(url, { 
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'MinecraftServerStatus/1.0'
            }
        })
        .then(response => {
            clearTimeout(timeoutId);
            resolve(response);
        })
        .catch(error => {
            clearTimeout(timeoutId);
            reject(error);
        });
    });
}

// Обновление статуса из основного API
function updateServerStatus(data) {
    if (!statusElement || !playersElement || !versionElement) {
        console.error('Элементы DOM не найдены');
        return;
    }
    
    if (data.online) {
        // Сервер онлайн
        statusElement.innerHTML = '<span style="color: #4CAF50;">● Онлайн</span>';
        
        const playersOnline = data.players?.online || 0;
        const playersMax = data.players?.max || 0;
        playersElement.textContent = `${playersOnline}/${playersMax}`;
        
        versionElement.textContent = data.version || 'Неизвестно';
        
        // Дополнительная информация если есть
        if (data.players && data.players.list && data.players.list.length > 0) {
            console.log('Игроки онлайн:', data.players.list);
        }
        
    } else {
        // Сервер офлайн
        statusElement.innerHTML = '<span style="color: #f44336;">● Офлайн</span>';
        playersElement.textContent = '0/0';
        versionElement.textContent = 'Недоступно';
    }
    
    // Убираем сообщения об ошибках
    hideErrorMessages();
}

// Обновление статуса из альтернативного API mcstatus.io
function updateServerStatusFromMcStatus(data) {
    if (!statusElement || !playersElement || !versionElement) return;
    
    if (data.online) {
        statusElement.innerHTML = '<span style="color: #4CAF50;">● Онлайн</span>';
        
        const playersOnline = data.players?.online || 0;
        const playersMax = data.players?.max || 0;
        playersElement.textContent = `${playersOnline}/${playersMax}`;
        
        versionElement.textContent = data.version?.name_clean || data.version?.name || 'Неизвестно';
        
    } else {
        statusElement.innerHTML = '<span style="color: #f44336;">● Офлайн</span>';
        playersElement.textContent = '0/0';
        versionElement.textContent = 'Недоступно';
    }
    
    hideErrorMessages();
}

// Показать состояние загрузки
function showLoadingState() {
    if (statusElement) {
        statusElement.innerHTML = '<span style="color: #FF9800;">● Загрузка...</span>';
    }
    if (playersElement) {
        playersElement.textContent = '...';
    }
    if (versionElement) {
        versionElement.textContent = '...';
    }
}

// Показать состояние ошибки
function showErrorState() {
    if (statusElement) {
        statusElement.innerHTML = '<span style="color: #FF9800;">● Ошибка подключения</span>';
        
        // Добавляем сообщение об ошибке
        const errorMessage = document.createElement('div');
        errorMessage.id = 'error-message';
        errorMessage.style.color = '#ff6b6b';
        errorMessage.style.marginTop = '10px';
        errorMessage.style.fontSize = '14px';
        errorMessage.style.fontWeight = 'normal';
        errorMessage.innerHTML = 'Не удалось получить статус сервера<br><small>Попробуйте обновить страницу</small>';
        
        // Убираем старые сообщения об ошибках
        hideErrorMessages();
        
        statusElement.appendChild(errorMessage);
    }
    
    if (playersElement) playersElement.textContent = 'Н/Д';
    if (versionElement) versionElement.textContent = 'Н/Д';
}

// Скрыть сообщения об ошибках
function hideErrorMessages() {
    const existingError = document.getElementById('error-message');
    if (existingError) {
        existingError.remove();
    }
}

// Добавить кнопку обновления
function addRefreshButton() {
    // Удаляем старую кнопку если есть
    const existingButton = document.getElementById('refresh-status-btn');
    if (existingButton) {
        existingButton.remove();
    }
    
    // Создаем новую кнопку
    const refreshButton = document.createElement('button');
    refreshButton.id = 'refresh-status-btn';
    refreshButton.innerHTML = '🔄 Обновить статус';
    refreshButton.style.marginTop = '15px';
    refreshButton.style.padding = '8px 16px';
    refreshButton.style.backgroundColor = '#2196F3';
    refreshButton.style.color = 'white';
    refreshButton.style.border = 'none';
    refreshButton.style.borderRadius = '4px';
    refreshButton.style.cursor = 'pointer';
    refreshButton.style.fontSize = '14px';
    refreshButton.style.transition = 'background-color 0.3s';
    
    // Эффект при наведении
    refreshButton.onmouseover = function() {
        this.style.backgroundColor = '#1976D2';
    };
    refreshButton.onmouseout = function() {
        this.style.backgroundColor = '#2196F3';
    };
    
    // Обработчик клика
    refreshButton.onclick = function() {
        refreshButton.innerHTML = '⏳ Обновление...';
        refreshButton.disabled = true;
        
        fetchServerStatus().finally(() => {
            setTimeout(() => {
                refreshButton.innerHTML = '🔄 Обновить статус';
                refreshButton.disabled = false;
            }, 1000);
        });
    };
    
    // Добавляем кнопку в подходящее место
    const statusContainer = document.querySelector('.server-status-container') || 
                           document.querySelector('.status-container') || 
                           statusElement?.parentNode;
    
    if (statusContainer) {
        statusContainer.appendChild(refreshButton);
    } else {
        console.warn('Не найден контейнер для кнопки обновления');
    }
}

// Запуск автоматического обновления
function startAutoRefresh() {
    console.log(`Автообновление запущено (интервал: ${REFRESH_INTERVAL/1000} сек)`);
    
    setInterval(() => {
        console.log('Автоматическое обновление статуса...');
        fetchServerStatus();
    }, REFRESH_INTERVAL);
}

// Функция для ручного обновления (можно вызвать из консоли)
function refreshServerStatus() {
    console.log('Ручное обновление статуса');
    fetchServerStatus();
}

// Инициализация других компонентов страницы
function initPageComponents() {
    // Здесь может быть код для инициализации других элементов страницы
    console.log('Инициализация компонентов страницы...');
    
    // Добавляем стили для улучшенного отображения
    addCustomStyles();
}

// Добавление кастомных стилей
function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .status-loading {
            color: #FF9800 !important;
            font-style: italic;
        }
        .status-online {
            color: #4CAF50 !important;
            font-weight: bold;
        }
        .status-offline {
            color: #f44336 !important;
            font-weight: bold;
        }
        .status-error {
            color: #FF9800 !important;
            font-weight: bold;
        }
        #refresh-status-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);
}

// Показываем версию скрипта в консоли
console.log('Minecraft Server Status Script v2.0 loaded');

// Делаем функции доступными глобально (для отладки)
window.refreshServerStatus = refreshServerStatus;
window.getServerConfig = () => ({ ip: SERVER_IP, port: SERVER_PORT });

// Обработчик ошибок страницы
window.addEventListener('error', function(e) {
    console.error('Глобальная ошибка:', e.error);
});
