# HMS Deployment

This repository contains a complete Hospital Management System (HMS) built as a multi-part application:

- HMS_Back_end: Node.js and Express REST API
- HMS_Front_end: Angular admin dashboard
- PatientApp: Expo-based mobile application for patients

The system is designed to support hospital operations such as authentication, employee and patient management, appointments, medical records, and role-based access control.

## Project Overview

This project is divided into three main parts:

1. Backend API
   - Handles business logic, database access, authentication, and authorization.
   - Built with Node.js, Express, and MongoDB.

2. Web Admin Panel
   - Provides a web-based interface for hospital staff and administrators.
   - Built with Angular.

3. Patient Mobile App
   - Offers a mobile experience for patients.
   - Built with Expo and React Native.

## Folder Structure

```text
HMS-Deployement/
├── HMS_Back_end/
├── HMS_Front_end/
└── PatientApp/
```

## Tech Stack

- Backend: Node.js, Express, MongoDB
- Frontend: Angular, TypeScript
- Mobile App: Expo, React Native

## Getting Started

### 1. Backend Setup

```bash
cd HMS_Back_end
npm install
npm run dev
```

The backend API will run locally on the configured port (typically 5000).

### 2. Frontend Setup

```bash
cd HMS_Front_end
npm install
npm start
```

Open the Angular app in your browser at the local development URL.

### 3. Patient Mobile App Setup

```bash
cd PatientApp
npm install
npx expo start
```

Use the Expo developer tools to run the app on a simulator or physical device (Android Studio for Windows and Xcode for Mac users).

## Prerequisites

Before running the project, make sure you have:

- Node.js and npm installed
- A running MongoDB instance
- Expo CLI for the mobile app

## Deployment

This project is deployed on an AWS EC2 instance for production use. The deployment follows a standard cloud-hosted setup where the backend API and web application are served from a public server instance.

### Deployment Type

- Cloud platform: AWS EC2
- Backend runtime: Node.js / Express
- Process manager: PM2
- Web server: Nginx
- Frontend: Angular web app
- Mobile app: Expo-based application
- Database: MongoDB Atlas

### Public URL for Users

Users can access the deployed system through:

- Web / Admin Portal: http://16.112.151.129

This public URL can be shared with users for accessing the hospital management system online.

## Notes

- The backend must be running before the frontend and mobile app can fully communicate with it.
- Make sure the environment variables for the backend are configured correctly before starting the API.

## Summary

This repository provides a full-stack HMS solution with a backend API, an admin web interface, and a patient mobile application, making it suitable for hospital management and patient-facing workflows.
