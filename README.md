# Medical Appointment Management System

A comprehensive medical appointment scheduling and patient management system with Google Calendar integration.
![Medical Appointment Management System](docs/screenshots/preview.png)


## Project Overview

This application is a full-featured medical practice management system designed to streamline appointment scheduling, patient record management, and calendar synchronization. Built with modern web technologies, it provides an intuitive interface for healthcare professionals to manage their daily operations efficiently.

## Key Features

### 📅 Appointment Management
- **Weekly Scheduler View**: Visual calendar interface with drag-and-drop appointment rescheduling
- **Appointment Creation**: Quick appointment booking with date/time selection
- **Appointment Editing**: Modify existing appointments with status tracking
- **Status Management**: Track appointments as scheduled, completed, cancelled, or no-show
- **Duration Options**: Support for 30-minute, 1-hour, and 2-hour appointments
- **Appointment Types**: Consultation, follow-up, and procedure categorization

### 👥 Patient Management
- **Patient Database**: Comprehensive patient information storage
- **Patient Profiles**: Name, email, phone, date of birth, address, emergency contacts
- **Patient Creation**: Add new patients directly from the appointment booking flow
- **Patient Search**: Quick patient lookup when scheduling appointments
- **Medical Notes**: Store patient-specific notes and information

### 🔗 Google Calendar Integration
- **Two-Way Sync**: View Google Calendar events alongside local appointments
- **Automatic Sync**: Option to automatically sync new appointments to Google Calendar
- **Real-time Updates**: Live display of Google Calendar events in the scheduler
- **Color Coding**: Distinct visual differentiation between local and Google Calendar events

### ⚙️ Settings & Customization
- **Working Hours**: Configure start and end times for your practice
- **Time Slots**: Customize appointment slot durations (15, 30, or 60 minutes)
- **Days Off**: Set non-working days (weekends, holidays)
- **Practice Information**: Store practice name, address, and contact details

## Technology Stack

- **Frontend Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn-ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **Calendar**: @aldabil/react-scheduler for the weekly view
- **Date Handling**: date-fns for date manipulation
- **State Management**: React hooks with local storage persistence
- **Backend Server**: Express.js for Google Calendar API integration
- **API Integration**: Google Calendar API via googleapis
- **Form Handling**: react-hook-form with Zod validation
- **Notifications**: Sonner for toast notifications

## Getting Started

### Prerequisites

- Node.js (v16 or higher) - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- npm or yarn package manager
- Google Cloud Platform account (for Google Calendar integration)

### Installation

1. **Clone the repository**
```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. **Install dependencies**
```sh
npm install
```

3. **Start the development server**
```sh
npm run dev
```

The application will be available at `http://localhost:5173`

4. **Start the backend server** (for Google Calendar integration)
```sh
cd server
npm install
npm start
```

The API server will run on `http://localhost:3001`

## Google Calendar Integration Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### Step 2: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type
3. Fill in required information:
   - App name: Your application name
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. Add test users (your email addresses)

### Step 3: Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Configure:
   - **Name**: Your app name
   - **Authorized JavaScript origins**: 
     - `http://localhost:5173` (for development)
     - Your production domain
   - **Authorized redirect URIs**:
     - `http://localhost:5173` (for development)
     - Your production domain
5. Click "Create" and save your:
   - Client ID
   - Client Secret

### Step 4: Configure Application

1. In the application, navigate to **Settings** (gear icon in sidebar)
2. Scroll to **Google Calendar Integration**
3. Click **Connect to Google Calendar**
4. Enter your Client ID and Client Secret
5. Click **Save Settings**
6. The "Sync with Google Calendar" button will appear in the scheduler

### Step 5: Authorize Access

1. Click **Sync with Google Calendar** in the scheduler header
2. A popup will open for Google authentication
3. Sign in with your Google account
4. Grant calendar access permissions
5. The popup will close and events will sync

### How Google Calendar Sync Works

- **Viewing Events**: Google Calendar events appear in the scheduler with a distinct blue color
- **Creating Appointments**: Toggle "Sync to Google Calendar" when creating appointments to automatically add them to Google Calendar
- **Manual Sync**: Click the sync button in the scheduler to refresh Google Calendar events
- **Event Details**: Click on Google Calendar events to view details (editing is done in Google Calendar)
- **Local vs. Cloud**: Local appointments are stored in browser storage, while synced appointments exist in both locations

## How the System Works

### Data Storage

The application uses browser Local Storage for data persistence:

- **Appointments**: `medical-appointments` - All appointment records
- **Patients**: `medical-patients` - Patient information database
- **Settings**: `medical-settings` - Practice configuration and preferences

### Appointment Workflow

1. **Select Time Slot**: Click on a time slot in the weekly scheduler
2. **Choose Patient**: Select an existing patient or create a new one
3. **Set Details**: Choose appointment type, duration, and add notes
4. **Google Sync**: Toggle whether to sync to Google Calendar
5. **Create**: Appointment is saved and appears in the scheduler
6. **Edit/Update**: Click existing appointments to modify status or details
7. **Reschedule**: Drag and drop appointments to new time slots

### Patient Management

- **Create Patient**: Can be done independently via the Patients tab or during appointment creation
- **Patient Records**: Stored with complete contact and medical information
- **Patient History**: View all appointments for a specific patient
- **Search & Filter**: Quick patient lookup when scheduling

### Settings Configuration

- **Working Hours**: Defines visible hours in the scheduler (e.g., 8:00 AM - 6:00 PM)
- **Time Slot Duration**: Controls the granularity of available time slots
- **Days Off**: Weekends and holidays are highlighted differently in the calendar
- **Google Integration**: Store OAuth credentials for calendar sync

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── appointments/     # Appointment-related components
│   │   ├── dashboard/        # Main scheduler and calendar views
│   │   ├── layout/           # Sidebar and layout components
│   │   ├── notifications/    # Toast notifications
│   │   ├── patients/         # Patient management components
│   │   ├── settings/         # Settings panels
│   │   └── ui/              # Reusable UI components (shadcn)
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and storage functions
│   ├── pages/               # Page components
│   ├── types/               # TypeScript type definitions
│   └── main.tsx             # Application entry point
├── server/
│   └── index.js             # Express server for Google Calendar API
└── public/
    └── data/                # Sample data files
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Editing

**Option 1: Local IDE**
- Clone the repository
- Make changes in your preferred IDE

**Option 2: GitHub Codespaces**
- Open the repository on GitHub
- Click "Code" > "Codespaces" > "New codespace"
- Edit files directly in the browser

## Deployment

### Backend Deployment

For Google Calendar integration in production:
1. Deploy the Express server (`server/index.js`) to a hosting platform
2. Update the API endpoint in the application code
3. Configure environment variables for OAuth credentials
4. Update Google Cloud Console with production redirect URIs

## Features in Detail

### Weekly Scheduler
- Drag-and-drop rescheduling
- Color-coded appointment status
- Current time indicator (red line)
- Responsive design for all screen sizes
- Custom working hours display

### Appointment Status Colors
- 🟢 **Green**: Completed appointments
- 🔵 **Blue**: Scheduled appointments  
- 🟡 **Yellow**: Follow-up appointments
- 🔴 **Red**: Cancelled appointments
- ⚫ **Gray**: No-show appointments

### Google Calendar Events
- 🔵 **Light Blue**: Google Calendar events (read-only)
- Displayed alongside local appointments
- Click to view event details

## Security Considerations

- **Local Storage**: Sensitive patient data is stored in browser local storage
- **HIPAA Compliance**: For production use, implement proper backend with encryption
- **OAuth Security**: Keep Google OAuth credentials secure
- **Access Control**: Consider implementing user authentication for multi-user scenarios

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Modern mobile browsers

## Troubleshooting

### Google Calendar Not Syncing
1. Check that Client ID and Client Secret are correct
2. Verify redirect URIs match in Google Cloud Console
3. Ensure Google Calendar API is enabled
4. Check browser console for error messages

### Appointments Not Saving
1. Check browser local storage is enabled
2. Clear browser cache and reload
3. Check for JavaScript errors in console

### Server Connection Issues
1. Ensure backend server is running on port 3001
2. Check for CORS configuration in server
3. Verify API endpoints are correct
