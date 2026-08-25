# ClienteAPP — CRM Casas Prefabricadas

> Sistema CRM profesional para gestión de clientes, proyectos, pagos y seguimiento de obras de casas prefabricadas. Funciona 100% en el navegador, sin servidor ni base de datos externa.

---

## 🚀 Inicio rápido

### Opción 1 — Abrir directo
Abre `index.html` en Chrome o Edge. Funciona sin servidor para uso básico.

### Opción 2 — Servidor local (recomendado para PWA)
Para que el Service Worker y la instalación como app funcionen correctamente:

```bash
# Python
python -m http.server 8080

# Node.js
npx serve .

# VS Code — instala "Live Server" y haz clic en "Go Live"
```

Luego abre: `http://localhost:8080`

---

## 🔐 Credenciales de acceso

| Usuario    | Contraseña    | Rol               |
|------------|---------------|-------------------|
| `admin`    | `admin123`    | Administrador     |
| `asesor`   | `asesor123`   | Asesor de Ventas  |
| `tecnico`  | `tecnico123`  | Técnico de Obra   |

---

## 📦 Stack tecnológico

| Tecnología | Uso |
|---|---|
| HTML5 + CSS3 | Estructura y estilos base |
| Bootstrap 5.3 | Componentes UI y grid |
| Bootstrap Icons 1.11 | Iconografía |
| JavaScript Vanilla (ES6+) | Lógica de la aplicación |
| IndexedDB | Base de datos local en el navegador |
| Service Worker | Funcionamiento offline (PWA) |
| Chart.js 4.4 | Gráficas en el dashboard |
| Google Fonts — Inter | Tipografía principal |

> Sin backend. Sin base de datos externa. Sin dependencias npm. Todo corre en el navegador.

---

## ✨ Módulos

### 📊 Dashboard
- Hero con chips animados: clientes, en obra, recaudado, pendiente
- KPI cards con diseño glassmorphism y animaciones de entrada
- Anillo SVG de progreso de cobros
- Pipeline de ventas por etapa
- Sección **"A quién llamar hoy"** con prioridades (urgente / importante / rutinario)
- Resumen financiero con barras CSS horizontales por cliente
- Entregas próximas con cuenta regresiva visual
- Acciones rápidas: Nuevo Cliente, Ver Pagos, Ver Proyectos, Ir a Tareas

### 👥 Clientes
- Registro con nombre, teléfono, ubicación del lote y notas
- Pipeline de 7 estados: Nuevo → Cotizado → Negociación → Firmado → En Construcción → Finalizado → Perdido
- Búsqueda en tiempo real y filtros por estado
- Acceso directo a WhatsApp con mensaje predefinido

### 🏠 Proyectos
- Modelo de casa, área (m²), precio total, fecha de entrega y **estado del proyecto**
- Especificaciones técnicas: sistema constructivo, estilo, cubierta, ornamentación, puertas
- Placa de cimentación como cobro independiente opcional
- Galería de evidencias fotográficas y planos (JPG, PNG, PDF) con lightbox
- Modo cotización (sin pagos) y modo firmado (con pagos activos)

### 💰 Pagos
- Etapas automáticas al firmar: 50% firma / 40% materiales / 10% techo
- Etapa adicional opcional: placa de cimentación
- Registro de pagos parciales o totales por etapa
- Resumen visual por cliente con barra de progreso

### 📁 Expediente
- Ficha completa del cliente en modal
- Tabs: Proyecto · Pagos · Seguimiento · **Historial de estados**
- Historial de cambios de estado con línea de tiempo visual y duración por etapa

### 💬 Seguimiento
- Timeline de interacciones: llamada, WhatsApp, visita, reunión, nota, recordatorio
- Recordatorios con notificación push en el navegador
- Historial ordenado por fecha

### 🔔 Notificaciones inteligentes
- Alerta si falta ≤ 30 días para entrega y la firma del contrato no supera el 50%
- Alerta si el proyecto lleva ≥ 1 día en construcción sin pagar el 40% de materiales
- Máximo una notificación por día por cliente (sin spam)

### 🔍 Búsqueda global
- Atajo `Ctrl+K` o botón en el topbar
- Busca en clientes, proyectos y pagos pendientes simultáneamente
- Navegación con teclado (↑↓ Enter ESC)
- Texto encontrado resaltado en amarillo

### 💼 Mis Finanzas
- Registro de comisiones por proyecto
- Control de préstamos y abonos
- Base mensual con distribución automática entre préstamos

### ✅ Tareas
- Gestión de pendientes con categorías y prioridades
- Filtros por estado, prioridad y categoría
- Vinculación opcional a un cliente

### ⚙️ Configuración
- Cambiar nombre para mostrar (sidebar, dashboard, saludo)
- Cambiar contraseña
- Exportar / importar backup en JSON
- Información del sistema y almacenamiento usado

---

## 🎨 Diseño y animaciones

- Partículas animadas con canvas en la pantalla de login
- Glassmorphism en el login y chips del hero
- KPI cards con gradientes, íconos y animaciones escalonadas
- Anillos SVG animados para progreso de cobros y cuenta regresiva
- Toasts con barra de progreso y sonido (Web Audio API)
- Historial de estados con línea de tiempo animada
- Responsive completo para móvil y tablet

---

## 💾 Backup y datos

Los datos se guardan en **IndexedDB** del navegador (local, privado, sin internet).

Para hacer backup:
1. Ve a **Configuración → Exportar Backup**
2. Se descarga un archivo `.json` con todos los datos
3. Para restaurar: **Configuración → Importar Backup**

---

## 📱 Instalar como app (PWA)

**Chrome / Edge (PC o Android):**
1. Abre la app en el navegador
2. Clic en los 3 puntos → *"Instalar ClienteAPP"*

**Safari (iPhone / iPad):**
1. Abre la app en Safari
2. Botón Compartir → *"Agregar a pantalla de inicio"*

---

## 📁 Estructura del proyecto

```
ClienteAPP/
├── index.html              # App principal (SPA)
├── manifest.json           # Configuración PWA
├── sw.js                   # Service Worker (offline)
├── README.md
└── assets/
    ├── css/
    │   └── app.css         # Estilos principales + animaciones
    ├── js/
    │   ├── app.js          # Controlador principal, router, búsqueda global
    │   ├── auth.js         # Autenticación y sesiones
    │   ├── db.js           # IndexedDB wrapper (v4)
    │   ├── ui.js           # Helpers UI, toasts, sonidos, notificaciones
    │   ├── dashboard.js    # Dashboard visual con Chart.js
    │   ├── clientes.js     # Módulo clientes
    │   ├── proyectos.js    # Módulo proyectos + historial de estados
    │   ├── pagos.js        # Módulo pagos por etapas
    │   ├── seguimiento.js  # Timeline de seguimiento
    │   ├── finanzas.js     # Finanzas personales
    │   ├── tareas.js       # Gestión de tareas
    │   └── configuracion.js# Configuración y backup
    └── img/
        └── icon-192.svg    # Ícono de la app
```

---

## 🛠️ Desarrollo

No requiere instalación de dependencias. Todas las librerías se cargan desde CDN.

1. Clona o descarga el repositorio
2. Abre la carpeta en VS Code
3. Instala la extensión **Live Server**
4. Clic en **Go Live** en la barra inferior
5. Edita cualquier archivo — los cambios se reflejan en tiempo real

---

*Desarrollado con ❤️ para la gestión de proyectos de casas prefabricadas.*
# ClienteAPP_3
# ClienteAPP
# ClienteAPP_4
# ClienteAPP_5
# ClienteAPP_6
# ClienteAPP_7
# ClienteAPP_2.0
# CLIENTE_APP_1.0
