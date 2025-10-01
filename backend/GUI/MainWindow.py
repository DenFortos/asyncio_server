from PySide6.QtWidgets import QMainWindow, QWidget, QVBoxLayout, QTabWidget
from UsersTab import UsersTab
from GlobalFunctionsTab import GlobalFunctionsTab
from services import list_clients  # Импортируем функцию для получения клиентов

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Disperser")
        self.resize(1000, 600)

        # Центральный виджет
        central = QWidget()
        self.setCentralWidget(central)
        root_layout = QVBoxLayout(central)

        # Вкладки
        self.tabs = QTabWidget()
        root_layout.addWidget(self.tabs)

        # Users вкладка
        self.users_tab = UsersTab()
        self.tabs.addTab(self.users_tab, "Users")

        # Заполняем таблицу клиентов
        clients = list_clients()
        self.users_tab.fill_table(clients)

        # Global Functions вкладка
        self.global_tab = GlobalFunctionsTab()
        self.tabs.addTab(self.global_tab, "Global Functions")

        # Тёмная тема
        self.setStyleSheet("""
            QMainWindow { background-color: #2b2b2b; }
            QTabWidget::pane { border: 0; }
        """)