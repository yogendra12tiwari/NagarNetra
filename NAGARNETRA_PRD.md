# NagarNetra — Product Requirements Document

> **Project:** NagarNetra
> **Former Reference Project:** SwachhOS
> **Product Type:** AI-powered Civic Sanitation Intelligence & Operations Platform
> **Primary Users:** Citizens, Municipal Administrators, Sanitation Teams
> **Development Environment:** Google Antigravity IDE
> **Frontend:** React + Vite
> **Backend:** Firebase + Cloud Functions
> **Database:** Firestore
> **AI:** Google Gemini
> **Geospatial:** Leaflet + H3 + Supercluster
> **Communication:** WhatsApp via Twilio
> **Deployment:** Firebase Hosting
> **Document Status:** Master implementation specification

---

# 1. Executive Summary

## 1.1 Product Vision

**NagarNetra** is an AI-powered civic sanitation intelligence platform designed to transform the way urban waste and sanitation complaints are reported, analyzed, prioritized, resolved, and verified.

The system connects:

```text
Citizen
   ↓
Report
   ↓
AI Validation
   ↓
Location Intelligence
   ↓
Duplicate / Community Detection
   ↓
Live Civic Database
   ↓
Geospatial Intelligence
   ↓
AI Priority Analysis
   ↓
Municipal Team Assignment
   ↓
Cleanup
   ↓
Citizen Verification
   ↓
Feedback
   ↓
Reinspection if required
```

The fundamental principle is:

> **A complaint should not disappear after submission. It should become an actionable operational case with measurable resolution and citizen-verified closure.**

---

# 2. Problem Statement

Urban sanitation systems frequently suffer from:

* fragmented complaint channels
* duplicate complaints
* lack of geographic prioritization
* delayed response
* poor visibility into active sanitation problems
* limited coordination between sanitation teams
* lack of evidence that a reported problem was actually resolved
* citizens not knowing the status of their complaint
* difficulty identifying persistent hotspots
* lack of data-driven allocation of municipal resources

Traditional complaint systems often follow:

```text
Citizen Complaint
      ↓
Ticket Created
      ↓
Unknown Status
```

NagarNetra changes this to:

```text
Citizen Report
      ↓
AI Validation
      ↓
Spatial Aggregation
      ↓
Priority Analysis
      ↓
Operational Assignment
      ↓
Resolution
      ↓
Citizen Verification
      ↓
Accountability
```

---

# 3. Product Goals

## 3.1 Primary Goals

NagarNetra must:

1. Allow citizens to report sanitation problems easily.
2. Support photo-based reporting.
3. Capture geographic location.
4. Validate submitted images using AI.
5. Detect duplicate or nearby reports.
6. Aggregate multiple citizen reports into community-level problems.
7. Display sanitation problems on an interactive map.
8. Provide clustering, heatmap, and H3-based geographic analysis.
9. Calculate operational metrics.
10. Use AI to identify high-priority sanitation zones.
11. Allow administrators to assign sanitation teams.
12. Allow administrators to resolve sanitation cases.
13. Notify citizens after resolution.
14. Collect citizen feedback.
15. Request proof when citizens report poor resolution.
16. Support reinspection workflows.
17. Provide a public-facing sanitation intelligence interface.
18. Provide an administrative command center.
19. Continue working with mock data when external services are unavailable.

---

# 4. Non-Goals

The initial hackathon version does NOT need to implement:

* a full municipal ERP
* payroll management
* employee attendance
* vehicle GPS tracking
* financial accounting
* city-wide IoT sensor infrastructure
* advanced predictive epidemiology
* complex authentication infrastructure
* nationwide deployment
* production-scale distributed architecture

These may become future extensions.

---

# 5. Target Users

## 5.1 Citizens

Citizens should be able to:

* report garbage
* submit photographs
* provide location
* check existing problems
* ask civic questions
* receive resolution notifications
* provide ratings
* report incomplete cleanup

---

## 5.2 Municipal Administrators

Administrators should be able to:

* see active sanitation problems
* inspect the city map
* identify hotspots
* filter problems
* analyze trends
* view AI priorities
* assign teams
* resolve problems
* monitor feedback
* identify recurring problems

---

## 5.3 Sanitation Teams

Teams are operational units responsible for:

* receiving assigned cases
* visiting locations
* cleaning reported areas
* completing assigned work

The hackathon UI can represent teams as data entities without requiring a separate team mobile application.

---

# 6. Product Architecture

```text
                         ┌──────────────────────────┐
                         │        CITIZENS          │
                         │                          │
                         │ WhatsApp / Public Web UI │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │       INGESTION          │
                         │                          │
                         │ Photo + Location + Text  │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │       AI VALIDATION      │
                         │                          │
                         │ Gemini Vision            │
                         │ Image validation         │
                         │ Duplicate detection      │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │    GEOSPATIAL ENGINE     │
                         │                          │
                         │ Location matching        │
                         │ H3                      │
                         │ Supercluster             │
                         │ Heatmap                  │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │       FIRESTORE          │
                         │                          │
                         │ Reports                  │
                         │ Dump Points              │
                         │ Feedback                 │
                         │ Metadata                 │
                         │ Sessions                 │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │         NAGARNETRA COMMAND CENTER      │
                  │                                        │
                  │ Map │ Analysis │ Coordination           │
                  │ Insights │ Feedback                    │
                  └────────────────────┬───────────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ SANITATION TEAM │
                              └────────┬────────┘
                                       │
                                  Cleanup
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ CITIZEN         │
                              │ VERIFICATION    │
                              └────────┬────────┘
                                       │
                                  Feedback
                                       │
                         ┌─────────────┴─────────────┐
                         │                           │
                       Good                       Poor
                         │                           │
                         ▼                           ▼
                     Resolved                 Proof Required
                                                     │
                                                     ▼
                                                Reinspection
```

---

# 7. High-Level Technical Architecture

```text
                    ┌───────────────────────┐
                    │       Browser         │
                    └───────────┬───────────┘
                                │
                         React Application
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
       Public Dashboard    Admin Dashboard     AI Interface
             │                  │                  │
             └──────────────────┼──────────────────┘
                                │
                         Service Layer
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
        Firebase.js        Gemini.js        Geospatial
             │                  │                  │
             ▼                  ▼                  ▼
        Firestore          Gemini API       Leaflet/H3
             │
             ▼
       Cloud Functions
             │
        ┌────┴────┐
        │         │
        ▼         ▼
      Twilio   Backend Logic
        │
        ▼
    WhatsApp
```

---

# 8. Frontend Architecture

The frontend is a React/Vite single-page application.

```text
src/
│
├── main.jsx
│
├── App.jsx
│
├── pages/
│   ├── PublicDashboard.jsx
│   └── AdminPanel.jsx
│
├── components/
│   ├── ClusterLayer.jsx
│   ├── HeatmapLayer.jsx
│   ├── HexGridLayer.jsx
│   ├── FloatingSearchChat.jsx
│   ├── PublicRagChat.jsx
│   ├── PublicTopBar.jsx
│   ├── SplashScreen.jsx
│   ├── TabBar.jsx
│   ├── TopBar.jsx
│   │
│   └── tabs/
│       ├── MapTab.jsx
│       ├── AnalysisTab.jsx
│       ├── CoordinationTab.jsx
│       ├── InsightsTab.jsx
│       └── FeedbackTab.jsx
│
├── data/
│   └── mockData.js
│
├── services/
│   ├── firebase.js
│   └── gemini.js
│
├── App.css
└── index.css
```

---

# 9. Application Entry Flow

```text
index.html
    ↓
main.jsx
    ↓
App.jsx
    ↓
Application initialization
    ↓
Firebase availability check
    ↓
Load mock data / Firestore data
    ↓
Determine public/admin context
    ↓
Render appropriate interface
```

---

# 10. `App.jsx` Responsibilities

`App.jsx` acts as the central application controller.

It owns or coordinates:

* application initialization
* splash state
* active tab
* reports
* dump points
* filters
* feedback
* teams
* team assignments
* resolution state
* Firebase listeners
* resolution actions
* public/admin routing

Conceptually:

```text
                 App.jsx
                    │
       ┌────────────┼─────────────┐
       │            │             │
       ▼            ▼             ▼
     Data         State        Actions
       │            │             │
       └────────────┼─────────────┘
                    ▼
                  Pages
                    │
             ┌──────┴──────┐
             ▼             ▼
          Public          Admin
```

---

# 11. State Management

The application should maintain the following conceptual state:

```javascript
{
  showSplash,
  activeTab,

  dumpPoints,
  reports,
  feedbacks,

  teams,
  teamAssignments,

  resolvedOverrides,

  timeFilter,
  severityFilter,

  resolvingIds
}
```

The exact implementation may use React state/hooks.

Do not introduce Redux unless there is a demonstrated need.

---

# 12. Public Dashboard

## Purpose

Provide a simplified citizen-facing view.

The public dashboard should prioritize:

* map visibility
* active sanitation issues
* search
* AI assistant
* simple navigation
* civic information

It should NOT expose administrative complexity.

---

# 13. Public Dashboard Architecture

```text
PublicDashboard
│
├── PublicTopBar
│
├── Interactive Map
│   ├── Cluster Layer
│   ├── Heatmap Layer
│   └── H3 Layer
│
├── FloatingSearchChat
│
└── PublicRagChat
```

---

# 14. Public Map Requirements

The public map must:

* display active sanitation problems
* display geographic positions
* allow zooming
* support clustering
* allow inspection of a problem
* provide visual severity information
* work with mock data
* support Firestore data when configured

---

# 15. Admin Command Center

The admin dashboard is the core operational interface.

It should contain five primary tabs:

```text
MAP
ANALYSIS
COORDINATION
INSIGHTS
FEEDBACK
```

---

# 16. Admin Layout

```text
┌─────────────────────────────────────────────────────┐
│                    TOP BAR                          │
├─────────────────────────────────────────────────────┤
│ MAP │ ANALYSIS │ COORDINATION │ INSIGHTS │ FEEDBACK│
├─────────────────────────────────────────────────────┤
│                                                     │
│                ACTIVE TAB CONTENT                   │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

# 17. Map Module

## Purpose

The Map module provides geographic situational awareness.

## Required capabilities

* individual problem markers
* marker clustering
* heatmap
* H3 hexagonal grid
* problem details
* severity representation
* status representation
* filters
* zoom controls
* geographic aggregation

---

# 18. Map Architecture

```text
                    MapTab
                      │
          ┌───────────┼────────────┐
          │           │            │
          ▼           ▼            ▼
      Clusters     Heatmap        H3
          │           │            │
          └───────────┼────────────┘
                      │
                      ▼
                   Leaflet
                      │
                      ▼
                 Map Display
```

---

# 19. Cluster Layer

## Component

`ClusterLayer.jsx`

## Purpose

Prevent map overload when many reports exist in a small geographic area.

Input:

```text
latitude
longitude
problem metadata
```

Processing:

```text
Individual points
       ↓
Supercluster
       ↓
Clusters
       ↓
Map
```

When zoom increases:

```text
Cluster
   ↓
Smaller cluster
   ↓
Individual markers
```

---

# 20. Heatmap Layer

## Component

`HeatmapLayer.jsx`

Purpose:

Visualize density.

Input:

```text
latitude
longitude
intensity
```

Output:

```text
High-density zones
Medium-density zones
Low-density zones
```

Heatmap answers:

> Where are sanitation problems concentrated?

---

# 21. H3 Hex Grid

## Component

`HexGridLayer.jsx`

H3 provides hierarchical geographic indexing.

Flow:

```text
Latitude / Longitude
        ↓
H3 Cell
        ↓
Aggregate reports
        ↓
Calculate cell intensity
        ↓
Render hexagon
```

The H3 view answers:

> Which geographic zones are experiencing the highest concentration of problems?

---

# 22. Analysis Module

## Component

`AnalysisTab.jsx`

Purpose:

Convert raw sanitation data into operational metrics.

Possible metrics:

* total reports
* active problems
* resolved problems
* new reports
* average problem duration
* high-severity problems
* resolution rate
* citizen satisfaction
* recurring problem count
* geographic concentration
* trend over time

---

# 23. Analysis Model

```text
Raw Reports
    ↓
Aggregation
    ↓
Metrics
    ↓
Charts
    ↓
Operational Interpretation
```

Example:

```text
500 Reports
   ↓
120 Community Problems
   ↓
30 High-Priority Problems
   ↓
12 Unresolved Critical Problems
```

---

# 24. Coordination Module

## Component

`CoordinationTab.jsx`

Purpose:

Convert identified problems into operational work.

Flow:

```text
Problem
   ↓
Priority
   ↓
Select Team
   ↓
Assignment
   ↓
Cleanup
   ↓
Resolve
```

---

# 25. Team Model

A team should conceptually contain:

```javascript
{
  id,
  name,
  members,
  status,
  currentAssignments,
  location
}
```

Example:

```text
Team A
Team B
Team C
Team D
```

The exact demo data can be adjusted.

---

# 26. Assignment Model

```javascript
{
  problemId,
  teamId,
  assignedAt,
  status
}
```

Statuses:

```text
UNASSIGNED
ASSIGNED
IN_PROGRESS
RESOLVED
```

---

# 27. Resolution Workflow

When an administrator selects Resolve:

```text
Resolve clicked
      ↓
Validate problem
      ↓
Mark resolving
      ↓
Update UI
      ↓
Update Firestore if available
      ↓
Find related citizen reports
      ↓
Identify citizen contacts
      ↓
Trigger feedback process
      ↓
Problem becomes resolved
```

The UI must immediately reflect the new state while backend operations occur.

---

# 28. Insights Module

## Component

`InsightsTab.jsx`

Purpose:

Provide AI-assisted operational intelligence.

The system should identify:

* highest-priority problems
* persistent sanitation issues
* unusual spikes
* areas with repeated reports
* problems requiring immediate intervention

---

# 29. AI Priority Engine

The AI receives structured information such as:

```text
Problem ID
Problem name
Report count
Days active
Severity
Location/context
```

Gemini returns:

```text
AI score
AI reason
```

Conceptually:

```text
                     Problem Data
                          │
                          ▼
                       Gemini
                          │
               ┌──────────┴──────────┐
               ▼                     ▼
         Priority Score         Explanation
               │                     │
               └──────────┬──────────┘
                          ▼
                    Admin Insight
```

---

# 30. Priority Score

The AI score should NOT be treated as an unquestionable truth.

It is a decision-support signal.

The dashboard should communicate:

```text
AI Priority
+
Reason
```

rather than simply:

```text
AI says this is urgent.
```

---

# 31. Public AI Assistant

## Component

`PublicRagChat.jsx`

The public assistant should answer civic/sanitation-related questions using contextual information.

Possible questions:

```text
Where are major garbage hotspots?
What sanitation problems are active?
How do I report garbage?
Has a reported issue been resolved?
What should I do if garbage is not collected?
```

---

# 32. RAG Context

The AI assistant should receive relevant context.

```text
User Question
      +
Conversation History
      +
Civic Metadata
      +
Ward Information
      +
Current Problems
      +
Sanitation Information
      ↓
Gemini
      ↓
Grounded Answer
```

The assistant should avoid pretending to know information that isn't available in the supplied context.

---

# 33. AI Guardrails

The public assistant should:

* stay within civic/sanitation topics
* avoid hallucinating municipal policies
* distinguish live data from general guidance
* not expose private citizen information
* not expose internal administrative information
* avoid returning sensitive Firestore data
* provide useful fallback responses when AI is unavailable

---

# 34. Citizen Reporting

Citizen reports may originate through:

1. WhatsApp
2. Public interface
3. Future mobile applications

The primary hackathon workflow should emphasize WhatsApp.

---

# 35. WhatsApp Architecture

```text
Citizen
   │
   ▼
WhatsApp
   │
   ▼
Twilio
   │
   ▼
Firebase Cloud Function
   │
   ▼
Conversation State Machine
   │
   ├── Photo
   ├── Location
   ├── Validation
   ├── Duplicate Detection
   └── Report Creation
   │
   ▼
Firestore
```

---

# 36. WhatsApp Conversation State Machine

Conceptual states:

```text
START
  ↓
WAITING_FOR_PHOTO
  ↓
VALIDATING_PHOTO
  ↓
WAITING_FOR_LOCATION
  ↓
MATCHING_REPORT
  ↓
REPORT_CREATED
  ↓
TRACKING
```

Each user/session should maintain its current conversational state.

---

# 37. Image Validation

Submitted images should be analyzed by AI.

Flow:

```text
Photo
 ↓
Gemini Vision
 ↓
Is sanitation/waste problem?
 ├── YES
 │    ↓
 │  Continue
 │
 └── NO
      ↓
 Ask user for appropriate image
```

The system should avoid accepting obviously irrelevant images.

---

# 38. Image Duplicate Detection

The system should calculate an image hash.

```text
Image
 ↓
Hash
 ↓
Compare with previous submissions
 ├── Match → duplicate
 └── New   → continue
```

This reduces repeated submissions of the exact same image.

---

# 39. Spatial Duplicate Detection

Image duplication is not enough.

Different citizens may photograph the same garbage pile.

Therefore:

```text
Report A ──┐
Report B ──┼── Nearby geographic location
Report C ──┘
             ↓
       Spatial Matching
             ↓
      Existing Problem
             ↓
     report_count += 1
```

This creates a community-level problem.

---

# 40. Community Problem Model

A `dumpPoint` represents an aggregated sanitation issue.

Example:

```javascript
{
  id,
  name,
  latitude,
  longitude,
  status,
  severity,
  reportCount,
  firstReportedAt,
  lastReportedAt
}
```

Multiple reports can point to one dump point.

---

# 41. Report Model

A report represents an individual citizen submission.

Conceptually:

```javascript
{
  id,
  phoneNumber,
  timestamp,
  latitude,
  longitude,
  photoUrl,
  imageHash,
  matchedPointId,
  status
}
```

Private information must never be displayed publicly.

---

# 42. Feedback System

After cleanup:

```text
Admin resolves
      ↓
Citizen notification
      ↓
Feedback request
      ↓
Citizen rating
```

Rating scale:

```text
1 ⭐
2 ⭐
3 ⭐
4 ⭐
5 ⭐
```

---

# 43. Poor Resolution Workflow

If a citizen reports that the cleanup was inadequate:

```text
Low rating
    ↓
Ask for proof
    ↓
Citizen submits photo
    ↓
Feedback stored
    ↓
Case flagged
    ↓
Reinspection
```

This prevents false closure.

---

# 44. Accountability Loop

The complete accountability loop is:

```text
REPORT
  ↓
PRIORITIZE
  ↓
ASSIGN
  ↓
CLEAN
  ↓
RESOLVE
  ↓
VERIFY
  ↓
FEEDBACK
  ↓
REINSPECT IF NEEDED
```

This is one of the primary product differentiators.

---

# 45. Firestore Architecture

Primary collections:

```text
Firestore
│
├── dumpPoints
├── reports
├── feedback
├── meta
└── whatsapp_sessions
```

---

# 46. `dumpPoints`

Purpose:

Store aggregated sanitation problems.

Example:

```javascript
{
  id,
  name,
  location,
  status,
  severity,
  reportCount,
  daysActive,
  firstReported,
  lastReported
}
```

---

# 47. `reports`

Purpose:

Store individual citizen submissions.

Relationships:

```text
Report
  │
  └── matchedPointId
          ↓
      dumpPoint
```

---

# 48. `feedback`

Purpose:

Store citizen verification.

Conceptually:

```javascript
{
  id,
  reportId,
  pointId,
  rating,
  comment,
  proofPhoto,
  createdAt
}
```

---

# 49. `whatsapp_sessions`

Purpose:

Maintain conversational state.

This collection should remain private.

It may contain:

```javascript
{
  phoneNumber,
  language,
  state,
  temporaryData,
  updatedAt
}
```

---

# 50. `meta`

Purpose:

Store civic reference data.

Possible information:

* ward information
* municipal information
* sanitation guidelines
* public FAQs
* service information

---

# 51. Firebase Realtime Data Flow

The React application should listen to Firestore updates.

```text
Firestore
   │
   ├── dumpPoints listener
   ├── reports listener
   └── feedback listener
            │
            ▼
        React State
            │
            ▼
       UI automatically updates
```

This enables near-real-time dashboard behavior.

---

# 52. Mock Data Architecture

The application MUST support mock data.

```text
Firebase available?
       │
   ┌───┴───┐
   │       │
  YES      NO
   │       │
   ▼       ▼
Firestore Mock Data
   │       │
   └───┬───┘
       ▼
      UI
```

This is critical for hackathon reliability.

---

# 53. Why Mock Data Is Required

External services can fail because of:

* internet issues
* API quota
* invalid keys
* Firebase configuration
* Gemini outage
* Twilio configuration
* deployment issues

The core demo must remain functional.

---

# 54. Firebase Cloud Functions

Cloud Functions should handle backend-only operations.

Responsibilities include:

* WhatsApp webhooks
* session management
* report processing
* AI-related backend operations where appropriate
* notification handling
* feedback workflow
* Firestore backend operations

---

# 55. Backend Security Principle

Secrets must never be hard-coded into the frontend.

Sensitive credentials belong in:

```text
Environment variables
Secret Manager
Firebase configuration
```

Never:

```text
React source code
Git repository
public assets
```

---

# 56. Gemini Architecture

The preferred architecture is:

```text
React
  │
  ▼
Backend / Cloud Function
  │
  ▼
Gemini
```

For safe production behavior, sensitive API keys should not be exposed in browser code.

---

# 57. AI Failure Handling

If Gemini fails:

```text
Gemini unavailable
       ↓
Use deterministic fallback
       ↓
Continue application
```

The UI should never completely break because AI is unavailable.

For example:

```text
AI priority unavailable
```

is better than:

```text
Entire dashboard crashed
```

---

# 58. Geospatial Architecture

NagarNetra uses three complementary spatial representations.

## Individual points

```text
Where exactly?
```

## Clusters

```text
Where are many nearby reports?
```

## Heatmap

```text
Where is density highest?
```

## H3

```text
Which geographic cells are problematic?
```

Together:

```text
Individual
    +
Cluster
    +
Heatmap
    +
H3
    ↓
Complete spatial intelligence
```

---

# 59. Filtering System

Administrators should be able to filter by:

### Time

```text
Today
7 Days
30 Days
Custom
```

### Severity

```text
Low
Medium
High
Critical
```

### Status

```text
Active
Assigned
In Progress
Resolved
```

### Geographic area

Future extension:

```text
Ward
Zone
Neighborhood
```

---

# 60. Operational KPIs

The dashboard should support KPIs such as:

```text
Total Reports
Active Problems
Resolved Problems
Resolution Rate
Average Resolution Time
High Priority Problems
Citizen Satisfaction
Reinspection Rate
```

---

# 61. Product Metrics

Success of NagarNetra can be evaluated using:

### Reporting

* number of reports
* validated report percentage
* duplicate rate

### Operations

* average response time
* average resolution time
* percentage resolved
* team utilization

### Citizen experience

* feedback response rate
* average rating
* unresolved-after-resolution rate

### Intelligence

* number of hotspots detected
* AI-prioritized cases
* recurring hotspot identification

---

# 62. UI/UX Principles

NagarNetra should feel like a **modern urban command center**, not a traditional government portal.

Design principles:

* clean
* data-rich
* spatial
* modern
* responsive
* high information density
* clear hierarchy
* minimal clutter
* strong visual status indicators

---

# 63. Visual Hierarchy

The user should immediately understand:

```text
1. What is happening?
2. Where is it happening?
3. What is most urgent?
4. What action should be taken?
5. Has the action succeeded?
```

---

# 64. Admin UX

The admin should be able to go from:

```text
Problem discovered
       ↓
Problem understood
       ↓
Problem prioritized
       ↓
Team selected
       ↓
Problem resolved
```

with minimal navigation.

---

# 65. Public UX

The citizen should be able to:

```text
Open
 ↓
Understand
 ↓
Search / Ask
 ↓
Report
 ↓
Track
 ↓
Verify
```

without learning the system.

---

# 66. Branding

The final product name is:

# NagarNetra

Meaning:

```text
Nagar = City
Netra = Eye
```

Concept:

> **The intelligent eye of the city.**

The old visible branding:

```text
SwachhOS
```

must be replaced with:

```text
NagarNetra
```

wherever user-facing.

---

# 67. Branding Areas to Update

Audit and replace:

* page titles
* logos
* splash screen
* headers
* public dashboard
* admin dashboard
* favicon
* AI prompts where branding appears
* WhatsApp messages
* README
* presentation assets
* Firebase hosting names where applicable
* metadata
* descriptions
* HTML title
* accessibility labels

Do NOT blindly rename internal variable names if doing so creates unnecessary risk.

---

# 68. Recommended Tagline

Primary:

> **NagarNetra — See the City. Solve the Problem.**

Alternative:

> **NagarNetra — AI-Powered Civic Intelligence**

---

# 69. Accessibility Requirements

The interface should support:

* keyboard navigation
* readable contrast
* semantic buttons
* accessible labels
* meaningful tooltips
* visible focus states
* screen-reader-friendly controls where practical

---

# 70. Responsive Design

The application should support:

```text
Desktop
Tablet
Mobile
```

Admin dashboard priority:

```text
Desktop > Tablet > Mobile
```

Public dashboard priority:

```text
Mobile = Desktop
```

because citizens may access the public interface primarily through phones.

---

# 71. Error Handling

Every external operation must have error handling.

Examples:

```text
Firebase unavailable
Gemini unavailable
Twilio unavailable
Invalid image
Invalid location
Duplicate report
Network failure
Firestore permission error
```

The UI should provide human-readable feedback.

---

# 72. Loading States

The application should use explicit states:

```text
Loading
Success
Empty
Error
Offline
```

For example:

```text
AI Analysis
───────────
Analyzing hotspots...
```

rather than freezing the interface.

---

# 73. Empty States

Examples:

```text
No active sanitation issues found.
```

```text
No feedback received yet.
```

```text
No high-priority zones detected.
```

---

# 74. Security Requirements

## Must protect:

* phone numbers
* citizen identity
* WhatsApp sessions
* API keys
* Firebase credentials
* Twilio credentials
* private backend data

## Must NOT expose:

```text
.env
API keys
service account keys
Twilio auth token
private session data
```

---

# 75. Firestore Security

The original project contains permissive/demo-oriented Firestore rules.

For the hackathon:

* maintain functionality
* avoid exposing secrets
* restrict private sessions
* ensure public users cannot access private citizen data

For production:

```text
Firebase Auth
+
role-based access
+
server-side validation
+
least-privilege Firestore rules
```

---

# 76. Performance Requirements

The map must remain usable with many reports.

Techniques:

```text
Supercluster
H3 aggregation
Heatmap aggregation
Lazy-loaded admin tabs
Memoization where useful
Firestore query constraints
```

Avoid rendering thousands of individual DOM markers unnecessarily.

---

# 77. Component Dependency Model

```text
App.jsx
│
├── PublicDashboard
│   ├── PublicTopBar
│   ├── FloatingSearchChat
│   └── PublicRagChat
│
└── AdminPanel
    ├── TopBar
    ├── TabBar
    │
    ├── MapTab
    │   ├── ClusterLayer
    │   ├── HeatmapLayer
    │   └── HexGridLayer
    │
    ├── AnalysisTab
    ├── CoordinationTab
    ├── InsightsTab
    └── FeedbackTab
```

---

# 78. Service Dependency Model

```text
Components
     │
     ├───────────────┐
     ▼               ▼
firebase.js      gemini.js
     │               │
     ▼               ▼
Firestore          Gemini
     │
     ▼
Cloud Functions
     │
     ▼
Twilio
     │
     ▼
WhatsApp
```

---

# 79. Source File Responsibility Matrix

| File                        | Responsibility                             |
| --------------------------- | ------------------------------------------ |
| `main.jsx`                  | React entry point                          |
| `App.jsx`                   | Global orchestration and application state |
| `PublicDashboard.jsx`       | Public application shell                   |
| `AdminPanel.jsx`            | Admin application shell                    |
| `MapTab.jsx`                | Main geospatial admin interface            |
| `AnalysisTab.jsx`           | Analytics and metrics                      |
| `CoordinationTab.jsx`       | Team assignment and operations             |
| `InsightsTab.jsx`           | AI insights and priority analysis          |
| `FeedbackTab.jsx`           | Citizen feedback and verification          |
| `ClusterLayer.jsx`          | Geospatial clustering                      |
| `HeatmapLayer.jsx`          | Density visualization                      |
| `HexGridLayer.jsx`          | H3 geographic visualization                |
| `FloatingSearchChat.jsx`    | Public search/AI interaction               |
| `PublicRagChat.jsx`         | Context-aware civic assistant              |
| `PublicTopBar.jsx`          | Public navigation/header                   |
| `TopBar.jsx`                | Admin navigation/header                    |
| `TabBar.jsx`                | Admin tab navigation                       |
| `SplashScreen.jsx`          | Initial branding/loading experience        |
| `mockData.js`               | Development/demo data                      |
| `firebase.js`               | Firebase initialization                    |
| `gemini.js`                 | Gemini service abstraction                 |
| `functions/index.js`        | Backend/WhatsApp/cloud functions           |
| `functions/translations.js` | WhatsApp translations                      |
| `migrate.js`                | Mock → Firestore migration                 |
| `smoke.js`                  | AI/backend smoke testing                   |
| `firebase.json`             | Firebase deployment configuration          |
| `firestore.rules`           | Database security rules                    |
| `vite.config.js`            | Vite build configuration                   |
| `index.html`                | HTML entry/metadata                        |

---

# 80. Runtime Modes

NagarNetra should support three conceptual modes.

## Mode 1 — Demo

```text
Mock Data
+
Mock AI fallback
+
Frontend only
```

Used for:

* development
* hackathon rehearsals
* offline demonstrations

---

## Mode 2 — Connected Demo

```text
Firestore
+
Gemini
+
Frontend
```

Used for:

* live hackathon demonstrations
* real-time data

---

## Mode 3 — Full Production

```text
Firebase
+
Cloud Functions
+
Gemini
+
Twilio
+
Authentication
+
Security Rules
+
Monitoring
```

---

# 81. Environment Variables

The final project should use environment variables for configuration.

Frontend examples:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Backend secrets should NOT use `VITE_` variables because those are exposed to the browser.

Backend configuration should use secure Firebase/server-side configuration.

---

# 82. Deployment Architecture

```text
                 Firebase
                    │
          ┌─────────┴─────────┐
          │                   │
     Public Hosting       Admin Hosting
          │                   │
          ▼                   ▼
      Public UI           Admin UI
          │                   │
          └─────────┬─────────┘
                    │
                    ▼
                Firestore
                    │
                    ▼
             Cloud Functions
                    │
              ┌─────┴─────┐
              ▼           ▼
           Gemini       Twilio
                          │
                          ▼
                       WhatsApp
```

---

# 83. Public vs Admin Separation

The application may use:

```text
Public Dashboard
```

and:

```text
Admin Dashboard
```

as separate deployment targets/routes.

The same React codebase can support both.

---

# 84. Hackathon Demo Scenario

The primary demonstration should tell one complete story.

## Scenario

A garbage hotspot appears in a neighborhood.

### Step 1

Citizen submits a photo through WhatsApp.

### Step 2

AI validates the image.

### Step 3

Location is captured.

### Step 4

System checks whether a nearby problem already exists.

### Step 5

Report is attached to the existing community problem.

### Step 6

Report count increases.

### Step 7

Map updates.

### Step 8

Heatmap/H3 intensity increases.

### Step 9

AI identifies the location as high priority.

### Step 10

Admin opens Insights.

### Step 11

Admin sees:

```text
Priority: HIGH
Reason: Persistent reports + high report volume
```

### Step 12

Admin assigns sanitation team.

### Step 13

Team performs cleanup.

### Step 14

Admin marks problem resolved.

### Step 15

Citizen receives feedback request.

### Step 16

Citizen rates the cleanup.

### Step 17

If rating is poor, proof is requested.

### Step 18

Dashboard flags the case for reinspection.

This demonstrates the entire closed loop.

---

# 85. Core Product Differentiators

## 85.1 Community-Level Problem Detection

Multiple citizens reporting the same problem become:

```text
One problem
+
Multiple confirmations
```

rather than multiple isolated tickets.

---

## 85.2 Geospatial Intelligence

NagarNetra does not simply show pins.

It provides:

```text
Pins
+
Clusters
+
Heatmap
+
H3
```

---

## 85.3 AI Prioritization

Instead of manually inspecting every complaint:

```text
All problems
     ↓
AI prioritization
     ↓
Most important problems
```

---

## 85.4 Closed-Loop Accountability

Resolution is not considered complete merely because an administrator clicked:

```text
Resolved
```

Citizen feedback can reopen the problem.

---

## 85.5 Public Civic Intelligence

Citizens can interact with a civic AI assistant rather than navigating complex municipal portals.

---

# 86. Reliability Strategy

NagarNetra should always prioritize:

```text
Core functionality
       >
External integrations
```

If:

```text
Gemini fails
```

the dashboard still works.

If:

```text
Firebase fails
```

mock data should still work.

If:

```text
Twilio fails
```

the admin dashboard still works.

This ensures the hackathon demonstration remains stable.

---

# 87. Testing Strategy

Testing should happen at multiple levels.

## Unit-level

Test:

* filtering
* scoring
* data transformation
* geospatial calculations

## Component-level

Test:

* map rendering
* tabs
* cards
* chat
* resolution workflow

## Integration-level

Test:

```text
Report
 ↓
Firestore
 ↓
Dashboard
```

and:

```text
Resolve
 ↓
Feedback
```

## AI-level

Test:

* valid photo
* invalid photo
* priority analysis
* civic question
* irrelevant question

---

# 88. Smoke Test

A basic smoke test should verify:

```text
Application starts
      ↓
Mock data loads
      ↓
Map renders
      ↓
Admin tabs open
      ↓
AI service can be invoked
      ↓
Resolution action works
```

---

# 89. Definition of Done — Frontend

Frontend is complete when:

* app starts without errors
* NagarNetra branding is visible
* public dashboard works
* admin dashboard works
* all five admin tabs work
* map renders
* clusters work
* heatmap works
* H3 works
* filters work
* mock data works
* resolution works
* feedback UI works
* AI UI works
* responsive layout works

---

# 90. Definition of Done — Backend

Backend is complete when:

* Firestore connects
* reports can be stored
* dump points can be stored
* feedback can be stored
* realtime listeners work
* WhatsApp webhook works
* sessions work
* image validation works
* duplicate detection works
* notifications work
* errors are handled

---

# 91. Definition of Done — Hackathon

The project is hackathon-ready when:

```text
Fresh clone
   ↓
Install dependencies
   ↓
Configure environment
   ↓
Start application
   ↓
Public dashboard works
   ↓
Admin dashboard works
   ↓
Demo data works
   ↓
AI demo works
   ↓
Resolution workflow works
   ↓
Feedback workflow works
```

with no critical runtime errors.

---

# 92. Development Strategy

We will NOT ask an AI coding agent to build the entire project in one shot.

Development will happen in controlled milestones.

```text
M0  Repository Understanding
 ↓
M1  NagarNetra Rebranding
 ↓
M2  Design System
 ↓
M3  Mock Data Foundation
 ↓
M4  Map Engine
 ↓
M5  Admin Dashboard
 ↓
M6  Analytics
 ↓
M7  Coordination
 ↓
M8  Feedback
 ↓
M9  AI Intelligence
 ↓
M10 Firebase
 ↓
M11 WhatsApp
 ↓
M12 Security
 ↓
M13 Deployment
 ↓
M14 Hackathon Polish
```

---

# 93. Milestone M0 — Repository Baseline

Before modifying code:

* create Git branch
* install dependencies
* run application
* confirm baseline
* document current behavior
* identify warnings/errors
* do not change architecture

---

# 94. Milestone M1 — NagarNetra Rebranding

Replace user-facing SwachhOS branding.

Tasks:

```text
SwachhOS
   ↓
NagarNetra
```

Update:

* title
* headers
* splash
* favicon
* logos
* descriptions
* AI references
* WhatsApp messages
* documentation

Do not break imports or functionality.

---

# 95. Milestone M2 — Design System

Define:

```text
Colors
Typography
Spacing
Cards
Buttons
Inputs
Status indicators
Map overlays
Charts
Modal styles
```

All new components should follow the design system.

---

# 96. Milestone M3 — Mock Data

Establish a realistic demo dataset.

Dataset should contain:

* multiple geographic locations
* different severities
* active/resolved states
* repeated reports
* different timestamps
* teams
* feedback
* AI-priority examples

The map should look populated and realistic.

---

# 97. Milestone M4 — Geospatial Engine

Implement and verify:

```text
Leaflet
 ↓
Markers
 ↓
Supercluster
 ↓
Heatmap
 ↓
H3
```

Test with:

```text
10 points
100 points
500 points
1000 points
```

---

# 98. Milestone M5 — Command Center

Implement:

```text
TopBar
TabBar
Map
Analysis
Coordination
Insights
Feedback
```

Each tab must work independently.

---

# 99. Milestone M6 — Analytics

Implement:

* KPI cards
* charts
* trend analysis
* severity distribution
* resolution statistics
* hotspot statistics

---

# 100. Milestone M7 — Coordination

Implement:

```text
Problem
 ↓
Select Team
 ↓
Assign
 ↓
In Progress
 ↓
Resolve
```

---

# 101. Milestone M8 — Feedback

Implement:

```text
Resolution
 ↓
Feedback request
 ↓
Rating
 ↓
Good / Poor
 ↓
Proof
 ↓
Reinspection
```

---

# 102. Milestone M9 — AI

Implement:

### AI priority

```text
Problem data
 ↓
Gemini
 ↓
Score + explanation
```

### Civic assistant

```text
Question
+
Context
 ↓
Gemini
 ↓
Answer
```

---

# 103. Milestone M10 — Firebase

Connect:

```text
React
 ↓
Firebase
 ↓
Firestore
```

Replace mock data progressively.

Do NOT remove the mock fallback.

---

# 104. Milestone M11 — WhatsApp

Implement:

```text
Twilio
 ↓
Cloud Function
 ↓
Session
 ↓
Photo
 ↓
Location
 ↓
Validation
 ↓
Report
```

Then:

```text
Resolve
 ↓
WhatsApp feedback
```

---

# 105. Milestone M12 — Security

Implement:

* secure environment variables
* Firestore rules
* private sessions
* admin authorization
* backend-only secrets
* input validation

---

# 106. Milestone M13 — Deployment

Deploy:

```text
Firebase Hosting
Firestore
Cloud Functions
```

Test from a clean browser/device.

---

# 107. Milestone M14 — Hackathon Polish

Final improvements:

* animations
* loading states
* empty states
* error states
* responsive behavior
* demo data
* AI explanations
* map polish
* performance
* presentation
* demo script

---

# 108. Antigravity Coding Rules

Google Antigravity must follow these rules when modifying the repository.

## Rule 1

Inspect existing code before changing it.

## Rule 2

Do not rewrite the application architecture without explicit approval.

## Rule 3

Do not remove working functionality.

## Rule 4

Prefer small, reversible changes.

## Rule 5

Run the application after significant modifications.

## Rule 6

Fix errors before moving to the next milestone.

## Rule 7

Never hard-code API secrets.

## Rule 8

Preserve mock-data fallback.

## Rule 9

Do not introduce unnecessary dependencies.

## Rule 10

Do not duplicate existing components.

---

# 109. AI Coding Agent Workflow

For every task:

1. Inspect
2. Understand
3. Plan
4. Modify
5. Run
6. Test
7. Inspect output
8. Fix
9. Summarize changes
```

The coding agent should report:


Files changed
What changed
Why
Tests executed
Errors remaining
Next recommended step
```

---

# 110. Git Strategy

Recommended branches:


main
│
├── develop
│
├── feature/rebranding
├── feature/map
├── feature/analytics
├── feature/coordination
├── feature/ai
├── feature/firebase
└── feature/whatsapp
```

For a hackathon, even if only `main` is used, commits should remain milestone-based.

---

# 111. Commit Strategy

Examples:
feat: establish NagarNetra branding
feat: implement map clustering
feat: add sanitation heatmap
feat: add H3 geographic layer
feat: implement admin analytics
feat: implement team coordination
feat: add AI priority insights
feat: integrate Firestore
feat: integrate WhatsApp reporting
fix: handle Gemini failure gracefully
fix: preserve mock data fallback
```

---

# 112. Final Product Architecture


                           NAGARNETRA
                               │
             ┌─────────────────┴──────────────────┐
             │                                    │
        PUBLIC EXPERIENCE                    ADMIN EXPERIENCE
             │                                    │
       ┌─────┴─────┐                    ┌─────────┴─────────┐
       │           │                    │                   │
      MAP          AI                 MAP                ANALYSIS
       │           │                    │                   │
       │           │                    │                   │
       │           │               COORDINATION          INSIGHTS
       │           │                    │                   │
       │           │                    └─────────┬─────────┘
       │           │                              │
       └───────────┴──────────────┬───────────────┘
                                  │
                             FIRESTORE
                                  │
                 ┌────────────────┼────────────────┐
                 │                │                │
             dumpPoints        reports         feedback
                 │                │                │
                 └────────────────┼────────────────┘
                                  │
                           CLOUD FUNCTIONS
                                  │
                  ┌───────────────┼──────────────┐
                  │               │              │
               GEMINI          TWILIO        Backend Logic
                  │               │
                  │            WhatsApp
                  │
             AI Intelligence
```

---

# 113. The Core NagarNetra Loop

The entire product can be summarized in one architecture:


                    SEE
                     ↓
                  REPORT
                     ↓
                 VALIDATE
                     ↓
                AGGREGATE
                     ↓
                 ANALYZE
                     ↓
                PRIORITIZE
                     ↓
                 ASSIGN
                     ↓
                  CLEAN
                     ↓
                 VERIFY
                     ↓
                FEEDBACK
                     ↓
               REINSPECT
                     │
                     └──────────→ SEE
```

This is NagarNetra.

---

# 114. Final Product Statement

> **NagarNetra is an AI-powered civic sanitation intelligence and operations platform that turns citizen reports into spatially aggregated, AI-prioritized, operationally actionable problems and closes the loop through team coordination and citizen-verified resolution.**

The product is not simply:


Complaint Management


It is:

Civic Intelligence
+
Geospatial Intelligence
+
AI Decision Support
+
Operations
+
Citizen Accountability
```

---

# 115. Hackathon Pitch

## One-line pitch

> **NagarNetra gives cities an intelligent eye — turning citizen complaints into prioritized action and verified resolution.**

## Problem

Cities receive thousands of sanitation complaints but lack unified visibility and intelligent prioritization.

## Solution

NagarNetra combines:

Citizen Reporting
+
AI
+
Geospatial Intelligence
+
Municipal Coordination
+
Citizen Verification
```

## Impact

Faster identification
        ↓
Better prioritization
        ↓
Smarter resource allocation
        ↓
Faster cleanup
        ↓
Greater accountability
        ↓
Cleaner cities
```

---

# 116. Final Success Criteria

NagarNetra succeeds when a judge can understand this within a few minutes:


"Someone reports garbage."
          ↓
"The system understands where it is."
          ↓
"It detects that others reported the same problem."
          ↓
"It identifies the hotspot."
          ↓
"AI explains why it matters."
          ↓
"The municipality assigns a team."
          ↓
"The problem gets resolved."
          ↓
"The citizen verifies it."
          ↓
"If the citizen says it isn't fixed,
 the system sends it back for action."
```

That closed loop is the heart of NagarNetra.

---

# 117. Implementation Principle

The project should always follow:

> **Build the simplest reliable implementation that preserves the intended product behavior.**

Prioritize:

```text
Reliability
>
Correctness
>
User Experience
>
Performance
>
Advanced Features
```

For the hackathon, a stable end-to-end workflow is more valuable than ten unfinished features.

---

# 118. Final Technology Stack

| Layer               | Technology               |
| ------------------- | ------------------------ |
| UI                  | React                    |
| Build               | Vite                     |
| Styling             | Tailwind CSS + CSS       |
| Maps                | Leaflet / React Leaflet  |
| Clustering          | Supercluster             |
| Geospatial indexing | H3                       |
| Charts              | Recharts                 |
| Icons               | Lucide                   |
| Database            | Firebase Firestore       |
| Backend             | Firebase Cloud Functions |
| AI                  | Google Gemini            |
| Messaging           | Twilio WhatsApp          |
| Hosting             | Firebase Hosting         |   |
| Language            | JavaScript / JSX         |

---

# 119. Final Repository Direction

The final repository should conceptually become:

```text
NagarNetra/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── data/
│   └── assets/
│
├── functions/
│
├── public/
│
├── assets/
│
├── outputs/
│
├── firebase.json
├── firestore.rules
├── vite.config.js
├── package.json
├── README.md
└── NAGARNETRA_PRD.md
```


