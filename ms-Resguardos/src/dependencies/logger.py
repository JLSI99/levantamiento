import logging
from pythonjsonlogger import jsonlogger

def setup_logger(name: str)-> logging.Logger:
    logger=logging.getLogger(name)

    if not logger.handlers:
        handler= logging.StreamHandler()
        formatter=jsonlogger.JsonFormatter(
            fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%SZ"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

    return logger