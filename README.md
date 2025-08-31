# CodeRacer: The Ultimate Real-time Coding Mentorship Platform

<p align="center">
  <img src="docs/logo.jpg" alt="CodeRacer" width="200"/>
</p>

<p align="center">
  A full-stack web application for interactive coding mentorship, built with React and Node.js.
</p>

## Table of Contents

- [Features](#features)
- [Technical Stack](#technical-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
- [Deployment](#deployment)

## Features

- **Real-time Code Sharing:** Mentors can view and interact with learners' code in real-time.
- **Task Assignment:** Mentors can create and assign coding tasks to learners.
- **AI-Powered Evaluation:** Code submissions are evaluated by Google's Gemini API, providing a score and detailed feedback.
- **Session Management:** Mentors can export and import session data to save and resume sessions.
- **Administrative Controls:** Mentors can kick or ban participants from a session.
- **Dynamic Leaderboard:** An optional leaderboard ranks learners by score and submission speed.

## Technical Stack

- **Frontend:** React, WebSockets, Monaco Editor
- **Backend:** Node.js, Express, ws (WebSockets)
- **AI:** Google Gemini API

## Getting Started

### Prerequisites

- Node.js and npm installed
- A Gemini API key

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

### Configuration

1. **Set up your Gemini API key:**
   Create a `.env` file in the `backend` directory and add your API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

2. **Set the mentor secret:**
   In `backend/server.js`, you can change the `mentor_secret_key` to a value of your choice.

### Running the Application

1. **Start the backend server:**
   ```bash
   cd backend
   node server.js
   ```

2. **Start the frontend development server:**
   ```bash
   cd ../frontend
   npm start
   ```

The application will be available at `http://localhost:3000`.

## Deployment

This application is configured for deployment on Vercel. Simply connect your repository to a new Vercel project, and it will be deployed automatically using the `vercel.json` configuration file.