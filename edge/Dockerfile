FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# En modo simulate el edge no usa cámara (opencv/pyzbar) ni GPIO (gpiozero/lgpio),
# solo necesita lo mínimo para hablar HTTP/MQTT y verificar JWT localmente.
# psycopg2-binary lo usa solo bootstrap.py para resolver el UUID del aula.
RUN pip install --upgrade pip && \
    pip install \
        paho-mqtt==2.1.0 \
        PyJWT==2.12.1 \
        cryptography==48.0.0 \
        requests \
        psycopg2-binary==2.9.10

COPY main.py bootstrap.py ./

CMD ["python", "bootstrap.py"]
