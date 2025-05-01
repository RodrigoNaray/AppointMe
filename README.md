# AppointMe 📅✨

AppointMe is a full-stack web application designed to simplify appointment and service management for independent professionals, such as makeup artists, stylists, therapists, and more. It allows clients to easily view services and real-time availability, and make bookings. Professionals can efficiently manage their business through a secure, mobile-optimized admin panel.

📋 Table of Contents

*   [Key Features (MVP)](#key-features-mvp)
*   [Technologies Used](#technologies-used)
*   [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Installation](#installation)
    *   [Usage (Development)](#usage-development)
*   [Future Enhancements](#future-enhancements)
*   [Contributing](#contributing)
*   [License](#license)

## 🚀 Key Features (MVP)

*   **📱 Responsive Interface (Mobile-First):** Optimized design for a smooth experience on phones and tablets, with a polished desktop view.
*   **💄 Service Management:** Administrators can Create, Read, Update, and Delete (CRUD) services, specifying details like name, description, duration, and price.
*   **🗓️ Availability Management:**
    *   Define a weekly base working schedule.
    *   Block specific days or hours (e.g., for vacations or personal appointments).
    *   Configure the minimum notice period required for client bookings (e.g., disallow bookings with less than 1 hour's notice).
*   **📅 Interactive Calendar:** Clients can easily view available days and time slots for each service, considering the professional's schedule, blocked periods, existing bookings, and the minimum notice rule.
*   **✅ Simple Booking System:** Clients select a service and an available time slot and complete the booking by providing their name, email, and phone number (no account creation required in the MVP).
*   **🔒 Secure Admin Panel:**
    *   Login for administrators via Email/Password or Google Login (implemented with Passport.js).
    *   Protection of admin routes using JWT.
    *   Clear visualization of received bookings.

## 🛠️ Technologies Used

*   **Frontend:** React, TypeScript, Vite, CSS 
*   **Backend:** Node.js, TypeScript, Express.js
*   **Database:** PostgreSQL
*   **ORM:** Prisma
*   **Authentication (Admin):** Passport.js (Strategies: Local, Google OAuth 2.0, JWT), bcrypt
*   **Monorepo Management:** npm Workspaces
*   **Others:** concurrently (for development), date-fns (for date handling)

## 🏁 Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

*   Node.js (v16+ recommended)
*   npm (v7+ recommended)
*   Git
*   PostgreSQL installed and running

### Installation

Clone the repository:

git clone https://github.com/RodrigoNaray/AppointMe
cd AppointMe

Configure Environment Variables (Backend):

Navigate to the backend folder.

Copy the `.env.example` file and rename it to `.env`.

Edit the .env file and configure the necessary variables:

| Variable               | Description                                     | Example Value                                                |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`         | PostgreSQL connection string                    | `postgresql://user:password@host:port/db?schema=public`        |
| `JWT_SECRET`             | Secure secret string for signing JWT tokens      | `YOUR_SECURE_JWT_SECRET`                                     |
| `GOOGLE_CLIENT_ID`       | Google Cloud Client ID for OAuth 2.0              | `YOUR_GOOGLE_CLIENT_ID`                                      |
| `GOOGLE_CLIENT_SECRET`   | Google Cloud Client Secret                        | `YOUR_GOOGLE_CLIENT_SECRET`                                  |
| `SERVER_URL`             | Base URL of your backend                          | `http://localhost:5000`                                      |
| `CLIENT_URL`             | Base URL of your frontend (for CORS/redirects)  | `http://localhost:5173`                                      |

### Install Dependencies

From the root project folder (AppointMe/), run:

npm install

This will install dependencies for the root, backend, and frontend.

### Set up Database

Make sure your PostgreSQL server is running and you have created the database specified in DATABASE_URL.

From the root folder, run the initial Prisma migration:

npm run prisma:migrate

(This script runs npm run prisma:migrate -w backend).

## 💻 Usage (Development)

To start the backend and frontend development servers concurrently:

From the root project folder (AppointMe/), run:

npm run dev

This command uses `concurrently` to launch the development scripts defined in the `package.json` files of the `backend` and `frontend` workspaces.

Now you can access the app in your browser:

*   Frontend (Client): Typically at `http://localhost:5173` (Vite's default port).
*   Backend API: Typically at `http://localhost:5000` (or the port specified in your `.env` file).

✨ Future Enhancements (Post-MVP)
Client Authentication and Profiles (Register/Login, history).

Client-side Booking Management (cancel/reschedule).

Automatic Notifications (email/SMS).

Online Payment Gateway Integration.

Review and Rating System.
... and much more!

🤝 Contributing

Contributions are welcome! If you wish to contribute, please open an issue first to discuss the proposed changes.

📄 License
This project is licensed under the MIT License. See the LICENSE file for details.

Thank you for checking out AppointMe!