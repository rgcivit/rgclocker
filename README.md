# rgClocker 🔒

**rgClocker** es una aplicación web de bóveda personal de seguridad militar diseñada para almacenar, gestionar y previsualizar tu documentación personal (en formato PDF) de manera 100% segura, cifrada en memoria, y respaldada en tu cuenta personal de Google Drive.

---

## 🏗️ Arquitectura Técnica y Flujo de Datos

El diseño del sistema prioriza la **privacidad absoluta** del usuario aplicando un modelo de **Zero-Knowledge** en el que los archivos PDF nunca tocan el disco duro del servidor sin cifrar:

```
[ Cliente (React) ] 
       │ 
       ├─ (1) Envía PDF en memoria o solicita ID ──> [ Servidor Express ]
       │                                                    │
       │                                                    ├─ [ Cifra/Descifra en Memoria ] 
       │                                                    │  (AES-256-GCM con IV + AuthTag)
       │                                                    │
       ▼                                                    ▼
[ Blob temporal URL ] <── (4) Flujo descifrado ─── [ API Google Drive ]
                                                    (Servicio en la Nube)
```

1. **Subida Cifrada**: Al subir un archivo PDF, el frontend lo envía como un stream al backend. El backend genera un Vector de Inicialización (IV) único de 12 bytes y cifra el archivo en memoria utilizando el algoritmo simétrico **AES-256-GCM**.
2. **Almacenamiento en Google Drive**: El stream cifrado resultante se envía a Google Drive con la extensión `.enc` (ej. `d3b07384d113.enc`). No se guarda ninguna copia en el servidor.
3. **Descarga y Previsualización al Vuelo**: Al solicitar un documento, el backend lo obtiene desde la API de Google Drive como un buffer de bytes binarios directos, lo descifra en memoria usando su clave maestra + el IV + la etiqueta de autenticación (authTag) almacenados en la base de datos PostgreSQL, y le transmite el flujo PDF original directamente al navegador.

---

## 📂 Estructura del Proyecto

```
rgclocker/
├── backend/                  # API Rest en Node.js + Express
│   ├── config/               # Configuración de base de datos (Sequelize)
│   ├── controllers/          # Lógica de negocio (Autenticación, Lockers, Documentos)
│   ├── middlewares/          # Doble capa de seguridad (JWT y Locker PIN verification)
│   ├── models/               # Modelos PostgreSQL (User, Locker, Document)
│   ├── routes/               # Enrutadores REST API
│   ├── services/             # Integración con Google Drive API
│   ├── utils/                # Utilidades de cifrado criptográfico (AES-256-GCM)
│   ├── Dockerfile            # Configuración Docker para producción backend
│   └── index.js              # Punto de entrada del servidor
│
├── frontend/                 # Interfaz de Usuario Single Page App (React + Vite)
│   ├── src/
│   │   ├── components/       # Componentes reusables (Visor de PDF)
│   │   ├── context/          # Estados globales (Auth y Lockers de doble factor)
│   │   ├── hooks/            # Hooks personalizados (useAutoLock para inactividad)
│   │   ├── pages/            # Páginas (Login, Dashboard, Vista de Locker)
│   │   └── services/         # Cliente Axios integrado
│   └── index.html            # Punto de entrada web
│
└── render.yaml               # Configuración de despliegue automatizado en Render.com
```

---

## 🔐 Doble Capa de Seguridad y Auto-Lock

* **Nivel 1 (Sesión Global)**: Autenticación inicial del usuario mediante usuario/contraseña, la cual genera un token **JWT con expiración estricta de 2 horas**. El token se envía en la cabecera `Authorization: Bearer <token>`.
* **Nivel 2 (Archivador/Locker Cerrado)**: Para acceder a cualquier archivador individual, se requiere ingresar un **PIN numérico (4-6 dígitos)**. Al ingresarlo, el backend valida el hash (`bcryptjs`) y emite un **Locker Token temporal con 15 minutos de validez**. Este token se envía en la cabecera personalizada `X-Locker-Token`.
* **Auto-Lock por Inactividad**: Un hook de React `useAutoLock.js` detecta la inactividad del usuario en el navegador (movimientos de ratón, pulsaciones de teclas, clics). Si transcurren **5 minutos** sin interacción, destruye el Locker Token de la memoria y la sesión local de ese archivador, bloqueándolo de inmediato y redirigiendo al dashboard de lockers.

---

## ⚙️ Guía de Configuración Inicial Paso a Paso

### Paso 1: Configurar Cuenta de Servicio en Google Cloud (Service Account)

Para que el servidor pueda guardar tus archivos PDF cifrados de forma automática en tu Google Drive personal, necesitas crear una cuenta de servicio:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto nuevo llamado **rgclocker**.
3. En el menú de la izquierda, busca **API y servicios** > **Biblioteca** (Library). Busca **Google Drive API** y haz clic en **Habilitar** (Enable).
4. Ve a **IAM y administración** > **Cuentas de servicio** (Service Accounts).
5. Haz clic en **Crear cuenta de servicio** en la parte superior. Asigna un nombre (ej. `rgclocker-drive-service`) y haz clic en **Crear y continuar**. No es necesario asignar un rol en este paso.
6. Una vez creada la cuenta de servicio, haz clic sobre ella en la lista. Ve a la pestaña **Claves** (Keys).
7. Haz clic en **Agregar clave** > **Crear clave nueva** en formato **JSON**. Esto descargará automáticamente un archivo `.json` de credenciales a tu ordenador.
8. Renombra ese archivo descargado a `google-service-account.json` y colócalo **dentro de la carpeta `/backend`** de este proyecto. *Nota: Este archivo ya se encuentra en `.gitignore` para que nunca se suba a repositorios públicos.*

### Paso 2: Crear y Compartir una Carpeta en tu Google Drive Personal

1. Abre tu Google Drive personal.
2. Crea una carpeta dedicada (ej. `rgclocker_vault`).
3. Entra en la carpeta recién creada y copia el ID que aparece al final de la URL en el navegador (ej. si la URL es `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g...`, el ID de tu carpeta es `1a2b3c4d5e6f7g...`). Guarda este ID para tu archivo `.env`.
4. Abre el archivo `google-service-account.json` que descargaste en el paso anterior y copia la dirección de correo que aparece en la clave `"client_email"` (ej. `rgclocker-drive-service@proyecto.iam.gserviceaccount.com`).
5. Vuelve a tu Google Drive, haz clic derecho sobre la carpeta del vault > **Compartir**. Agrega el correo de tu Service Account como **Editor** y desmarca la opción de enviar notificación por correo. Esto le da permisos a tu backend para guardar y recuperar archivos de esa carpeta específica únicamente.

---

## 🚀 Despliegue en Desarrollo (Local)

### 1. Configuración de Variables de Entorno (.env)

Crea un archivo `.env` dentro de la carpeta `backend/` a partir de la plantilla facilitada:

```bash
cp backend/.env.example backend/.env
```

Abre el archivo `backend/.env` y configura lo siguiente:
* **DATABASE_URL**: Dirección de conexión a tu base de datos PostgreSQL local o remota.
* **ENCRYPTION_KEY**: Una clave de 64 caracteres hexadecimales (32 bytes exactos). Puedes generar una clave segura abriendo tu terminal y ejecutando:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
* **GOOGLE_DRIVE_FOLDER_ID**: Pega el ID de la carpeta de Google Drive que obtuviste en el Paso 2.
* **GOOGLE_SERVICE_ACCOUNT_KEY_PATH**: Se mantendrá como `google-service-account.json` (el archivo clave colocado en el backend).

---

### 2. Levantar el Backend (Express API)

Asegúrate de tener instalado PostgreSQL y tener una base de datos vacía lista para el proyecto.

```bash
cd backend
npm install
npm run dev
```

El servidor se iniciará en `http://localhost:5000` y sincronizará de forma automática las tablas en PostgreSQL.

---

### 3. Levantar el Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

El portal web de tu bóveda privada se abrirá en `http://localhost:5173`. 
Al cargar la web por primera vez, podrás usar la opción **"Registra tu clave"** en el formulario de acceso para crear tu usuario inicial administrador y definir tus archivadores.

---

## 🔗 Vincular el Repositorio Local a GitHub

Para resguardar tu código en GitHub de manera segura:

1. Crea un repositorio vacío (sin README ni .gitignore) en tu cuenta de GitHub.
2. Abre tu terminal en la raíz de este proyecto (`rgclocker/`) y ejecuta:

```bash
# Inicializa el git si no lo está
git init

# Agrega todos los archivos al staging
git add .

# Haz el commit inicial de tu estructura base
git commit -m "feat: base architecture complete (backend express, frontend react, security dual layer)"

# Vincula a tu repositorio remoto de GitHub (Reemplaza con tu URL)
git branch -M main
git remote add origin https://github.com/TU_USUARIO/rgclocker.git

# Sube el código seguro
git push -u origin main
```

*Advertencia de Seguridad: Tu `.gitignore` ha sido configurado minuciosamente de manera estricta para evitar la subida accidental de archivos `.env`, módulos de Node, carpetas `/temp` o credenciales de la Cuenta de Servicio de Google (`google-service-account.json`). Jamás remuevas estas protecciones.*

---

## ☁️ Configuración de Despliegue en la Nube (Deploy)

Este repositorio está preparado para desplegarse de manera automatizada en plataformas como **Render.com** utilizando el archivo `render.yaml` incluido en la raíz.

### Pasos para Render:
1. Sube tu código a un repositorio privado en tu cuenta de GitHub.
2. Abre tu panel en [Render.com](https://render.com).
3. Haz clic en **New** > **Blueprint**.
4. Vincula tu repositorio privado de GitHub.
5. Render leerá el archivo `render.yaml` y creará automáticamente:
   - Una base de datos PostgreSQL de producción gratis.
   - El servicio API de Node.js (backend).
   - El servicio web estático (frontend).
6. Una vez creado, ve al servicio `rgclocker-backend` en Render > **Environment** e introduce las variables correspondientes que faltan (ej. `ENCRYPTION_KEY` y `GOOGLE_DRIVE_FOLDER_ID`).
7. Sube el contenido del archivo `google-service-account.json` a Render a través de **Secret Files** en el menú de Environment como un archivo secreto llamado `google-service-account.json` colocado en el directorio `/opt/render/project/src/backend/google-service-account.json` o configúralo según las variables de ruta indicadas en tu backend.

¡Tu bóveda segura ya está lista para usar desde cualquier parte del mundo de forma confidencial y privada! 🚀🔒
