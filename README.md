# HR Management System – Employee Self-Service Update

This project keeps **one React/Vite website, one Django REST API, and one PostgreSQL database**. The common login routes users to the HR Admin dashboard or Employee portal based on the authenticated Django user's `is_staff` role.

## New functionality

### Employee accounts
- HR creates an employee record first.
- In the Employees table, use the key icon to create a login for that employee.
- Enter a unique username and temporary password. Share those credentials privately with the employee.
- The linked Django user is a normal user (`is_staff=False`, `is_superuser=False`).
- On first login, the employee must change the temporary password. The employee portal APIs remain blocked until that change is complete.
- Deactivating an employee deactivates their linked login; deleting the employee deactivates the login rather than leaving an orphaned active account.

### Attendance
- Employees can only view their own attendance.
- Employees use Check In and Check Out actions. Check-out remarks are optional.
- The API calculates duration: 8 hours or more = Present; 4 hours to less than 8 hours = Half Day; less than 4 hours = Absent.
- Duplicate check-in/check-out actions are rejected.
- HR administrators retain management access to all attendance records.
- The current implementation calculates same-calendar-day shifts. Overnight shifts need a separate company policy before they can be supported correctly.

### Leave requests
- Employees can submit leave requests and see only their own requests and HR remarks.
- HR administrators can review, approve, reject, or cancel requests.
- Employees cannot change the status or review remarks.

### Holidays
- HR administrators can create, edit, and delete company-wide or department-specific holidays.
- Employees can only see company-wide holidays and holidays assigned to their own department.

### Employee dashboard
- Shows employee ID, department, designation, joining date, employment type, service duration, monthly attendance counts, leave counts, and recent attendance.

## Backend setup

1. Open a terminal in `backend`.
2. Create and activate your virtual environment.
3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Copy `.env.example` to `.env` and set your local database URL and secrets. Do not commit `.env`.
5. Apply database migrations:

   ```bash
   python manage.py migrate
   ```

6. Check the project:

   ```bash
   python manage.py check
   ```

7. Start Django:

   ```bash
   python manage.py runserver
   ```

## Frontend setup

1. Open another terminal in `frontend`.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env` from `.env.example` and set `VITE_API_URL` to your Django API base URL (for local development, `http://127.0.0.1:8000/api`).
4. Start Vite:

   ```bash
   npm run dev
   ```

## First-time employee account workflow

1. HR creates the employee record with an accurate email and joining date.
2. In HR → Employees, click the key icon on that employee row.
3. Enter a unique username and a temporary password that meets Django's password validators.
4. HR privately shares those credentials with the employee.
5. Employee signs in through the same login page and changes the temporary password.
6. The employee is then routed to `/employee`.

## API endpoints added

- `POST /api/employees/records/{id}/create-login/` – HR creates employee login.
- `GET /api/employee/dashboard/` – employee's own dashboard and service duration.
- `POST /api/attendance/records/check-in/` – employee check-in.
- `POST /api/attendance/records/check-out/` – employee check-out; optional JSON `remarks`.
- `/api/holidays/records/` – HR CRUD; employee read-only filtered holiday list.
- Existing `/api/leaves/requests/` now supports employee-created requests and employee-owned list access, while HR retains review actions.

## Deployment notes

- The existing Vercel project and Render backend can be reused; no second frontend or backend is needed.
- Apply migrations to the production database before testing the new pages:

  ```bash
  python manage.py migrate
  ```

- Keep the existing Vercel API URL configuration. Add no new CORS origin because the same frontend origin is being used.
- Confirm `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and `BREVO_SENDER_NAME` are configured in Render if using the existing Brevo OTP integration.
- Never upload `.env`, database files, virtual environments, or `node_modules` to GitHub.

## Attendance policy note

The current 8-hour / 4-hour thresholds are the agreed initial rule, not a configurable HR policy screen yet. HR should confirm whether breaks are included and whether any employee categories have different daily hours before production use. Missing check-outs remain incomplete until corrected; this version does not run an automatic end-of-day absent marking job.
