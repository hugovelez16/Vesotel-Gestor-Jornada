# **App Name**: Vesotel Jornada

## Core Features:

- Login Authentication: Secure login with Google Authentication, checking against allowed users list in Firestore. Redirects to access request form if not authorized.
- Dashboard Overview: Displays monthly summary cards for earnings, hours worked, and days worked, fetched and computed from Firestore.
- Interactive Calendar: Visual monthly calendar with color-coded work logs (Particular/Tutorial). Clicking a day/event opens an edit modal. Tutorial events use string comparison for date range.
- Work Log Management: Allows adding, editing, and deleting work logs (particular and tutorial types). Calculates total earnings based on hourly, daily, coordination, and night rates, considering IRPF.
- Admin Timeline View: A daily timeline view (accessible only to admin) showing users and their work shifts across a daily schedule. Clicking allows for editing of the logs.
- Admin User Management: User list displays all the approved users (the email has been manually placed on the 'allowed_users' table on Firestore) including delete function. Admin panel for managing pending access requests and approving them to 'allowed_users'.
- Access Request: Form allowing unauthorized users to request access, saving data to the Firestore 'access_requests' collection for admin approval.

## Style Guidelines:

- Primary color: Red (#FF0000) for a professional and reliable feel.
- Background color: Light gray (#F9FAFB), a very lightly desaturated red, to create a clean backdrop and allow UI elements to pop.
- Accent color: Slate (#64748B), a muted blue-gray for interactive elements, contrasting with the primary red.
- Body and headline font: 'Inter' (sans-serif) for a modern and neutral aesthetic. A versatile choice for all text.
- Lucide React icons to provide a consistent, clean, and modern look across the application.
- Clean, modern design with clear sections, using Tailwind CSS grid and flexbox for responsiveness.
- Subtle transitions and animations for improved user experience (e.g., modal appearance, loading states).