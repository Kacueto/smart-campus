FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

COPY infra/certs/private.pem  /certs/private.pem
COPY infra/certs/public.pem   /certs/public.pem
COPY infra/certs/aes.key      /certs/aes.key
COPY mqtt-broker/certs/ca.crt /certs/mqtt-ca.crt

ENV JWT_PRIVATE_KEY_PATH=/certs/private.pem
ENV JWT_PUBLIC_KEY_PATH=/certs/public.pem
ENV JWT_AES_KEY_PATH=/certs/aes.key
ENV MQTT_CA_CERT=/certs/mqtt-ca.crt

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
