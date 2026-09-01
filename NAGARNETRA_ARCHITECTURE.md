# NagarNetra — Technical Architecture Specification

> **Document:** NAGARNETRA_ARCHITECTURE.md
> **Product:** NagarNetra
> **Architecture Reference:** SwachhOS reference implementation
> **Status:** Implementation Source of Truth
> **Frontend:** React + Vite
> **Backend:** Firebase Cloud Functions
> **Database:** Firestore
> **AI:** Google Gemini
> **Maps:** Leaflet + React-Leaflet
> **Geospatial:** H3 + Supercluster
> **Messaging:** Twilio WhatsApp
> **Deployment:** Firebase Hosting

---

# 1. Architecture Philosophy

NagarNetra follows a modular, event-driven civic intelligence architecture.

The system converts:

```text
Citizen Signal
      ↓
Validated Data
      ↓
Geospatial Aggregation
      ↓
AI Intelligence
      ↓
Operational Decision
      ↓
Municipal Action
      ↓
Citizen Verification
```

The architecture must prioritize:

1. Reliability
2. Separation of concerns
3. Security
4. Maintainability
5. Real-time updates
6. Graceful fallback
7. Hackathon demo reliability
8. Production extensibility

---

# 2. System Context

```text
                              ┌───────────────────┐
                              │      CITIZEN      │
                              └─────────┬─────────┘
                                        │
                          ┌─────────────┴─────────────┐
                          │                           │
                       WhatsApp                  Public Web
                          │                           │
                          ▼                           ▼
                       Twilio                Public Dashboard
                          │                           │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                              ┌───────────────────┐
                              │  NAGARNETRA CORE  │
                              └─────────┬─────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
               Firestore             Gemini            Geospatial
                    │                   │                   │
                    └───────────────────┼───────────────────┘
                                        │
                                        ▼
                              ┌───────────────────┐
                              │  ADMIN COMMAND    │
                              │      CENTER       │
                              └─────────┬─────────┘
                                        │
                                        ▼
                               Sanitation Team
                                        │
                                        ▼
                                     Cleanup
                                        │
                                        ▼
                                  Verification
                                        │
                                        ▼
                                    Feedback
```

---

# 3. Architectural Layers

NagarNetra is divided into six logical layers.

```text
┌─────────────────────────────────────────────┐
│  1. EXPERIENCE LAYER                       │
│  Public UI / Admin UI / WhatsApp            │
├─────────────────────────────────────────────┤
│  2. APPLICATION LAYER                      │
│  State / Workflows / Business Logic         │
├─────────────────────────────────────────────┤
│  3. INTELLIGENCE LAYER                     │
│  Gemini / Priority / Validation             │
├─────────────────────────────────────────────┤
│  4. GEOSPATIAL LAYER                       │
│  Leaflet / H3 / Supercluster                │
├─────────────────────────────────────────────┤
│  5. DATA LAYER                             │
│  Firestore / Mock Data                     │
├─────────────────────────────────────────────┤
│  6. INTEGRATION LAYER                      │
│  Firebase Functions / Twilio / Gemini       │
└─────────────────────────────────────────────┘
```

---

# 4. Repository Architecture

```text
NagarNetra/
│
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   │
│   ├── pages/
│   │   ├── PublicDashboard.jsx
│   │   └── AdminPanel.jsx
│   │
│   ├── components/
│   │   ├── ClusterLayer.jsx
│   │   ├── HeatmapLayer.jsx
│   │   ├── HexGridLayer.jsx
│   │   ├── FloatingSearchChat.jsx
│   │   ├── PublicRagChat.jsx
│   │   ├── PublicTopBar.jsx
│   │   ├── SplashScreen.jsx
│   │   ├── TabBar.jsx
│   │   ├── TopBar.jsx
│   │   │
│   │   └── tabs/
│   │       ├── MapTab.jsx
│   │       ├── AnalysisTab.jsx
│   │       ├── CoordinationTab.jsx
│   │       ├── InsightsTab.jsx
│   │       └── FeedbackTab.jsx
│   │
│   ├── services/
│   │   ├── firebase.js
│   │   └── gemini.js
│   │
│   ├── data/
│   │   └── mockData.js
│   │
│   └── assets/
│
├── functions/
│   ├── index.js
│   ├── translations.js
│   ├── package.json
│   └── package-lock.json
│
├── public/
│
├── assets/
│
├── outputs/
│
├── firebase.json
├── firestore.rules
├── .firebaserc
├── vite.config.js
├── package.json
├── package-lock.json
├── migrate.js
├── smoke.js
├── README.md
├── NAGARNETRA_PRD.md
└── NAGARNETRA_ARCHITECTURE.md
```

---

# 5. Frontend Runtime Architecture

```text
index.html
    │
    ▼
main.jsx
    │
    ▼
App.jsx
    │
    ├─────────────────────────┐
    │                         │
    ▼                         ▼
PublicDashboard          AdminPanel
    │                         │
    │                         ├── TopBar
    │                         ├── TabBar
    │                         │
    │                         ├── MapTab
    │                         ├── AnalysisTab
    │                         ├── CoordinationTab
    │                         ├── InsightsTab
    │                         └── FeedbackTab
    │
    ├── PublicTopBar
    ├── FloatingSearchChat
    └── PublicRagChat
```

---

# 6. Application Controller — `App.jsx`

`App.jsx` is the frontend orchestration layer.

It coordinates:

* application initialization
* route/context selection
* Firebase listeners
* mock fallback
* application state
* filters
* team assignments
* feedback
* resolution
* public/admin rendering

It should NOT become a giant business-logic file over time.

If functionality becomes complex, extract it into:

```text
hooks/
services/
utils/
```

rather than continuously increasing `App.jsx`.

---

# 7. Recommended State Model

The application state is conceptually:

```javascript
{
  showSplash: boolean,

  activeTab: string,

  dumpPoints: [],
  reports: [],
  feedbacks: [],

  teams: [],
  teamAssignments: [],

  resolvedOverrides: {},

  timeFilter: string,
  severityFilter: string,
  statusFilter: string,

  resolvingIds: []
}
```

---

# 8. State Ownership

| State         | Owner                     |
| ------------- | ------------------------- |
| Splash state  | App                       |
| Active tab    | App/AdminPanel            |
| Dump points   | App                       |
| Reports       | App                       |
| Feedback      | App                       |
| Teams         | App                       |
| Assignments   | App                       |
| Filters       | App/individual tab        |
| AI result     | Insights/service          |
| Chat history  | Chat component            |
| Map viewport  | Map                       |
| Loading state | Feature component/service |

---

# 9. Data Flow Rule

Data should flow primarily downward.

```text
App
 ↓
Page
 ↓
Component
```

Events should flow upward.

```text
Component
 ↓
callback
 ↓
Page/App
 ↓
state update
```

Avoid unrelated components directly modifying global state.

---

# 10. Firebase Service Architecture

`firebase.js` is responsible for Firebase initialization.

Conceptual interface:

```javascript
initializeFirebase()
getFirestore()
subscribeToDumpPoints()
subscribeToReports()
subscribeToFeedback()
updateDumpPoint()
createReport()
createFeedback()
```

Components should ideally not contain raw Firebase initialization logic.

---

# 11. Firestore Architecture

Primary collections:

```text
firestore
│
├── dumpPoints
├── reports
├── feedback
├── meta
└── whatsapp_sessions
```

---

# 12. `dumpPoints` Collection

A dump point represents an aggregated sanitation problem.

Recommended schema:

```javascript
{
  id: string,

  name: string,

  location: {
    latitude: number,
    longitude: number
  },

  status: "active" | "assigned" | "in_progress" | "resolved",

  severity: "low" | "medium" | "high" | "critical",

  reportCount: number,

  firstReportedAt: timestamp,

  lastReportedAt: timestamp,

  assignedTeamId: string | null,

  aiScore: number | null,

  aiReason: string | null,

  createdAt: timestamp,

  updatedAt: timestamp
}
```

---

# 13. `reports` Collection

A report represents an individual citizen submission.

```javascript
{
  id: string,

  pointId: string | null,

  phoneNumber: string | null,

  location: {
    latitude: number,
    longitude: number
  },

  photoUrl: string | null,

  imageHash: string | null,

  status:
    "pending" |
    "validated" |
    "rejected" |
    "matched" |
    "resolved",

  validation: {
    isValid: boolean,
    reason: string | null
  },

  createdAt: timestamp,

  updatedAt: timestamp
}
```

---

# 14. Privacy Rule for Reports

Phone numbers and other citizen-identifying information must NOT be exposed in:

* public map
* public API
* public AI context
* public dashboard
* client-side logs

Only authorized backend/admin operations may access them.

---

# 15. `feedback` Collection

Recommended schema:

```javascript
{
  id: string,

  pointId: string,

  reportId: string | null,

  rating: number,

  comment: string | null,

  proofPhotoUrl: string | null,

  requiresReinspection: boolean,

  createdAt: timestamp
}
```

Rating:

```text
1–5
```

---

# 16. `whatsapp_sessions`

This is a private backend collection.

```javascript
{
  phoneNumber: string,

  language: "en" | "hi",

  state:
    "START" |
    "WAITING_FOR_PHOTO" |
    "VALIDATING_PHOTO" |
    "WAITING_FOR_LOCATION" |
    "MATCHING_REPORT" |
    "REPORT_CREATED" |
    "TRACKING" |
    "FEEDBACK",

  temporaryData: object,

  updatedAt: timestamp
}
```

This collection must not be publicly readable or writable.

---

# 17. `meta` Collection

Used for public civic context.

Possible schema:

```javascript
{
  wards: [],
  civicInformation: {},
  sanitationGuidelines: [],
  FAQs: [],
  municipality: {}
}
```

Only non-sensitive information belongs here.

---

# 18. Relationships

```text
Citizen
   │
   └── Report
          │
          ▼
      dumpPoint
          │
          ├── Team Assignment
          │
          └── Feedback
```

Relational view:

```text
reports.pointId
       │
       ▼
dumpPoints.id

feedback.pointId
       │
       ▼
dumpPoints.id

teamAssignments.pointId
       │
       ▼
dumpPoints.id
```

---

# 19. Report Aggregation

Multiple reports can map to one dump point.

```text
Report A ─┐
Report B ─┼──> Dump Point #42
Report C ─┘
```

Therefore:

```text
reportCount = 3
```

rather than:

```text
3 independent problems
```

---

# 20. Spatial Matching

When a new report arrives:

```text
New Report
    │
    ▼
Extract latitude/longitude
    │
    ▼
Find nearby active dump points
    │
    ▼
Distance threshold
    │
    ├── Match found
    │      ↓
    │   Existing point
    │
    └── No match
           ↓
       New point
```

The matching threshold should be configurable.

Example:

```javascript
SPATIAL_MATCH_RADIUS_METERS = 100;
```

The exact value should be configurable rather than hard-coded throughout the application.

---

# 21. Image Duplicate Detection

Before creating a new report:

```text
Image
  ↓
Hash
  ↓
Search existing image hashes
  │
  ├── Match → duplicate
  │
  └── No match → continue
```

Image hash should be used as a signal, not the sole identity mechanism.

---

# 22. AI Image Validation

Pipeline:

```text
Photo
  ↓
Gemini Vision
  ↓
Validation
  │
  ├── Valid sanitation issue
  │       ↓
  │    Continue
  │
  └── Invalid
          ↓
       Reject / retry
```

Expected AI result:

```json
{
  "isValid": true,
  "category": "garbage_dump",
  "confidence": 0.92,
  "reason": "Visible accumulation of mixed waste"
}
```

The actual implementation must validate and sanitize the AI response.

---

# 23. AI Priority Engine

Input:

```javascript
{
  id,
  name,
  reportCount,
  daysActive,
  severity,
  location
}
```

AI output:

```javascript
{
  id,
  aiScore,
  aiReason
}
```

Example:

```json
{
  "id": "DP-042",
  "aiScore": 94,
  "aiReason": "High report volume and prolonged unresolved duration."
}
```

---

# 24. AI Priority Architecture

```text
Firestore
    │
    ▼
Active Dump Points
    │
    ▼
Prepare Structured AI Input
    │
    ▼
Gemini
    │
    ▼
Validate JSON
    │
    ▼
Store / Display Result
```

AI should not directly mutate critical operational state without validation.

---

# 25. Priority Model

AI priority is a decision-support signal.

Conceptually:

```text
Priority =
    Report Volume
    +
Persistence
    +
Severity
    +
Spatial Concentration
    +
Context
```

Gemini can interpret these signals.

The application should never claim:

> "AI guarantees this is the most urgent problem."

Instead:

> "AI prioritizes this problem based on available operational signals."

---

# 26. Public AI Assistant

Architecture:

```text
User
 ↓
Question
 ↓
Retrieve relevant civic context
 ↓
Retrieve safe public problem context
 ↓
Build prompt
 ↓
Gemini
 ↓
Validate response
 ↓
Display
```

---

# 27. RAG Context

The assistant may receive:

```text
Question
+
Conversation History
+
Public Civic Metadata
+
Ward Information
+
Current Public Hotspots
+
Sanitation Guidelines
```

Never include:

```text
Phone numbers
Private sessions
Admin credentials
Private internal notes
Sensitive citizen data
```

---

# 28. AI Prompt Architecture

Prompt structure:

```text
SYSTEM INSTRUCTIONS
        +
DOMAIN RULES
        +
AVAILABLE CONTEXT
        +
USER QUESTION
        +
CONVERSATION HISTORY
        ↓
      GEMINI
        ↓
      ANSWER
```

---

# 29. AI Guardrails

The public AI assistant must:

* stay within civic/sanitation topics
* use provided context
* clearly distinguish unavailable information
* avoid inventing live data
* avoid private information
* avoid administrative-only information
* return useful fallback responses

---

# 30. Public Chat State

```javascript
{
  messages: [],
  isLoading: false,
  error: null
}
```

Message:

```javascript
{
  role: "user" | "assistant",
  content: string,
  timestamp: number
}
```

---

# 31. Geospatial Architecture

NagarNetra has four map representations.

```text
                GEOSPATIAL ENGINE
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
    Markers        Clusters          Heatmap
       │               │                │
       └───────────────┼────────────────┘
                       │
                       ▼
                      H3
```

---

# 32. Individual Markers

Each active dump point can be represented as a marker.

Marker data:

```javascript
{
  id,
  latitude,
  longitude,
  severity,
  status,
  reportCount
}
```

---

# 33. Supercluster

Purpose:

Reduce map rendering complexity.

```text
1000 points
    ↓
Supercluster
    ↓
100 clusters
```

As zoom increases:

```text
100 clusters
    ↓
50 clusters
    ↓
individual points
```

---

# 34. Heatmap

Input:

```javascript
[
  [latitude, longitude, intensity],
  ...
]
```

Intensity may incorporate:

```text
reportCount
severity
persistence
```

Heatmap is a visualization, not the source of truth.

---

# 35. H3

H3 converts coordinates into hierarchical hexagonal cells.

```text
latitude
longitude
   ↓
H3 index
   ↓
cell
   ↓
aggregate reports
   ↓
cell intensity
```

Each cell may contain:

```javascript
{
  h3Index,
  reportCount,
  activeProblemCount,
  severityScore
}
```

---

# 36. Map Layer Ordering

Recommended rendering order:

```text
Base Map
   ↓
H3 Layer
   ↓
Heatmap
   ↓
Cluster Layer
   ↓
Selected Marker / Popup
   ↓
UI Controls
```

The exact z-index should ensure markers remain usable above analytical overlays.

---

# 37. Map Filtering

Filters should affect relevant map layers consistently.

```text
Time Filter
Severity Filter
Status Filter
Ward Filter
```

Filtered data:

```text
Raw Data
   ↓
Time Filter
   ↓
Severity Filter
   ↓
Status Filter
   ↓
Geographic Filter
   ↓
Map Layers
```

---

# 38. Admin Command Center Architecture

```text
AdminPanel
│
├── TopBar
│
├── TabBar
│
└── Active Tab
    │
    ├── MapTab
    ├── AnalysisTab
    ├── CoordinationTab
    ├── InsightsTab
    └── FeedbackTab
```

---

# 39. `MapTab`

Responsibilities:

* display active problems
* render map
* display clusters
* display heatmap
* display H3
* support filtering
* inspect problem
* support resolution/assignment actions where appropriate

MapTab should not own Firestore initialization.

---

# 40. `AnalysisTab`

Responsibilities:

* KPI cards
* report trends
* severity distribution
* resolution statistics
* problem duration
* geographic distribution
* operational metrics

Data flow:

```text
Firestore Data
      ↓
Aggregation Functions
      ↓
Analytics Data
      ↓
Charts
```

---

# 41. `CoordinationTab`

Responsibilities:

* display active work
* display unassigned problems
* display teams
* assign team
* update assignment
* display progress
* resolve problem

Workflow:

```text
UNASSIGNED
    ↓
ASSIGNED
    ↓
IN_PROGRESS
    ↓
RESOLVED
```

---

# 42. `InsightsTab`

Responsibilities:

* AI priority list
* AI reasoning
* persistent hotspots
* unusual activity
* operational recommendations

Architecture:

```text
Current Problems
       ↓
AI Service
       ↓
Prioritized Problems
       ↓
Insight Cards
```

---

# 43. `FeedbackTab`

Responsibilities:

* display feedback
* rating distribution
* unresolved complaints
* proof photos
* reinspection flags
* citizen satisfaction

Workflow:

```text
Resolved
   ↓
Feedback
   ↓
Rating
   ↓
Good ─────→ Closed
   │
   └─ Poor → Reinspection
```

---

# 44. Team Architecture

Team:

```javascript
{
  id: string,
  name: string,
  status: "available" | "busy" | "offline",
  members: [],
  currentAssignments: []
}
```

Assignment:

```javascript
{
  id: string,
  pointId: string,
  teamId: string,
  status: "assigned" | "in_progress" | "completed",
  assignedAt: timestamp,
  completedAt: timestamp | null
}
```

---

# 45. Resolution Architecture

```text
Admin
 ↓
Resolve
 ↓
Validate current state
 ↓
Update UI state
 ↓
Update Firestore
 ↓
Find affected reports
 ↓
Trigger citizen notification
 ↓
Request feedback
```

Resolution should be idempotent.

If the same resolution action is accidentally triggered twice, it should not create duplicate notifications or duplicate state transitions.

---

# 46. Feedback Architecture

```text
Resolution
   ↓
Feedback Request
   ↓
Citizen Rating
   ↓
Firestore
   ↓
Feedback Dashboard
```

Poor rating:

```text
rating <= configured threshold
        ↓
requiresReinspection = true
```

---

# 47. WhatsApp Backend Architecture

```text
WhatsApp
   ↓
Twilio
   ↓
Webhook
   ↓
Cloud Function
   ↓
Session
   ↓
Conversation Handler
   ↓
Validation / Matching
   ↓
Firestore
```

---

# 48. WhatsApp Conversation Engine

The conversation engine is a state machine.

```text
START
  │
  ▼
WAITING_FOR_PHOTO
  │
  ▼
VALIDATING_PHOTO
  │
  ├── invalid → WAITING_FOR_PHOTO
  │
  └── valid
       ↓
WAITING_FOR_LOCATION
       ↓
MATCHING_REPORT
       ↓
REPORT_CREATED
       ↓
TRACKING
```

---

# 49. WhatsApp Language

Supported initial languages:

```text
English
Hindi
```

Language should be stored in the session.

```javascript
{
  phoneNumber,
  language: "en"
}
```

Messages should be generated from:

```text
translations.js
```

rather than duplicated throughout backend logic.

---

# 50. WhatsApp Error Handling

Examples:

```text
Invalid image
Invalid location
Duplicate report
Unknown command
Missing session
Twilio error
Gemini error
Firestore error
```

Each must have a user-friendly response.

---

# 51. WhatsApp Feedback Workflow

```text
Admin Resolves
      ↓
Find Citizen Reports
      ↓
Extract Safe Contact
      ↓
Send WhatsApp Message
      ↓
Ask Rating
      ↓
Store Rating
      │
      ├── Good
      │
      └── Poor
           ↓
       Request Photo
           ↓
       Flag Reinspection
```

---

# 52. Cloud Functions Responsibilities

`functions/index.js` should contain backend-only operations such as:

* WhatsApp webhook
* WhatsApp session management
* report creation
* report matching
* AI validation where backend-side
* notifications
* feedback handling
* backend Firestore operations

Frontend-only responsibilities should remain in `src/`.

---

# 53. Backend Security Boundary

```text
                    TRUST BOUNDARY
                         │
Frontend ────────────────┤
                         │
                         ▼
                  Cloud Functions
                         │
                 ┌───────┼────────┐
                 ▼       ▼        ▼
             Firestore Gemini   Twilio
```

Secrets remain behind this boundary.

---

# 54. Environment Architecture

## Frontend

Only public configuration may use:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Remember:

> Any `VITE_*` variable can be exposed to the browser.

Therefore no private secrets should use `VITE_*`.

---

# 55. Backend Secrets

Backend secrets may include:

```text
GEMINI_API_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
```

These must remain server-side.

Preferred mechanisms:

```text
Firebase Secret Manager
Environment configuration
Secure deployment secrets
```

Never commit them to Git.

---

# 56. Configuration Separation

Use:

```text
.env.local
```

for local frontend configuration.

Use secure backend configuration for:

```text
Gemini
Twilio
Firebase Admin
```

Never commit:

```text
.env
.env.local
service-account.json
credentials.json
```

---

# 57. Mock Mode

NagarNetra MUST support mock mode.

```text
                    Firebase Available?
                         │
                 ┌───────┴────────┐
                 │                │
                YES              NO
                 │                │
                 ▼                ▼
             Firestore        mockData.js
                 │                │
                 └───────┬────────┘
                         ▼
                        App
```

---

# 58. Mock Data Requirements

Mock data should include:

* multiple dump points
* multiple reports
* different severity
* different statuses
* duplicate reports
* persistent problems
* teams
* feedback
* AI priority examples
* geographic distribution

The mock dataset must make the dashboard visually convincing.

---

# 59. Data Synchronization

When Firebase is enabled:

```text
Firestore
   ↓
onSnapshot
   ↓
React State
   ↓
Derived Data
   ↓
UI
```

The UI should not require manual refresh.

---

# 60. Optimistic UI

For actions such as:

```text
Assign
Resolve
```

the UI may optimistically update.

However:

```text
Optimistic Update
       ↓
Backend operation
       ↓
Success → retain
Failure → rollback + error
```

Do not permanently mutate state if the backend operation fails.

---

# 61. Error Architecture

All services should return structured errors.

Conceptually:

```javascript
{
  success: false,
  error: {
    code: "FIREBASE_UNAVAILABLE",
    message: "Unable to connect to Firestore."
  }
}
```

Avoid exposing raw backend exceptions to users.

---

# 62. Loading Architecture

Every asynchronous operation should have:

```text
idle
loading
success
error
```

Example:

```text
AI Insights

Loading...
```

then:

```text
AI Insights

3 high-priority zones identified.
```

or:

```text
AI Insights

Unable to analyze at this time.
Using operational fallback.
```

---

# 63. AI Fallback

If Gemini is unavailable:

```text
Gemini
  ↓
FAIL
  ↓
Deterministic scoring
```

Example:

```text
fallbackScore =
  reportCountWeight +
  durationWeight +
  severityWeight
```

The UI should indicate when AI results are unavailable and a fallback was used.

---

# 64. Suggested Deterministic Priority Formula

A simple fallback:

```text
score =
    normalizedReportCount * 0.40
  + normalizedDaysActive  * 0.30
  + normalizedSeverity    * 0.30
```

Result:

```text
0–100
```

This is only a fallback.

AI remains the primary intelligence layer when available.

---

# 65. Data Validation

Every external input must be validated.

Examples:

```text
Latitude
Longitude
Rating
Phone number
Image
AI JSON
Firestore document
Team ID
Point ID
```

Never assume external data is valid.

---

# 66. API Response Validation

AI responses must be treated as untrusted input.

Do not blindly execute or store arbitrary AI output.

Expected schema:

```json
{
  "id": "string",
  "aiScore": "number",
  "aiReason": "string"
}
```

Validate:

```text
id exists
score is numeric
score is within 0–100
reason is a string
```

---

# 67. Component Design Rules

Components should be:

* focused
* reusable
* predictable
* independently testable

Avoid:

```text
One giant component
```

Prefer:

```text
Map
├── ClusterLayer
├── HeatmapLayer
├── HexGridLayer
└── ProblemPopup
```

when complexity requires it.

---

# 68. Service Layer Rules

Components should call:

```text
services/
```

rather than implementing external integrations directly.

Example:

```text
InsightsTab
    ↓
gemini.js
    ↓
Gemini
```

not:

```text
InsightsTab
    ↓
fetch(...)
    ↓
Gemini
```

---

# 69. Utility Layer

If repeated logic emerges, introduce:

```text
src/utils/
```

Potential utilities:

```text
distance.js
formatters.js
priority.js
geo.js
validation.js
```

Do not create utilities prematurely.

---

# 70. Routing Architecture

The application supports public/admin contexts.

Conceptually:

```text
Public
  /
  ↓
PublicDashboard

Admin
  /admin
  ↓
AdminPanel
```

If separate Firebase Hosting targets are used:

```text
Public Host
    ↓
Public Dashboard

Admin Host
    ↓
Admin Dashboard
```

---

# 71. Authentication Architecture

The initial hackathon architecture may use simplified admin access.

Production architecture should introduce:

```text
Firebase Authentication
       ↓
User Identity
       ↓
Role
       ↓
Admin Authorization
```

Roles:

```text
citizen
operator
admin
super_admin
```

---

# 72. Authorization Matrix

| Action                      | Citizen | Operator | Admin |
| --------------------------- | ------: | -------: | ----: |
| View public map             |       ✓ |        ✓ |     ✓ |
| Submit report               |       ✓ |        ✓ |     ✓ |
| View own report             |       ✓ |        ✓ |     ✓ |
| View all reports            |       ✗ |        ✓ |     ✓ |
| Assign team                 |       ✗ |        ✓ |     ✓ |
| Resolve point               |       ✗ |        ✓ |     ✓ |
| View feedback               | Limited |        ✓ |     ✓ |
| Modify system configuration |       ✗ |        ✗ |     ✓ |

---

# 73. Firestore Security Model

Development:

```text
Mock-friendly
```

Hackathon connected mode:

```text
Authenticated admin writes
Public-safe reads
Private sessions protected
```

Production:

```text
Least privilege
Role-based access
Server-side validation
```

---

# 74. Public Data Boundary

The public dashboard should only receive fields necessary for public display.

Example public dump point:

```javascript
{
  id,
  name,
  location,
  status,
  severity,
  reportCount
}
```

Not:

```javascript
{
  phoneNumber,
  privateNotes,
  internalAdminData
}
```

---

# 75. Logging

Development logging may include:

```text
Firebase connection
AI request status
Map processing
Backend workflow
```

Production logs must NOT include:

```text
phone numbers
API keys
tokens
private citizen data
```

---

# 76. Performance Architecture

Primary performance risks:

1. Map rendering
2. Firestore listeners
3. AI requests
4. Large report collections
5. Repeated calculations

Solutions:

```text
Supercluster
Memoization
Lazy loading
Aggregation
Pagination
Firestore query constraints
Debounced search
```

---

# 77. AI Cost Control

Do not call Gemini on every UI render.

Bad:

```text
React render
 ↓
Gemini request
```

Good:

```text
User action / controlled refresh
 ↓
Gemini request
 ↓
Cache result
```

AI priority results should be cached for a reasonable period.

---

# 78. Map Performance

Avoid:

```text
10,000 React markers
```

Prefer:

```text
10,000 raw reports
      ↓
aggregation
      ↓
clusters / H3 / heatmap
```

Only display individual markers at appropriate zoom levels.

---

# 79. Firestore Performance

Avoid downloading entire collections unnecessarily.

Prefer:

```text
query
+
filter
+
limit
+
indexes
```

where appropriate.

---

# 80. Real-Time Strategy

Realtime listeners should be used for data that benefits from immediate updates:

```text
dumpPoints
reports
feedback
```

Heavy historical analytics should eventually use:

```text
aggregated data
```

rather than continuously processing the entire raw dataset.

---

# 81. Analytics Pipeline

```text
Reports
   ↓
Aggregation
   ↓
Metrics
   ↓
Charts
```

Example:

```text
1000 reports
   ↓
200 active points
   ↓
40 high-priority
   ↓
25 resolved
```

---

# 82. Derived Metrics

Examples:

```text
resolutionRate =
resolvedPoints / totalPoints
```

```text
averageReportsPerPoint =
totalReports / totalPoints
```

```text
reinspectionRate =
reinspectionCases / resolvedCases
```

```text
citizenSatisfaction =
averageFeedbackRating
```

---

# 83. Event Model

Important events:

```text
REPORT_CREATED
REPORT_VALIDATED
REPORT_REJECTED
REPORT_MATCHED
POINT_CREATED
POINT_UPDATED
TEAM_ASSIGNED
WORK_STARTED
POINT_RESOLVED
FEEDBACK_REQUESTED
FEEDBACK_RECEIVED
REINSPECTION_REQUIRED
```

These events form the conceptual business lifecycle.

---

# 84. Problem Lifecycle

```text
NEW
 ↓
VALIDATED
 ↓
ACTIVE
 ↓
PRIORITIZED
 ↓
ASSIGNED
 ↓
IN_PROGRESS
 ↓
RESOLVED
 ↓
VERIFIED
```

Failure path:

```text
VERIFIED
   ↓
FAILED_VERIFICATION
   ↓
REINSPECTION
   ↓
IN_PROGRESS
```

---

# 85. Report Lifecycle

```text
SUBMITTED
   ↓
VALIDATING
   ↓
VALIDATED
   ↓
MATCHED
   ↓
ACTIVE
   ↓
RESOLVED
```

Invalid:

```text
SUBMITTED
   ↓
REJECTED
```

Duplicate:

```text
SUBMITTED
   ↓
DUPLICATE
```

---

# 86. Team Lifecycle

```text
AVAILABLE
   ↓
ASSIGNED
   ↓
BUSY
   ↓
AVAILABLE
```

---

# 87. Feedback Lifecycle

```text
REQUESTED
   ↓
RECEIVED
   │
   ├── SATISFIED
   │
   └── UNSATISFIED
          ↓
      REINSPECTION
```

---

# 88. End-to-End Sequence

```text
Citizen
  │
  │ Photo + Location
  ▼
Twilio
  │
  ▼
Cloud Function
  │
  ├── Validate session
  ├── Validate photo
  ├── Hash image
  ├── Check duplicate
  ├── Check spatial match
  │
  ▼
Firestore
  │
  ▼
dumpPoint updated
  │
  ▼
Realtime listener
  │
  ▼
Admin Map
  │
  ▼
AI Priority
  │
  ▼
Admin
  │
  ▼
Assign Team
  │
  ▼
Cleanup
  │
  ▼
Resolve
  │
  ▼
WhatsApp
  │
  ▼
Citizen
  │
  ▼
Rating
  │
  ├── Good → Close
  │
  └── Poor → Proof → Reinspection
```

---

# 89. Failure Scenarios

## Firebase unavailable

```text
Firebase failure
 ↓
Mock mode
 ↓
UI remains operational
```

## Gemini unavailable

```text
Gemini failure
 ↓
Fallback priority algorithm
 ↓
UI remains operational
```

## Twilio unavailable

```text
Twilio failure
 ↓
Admin dashboard remains operational
 ↓
Notification marked failed
```

## Invalid AI response

```text
AI response
 ↓
Schema validation
 ↓
Invalid
 ↓
Fallback
```

---

# 90. Deployment Architecture

```text
                         Firebase
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
          Hosting        Firestore      Functions
             │              │              │
             │              │         ┌────┴────┐
             │              │         ▼         ▼
             │              │      Gemini     Twilio
             │              │                   │
             ▼              ▼                   ▼
          React UI       Data              WhatsApp
```

---

# 91. Firebase Hosting

Potential targets:

```text
public
admin
```

Both may serve the same compiled application with different context/routing.

---

# 92. Build Pipeline

```text
Source
  ↓
npm install
  ↓
npm run build
  ↓
dist/
  ↓
Firebase Hosting
```

---

# 93. Development Workflow

```text
Antigravity IDE
      ↓
Modify
      ↓
npm run dev
      ↓
Browser
      ↓
Test
      ↓
Fix
      ↓
Commit
```

---

# 94. Antigravity Rules

Before modifying any code, the coding agent MUST:

1. Read `NAGARNETRA_PRD.md`.
2. Read `NAGARNETRA_ARCHITECTURE.md`.
3. Inspect relevant existing files.
4. Identify dependencies.
5. Make the smallest reasonable change.
6. Preserve working behavior.
7. Run tests/build where applicable.
8. Report changed files.
9. Report remaining issues.

---

# 95. No Blind Rewrites

The agent must NOT:

* replace the entire architecture
* introduce a new framework without approval
* remove Firebase
* remove Gemini
* remove mock mode
* remove map layers
* rewrite all components unnecessarily
* create duplicate components
* hard-code credentials

---

# 96. Dependency Policy

Before adding a dependency:

```text
Is it already installed?
        │
       YES
        ↓
Use existing dependency.

       NO
        ↓
Is it necessary?
        │
       YES
        ↓
Add dependency with justification.
```

Avoid dependency bloat.

---

# 97. Code Quality

Prefer:

```text
clear names
small functions
single responsibility
early returns
validated inputs
consistent error handling
```

Avoid:

```text
deep nesting
duplicated logic
magic numbers
hard-coded credentials
unexplained side effects
```

---

# 98. Configuration Constants

Important configurable values should live in one location.

Examples:

```javascript
SPATIAL_MATCH_RADIUS_METERS
AI_PRIORITY_REFRESH_INTERVAL
FEEDBACK_REINSPECTION_THRESHOLD
MAP_DEFAULT_ZOOM
MAP_DEFAULT_CENTER
```

Avoid scattering these values throughout the codebase.

---

# 99. Recommended Future Directory Expansion

As complexity grows:

```text
src/
├── components/
├── pages/
├── services/
├── hooks/
├── utils/
├── constants/
├── types/
└── data/
```

Do not create these folders until they solve a real organization problem.

---

# 100. Security Checklist

Before deployment:

```text
[ ] No API keys in Git
[ ] No Twilio secrets in frontend
[ ] No Gemini private key in frontend
[ ] No service-account JSON committed
[ ] WhatsApp sessions private
[ ] Citizen phone numbers protected
[ ] Public API exposes only safe fields
[ ] Admin writes protected
[ ] Input validation enabled
[ ] AI output validated
```

---

# 101. Observability Checklist

The deployed system should eventually monitor:

```text
Firebase errors
Cloud Function errors
Gemini failures
Twilio failures
Report creation failures
AI validation failures
Firestore permission errors
```

---

# 102. Testing Architecture

## Unit Tests

Test:

```text
distance calculation
filtering
priority fallback
data aggregation
validation
```

## Integration Tests

Test:

```text
report → Firestore
resolve → feedback
assignment → status
```

## UI Tests

Test:

```text
map
tabs
filters
chat
resolution
feedback
```

---

# 103. Hackathon Test Dataset

The demo dataset should intentionally include:

```text
1 critical persistent hotspot
2 high-priority hotspots
Several medium problems
Several low problems
Resolved cases
Poor-feedback case
Multiple reports at same location
Different geographic clusters
```

This ensures every major feature can be demonstrated.

---

# 104. Demo Reliability Mode

Before the hackathon presentation:

```text
Enable:
Mock data
Cached AI results
Fallback scoring
Stable map data
```

External integrations should be demonstrated live only when they have been tested immediately beforehand.

---

# 105. Performance Targets

For the hackathon build:

```text
Initial UI render: fast enough for demo
Map interaction: smooth
Tab switching: responsive
AI response: visible loading state
Firestore updates: near real-time
No critical console errors
```

Exact performance benchmarks can be added after profiling.

---

# 106. Accessibility

Required:

```text
semantic buttons
keyboard interaction
visible focus
readable contrast
ARIA labels where needed
alt text for meaningful images
```

---

# 107. Responsive Architecture

Public:

```text
Mobile
Tablet
Desktop
```

Admin:

```text
Desktop
Tablet
Mobile fallback
```

Map interactions must remain usable on touch devices.

---

# 108. Design System

NagarNetra should maintain a consistent visual language.

Core primitives:

```text
Button
Card
Badge
Input
Dropdown
Modal
Tooltip
StatCard
ChartCard
MapControl
StatusIndicator
```

---

# 109. Status Semantics

Use consistent semantic states.

```text
ACTIVE
ASSIGNED
IN_PROGRESS
RESOLVED
REINSPECTION
```

The visual treatment should consistently communicate these states across:

```text
map
cards
tables
analytics
feedback
```

---

# 110. Information Hierarchy

Every admin screen should answer:

```text
WHAT?
WHERE?
HOW BAD?
WHY?
WHO?
WHAT NEXT?
```

Example:

```text
Problem
 ↓
Location
 ↓
Severity
 ↓
AI Reason
 ↓
Assigned Team
 ↓
Current Status
```

---

# 111. Public Information Hierarchy

Public interface should answer:

```text
What is happening?
Where?
How can I report?
Can I ask something?
What happened to my report?
```

---

# 112. Data Ownership

| Data           | System of Record                               |
| -------------- | ---------------------------------------------- |
| Reports        | Firestore                                      |
| Dump Points    | Firestore                                      |
| Feedback       | Firestore                                      |
| Sessions       | Firestore                                      |
| Civic metadata | Firestore                                      |
| Mock data      | `mockData.js`                                  |
| AI response    | Gemini + application storage where appropriate |
| UI state       | React                                          |
| Map viewport   | React/component state                          |

---

# 113. Source of Truth Principle

Firestore is the source of truth for connected mode.

React state is a representation/cache of that data.

```text
Firestore
    ↓
React
    ↓
UI
```

Do not allow the browser's local state to silently become the permanent source of truth.

---

# 114. AI Source of Truth Principle

Gemini is NOT the source of truth.

Gemini is:

```text
Decision Support
```

The authoritative data comes from:

```text
Firestore
```

AI interprets available data.

---

# 115. Geospatial Source of Truth

Raw geographic coordinates belong to:

```text
reports
dumpPoints
```

Derived layers:

```text
H3
clusters
heatmap
```

are generated views.

They should be reproducible from source data.

---

# 116. Architectural Invariants

The following must remain true:

### Invariant 1

Every community problem has a stable ID.

### Invariant 2

Every report can be traced to a problem when matched.

### Invariant 3

Private citizen information never reaches public UI.

### Invariant 4

AI failure does not crash the application.

### Invariant 5

Firebase failure does not make the hackathon demo unusable.

### Invariant 6

A resolved problem can be reopened through verification/reinspection.

### Invariant 7

Map visualizations are derived from source data.

### Invariant 8

Secrets never enter frontend source code.

---

# 117. Architecture Decision Records

Important architectural changes should be documented.

Example:

```text
ADR-001: Use Firestore as primary operational database
ADR-002: Use H3 for geographic aggregation
ADR-003: Use Supercluster for map rendering
ADR-004: Use Gemini for decision support
ADR-005: Maintain mock-data fallback
ADR-006: Use Cloud Functions for sensitive integrations
```

---

# 118. Implementation Order

The recommended order is:

```text
01 Repository baseline
02 Branding
03 Design system
04 Mock data
05 Map
06 Admin shell
07 Analysis
08 Coordination
09 Feedback
10 AI
11 Firebase
12 Cloud Functions
13 WhatsApp
14 Security
15 Deployment
16 Hackathon polish
```

---

# 119. Definition of Architectural Completion

The architecture is considered implemented when:

```text
Frontend
    ↓
Service layer
    ↓
Firebase
    ↓
Cloud Functions
    ↓
Gemini / Twilio
```

all communicate through defined boundaries.

No major component should bypass these boundaries unnecessarily.

---

# 120. Final Architecture

```text
                           NAGARNETRA
                               │
             ┌─────────────────┴──────────────────┐
             │                                    │
          PUBLIC                              ADMIN
             │                                    │
     ┌───────┴────────┐              ┌────────────┴───────────┐
     │                │              │                        │
    MAP              AI             MAP                    ANALYSIS
     │                │              │                        │
     │                │              COORDINATION             │
     │                │              INSIGHTS                 │
     │                │              FEEDBACK                 │
     └───────┬────────┘              └────────────┬───────────┘
             │                                    │
             └────────────────┬───────────────────┘
                              │
                         APPLICATION
                              │
             ┌────────────────┼─────────────────┐
             │                │                 │
             ▼                ▼                 ▼
         FIREBASE           GEMINI          GEOSPATIAL
             │                │                 │
             ▼                │          ┌──────┼──────┐
        FIRESTORE             │          ▼      ▼      ▼
             │                │       Leaflet  H3  Supercluster
             ▼                │
      CLOUD FUNCTIONS ◄───────┘
             │
        ┌────┴─────┐
        ▼          ▼
      TWILIO    Backend
        │        Logic
        ▼
     WhatsApp
        │
        ▼
     CITIZEN
        │
        ▼
     FEEDBACK
        │
        └──────────────────────→ FIRESTORE
```

---

# 121. Final Architectural Principle

NagarNetra should be understood as a **closed-loop civic operating system**:

```text
SENSE
  ↓
UNDERSTAND
  ↓
AGGREGATE
  ↓
PRIORITIZE
  ↓
ACT
  ↓
VERIFY
  ↓
LEARN
  ↓
SENSE AGAIN
```

The platform combines:

```text
Citizen Participation
+
AI
+
Geospatial Intelligence
+
Real-Time Data
+
Municipal Operations
+
Accountability
```

This architecture must guide all implementation decisions made inside Google Antigravity IDE.
