document.addEventListener('DOMContentLoaded', function() {
    // Получаем элементы DOM
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const version = document.getElementById('version');
    const software = document.getElementById('software');
    const motd = document.getElementById('motd');
    const playerCount = document.getElementById('player-count');
    const playerProgress = document.getElementById('player-progress');
    const refreshBtn = document.getElementById('refresh-btn');
    const maxTodayElement = document.getElementById('max-today');
    const maxAllTimeElement = document.getElementById('max-alltime');
    
    // Устанавливаем IP-адреса
    document.getElementById('java-ip').textContent = '46.166.200.102:25566';
    document.getElementById('bedrock-ip').textContent = '46.166.200.102:19132';
    
    // Инициализация данных в LocalStorage
    function initializeStorage() {
        if (!localStorage.getItem('maxAllTime')) {
            localStorage.setItem('maxAllTime', '0');
        }
        if (!localStorage.getItem('maxToday')) {
            localStorage.setItem('maxToday', '0');
        }
        if (!localStorage.getItem('lastUpdateDate')) {
            localStorage.setItem('lastUpdateDate', getCurrentDate());
        }
        
        // Проверяем, не сменился ли день
        const lastUpdateDate = localStorage.getItem('lastUpdateDate');
        const currentDate = getCurrentDate();
        
        if (lastUpdateDate !== currentDate) {
            // Новый день - сбрасываем максимум за сегодня
            localStorage.setItem('maxToday', '0');
            localStorage.setItem('lastUpdateDate', currentDate);
        }
    }
    
    // Получение текущей даты в формате YYYY-MM-DD
    function getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    }
    
    // Обновление статистики онлайн
    function updateOnlineStats(currentOnline) {
        const currentMaxToday = parseInt(localStorage.getItem('maxToday')) || 0;
        const currentMaxAllTime = parseInt(localStorage.getItem('maxAllTime')) || 0;
        
        let updatedToday = currentMaxToday;
        let updatedAllTime = currentMaxAllTime;
        
        // Обновляем максимум за сегодня
        if (currentOnline > currentMaxToday) {
            updatedToday = currentOnline;
            localStorage.setItem('maxToday', updatedToday.toString());
        }
        
        // Обновляем максимум за всё время
        if (currentOnline > currentMaxAllTime) {
            updatedAllTime = currentOnline;
            localStorage.setItem('maxAllTime', updatedAllTime.toString());
        }
        
        // Обновляем отображение
        maxTodayElement.textContent = updatedToday;
        maxAllTimeElement.textContent = updatedAllTime;
    }
    
    // Функция для получения данных о сервере
    function fetchServerStatus() {
        console.log('Запрос данных сервера...');
        
        // Показываем индикатор загрузки
        setLoadingState();
        
        // Запрашиваем данные с API
        fetch('https://api.mcsrvstat.us/3/46.166.200.102:25566')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Данные получены:', data);
                updateServerInfo(data);
            })
            .catch(error => {
                console.error('Ошибка при получении данных:', error);
                setErrorState('Ошибка подключения к API');
            });
    }
    
    // Функция установки состояния загрузки
    function setLoadingState() {
        statusIndicator.className = 'status-indicator';
        statusText.textContent = 'Загрузка...';
        version.textContent = 'Загрузка...';
        software.textContent = 'Загрузка...';
        motd.innerHTML = '<div class="loading"><div class="spinner"></div>Загрузка сообщения...</div>';
        playerCount.textContent = 'Загрузка...';
        playerProgress.style.width = '0%';
    }
    
    // Функция установки состояния ошибки
    function setErrorState(message) {
        statusIndicator.className = 'status-indicator offline';
        statusText.textContent = 'Ошибка';
        version.textContent = 'Неизвестно';
        software.textContent = 'Неизвестно';
        motd.innerHTML = `<div class="error-message">${message}</div>`;
        playerCount.textContent = '0/0';
        playerProgress.style.width = '0%';
    }
    
    // Функция для обновления информации о сервере
    function updateServerInfo(data) {
        console.log('Обновление информации:', data);
        
        // Обновляем статус
        if (data.online) {
            statusIndicator.className = 'status-indicator online';
            statusText.textContent = 'Онлайн';
        } else {
            statusIndicator.className = 'status-indicator offline';
            statusText.textContent = 'Оффлайн';
        }
        
        // Обновляем версию и платформу
        version.textContent = data.version || 'Неизвестно';
        software.textContent = data.software || 'Vanilla';
        
        // Обновляем MOTD
        if (data.motd && data.motd.clean) {
            motd.textContent = data.motd.clean.join(' ');
        } else {
            motd.innerHTML = '<div style="text-align: center; color: #aaa;">Нет сообщения</div>';
        }
        
        // Обновляем информацию об игроках
        if (data.players) {
            const online = data.players.online || 0;
            const max = data.players.max || 0;
            playerCount.textContent = `${online} / ${max}`;
            
            // Обновляем прогресс-бар
            if (max > 0) {
                const percentage = Math.min((online / max) * 100, 100);
                playerProgress.style.width = `${percentage}%`;
            } else {
                playerProgress.style.width = '0%';
            }
            
            // Обновляем статистику онлайн
            if (data.online) {
                updateOnlineStats(online);
            }
        } else {
            playerCount.textContent = '0 / 0';
            playerProgress.style.width = '0%';
        }
    }
    
    // Инициализируем хранилище и загружаем начальные значения
    initializeStorage();
    maxTodayElement.textContent = localStorage.getItem('maxToday') || '0';
    maxAllTimeElement.textContent = localStorage.getItem('maxAllTime') || '0';
    
    // Загружаем статус при загрузке страницы
    fetchServerStatus();
    
    // Обновляем статус при нажатии на кнопку
    refreshBtn.addEventListener('click', fetchServerStatus);
    
    // Автоматическое обновление каждые 30 секунд
    setInterval(fetchServerStatus, 30000);
});
