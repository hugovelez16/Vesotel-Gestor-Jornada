# Vesotel Jornada - Gestor de Jornadas Laborales

Vesotel Jornada es una aplicación web moderna diseñada para facilitar el seguimiento y la gestión de las jornadas laborales de los empleados. Permite a los usuarios registrar sus horas de trabajo, ya sean particulares o de tutorial, calcular automáticamente sus ingresos y visualizar su actividad de forma clara y organizada. Incluye un robusto panel de administración para la gestión de usuarios, solicitudes de acceso y una visión global de la actividad de todo el equipo.

## 🖼️ Galería de Capturas

| Lista de Registros | Resumenes Mensuales | Panel de Administración (Timeline) |
| :---: | :---: | :---: |
| <img width="1913" height="984" alt="Captura de pantalla 2025-11-23 173109" src="https://github.com/user-attachments/assets/225e41b5-adb5-4008-b1f0-38a5a359aece" /> | <img width="1917" height="992" alt="Captura de pantalla 2025-11-23 172932" src="https://github.com/user-attachments/assets/8abc3b01-def4-49a0-9464-e7e785f93faa" /> | <img width="1697" height="981" alt="Captura de pantalla 2025-11-23 172802" src="https://github.com/user-attachments/assets/e0393db7-2766-4c9d-87d5-494b9cdc2f12" /> |


## ✨ Características Principales

### Para Usuarios:
- **Dashboard Personalizado**: Visualiza un resumen mensual de ingresos, horas trabajadas y días de tutorial.
- **Registro de Jornadas**: Añade nuevos registros de trabajo de tipo "Particular" (por horas) o "Tutorial" (por días).
- **Cálculo Automático de Ingresos**: El sistema calcula los importes basándose en las tarifas personales del usuario, aplicando pluses de nocturnidad, coordinación y cálculo de IRPF si corresponde.
- **Lista Detallada de Registros**: Un historial completo de todas las jornadas laborales, con opciones para editar y eliminar.
- **Calendario Interactivo**: Una vista de calendario que muestra todos los eventos de trabajo, permitiendo seleccionar un día para ver los detalles.
- **Resumen de Actividad**: Estadísticas totales y desglosadas por mes de toda la actividad laboral.
- **Exportación a WhatsApp**: Genera un resumen mensual formateado y listo para ser enviado por WhatsApp.
- **Perfil y Ajustes**: Gestiona la información personal y las tarifas por hora, día, coordinación y nocturnidad.

### Para Administradores:
- **Panel de Administración**: Un centro de control completo para supervisar la aplicación.
- **Gestión de Solicitudes de Acceso**: Aprueba o rechaza las solicitudes de nuevos usuarios que quieren unirse a la aplicación.
- **Gestión de Usuarios**: Visualiza y gestiona la lista de usuarios activos, edita sus perfiles, configura sus tarifas y revoca su acceso.
- **Timeline Diario**: Un cronograma visual que muestra la actividad de todos los usuarios para un día seleccionado, perfecto para la planificación y supervisión.
- **Estadísticas por Usuario**: Accede a un desglose detallado de las estadísticas históricas y mensuales de cada usuario.
- **Doble Vista**: El administrador puede cambiar entre la "vista de administrador" y la "vista de usuario" para experimentar la aplicación como un empleado normal.

## 🚀 Stack Tecnológico

Este proyecto está construido con un conjunto de tecnologías modernas y eficientes:

- **Framework**: [Next.js](https://nextjs.org/) (usando el App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Estilo y UI**:
  - [Tailwind CSS](https://tailwindcss.com/) para el diseño utility-first.
  - [ShadCN UI](https://ui.shadcn.com/) para componentes de interfaz de usuario accesibles y reutilizables.
  - [Lucide React](https://lucide.dev/) para los iconos.
- **Backend y Base de Datos**:
  - [Firebase](https://firebase.google.com/) para la autenticación y la base de datos en tiempo real.
  - **Firebase Authentication**: Para un inicio de sesión seguro con proveedores como Google.
  - **Firestore**: Como base de datos NoSQL para almacenar perfiles de usuario, registros de trabajo y configuraciones.
- **Despliegue**:
  - **GitHub Actions**: Para la integración y el despliegue continuo (CI/CD).
  - **Static Export (`output: 'export'`)**: El proyecto se compila como un sitio estático.
  - **FTP**: El build estático se despliega a un servidor (Plesk) a través de FTP.

## 📂 Estructura del Proyecto

El código fuente se encuentra principalmente en el directorio `src/`.

```
src/
├── app/                  # Rutas de la aplicación (App Router)
│   ├── (app)/            # Rutas protegidas para usuarios logueados
│   ├── admin/            # Rutas del panel de administración
│   ├── login/            # Página de inicio de sesión
│   └── ...
├── components/           # Componentes React reutilizables (UI, etc.)
├── firebase/             # Configuración y hooks de Firebase
├── hooks/                # Hooks de React personalizados
├── lib/                  # Utilidades, tipos, y lógica de negocio
└── ...
```

## ⚙️ Instalación y Puesta en Marcha

Sigue estos pasos para configurar el proyecto en tu entorno de desarrollo local.

### Prerrequisitos
- Node.js (versión 20.x o superior)
- npm o yarn

### Pasos

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/tu-repositorio.git
    cd tu-repositorio
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar Firebase:**
    Necesitarás un proyecto de Firebase para que la aplicación funcione.
    - Crea un proyecto en la [consola de Firebase](https://console.firebase.google.com/).
    - Habilita **Firebase Authentication** (con el proveedor de Google) y **Firestore**.
    - Copia las credenciales de tu aplicación web de Firebase y pégalas en los siguientes archivos:
      - `src/firebase/config.ts`
      - `src/lib/config.ts`

4.  **Configurar el Administrador:**
    En el archivo `src/lib/config.ts`, asegúrate de que la variable `ADMIN_EMAIL` contenga el email de la cuenta que actuará como administradora.

5.  **Ejecutar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en [http://localhost:9002](http://localhost:9002).

## 🚀 Despliegue

Este proyecto está configurado para ser desplegado como un sitio estático. El flujo de trabajo de GitHub Actions definido en `.github/workflows/deploy.yml` se encarga de:
1.  Instalar las dependencias.
2.  Construir el proyecto con `npm run build`.
3.  Subir los archivos generados en la carpeta `out/` al servidor a través de FTP.

Para que funcione, necesitas configurar los siguientes secretos en tu repositorio de GitHub:
- `FTP_SERVER`: La dirección de tu servidor FTP.
- `FTP_USERNAME`: Tu nombre de usuario de FTP.
- `FTP_PASSWORD`: Tu contraseña de FTP.
