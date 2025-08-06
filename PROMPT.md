You are a full-stack development assistant using Firebase and React. Help me build the MVP of a youth sports coaching app called **Prepletix**.

---

### 🔧 STACK & TOOLS

Use the following technologies and services:

- **Frontend:** React + Tailwind CSS
- **Backend:** Firebase Functions
- **Database:** Firestore (Firebase Cloud Firestore)
- **Auth:** Firebase Authentication (email/password only for MVP)
- **Hosting:** Firebase Hosting
- \*\*Target Platforms: Web

---

### ✅ TASKS — Firebase Console Setup

1. Create a **Firebase Project** called `prepletix`
2. Set up:
   - Firestore in production mode
   - Firebase Authentication (email/password)
   - Firebase Hosting
   - Firebase Functions (if needed for custom API logic)
3. Add Web App config and return the SDK config snippet for React app initialization
4. Add Firestore rules for authenticated read/write access scoped to user/team
5. Set up Firebase Storage if profile photo uploads will be handled
6. Prepare test data for a team with 8 players

---

### 📋 MVP FEATURES

Build only the following for MVP:

1. **Player Roster & Profiles**

   - Display list of players (name, photo, jersey number)
   - Click into full player profile
   - Tabs: Contact Info, Medical Info, Attendance History, Notes

2. **Player CRUD**

   - Add/edit/delete player
   - Upload or link profile image
   - Save to Firestore under `players` collection

3. **Attendance Tracker**

   - Toggle attendance for each player
   - Status: Present, Absent, Late, Left Early
   - Optional notes
   - Save to subcollection: `/players/{playerId}/attendance/`

4. **Practice Planner**
   - Create/edit/save practice plans
   - Drag-and-drop drill layout
   - Time slots (e.g. 10 min warm-up, 15 min stick work)
   - Tag practices by date and focus (e.g. shooting, teamwork)
   - Ability to duplicate and reuse plans
   - Practice calendar view
   - Practice editor with list of available drills
   - Option to print or view in full-screen for field use

---

### 🔐 FIREBASE AUTH EXPECTATIONS

- Only allow authenticated users to access app
- Use Firebase Auth UI or basic custom form
- Allow account creation and sign-in via email/password
- Protect Firestore access via `request.auth != null`

---

### 🗃️ DATA MODELS

Use the following Firestore-friendly structure:

```js
/players/{playerId} {
  name: string
  jerseyNumber: number
  photoUrl: string
  contacts: [ParentContact]
  medicalInfo: MedicalInfo
  notes: [CoachNote]
  createdAt: timestamp
  updatedAt: timestamp
}

/players/{playerId}/attendance/{recordId} {
  date: string
  eventType: string
  status: string
  note: string
}

```

### 📦 DELIVERABLES

- Firebase Console project set up and configured
- Firestore data schema in place
- SDK snippet returned for web app setup
- Ready-to-run React frontend that connects to Firebase
- Demo user and seeded player data

Start with Firebase setup, return the SDK config, and scaffold the data collections.
