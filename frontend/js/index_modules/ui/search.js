// Функция поиска клиентов
document.getElementById('search-input').addEventListener('input', () => {
  const term = document.getElementById('search-input').value.toLowerCase();
  const filtered = window.clients.filter(client =>
    client.user.toLowerCase().includes(term) ||
    client.pc.toLowerCase().includes(term) ||
    client.ip.includes(term)
  );
  window.renderClients(filtered);
});