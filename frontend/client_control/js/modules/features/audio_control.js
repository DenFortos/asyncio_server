window.toggleAudio = (type) => {
    // type приходит как 'input' или 'output'
    const stateKey = type === 'input' ? 'input' : 'output';

    // 1. Инвертируем состояние именно для этого типа
    AppState.audio[stateKey] = !AppState.audio[stateKey];
    const isActive = AppState.audio[stateKey];

    // 2. Находим именно ту иконку, на которую нажали
    const icon = document.querySelector(`.icon[data-function="audio-${type}"]`);

    if (icon) {
        // Если включено — добавляем класс active, если выключено — убираем
        icon.classList.toggle('active', isActive);

        // Если ты хочешь визуально выделить, что поток пошел (например, красным),
        // можно добавить/убрать спец. класс. Если нет — active достаточно.
        if (isActive) {
            icon.style.color = (type === 'input') ? '#ff4444' : '#44ff44'; // Например: микрофон красный, звук зеленый
        } else {
            icon.style.color = ''; // Возвращаем стандартный цвет из CSS
        }
    }

    // 3. Отправляем команду боту
    const action = isActive ? 'start' : 'stop';
    if (window.sendToBot) {
        window.sendToBot('Audio', `${action}_${type}`);
    }

    console.log(`[Audio] ${type} is now ${isActive ? 'ON' : 'OFF'}`);
};