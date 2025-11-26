document.addEventListener('DOMContentLoaded', function() {
    // Получаем элементы DOM
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const lastUpdate = document.getElementById('last-update');
    const motd = document.getElementById('motd');
    const playerCount = document.getElementById('player-count');
    const playerProgress = document.getElementById('player-progress');
    const copyButtons = document.querySelectorAll('.copy-btn');
    
    // Функция для безопасного обновления текста элемента
    function safeUpdateText(element, text) {
        if (element) {
            element.textContent = text;
        }
    }
    
    // Функция для безопасного обновления HTML элемента
    function safeUpdateHTML(element, html) {
        if (element) {
            element.innerHTML = html;
        }
    }
    
    // Функция для получения времени последнего обновления
    function getLastUpdateTime() {
        const now = new Date();
        return now.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
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
        
        // Запрашиваем данные с API
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
                
                // Обновляем время последнего обновления
                safeUpdateText(lastUpdate, getLastUpdateTime());
            })
            .catch(error => {
                console.error('Ошибка при получении данных:', error);
                setErrorState('Ошибка подключения');
                
                // Обновляем время последнего обновления даже при ошибке
                safeUpdateText(lastUpdate, getLastUpdateTime() + ' (ошибка)');
            });
    }
    
    // Функция установки состояния загрузки
    function setLoadingState() {
        if (statusIndicator) statusIndicator.className = 'status-indicator';
        safeUpdateText(statusText, 'Загрузка...');
        safeUpdateHTML(motd, '<div class="loading"><div class="spinner"></div>Загрузка сообщения...</div>');
        safeUpdateText(playerCount, 'Загрузка...');
        if (playerProgress) playerProgress.style.width = '0%';
    }
    
    // Функция установки состояния ошибки
    function setErrorState(message) {
        if (statusIndicator) statusIndicator.className = 'status-indicator offline';
        safeUpdateText(statusText, 'Ошибка');
        safeUpdateHTML(motd, `<div class="error-message">${message}</div>`);
        safeUpdateText(playerCount, '0/0');
        if (playerProgress) playerProgress.style.width = '0%';
    }
    
    // Функция для обновления информации о сервере
    function updateServerInfo(data) {
        console.log('Обновление информации:', data);
        
        // Обновляем статус
        if (data.status === 'success' && data.online) {
            if (statusIndicator) statusIndicator.className = 'status-indicator online';
            safeUpdateText(statusText, 'Онлайн');
        } else {
            if (statusIndicator) statusIndicator.className = 'status-indicator offline';
            safeUpdateText(statusText, 'Оффлайн');
        }
        
        // Обновляем MOTD
        if (data.motd_json) {
            safeUpdateText(motd, data.motd_json);
        } else if (data.motd) {
            safeUpdateText(motd, data.motd);
        } else {
            safeUpdateHTML(motd, '<div style="text-align: center; color: #FFAA00;">Нет сообщения</div>');
        }
        
        // Обновляем информацию об игроках
        if (data.players) {
            const online = data.players.now || 0;
            const max = data.players.max || 0;
            safeUpdateText(playerCount, `${online} / ${max}`);
            
            // Обновляем прогресс-бар
            if (playerProgress && max > 0) {
                const percentage = Math.min((online / max) * 100, 100);
                playerProgress.style.width = `${percentage}%`;
            } else if (playerProgress) {
                playerProgress.style.width = '0%';
            }
        } else {
            safeUpdateText(playerCount, '0 / 0');
            if (playerProgress) playerProgress.style.width = '0%';
        }
    }
    
    // Загружаем статус при загрузке страницы
    fetchServerStatus();
    
    // Автоматическое обновление каждые 30 секунд
    setInterval(fetchServerStatus, 30000);
});