IP = "127.0.0.1"
PORT = 50001
ZMQ_PUSH_PULL_ADDR = "tcp://127.0.0.1:50000" # Клиент -> Воркеры (Сохраняем)
ZMQ_WORKER_PUSH_ADDR = "tcp://127.0.0.1:50002" # Воркеры -> API (Новый канал)
API_PORT = 8001
AUTH_KEY = "super_secret"
NUM_WORKERS = 8