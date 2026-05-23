# Smart Campus — Guía Rápida de Usuario

**Universidad del Norte · Sistema de Control de Acceso Inteligente**

---

## Acceso al sistema

Abre el navegador en tu celular o computador y ve a:

```
http://localhost:5173
```

Inicia sesión con tu **código universitario** y contraseña.

---

## Estudiantes

### Registrar asistencia a una clase

1. Inicia sesión con tu código
2. El profesor genera el QR de la sesión y lo muestra en pantalla
3. En la app, ve a **Mis clases** y pulsa **Generar QR**
4. Muestra tu QR a la cámara del lector en la puerta del aula
5. LED **verde** = acceso permitido, asistencia registrada
6. LED **rojo** = acceso denegado (QR expirado, no estás inscrito, o ya fue usado)

> El QR es de un solo uso y expira en 30 segundos. Genéralo justo antes de pasar.

---

### Reservar un aula libre

1. Ve a la sección **Reservas** en tu dashboard
2. Selecciona fecha, hora de inicio y duración (1, 2 o 3 horas)
3. El sistema muestra solo las aulas disponibles en ese horario
4. Selecciona un aula y confirma la reserva
5. Cuando llegues, genera tu QR y escanéalo en la puerta
6. Puedes cancelar la reserva antes de que empiece

> Horario disponible para reservas: 07:00 a 18:00.

---

## Docentes

### Abrir sesión de clase

1. Inicia sesión con tu código de docente
2. Ve a **Mis clases de hoy** y selecciona la clase
3. Define los minutos de sesión de asistencia (5–15 min)
4. Pulsa **Generar QR de sesión**
5. Muestra el QR a la cámara del lector → LED **verde** → aula abierta
6. El temporizador comienza; los estudiantes pueden escanear su QR uno a uno

> No puedes generar QR para una clase que ya terminó.

### Ver asistencia en tiempo real

- En el dashboard del profesor aparece la lista de estudiantes que han pasado su QR durante la sesión activa
- Puedes cerrar la sesión manualmente antes de que termine el temporizador

---

## Administradores

1. Inicia sesión con el código de administrador
2. Accede al **Dashboard Admin** desde el menú
3. Desde ahí puedes:
   - **Usuarios**: crear, editar y desactivar cuentas
   - **Aulas**: agregar o modificar salones
   - **Horarios**: asignar clases a docentes y aulas
   - **Accesos**: revisar el historial de entradas y alertas

---

## Referencia rápida

| Rol | Código de prueba | Contraseña |
|---|---|---|
| Estudiante | 2024001 | 1234 |
| Estudiante | 2024002 | 1234 |
| Docente | DOC001 | 1234 |
| Administrador | ADM001 | 1234 |

| LED | Significado |
|---|---|
| Verde (3s) | Acceso permitido — asistencia registrada |
| Rojo (3s) | Acceso denegado |

---

*Smart Campus · Trabajo de Grado — Ingeniería de Sistemas · Universidad del Norte*
