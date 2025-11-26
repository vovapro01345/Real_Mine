document.addEventListener('DOMContentLoaded', function() {
    // Получаем элементы DOM
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const version = document.getElementById('version');
    const protocol = document.getElementById('protocol');
    const motd = document.getElementById('motd');
    const playerCount = document.getElementById('player-count');
    const playerProgress = document.getElementById('player-progress');
    const refreshBtn = document.getElementById('refresh-btn');
    const copyButtons = document.querySelectorAll('.copy-btn');
    
    // Функция для копирования IP в буфер обмена
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('IP скопирован: ' + text);
        }).catch(err => {
            console.error('Ошибка копирования: ', err);
            // Fallback для старых браузеров
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        });
    }
    
    // Обработчики для кнопок копирования
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const ip = this.getAttribute('data-ip');
            copyToClipboard(ip);
            
            // Показываем анимацию успешного копирования
            this.classList.add('copied');
            setTimeout(() => {
                this.classList.remove('copied');
            }, 2000);
        });
    });
    
    // Функция для получения данных о сервере
    function fetchServerStatus() {
        console.log('Запрос данных сервера...');
        
        // Показываем индикатор загрузки
        setLoadingState();
        
        // Запрашиваем данные с нового API
        fetch('https://mcapi.us/server/status?ip=46.166.200.102:25566')
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
        protocol.textContent = 'Загрузка...';
        motd.innerHTML = '<div class="loading"><div class="spinner"></div>Загрузка сообщения...</div>';
        playerCount.textContent = 'Загрузка...';
        playerProgress.style.width = '0%';
    }
    
    // Функция установки состояния ошибки
    function setErrorState(message) {
        statusIndicator.className = 'status-indicator offline';
        statusText.textContent = 'Ошибка';
        version.textContent = 'Неизвестно';
        protocol.textContent = 'Неизвестно';
        motd.innerHTML = `<div class="error-message">${message}</div>`;
        playerCount.textContent = '0/0';
        playerProgress.style.width = '0%';
    }
    
    // Функция для обновления информации о сервере
    function updateServerInfo(data) {
        console.log('Обновление информации:', data);
        
        // Обновляем статус
        if (data.status === 'success' && data.online) {
            statusIndicator.className = 'status-indicator online';
            statusText.textContent = 'Онлайн';
        } else {
            statusIndicator.className = 'status-indicator offline';
            statusText.textContent = 'Оффлайн';
        }
        
        // Обновляем версию и протокол
        if (data.server && data.server.name) {
            version.textContent = data.server.name;
        } else {
            version.textContent = 'Неизвестно';
        }
        
        if (data.server && data.server.protocol) {
            protocol.textContent = data.server.protocol;
        } else {
            protocol.textContent = 'Неизвестно';
        }
        
        // Обновляем MOTD
        if (data.motd_json) {
            motd.textContent = data.motd_json;
        } else if (data.motd) {
            motd.textContent = data.motd;
        } else {
            motd.innerHTML = '<div style="text-align: center; color: #aaa;">Нет сообщения</div>';
        }
        
        // Обновляем информацию об игроках
        if (data.players) {
            const online = data.players.now || 0;
            const max = data.players.max || 0;
            playerCount.textContent = `${online} / ${max}`;
            
            // Обновляем прогресс-бар
            if (max > 0) {
                const percentage = Math.min((online / max) * 100, 100);
                playerProgress.style.width = `${percentage}%`;
            } else {
                playerProgress.style.width = '0%';
            }
        } else {
            playerCount.textContent = '0 / 0';
            playerProgress.style.width = '0%';
        }
    }
    
    // Загружаем статус при загрузке страницы
    fetchServerStatus();
    
    // Обновляем статус при нажатии на кнопку
    refreshBtn.addEventListener('click', fetchServerStatus);
    
    // Автоматическое обновление каждые 30 секунд
    setInterval(fetchServerStatus, 30000);
});
