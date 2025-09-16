from .DataScribe import data_scribe
from .ScreenWatch import screen_watch
from .BinStream import bin_stream
from .EchoTap import echo_tap
from .CamGaze import cam_gaze
from .InputForge import input_forge

module_map = {
    "DataScribe": data_scribe,
    "ScreenWatch": screen_watch,
    "BinStream": bin_stream,
    "EchoTap": echo_tap,
    "CamGaze": cam_gaze,
    "InputForge": input_forge,
}

# Явный реэкспорт для from modules import *
__all__ = [
    "data_scribe",
    "screen_watch",
    "bin_stream",
    "echo_tap",
    "cam_gaze",
    "input_forge",
    "module_map",
]