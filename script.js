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
});

// Основная функция получения статуса сервера с альтернативными API
async function fetchServerStatus() {
    console.log('Проверка статуса сервера...');
    
    // Показываем индикатор загрузки
    showLoadingState();
    
    // Список альтернативных API в порядке приоритета
    const apiEndpoints = [
        {
            name: 'mcstatus.io',
            url: `https://api.mcstatus.io/v2/status/java/${SERVER_IP}:${SERVER_PORT}`,
            parser: parseMcStatusIO
        },
        {
            name: 'mcapi.us',
            url: `https://mcapi.us/server/status?ip=${SERVER_IP}&port=${SERVER_PORT}`,
            parser: parseMcApiUS
        },
        {
            name: 'mcsrvstat.us v2',
            url: `https://api.mcsrvstat.us/2/${SERVER_IP}:${SERVER_PORT}`,
            parser: parseMcSrvStat
        },
        {
            name: 'mcsrvstat.us v3',
            url: `https://api.mcsrvstat.us/3/${SERVER_IP}:${SERVER_PORT}`,
            parser: parseMcSrvStat
        }
    ];

    for (const endpoint of apiEndpoints) {
        try {
            console.log(`Пробуем API: ${endpoint.name}`);
            const data = await fetchAPI(endpoint.url);
            
            if (data) {
                const serverData = endpoint.parser(data);
                if (serverData) {
                    updateServerStatus(serverData);
                    console.log(`Успешно получены данные от ${endpoint.name}`);
                    return;
                }
            }
        } catch (error) {
            console.warn(`API ${endpoint.name} не сработало:`, error.message);
            continue;
        }
    }
    
    // Если все API не сработали
    showErrorState();
}

// Универсальная функция для запросов к API
async function fetchAPI(url) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'MinecraftServerStatus/1.0'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Таймаут запроса');
        }
        throw error;
    }
}

// Парсер для mcstatus.io
function parseMcStatusIO(data) {
    if (!data || typeof data.online !== 'boolean') return null;
    
    return {
        online: data.online,
        players: {
            online: data.players?.online || 0,
            max: data.players?.max || 0
        },
        version: data.version?.name_clean || data.version?.name || 'Неизвестно',
        motd: data.motd?.clean || ''
    };
}

// Парсер для mcapi.us
function parseMcApiUS(data) {
    if (!data || !data.server || typeof data.online !== 'boolean') return null;
    
    return {
        online: data.online,
        players: {
            online: data.players?.now || 0,
            max: data.players?.max || 0
        },
        version: data.server?.name || 'Неизвестно',
        motd: data.motd || ''
    };
}

// Парсер для mcsrvstat.us
function parseMcSrvStat(data) {
    if (!data || typeof data.online !== 'boolean') return null;
    
    return {
        online: data.online,
        players: {
            online: data.players?.online || 0,
            max: data.players?.max || 0
        },
        version: data.version || 'Неизвестно',
        motd: data.motd?.clean || data.motd?.raw || ''
    };
}

// Обновление статуса на странице
function updateServerStatus(serverData) {
    if (!statusElement || !playersElement || !versionElement) {
        console.error('Элементы DOM не найдены');
        return;
    }
    
    if (serverData.online) {
        // Сервер онлайн
        statusElement.innerHTML = '<span style="color: #4CAF50; font-weight: bold;">● Онлайн</span>';
        playersElement.textContent = `${serverData.players.online}/${serverData.players.max}`;
        versionElement.textContent = serverData.version;
        
        // Показываем дополнительную информацию если есть
        if (serverData.motd && serverData.motd.trim() !== '') {
            showMotd(serverData.motd);
        }
        
    } else {
        // Сервер офлайн
        statusElement.innerHTML = '<span style="color: #f44336; font-weight: bold;">● Офлайн</span>';
        playersElement.textContent = '0/0';
        versionElement.textContent = 'Недоступно';
    }
    
    // Убираем сообщения об ошибках
    hideErrorMessages();
}

// Показать MOTD (описание сервера)
function showMotd(motd) {
    // Удаляем старый MOTD если есть
    const oldMotd = document.getElementById('server-motd');
    if (oldMotd) oldMotd.remove();
    
    const motdElement = document.createElement('div');
    motdElement.id = 'server-motd';
    motdElement.style.marginTop = '8px';
    motdElement.style.fontSize = '12px';
    motdElement.style.color = '#888';
    motdElement.style.fontStyle = 'italic';
    motdElement.textContent = `"${motd}"`;
    
    statusElement.appendChild(motdElement);
}

// Показать состояние загрузки
function showLoadingState() {
    if (statusElement) {
        statusElement.innerHTML = '<span style="color: #FF9800;">● Проверка...</span>';
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
        statusElement.innerHTML = '<span style="color: #FF9800;">● Недоступно</span>';
        
        const errorMessage = document.createElement('div');
        errorMessage.id = 'error-message';
        errorMessage.style.color = '#ff6b6b';
        errorMessage.style.marginTop = '8px';
        errorMessage.style.fontSize = '12px';
        errorMessage.style.fontWeight = 'normal';
        errorMessage.textContent = 'Сервер не отвечает';
        
        hideErrorMessages();
        statusElement.appendChild(errorMessage);
    }
    
    if (playersElement) playersElement.textContent = '?/?';
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
    const existingButton = document.getElementById('refresh-status-btn');
    if (existingButton) return;
    
    const refreshButton = document.createElement('button');
    refreshButton.id = 'refresh-status-btn';
    refreshButton.innerHTML = '🔄 Обновить';
    refreshButton.style.marginTop = '10px';
    refreshButton.style.padding = '6px 12px';
    refreshButton.style.backgroundColor = '#666';
    refreshButton.style.color = 'white';
    refreshButton.style.border = 'none';
    refreshButton.style.borderRadius = '3px';
    refreshButton.style.cursor = 'pointer';
    refreshButton.style.fontSize = '12px';
    refreshButton.style.transition = 'background-color 0.2s';
    
    refreshButton.onmouseover = function() {
        this.style.backgroundColor = '#555';
    };
    refreshButton.onmouseout = function() {
        this.style.backgroundColor = '#666';
    };
    
    refreshButton.onclick = function() {
        refreshButton.innerHTML = '⏳ ...';
        refreshButton.disabled = true;
        
        fetchServerStatus().finally(() => {
            setTimeout(() => {
                refreshButton.innerHTML = '🔄 Обновить';
                refreshButton.disabled = false;
            }, 1000);
        });
    };
    
    const statusContainer = statusElement?.parentNode;
    if (statusContainer) {
        statusContainer.appendChild(refreshButton);
    }
}

// Запуск автоматического обновления
function startAutoRefresh() {
    console.log('Автообновление запущено');
    setInterval(fetchServerStatus, REFRESH_INTERVAL);
}

// Функция для ручного обновления
function refreshServerStatus() {
    console.log('Ручное обновление статуса');
    fetchServerStatus();
}

// Показываем версию скрипта в консоли
console.log('Minecraft Server Status Script v3.0 loaded - Multi-API version');

// Делаем функции доступными глобально (для отладки)
window.refreshServerStatus = refreshServerStatus;
window.getServerStatus = fetchServerStatus;

// Обработчик видимости страницы - обновляем при возвращении на вкладку
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        fetchServerStatus();
    }
});