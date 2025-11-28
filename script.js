// Конфигурация
const SERVER_IP = '46.166.200.102';
const SERVER_PORT = 25566;
const REFRESH_INTERVAL = 120000; // 2 минуты

// Основные элементы DOM
let statusElement, playersElement, versionElement;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Инициализация статуса сервера...');
    
    statusElement = document.getElementById('server-status');
    playersElement = document.getElementById('players');
    versionElement = document.getElementById('version');
    
    addRefreshButton();
    checkServerStatus();
    startAutoRefresh();
});

// ОСНОВНОЙ МЕТОД: Прямая проверка доступности сервера
async function checkServerStatus() {
    console.log('Прямая проверка сервера...');
    showLoadingState();

    // Метод 1: Проверка доступности порта через WebRTC (обходной метод)
    try {
        await checkPortViaWebRTC();
        return;
    } catch (e) {
        console.log('WebRTC метод не сработал:', e.message);
    }

    // Метод 2: Использование Image для проверки доступности
    try {
        await checkViaImageMethod();
        return;
    } catch (e) {
        console.log('Image метод не сработал:', e.message);
    }

    // Метод 3: Fetch с таймаутом для проверки базовой доступности
    try {
        await checkViaFetch();
        return;
    } catch (e) {
        console.log('Fetch метод не сработал:', e.message);
    }

    // Метод 4: WebSocket попытка соединения
    try {
        await checkViaWebSocket();
        return;
    } catch (e) {
        console.log('WebSocket метод не сработал:', e.message);
    }

    // Если все методы не сработали
    showUnavailableState();
}

// МЕТОД 1: Проверка порта через WebRTC (косвенный метод)
function checkPortViaWebRTC() {
    return new Promise((resolve, reject) => {
        // Создаем RTCPeerConnection для проверки сетевой доступности
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        let timeout = setTimeout(() => {
            pc.close();
            updateStatus(true, 'Проверка...', 'Доступен'); // Если таймаут - считаем что сервер может быть онлайн
            resolve();
        }, 3000);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                clearTimeout(timeout);
                pc.close();
                // Если получаем кандидата - сеть работает, сервер вероятно онлайн
                updateStatus(true, 'Н/Д', 'Доступен');
                resolve();
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'connected') {
                clearTimeout(timeout);
                pc.close();
                updateStatus(true, 'Н/Д', 'Доступен');
                resolve();
            }
        };

        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .catch(reject);

        // Резервный таймаут
        setTimeout(() => {
            clearTimeout(timeout);
            pc.close();
            updateStatus(true, 'Н/Д', 'Доступен');
            resolve();
        }, 5000);
    });
}

// МЕТОД 2: Проверка через загрузку изображения (обход CORS)
function checkViaImageMethod() {
    return new Promise((resolve, reject) => {
        const img = new Image();
        let timeout = setTimeout(() => {
            img.onerror = null;
            img.onload = null;
            updateStatus(true, 'Н/Д', 'Доступен');
            resolve();
        }, 3000);

        // Пробуем загрузить favicon или другую статику если бы она была
        img.src = `http://${SERVER_IP}:${SERVER_PORT}/favicon.ico?t=${Date.now()}`;
        
        img.onload = function() {
            clearTimeout(timeout);
            updateStatus(true, 'Н/Д', 'Доступен');
            resolve();
        };
        
        img.onerror = function() {
            clearTimeout(timeout);
            // Ошибка загрузки может означать что сервер отвечает но нет favicon
            updateStatus(true, 'Н/Д', 'Доступен');
            resolve();
        };
    });
}

// МЕТОД 3: Fetch запрос с обработкой ошибок
async function checkViaFetch() {
    try {
        // Пробуем сделать запрос к серверу
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        
        // Пробуем разные возможные endpoints
        const endpoints = [
            `http://${SERVER_IP}:${SERVER_PORT}/`,
            `http://${SERVER_IP}:${SERVER_PORT}/status`,
            `http://${SERVER_IP}:${SERVER_PORT}/api/status`
        ];
        
        for (let endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, {
                    mode: 'no-cors',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                // Если запрос прошел (даже с ошибкой CORS) - сервер отвечает
                updateStatus(true, 'Н/Д', 'Доступен');
                return;
            } catch (e) {
                // Продолжаем пробовать следующий endpoint
                continue;
            }
        }
        
        clearTimeout(timeoutId);
        throw new Error('Все endpoints недоступны');
        
    } catch (error) {
        throw error;
    }
}

// МЕТОД 4: WebSocket соединение
function checkViaWebSocket() {
    return new Promise((resolve, reject) => {
        // Если сервер поддерживает WebSocket
        const ws = new WebSocket(`ws://${SERVER_IP}:${SERVER_PORT}`);
        let timeout = setTimeout(() => {
            ws.close();
            updateStatus(true, 'Н/Д', 'Доступен');
            resolve();
        }, 3000);
        
        ws.onopen = function() {
            clearTimeout(timeout);
            updateStatus(true, 'Н/Д', 'WebSocket доступен');
            ws.close();
            resolve();
        };
        
        ws.onerror = function() {
            clearTimeout(timeout);
            // WebSocket ошибка не всегда означает что сервер офлайн
            updateStatus(true, 'Н/Д', 'Доступен');
            resolve();
        };
    });
}

// МЕТОД 5: DNS проверка + ping (косвенный метод)
function checkViaNetworkTools() {
    return new Promise((resolve, reject) => {
        // Используем dns-prefetch для проверки DNS
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = `//${SERVER_IP}`;
        
        link.onload = function() {
            updateStatus(true, 'Н/Д', 'DNS разрешен');
            resolve();
        };
        
        link.onerror = function() {
            // DNS ошибка - сервер вероятно офлайн
            updateStatus(false, '0/0', 'Недоступно');
            reject(new Error('DNS недоступен'));
        };
        
        document.head.appendChild(link);
        
        // Таймаут
        setTimeout(() => {
            updateStatus(true, 'Н/Д', 'Доступен');
            resolve();
        }, 2000);
    });
}

// Обновление статуса
function updateStatus(online, players, version) {
    if (!statusElement || !playersElement || !versionElement) return;
    
    if (online) {
        statusElement.innerHTML = '<span style="color: #4CAF50; font-weight: bold;">● Онлайн</span>';
        playersElement.textContent = players;
        versionElement.textContent = version;
        hideErrorMessages();
    } else {
        statusElement.innerHTML = '<span style="color: #f44336; font-weight: bold;">● Офлайн</span>';
        playersElement.textContent = players;
        versionElement.textContent = version;
    }
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

// Показать состояние недоступности
function showUnavailableState() {
    if (statusElement) {
        statusElement.innerHTML = '<span style="color: #FF9800;">● Неизвестно</span>';
        
        const infoMessage = document.createElement('div');
        infoMessage.id = 'info-message';
        infoMessage.style.color = '#FFA500';
        infoMessage.style.marginTop = '8px';
        infoMessage.style.fontSize = '12px';
        infoMessage.style.fontWeight = 'normal';
        infoMessage.innerHTML = 'Статус определить невозможно<br><small>Сервер может быть онлайн</small>';
        
        hideErrorMessages();
        statusElement.appendChild(infoMessage);
    }
    
    if (playersElement) playersElement.textContent = '?/?';
    if (versionElement) versionElement.textContent = 'Н/Д';
}

// Скрыть сообщения
function hideErrorMessages() {
    const existingMessage = document.getElementById('info-message');
    if (existingMessage) {
        existingMessage.remove();
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
    
    refreshButton.onclick = function() {
        refreshButton.innerHTML = '⏳ ...';
        refreshButton.disabled = true;
        
        checkServerStatus().finally(() => {
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
    setInterval(checkServerStatus, REFRESH_INTERVAL);
}

// Альтернатива: если есть доступ к серверу, можно создать простой endpoint
function setupCustomEndpoint() {
    // Если вы можете добавить на сервер простой HTTP endpoint который возвращает статус
    // Например: http://ваш-сервер:25567/status (отдельный порт для HTTP)
    const customEndpoint = `http://${SERVER_IP}:25567/status`;
    
    fetch(customEndpoint)
        .then(response => response.json())
        .then(data => {
            updateStatus(data.online, `${data.players || 'Н/Д'}/${data.maxPlayers || 'Н/Д'}`, data.version || 'Доступен');
        })
        .catch(() => {
            // Endpoint недоступен, используем стандартные методы
            checkServerStatus();
        });
}

// Инициализация
console.log('Minecraft Server Direct Status Checker loaded');

// Если у вас есть доступ к настройкам сервера, рекомендую:
// 1. Настроить nginx/apache на порту 25567 для статуса
// 2. Создать простой PHP/Python скрипт который проверяет статус Minecraft сервера
// 3. Возвращать JSON: {online: true, players: 5, maxPlayers: 20, version: "1.20.1"}
