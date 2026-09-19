FocusList — README

FocusList is a cinematic, space-inspired productivity dashboard that turns everyday tasks into a living constellation of focus, progress, and momentum.

Built as a frontend-first experience, FocusList combines a functional task manager with a dynamic cosmic visualization layer. The attached implementation is packaged as a single HTML artifact.

🌌 What is FocusList?

FocusList isn't just another To-Do list.

It visualizes productivity as a personal data universe:

⭐ Every task becomes a point in the constellation.
🟠 Priority determines visual identity.
🟢 Completion contributes to the Focus Core.
🔎 Search and filters reshape the visible task universe.
💥 Creating, completing, and deleting tasks produce visual feedback.
💾 Your tasks persist locally in the browser.
🪐 The entire interface is wrapped in a cinematic cosmic environment.

The goal is simple:

Turn task management into an experience rather than a checklist.

✨ Core Features
📝 Task Management

FocusList provides the complete task lifecycle:

Create tasks
Assign priorities
Mark tasks as completed
Edit task information
Delete tasks
Select individual tasks
Persist tasks between sessions

Supported priorities:

Priority	Visual identity
🔥 High	Warm orange
⚡ Medium	Golden/amber
🌿 Low	Sage green
✓ Completed	Visually subdued
🔎 Intelligent Filtering

The task engine supports multiple filtering dimensions simultaneously.

Search

Search directly through task titles.

Search → "research"

Only matching tasks remain visible.

Status
ALL
ACTIVE
COMPLETED
Priority
ALL
HIGH
MEDIUM
LOW

These filters operate against the actual application state rather than manipulating presentation-only data.

📊 Live Productivity Statistics

FocusList continuously derives productivity statistics from the current task state.

Total

Number of tasks currently stored.

Completed

Number of tasks marked complete.

Pending

Number of incomplete tasks.

Focus Percentage
completed / total × 100

The resulting percentage drives the central Focus Core visualization.

No fake dashboard numbers.

No hardcoded progress.

The visualization is connected to the actual task state.

🪐 The Focus Core

At the center of the experience is the Focus Core.

It represents the user's overall completion state.

Conceptually:

              COMPLETION
                   ↓
             ┌───────────┐
             │   CORE    │
             │    72%    │
             └───────────┘
                   ↓
          PRODUCTIVITY STATE

As tasks are completed, the core responds to the underlying state.

This turns a simple statistic into the visual centerpiece of the application.

🌌 Task Constellation

The most distinctive feature of FocusList is its task visualization.

Each actual task is represented as a node in a cosmic constellation.

                 ● High
                    \
                     \
          ● Low ----- ◉ Focus Core ----- ● Medium
                     /
                    /
                ● Completed

The constellation is not fake decorative data.

Nodes correspond to real tasks.

Selecting a node can connect the visualization back to the corresponding task in the application.

🔭 Interactive Cosmic Environment

The background is rendered using Canvas-based graphics rather than creating thousands of DOM elements.

The environment includes:

✦ Procedural stars
✦ Star clusters
✦ Cosmic dust
✦ Nebula structures
✦ Atmospheric gradients
✦ Particle bursts
✦ Task nodes
✦ Dynamic constellation rendering

The starfield is generated deterministically using seeded random generation, allowing the visual universe to remain stable rather than changing completely on every render.

🎬 Cinematic Introduction

FocusList opens with a cinematic introduction that transitions from the cosmic environment into the productivity interface.

The experience conceptually progresses through:

DEEP SPACE
    ↓
STARS
    ↓
NEBULA
    ↓
COSMIC PARTICLES
    ↓
FOCUS CORE
    ↓
TASK UNIVERSE
    ↓
FOCUSLIST

The application does not depend on a fake network-loading process.

The interface remains a functional application rather than becoming an animation disguised as loading.

💥 Microinteractions

FocusList uses animation to communicate state changes.

Examples include:

Adding a task
New task
   ↓
Task created
   ↓
Particle burst
   ↓
Constellation node appears
Completing a task
Pending
   ↓
Complete
   ↓
Focus percentage updates
   ↓
Core responds
   ↓
Node visual state changes
Deleting a task
Task
 ↓
Particle burst
 ↓
Node disappears
 ↓
Statistics update

The animations are tied to actual application events.

💾 Persistence

FocusList uses browser localStorage.

Storage key:

focuslist_tasks

Tasks survive page reloads without requiring a backend.

Stored task information includes concepts such as:

{
  id,
  title,
  priority,
  done,
  created
}

The application also validates and normalizes loaded data before using it.

🧠 Application Architecture

The application is structured around a central state model.

Conceptually:

                    ┌──────────────┐
                    │ APPLICATION  │
                    │    STATE     │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          ↓                ↓                ↓
      Task Engine     Filter Engine     Statistics
          │                │                │
          └────────────┬───┴────────────────┘
                       ↓
                  UI Rendering
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
        DOM Interface       Canvas Universe
             │                   │
             └─────────┬─────────┘
                       ↓
                  User Interaction

This keeps the visual layer synchronized with the actual application data.

⚡ Rendering Architecture

The visual system is designed around Canvas rather than massive DOM-based particle systems.

Canvas responsibilities
Starfield
Nebula
Cosmic dust
Particle effects
Constellation
Camera movement
Visual transitions
DOM responsibilities
Inputs
Buttons
Task information
Statistics
Filters
Dialog/editing UI
Accessibility semantics

This separation allows the interface to remain interactive without forcing the browser to maintain thousands of animated HTML elements.

🎯 Adaptive Performance

FocusList adapts visual density according to the environment.

The implementation considers:

Screen width
Hardware concurrency
Device pixel ratio
Reduced-motion preference
Configurable visual density

The cosmic renderer uses different star/particle counts depending on the available environment.

Conceptually:

High-end desktop
      ↓
More stars + richer effects

Normal desktop
      ↓
Balanced rendering

Mobile / lower-power device
      ↓
Reduced visual density

The Canvas pixel ratio is also capped to prevent unnecessarily expensive rendering.

♿ Accessibility

The visual experience does not replace the actual application interface.

Core functionality remains accessible through normal controls.

FocusList also accounts for:

Keyboard interaction
Visible focus states
Escape-to-close behavior
Input-safe keyboard shortcuts
Reduced-motion preferences
Responsive layouts
Semantic controls

Keyboard zoom shortcuts include:

+ / =     Zoom in
- / _     Zoom out
0         Reset view
Esc       Close selection/editing

Keyboard shortcuts avoid interfering while the user is typing inside inputs.

📱 Responsive Design

FocusList is designed to adapt from mobile screens through large desktop displays.

The layout can transition between:

┌───────────────────────────────┐
│           DESKTOP             │
│                               │
│ Stats │ Focus Core │ Tasks    │
│                               │
│        Constellation           │
└───────────────────────────────┘

and compact mobile compositions where the interface prioritizes:

Focus Core
     ↓
Statistics
     ↓
Task creation
     ↓
Filters
     ↓
Tasks
     ↓
Constellation

The visualization and controls remain usable rather than simply shrinking the desktop layout.

🧩 Technology Stack
Layer	Technology
Application	React
Runtime	Browser JavaScript
Styling	CSS
Visualization	HTML Canvas 2D
State	React component state
Persistence	localStorage
Animation	requestAnimationFrame
Interaction	Pointer + Keyboard events
Typography	Embedded WOFF2 fonts
Deployment model	Single bundled HTML artifact

The delivered artifact contains the runtime/application resources together rather than requiring a conventional multi-file project structure.

🏗️ Internal Code Organization

The application logic is organized into conceptual sections:

Component
│
├── Storage
│   ├── load()
│   ├── seed()
│   ├── persist()
│   └── commit()
│
├── Task Engine
│   ├── addTask()
│   ├── toggle()
│   └── remove()
│
├── Filter Engine
│   └── filtered()
│
├── Lifecycle
│   ├── componentDidMount()
│   ├── componentDidUpdate()
│   └── componentWillUnmount()
│
├── Cosmos
│   ├── initCosmos()
│   ├── sizeCanvases()
│   └── buildNebula()
│
├── Constellation
│   ├── syncNodes()
│   ├── hitTest()
│   ├── pointerOnConst()
│   └── clickConst()
│
├── Camera
│   ├── focusNode()
│   ├── zoomBy()
│   └── resetView()
│
├── Rendering
│   ├── drawCosmos()
│   ├── drawConstellation()
│   └── loop()
│
└── UI
    ├── statistics
    ├── filters
    ├── task list
    ├── editing
    └── dialogs
🔐 Data & Privacy

FocusList is frontend-only.

There is no application backend involved in the task-storage model.

Task data is stored locally using:

localStorage

This means the application's task state is tied to the browser/device where it is being used.

Clearing browser storage will remove the locally stored task data.

🚀 Running FocusList

Because the application is packaged as an HTML artifact, the basic workflow is intentionally simple:

1. Obtain FocusList.html
2. Open it in a modern browser
3. Start creating tasks

For a production deployment, the same artifact can be served from a static web host.

🧪 Functional Model

The application follows a simple state → render model:

USER ACTION
    ↓
STATE UPDATE
    ↓
LOCAL STORAGE
    ↓
REACT UPDATE
    ↓
DOM + CANVAS SYNCHRONIZATION
    ↓
VISUAL FEEDBACK

This ensures that the dashboard isn't merely a collection of animations.

The visual system is driven by the application's actual task state.

🛡️ Defensive Data Handling

When loading persisted tasks, FocusList performs validation rather than blindly trusting localStorage.

It checks things such as:

Is the stored value valid JSON?
Is it an array?
Is each task an object?
Does the task contain a usable title?
Is the priority valid?
Is the ID usable?
Is the creation timestamp valid?

Invalid data can therefore be rejected or normalized instead of crashing the application.

🎨 Design Language

The visual language combines:

Productivity dashboard

×

Editorial typography

×

Cosmic visualization

×

Organic color system

The UI uses a warm palette built around:

Deep space
Warm orange
Muted gold
Sage green
Cream / parchment surfaces

Typography combines:

Caprasimo for expressive headings
Figtree for interface/body content

The result is intentionally different from the typical blue/purple SaaS dashboard.

🧠 Design Philosophy

FocusList is based around one principle:

Productivity should feel visible.

Traditional task managers represent progress as:

☐ Task
☐ Task
☑ Task
☐ Task

FocusList instead represents the same underlying information as:

                 ✦
          ·             ·

     ●──────────◉──────────●
       \        64%       /
        \                /
          ●────────────●

              FOCUS

The task list remains practical.

The visualization makes the data memorable.

🏆 Why FocusList Stands Out

FocusList combines four normally separate ideas:

01 — Productivity

A genuinely usable To-Do application.

02 — Data Visualization

Tasks become an interactive visual dataset.

03 — Creative Computing

Procedural stars, nebulae, particles and Canvas rendering.

04 — UX Engineering

Responsive interaction, accessibility, keyboard controls, persistence and state synchronization.

So the project isn't simply:

“A pretty To-Do list.”

It's closer to:

A productivity application wrapped around a real-time visual representation of task state.

📌 Project Status

Frontend: ✅
Task CRUD: ✅
Priorities: ✅
Search: ✅
Status filters: ✅
Priority filters: ✅
Statistics: ✅
Local persistence: ✅
Canvas visualization: ✅
Task constellation: ✅
Interactive zoom: ✅
Responsive UI: ✅
Reduced motion support: ✅
Keyboard interaction: ✅
Cinematic introduction: ✅

🌠 FocusList
        YOUR TASKS
             ↓
        YOUR DATA
             ↓
       YOUR UNIVERSE
             ↓
        YOUR FOCUS

FocusList — Turn your workload into a universe. 🌌
