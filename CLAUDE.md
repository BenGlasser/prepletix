# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prepletix is a youth sports coaching app for elementary school lacrosse coaches. The app helps coaches manage players, track attendance, plan practices, and communicate with parents. Built as a cross-platform solution supporting Android, iOS (via PWA), and web browsers.

## Architecture

This is a multi-platform project with three main components:

- **web/** - React + Vite web application with Tailwind CSS
- **mobile/** - React Native Expo application for mobile platforms
- **functions/** - Firebase Cloud Functions for backend logic

The app uses Firebase as the backend service including Firestore (database), Authentication, Hosting, and Cloud Functions.

## Development Commands

### Web Application (web/)

```bash
cd web
yarn run dev          # Start development server
yarn run build        # Build for production
yarn run lint         # Run ESLint
yarn run preview      # Preview production build
```

### Firebase Functions (functions/)

```bash
cd functions
npm run serve        # Start Firebase emulator
npm run deploy       # Deploy functions to Firebase
npm run lint         # Run ESLint
npm run shell        # Start Firebase functions shell
npm run logs         # View function logs
```

## Data Models

### Core Entities

- **Player** - Central entity with name, jersey number, contacts, medical info, notes, and attendance records
- **AttendanceRecord** - Tracks presence status (present/absent/late/left_early) with optional notes
- **PracticePlan** - Contains drills with timing and focus areas
- **Drill** - Categorized activities with instructions and age appropriateness
- **Game** - Scheduled matches with opponent and location details
- **Message** - Communication between coaches and parents

### Key Collections (Firestore)

- `/players/{playerId}` - Player profiles and core information
- `/players/{playerId}/attendance/{recordId}` - Attendance tracking records

## MVP Features

The current MVP focuses on three core features:

1. **Player Roster & Profiles** - Display and manage player information
2. **Player CRUD Operations** - Add, edit, delete players with profile photos
3. **Attendance Tracker** - Mark attendance status with optional notes

## Firebase Configuration

The app uses Firebase services:

- **Authentication** - Email/password login for coaches
- **Firestore** - NoSQL database for all app data
- **Hosting** - Web app deployment
- **Functions** - Server-side logic and API endpoints
- **Storage** - Profile photo uploads

## Security & Access Control

- Authentication required for all app access
- Firestore security rules scope access to authenticated users
- Player data protected and associated with coach accounts

## Design Guidelines

- Use heroicons for all iconography