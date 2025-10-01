// Функции фильтрации клиентов (все/онлайн/оффлайн)
document.querySelectorAll('.filter-buttons button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelector('.filter-buttons .active').classList.remove('active');
    button.classList.add('active');
    const filter = button.id.replace('filter-', '');
    filterClients(filter);
  });
});

function filterClients(filter) {
  window.currentFilter = filter; // Сохраняем текущий фильтр
  let filtered = window.clients;
  if (filter === 'online') filtered = window.clients.filter(c => c.status === 'online');
  else if (filter === 'offline') filtered = window.clients.filter(c => c.status === 'offline');

  window.renderClients(filtered);
}