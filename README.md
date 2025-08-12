# AppointMe 📅✨

AppointMe is a full-stack web application designed to simplify appointment and service management for independent professionals, such as makeup artists, stylists, therapists, and more. It allows clients to easily view services and real-time availability, and make bookings. Professionals can efficiently manage their business through a secure, mobile-optimized admin panel.

📋 **Table of Contents**

* [🚀 Key Features (MVP)](#-key-features-mvp)
* [🛠️ Technologies Used](#️-technologies-used)
* [🏁 Getting Started](#-getting-started)
    * [Prerequisites](#prerequisites)
    * [Installation & Setup](#installation--setup)
    * [Running the Project](#running-the-project)
* [📝 Important Notes](#-important-notes)
* [✨ Future Enhancements](#-future-enhancements)
* [📄 License](#-license)

## 🚀 Key Features (MVP)

* **📱 Responsive Interface (Mobile-First):** Optimized design for a smooth experience on phones and tablets, with a polished desktop view built with **shadcn/ui**.
* **⚙️ Service Management:** Administrators can Create, Read, Update, and Delete (CRUD) services, specifying details like name, description, duration, and price.
* **🗓️ Availability Management:**
    * Define a weekly base working schedule.
    * Block specific days or hours (e.g., for vacations or personal appointments).
* **📅 Interactive Calendar:** Clients can easily view available days and time slots for each service, considering the professional's schedule and existing bookings.
* **✅ Simple Booking System:** Clients select a service and an available time slot and complete the booking by providing their name, email, and phone number (no client account required in the MVP).
* **🔒 Secure Admin Panel:**
    * Administrator login via Email/Password.
    * Secure session management using **JWTs stored in HttpOnly cookies** to prevent XSS attacks.
    * Protection of all admin routes via Passport.js middleware.

## 🛠️ Technologies Used

* **Frontend:** React, TypeScript, Vite, Tailwind CSS,shadcn/ui
* **Backend:** Node.js, TypeScript, Express.js
* **Database:** PostgreSQL
* **ORM:** Prisma
* **Authentication (Admin):** Passport.js (JWT Strategy), bcrypt
* **Development:** `concurrently` to run both servers simultaneously.

## 🏁 Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

* Node.js (v18+ recommended)
* npm (v8+ recommended)
* Git
* PostgreSQL installed and running

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/RodrigoNaray/AppointMe](https://github.com/RodrigoNaray/AppointMe)
    cd AppointMe
    ```

2.  **Install Dependencies for Both Projects:**
    This command will install dependencies for both the `backend` and `frontend` folders.
    ```bash
    npm run install:all
    ```

3.  **Configure Backend Environment Variables:**
    * Navigate to the `backend` folder: `cd backend`
    * Copy the `.env.example` file and rename it to `.env`.
    * Edit the `.env` file and configure the necessary variables:

| Variable       | Description                                  | Example Value                                           |
| -------------- | -------------------------------------------- | ------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string                 | `postgresql://user:password@host:port/db?schema=public` |
| `JWT_SECRET`   | Secure secret string for signing JWTs & cookies | `a_very_strong_and_secret_string`                       |
| `CLIENT_URL`   | Base URL of your frontend (for CORS)         | `http://localhost:5173`                                 |

4.  **Configure Frontend Environment Variables:**
    * Navigate to the `frontend` folder: `cd ../frontend`
    * Copy the `.env.example` file and rename it to `.env`.
    * Ensure the `VITE_API_BASE_URL` is correct.

5.  **Set up the Database:**
    * Make sure your PostgreSQL server is running and you have created the database specified in your `DATABASE_URL`.
    * Navigate to the `backend` folder and run the Prisma migration to create the tables:
    ```bash
    cd backend
    npx prisma migrate dev
    ```

## 💻 Running the Project

To start both the backend and frontend development servers concurrently:

1.  Navigate to the **root project folder** (`AppointMe/`).
2.  Run the following command:
    ```bash
    npm run dev
    ```

This command uses `concurrently` to launch both development servers.

* **Frontend (Client):** Access at `http://localhost:5173`
* **Backend API:** Access at `http://localhost:5000`

## 📝 Important Notes

### Date and Time Formatting

When sending dates to the API (e.g., for creating availability blocks), it is crucial to use the **ISO 8601** format ending with a `Z`. The `Z` signifies **UTC**, ensuring the date and time are interpreted correctly on the server, regardless of time zones.

**Example:** `2025-09-15T14:00:00.000Z`

## ✨ Future Enhancements (Post-MVP)

* Client Authentication and Profiles (Register/Login, history).
* Client-side Booking Management (cancel/reschedule).
* Automatic Email/SMS Notifications.
* Online Payment Gateway Integration.
* Review and Rating System.

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.