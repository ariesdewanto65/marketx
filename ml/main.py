try:
    from .inference import app
except ImportError:
    from inference import app