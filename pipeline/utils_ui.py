import os
import tkinter as tk
from tkinter import filedialog


def create_hidden_tk_root():
    """Erstelle verstecktes TK-Root-Fenster"""
    root = tk.Tk()
    root.withdraw()
    root.update()
    return root


def pick_directory_dialog(title, initial_path=None, required=True):
    """Dialog zur Verzeichnisauswahl"""
    root = create_hidden_tk_root()
    initialdir = initial_path if initial_path and os.path.isdir(initial_path) else None

    path = filedialog.askdirectory(title=title, initialdir=initialdir)
    root.destroy()

    if required and not path:
        raise RuntimeError(f"Ordnerauswahl abgebrochen: {title}")
    return path or None


def pick_file_dialog(title, filetypes, initial_path=None, required=True):
    """Dialog zur Dateiauswahl"""
    root = create_hidden_tk_root()

    initialdir = None
    if initial_path:
        if os.path.isdir(initial_path):
            initialdir = initial_path
        elif os.path.isfile(initial_path):
            initialdir = os.path.dirname(initial_path)

    path = filedialog.askopenfilename(
        title=title,
        filetypes=filetypes,
        initialdir=initialdir
    )
    root.destroy()

    if required and not path:
        raise RuntimeError(f"Dateiauswahl abgebrochen: {title}")
    return path or None