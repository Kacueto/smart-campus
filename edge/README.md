# Edge Node — Raspberry Pi 5

## Instalación (en la Pi 5)

```bash
sudo apt update && sudo apt install -y python3-pip libzbar0 libopencv-dev
pip3 install -r requirements.txt
```

## Obtener el UUID del aula desde el backend

```bash
curl http://<server-ip>:8000/docs  # buscar GET /reservas/aulas-disponibles
# o directo en postgres:
# SELECT id, codigo FROM aulas;
```

## Correr el nodo

```bash
python3 main.py \
  --aula      AULA-101 \
  --aula-uuid <UUID-del-aula-en-la-BD> \
  --backend   http://<server-ip>:8000 \
  --mqtt-host <server-ip> \
  --ip        <ip-de-la-pi>
```

## GPIO (LEDs)

| LED    | Pin BCM |
|--------|---------|
| Verde  | GPIO 17 |
| Rojo   | GPIO 27 |
| GND    | GND     |

## Modo headless (sin monitor)

Comentar la línea `cv2.imshow(...)` y `cv2.waitKey(...)` en `main.py`.
