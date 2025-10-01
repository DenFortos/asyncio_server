// Функции управления фоном (выбор и сохранение)
const backgrounds = [
  'images/bg1.jpg',
  'images/bg2.jpg',
  'images/bg3.jpg',
  'images/bg4.jpg'
];

function setBg(image) {
  document.body.style.backgroundImage = `url(${image})`;
  localStorage.setItem('selectedBackground', image);
}

document.getElementById('bgButton').addEventListener('click', () => {
  document.getElementById('bgModal').style.display = 'block';
});

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('bgModal').style.display = 'none';
});

document.querySelectorAll('.bg-option').forEach(option => {
  option.addEventListener('click', () => {
    const bgName = option.getAttribute('data-bg');
    setBg(`images/${bgName}.jpg`);
    document.getElementById('bgModal').style.display = 'none';
  });
});

// Загружаем сохраненный фон при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  const savedBg = localStorage.getItem('selectedBackground');
  if (savedBg) {
    document.body.style.backgroundImage = `url(${savedBg})`;
  }
});