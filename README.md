# KlonOS / ZeroLag Monorepo

Este repositorio contiene la arquitectura de **ZeroLag**, un ecosistema neuromórfico enfocado en la reducción de latencia y herramientas de desempeño. El proyecto utiliza un enfoque **monorepo** gestionado con [pnpm](https://pnpm.io/) workspaces.

## 📦 Estructura del Monorepo

El código fuente está distribuido principalmente en el directorio `artifacts/` para las aplicaciones principales y `lib/` para los paquetes internos compartidos.

### Aplicaciones (`artifacts/`)

- **`api-server`**: Backend principal en Node.js/Express. Maneja las APIs del proyecto, incluyendo el sistema unificado de autenticación (`better-auth`).
- **`clonengine`**: Aplicación web frontend (React + Vite) que funciona como la interfaz principal y panel de control de ZeroLag (Soporte PWA).
- **`klonos`**: Aplicación móvil multiplataforma desarrollada con **React Native** (Expo).
- **`klonos-ext`**: Extensión de navegador basada en React y Vite.
- **`mockup-sandbox`**: Entorno de pruebas y prototipado visual de componentes (Vite).

### Librerías Compartidas (`lib/`)

- **`api-client-react`**: Cliente API universal para React que incluye los hooks de autenticación (`better-auth/react`).
- **`api-zod`**: Esquemas de validación Zod compartidos entre frontend y backend.
- **`db`**: Esquema de base de datos y utilidades usando Drizzle ORM.

## 🔐 Autenticación

El sistema utiliza [better-auth](https://better-auth.com/) para proveer un sistema de autenticación unificado de "ZeroLag":
- **Passkeys (WebAuthn)**: Soporte principal para login sin contraseña mediante biometría (Face ID, Touch ID, etc).
- **Social OAuth**: Integraciones nativas y web para **Google**, **GitHub** y **Microsoft Entra ID**.
- **Email/Contraseña**: Soporte tradicional.

### Variables de Entorno Requeridas

Para correr los servicios de autenticación localmente o en producción, configura las siguientes variables en tu `.env`:

```env
# URL Base
BETTER_AUTH_URL="http://localhost:3001" # o tu dominio de producción

# Social Login (OAuth)
GOOGLE_CLIENT_ID="tu_client_id"
GOOGLE_CLIENT_SECRET="tu_client_secret"

GITHUB_CLIENT_ID="tu_client_id"
GITHUB_CLIENT_SECRET="tu_client_secret"

MICROSOFT_CLIENT_ID="tu_client_id"
MICROSOFT_CLIENT_SECRET="tu_client_secret"
MICROSOFT_TENANT_ID="tu_tenant_id"
```

## 🛠 Instalación y Uso

1. **Instalar dependencias**
   Asegúrate de usar `pnpm` (versión 10+ recomendada).
   ```bash
   pnpm install
   ```

2. **Compilar todos los paquetes**
   Verifica tipos y construye los artifacts:
   ```bash
   pnpm run build
   ```

3. **Desarrollo (Modo Dev)**
   Para correr el servidor API:
   ```bash
   pnpm -C artifacts/api-server dev
   ```
   *Nota: Revisa el `package.json` de cada subpaquete para comandos específicos de desarrollo.*

## ⚙️ Infraestructura y Despliegue (Azure)

Los scripts de configuración e infraestructura como código (Bicep) para desplegar en Azure están localizados en la carpeta `azure/`.
Consulta el archivo `AZURE_SETUP.md` para más información sobre cómo desplegar la base de datos PostgreSQL, la Static Web App y la Container App.
