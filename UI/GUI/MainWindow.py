from PySide6.QtWidgets import QMainWindow, QWidget, QVBoxLayout, QTabWidget, QLabel
from PySide6.QtGui import QFont

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

        # Пустые вкладки, можно позже подключать панели
        self.users_tab = QWidget()
        self.tabs.addTab(self.users_tab, "Users")

        self.global_tab = QWidget()
        self.tabs.addTab(self.global_tab, "Global Functions")

        # Тёмная тема
        self.setStyleSheet("""
            QMainWindow { background-color: #2b2b2b; }
            QTabWidget::pane { border: 0; }
        """)

        # Заголовок клиента (справа при выборе клиента)
        def set_client_info_title(self, text: str) -> None:
            """Метод для обновления шапки клиента"""
            if not self.client_info_title:
                self.client_info_title = QWidget(self.users_tab)
                layout = QVBoxLayout(self.client_info_title)
                self.client_info_title_label = QLabel(text)
                f = QFont()
                f.setPointSize(12)
                f.setBold(True)
                self.client_info_title_label.setFont(f)
                self.client_info_title_label.setStyleSheet("color: #FFFFFF;")
                layout.addWidget(self.client_info_title_label)
                layout.setContentsMargins(0, 0, 0, 0)
                if not self.users_tab.layout():
                    self.users_tab.setLayout(QVBoxLayout())
                self.users_tab.layout().addWidget(self.client_info_title)
            else:
                self.client_info_title_label.setText(text)

