import sys
import functools
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QSplitter, QTabWidget,
    QTableView, QHeaderView, QAbstractItemView, QLabel, QPushButton, QFrame, QHBoxLayout
)
from PySide6.QtGui import QStandardItemModel, QStandardItem, QFont
from PySide6.QtCore import Qt, QModelIndex

# Пример данных клиентов
clients_info = {
    "LExWmr1kooZH9hb": {"os": "Windows", "user": "Данил", "hostname": "DESKTOP-AQT2415", "arch": "x64"},
    "A3bXyz9pqRsT": {"os": "Windows", "user": "User2", "hostname": "PC-12345", "arch": "x64"},
}
runtime_client_state = {}

# ====================== Панели ======================
class DiskMapPanel(QWidget):
    def __init__(self):
        super().__init__()
        layout = QVBoxLayout(self)
        label = QLabel("DiskMap visualization will appear here", alignment=Qt.AlignCenter)
        label.setStyleSheet("color: #FFFFFF;")
        layout.addWidget(label)

class ClientModulesPanel(QWidget):
    def __init__(self):
        super().__init__()
        layout = QVBoxLayout(self)
        layout.setSpacing(5)

        self.diskmap_btn = QPushButton("DiskMap")
        self.diskmap_btn.setStyleSheet("background-color: #444; color: #FFF; padding: 5px;")
        layout.addWidget(self.diskmap_btn)

        self.back_btn = QPushButton("Back")
        self.back_btn.setStyleSheet("background-color: #444; color: #FFF; padding: 5px;")
        layout.addWidget(self.back_btn)
        layout.addStretch()

class GlobalFunctionsPanel(QWidget):
    def __init__(self):
        super().__init__()
        layout = QVBoxLayout(self)
        for name in ["Sleep all clients", "Refresh clients", "Other global function"]:
            btn = QPushButton(name)
            btn.setStyleSheet("background-color: #444; color: #FFF; padding: 5px;")
            layout.addWidget(btn)
        layout.addStretch()

# ====================== Главное окно ======================
class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Disperser")
        self.resize(1000, 600)

        central = QWidget()
        self.setCentralWidget(central)
        root = QVBoxLayout(central)

        # ====================== Вкладки ======================
        self.tabs = QTabWidget()
        root.addWidget(self.tabs)

        # ----- Users вкладка -----
        self.users_tab = QWidget()
        self.tabs.addTab(self.users_tab, "Users")
        u_layout = QVBoxLayout(self.users_tab)

        # Таблица клиентов
        self.table = QTableView()
        self._setup_table_model()
        u_layout.addWidget(self.table)

        # Splitter для левой и правой панели
        self.splitter = QSplitter(Qt.Horizontal)
        self.splitter.setVisible(False)
        u_layout.addWidget(self.splitter)

        # ===== Левая панель: Modules =====
        self.left_col = QWidget()
        left_v = QVBoxLayout(self.left_col)
        left_v.setContentsMargins(0,0,0,0)
        left_v.setSpacing(0)

        # Шапка Modules
        self.modules_title = QLabel("Modules", alignment=Qt.AlignCenter)
        f = QFont()
        f.setPointSize(12)
        f.setBold(True)
        self.modules_title.setFont(f)
        self.modules_title.setStyleSheet("color: #FFF;")
        left_v.addWidget(self.modules_title)

        # Линия под шапкой
        line_left = QFrame()
        line_left.setFrameShape(QFrame.HLine)
        line_left.setFrameShadow(QFrame.Sunken)
        line_left.setStyleSheet("color: #888;")
        left_v.addWidget(line_left)

        # Кнопки модулей
        self.modules_panel = ClientModulesPanel()
        left_v.addWidget(self.modules_panel)

        # ===== Правая панель: клиент + модуль =====
        self.right_col = QWidget()
        right_v = QVBoxLayout(self.right_col)
        right_v.setContentsMargins(0,0,0,0)
        right_v.setSpacing(0)

        # Шапка с информацией о клиенте
        self.client_info_title = QLabel("", alignment=Qt.AlignCenter)
        self.client_info_title.setFont(f)
        self.client_info_title.setStyleSheet("color: #FFF;")
        self.client_info_title.setFixedHeight(self.modules_title.sizeHint().height())
        right_v.addWidget(self.client_info_title)

        # Линия под шапкой
        line_right = QFrame()
        line_right.setFrameShape(QFrame.HLine)
        line_right.setFrameShadow(QFrame.Sunken)
        line_right.setStyleSheet("color: #888;")
        right_v.addWidget(line_right)

        # Контейнер под модуль
        self.module_view = QWidget()
        self.module_view_layout = QVBoxLayout(self.module_view)
        right_v.addWidget(self.module_view)
        right_v.setStretch(2, 1)

        # Добавляем панели в сплиттер
        self.splitter.addWidget(self.left_col)
        self.splitter.addWidget(self.right_col)

        # ----- Global Functions вкладка -----
        self.global_tab = GlobalFunctionsPanel()
        self.tabs.addTab(self.global_tab, "Global Functions")

        # ====================== Сигналы ======================
        self.table.doubleClicked.connect(self.on_client_activated)
        self.modules_panel.diskmap_btn.clicked.connect(lambda: self.on_module_selected("DiskMap"))
        self.modules_panel.back_btn.clicked.connect(self.on_back)

        self.current_client_id = None
        self.current_module = None

        # ====================== Тёмная тема ======================
        self.setStyleSheet("""
            QMainWindow { background-color: #2b2b2b; }
            QTabWidget::pane { border: 0; }
            QTableView { background-color: #333; color: #FFF; gridline-color: #555; }
            QHeaderView::section { background-color: #444; color: #FFF; }
            QLabel { color: #FFF; }
        """)

    # ====================== Таблица ======================
    def _setup_table_model(self):
        self.table_model = QStandardItemModel()
        self.table_model.setHorizontalHeaderLabels(["ID", "OS", "User@Host", "Arch", "Copy"])
        for cid, info in clients_info.items():
            items = [
                QStandardItem(cid),
                QStandardItem(info.get("os", "?")),
                QStandardItem(f'{info.get("user","?")}@{info.get("hostname","?")}'),
                QStandardItem(info.get("arch", "?")),
                QStandardItem(""),
            ]
            for it in items:
                it.setEditable(False)
            self.table_model.appendRow(items)

        self.table.setModel(self.table_model)
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table.setSelectionMode(QAbstractItemView.SingleSelection)
        self.table.verticalHeader().setVisible(False)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)

        hdr = self.table.horizontalHeader()
        hdr.setSectionResizeMode(0, QHeaderView.Stretch)
        hdr.setSectionResizeMode(1, QHeaderView.Stretch)
        hdr.setSectionResizeMode(2, QHeaderView.Stretch)
        hdr.setSectionResizeMode(3, QHeaderView.Stretch)
        hdr.setSectionResizeMode(4, QHeaderView.ResizeToContents)

        self._install_copy_buttons()

    def _install_copy_buttons(self):
        for row in range(self.table_model.rowCount()):
            btn = QPushButton("Copy")
            btn.setStyleSheet("background-color: #555; color: #FFF; padding: 2px;")
            btn.clicked.connect(functools.partial(self._copy_row, row))
            self.table.setIndexWidget(self.table_model.index(row, 4), btn)

    @staticmethod
    def _clear_layout(layout):
        while layout.count():
            item = layout.takeAt(0)
            w = item.widget()
            if w:
                w.deleteLater()

    # ====================== Действия ======================
    def _copy_row(self, row: int):
        cid = self.table_model.item(row, 0).text()
        os_ = self.table_model.item(row, 1).text()
        uh = self.table_model.item(row, 2).text()
        arch = self.table_model.item(row, 3).text()
        QApplication.clipboard().setText(f"ID {cid}: {os_} | {uh} | {arch}")

    def on_client_activated(self, index: QModelIndex):
        row = index.row()
        self.current_client_id = self.table_model.item(row, 0).text()

        self.table.setVisible(False)
        self.splitter.setVisible(True)

        cid = self.table_model.item(row, 0).text()
        os_ = self.table_model.item(row, 1).text()
        uh = self.table_model.item(row, 2).text()
        arch = self.table_model.item(row, 3).text()

        self.client_info_title.setText(f"ID {cid}: {os_} | {uh} | {arch}")

        self._clear_layout(self.module_view_layout)
        self.current_module = None

    def on_module_selected(self, name: str):
        self.current_module = name
        self._clear_layout(self.module_view_layout)
        if name == "DiskMap":
            self.module_view_layout.addWidget(DiskMapPanel())
        else:
            self.module_view_layout.addWidget(QLabel(f"{name} (stub)", alignment=Qt.AlignCenter))

    def on_back(self):
        if self.current_client_id and self.current_client_id in runtime_client_state:
            runtime_client_state.pop(self.current_client_id, None)
        self.current_client_id = None
        self.current_module = None
        self._clear_layout(self.module_view_layout)
        self.client_info_title.clear()
        self.splitter.setVisible(False)
        self.table.setVisible(True)
        self.table.clearSelection()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    w = MainWindow()
    w.show()
    sys.exit(app.exec())