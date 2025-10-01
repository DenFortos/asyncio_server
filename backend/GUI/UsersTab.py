from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel, QTableWidget, QTableWidgetItem, QAbstractItemView
from PySide6.QtGui import QFont
from PySide6.QtCore import QTimer
from services.ClientManager import list_clients

class UsersTab(QWidget):
    def __init__(self):
        super().__init__()
        layout = QVBoxLayout(self)

        # Заголовок вкладки
        title = QLabel("Users")
        font = QFont()
        font.setPointSize(12)
        font.setBold(True)
        title.setFont(font)
        title.setStyleSheet("color: #FFFFFF;")
        layout.addWidget(title)

        # Таблица пользователей
        self.table = QTableWidget()
        self.table.setColumnCount(5)  # id | os | user | hostname | arch
        self.table.setHorizontalHeaderLabels(["ID", "OS", "User", "Hostname", "Arch"])
        self.table.verticalHeader().setVisible(False)
        self.table.setStyleSheet("color: #FFFFFF; gridline-color: #555555;")
        self.table.setShowGrid(True)
        self.table.setSortingEnabled(True)
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        layout.addWidget(self.table)

        # Таймер для обновления таблицы каждые 500 мс
        self.timer = QTimer()
        self.timer.timeout.connect(self.update_table)
        self.timer.start(500)

        # Сигнал на клик по строке (пока заглушка)
        self.table.cellDoubleClicked.connect(self.client_clicked)

    def update_table(self):
        """Обновляет таблицу данными из ClientManager.list_clients()"""
        clients = list_clients()
        self.fill_table(clients)

    def fill_table(self, clients):
        """Заполняет таблицу клиентами"""
        self.table.setRowCount(len(clients))
        for row, client in enumerate(clients):
            self.table.setItem(row, 0, QTableWidgetItem(str(client.get("id", "?"))))
            self.table.setItem(row, 1, QTableWidgetItem(client.get("os", "?")))
            self.table.setItem(row, 2, QTableWidgetItem(client.get("user", "?")))
            self.table.setItem(row, 3, QTableWidgetItem(client.get("hostname", "?")))
            self.table.setItem(row, 4, QTableWidgetItem(client.get("arch", "?")))

    def client_clicked(self, row, column):
        """Вызывается при двойном клике на клиента. Пока заглушка."""
        client_id = self.table.item(row, 0).text()
        print(f"[GUI] Клиент {client_id} выбран — здесь будет вкладка с модулями")
