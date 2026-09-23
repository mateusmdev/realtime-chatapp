<p align="left">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg">
  <img alt="Node" src="https://img.shields.io/badge/node-22-339933?logo=node.js&logoColor=white">
  <img alt="Firebase" src="https://img.shields.io/badge/backend-Firebase-FFCA28?logo=firebase&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/build-Vite-646CFF?logo=vite&logoColor=white">
</p>

# realtime-chatapp

- [English](README.md) | [Portuguese](README.pt-br.md)

A real-time web chat application with a WhatsApp/Telegram-style one-on-one conversation flow. The frontend is built in vanilla JavaScript (ES Modules, no UI framework) using Vite, and the entire backend is provided by Firebase — authentication, persistence, and real-time synchronization via Firestore, with access control handled entirely by Firestore Security Rules.

> **Login Screen:** https://myrealtimechat.vercel.app </br>
> **Preview Mode (no login required):** https://myrealtimechat.vercel.app/app?mode=preview

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Security](#security)
- [Public Demo Environment and Automatic Reset](#public-demo-environment-and-automatic-reset)
- [Tech Stack](#tech-stack)
- [Environment Variables](#environment-variables)
- [Installation and Execution](#installation-and-execution)
- [Project Structure](#project-structure)
- [License](#license)

## Features

### Conversations and Messages
- One-on-one conversations between contacts, created automatically when a new contact is added.
- Real-time sending and receiving of text messages via Firestore listeners (`onSnapshot`).
- Encryption of text message content (see [Security](#security)).
- Contact sharing as an attachment within the conversation (name, email, and photo of the shared contact).
- Minimum interval between message sends (1.5s), enforced by the Firestore rules themselves.
- Preview of PDF files with PDF.js (rendering of the first page onto a `<canvas>`).
- Audio recording and playback in the browser (`MediaRecorder` and the Web Audio API).
- Photo capture from the device camera (`getUserMedia`) and preview of images and documents before sending.

> **About media sending:** the interface has full support for capturing and previewing images, documents, and audio. However, persisting these message types (`picture`, `file`, `audio`) is deliberately blocked by default across multiple layers of the application — see [Media Sending Restrictions](#security). In its current state, only messages of type `text` and `contact-attachment` can actually be written to Firestore.

### Contacts
- Adding contacts by email, with two-way creation (the contact appears in both users' lists).
- Contact list updated in real time.
- Contact removal (soft delete, reflected for both parties).
- Local cache of contact profiles to reduce redundant Firestore reads.

### Authentication and Session
- Login with Google (Firebase Authentication).
- Mandatory acceptance of the Terms of Use before authentication, with version tracking (`termsAcceptedVersion`) — a new acceptance is required whenever the current version of the terms changes.
- Application integrity verification with Firebase App Check (reCAPTCHA Enterprise).
- Periodic validation (every 30 minutes) of the access token, with automatic termination of the local session if the token is no longer valid.

### Profile, Preferences, and Interface
- Emoji picker, with the list loaded from an external API and kept in a local cache.
- Responsive layout, adapted for mobile devices and desktop.

### Account Deletion
- Two-step deletion: the account is first marked as deleted (a tombstone, preserving only minimal data) and can only be permanently removed by the account owner themselves once it has been marked.
- Interruption-resilient process — if the deletion is interrupted partway through the flow, the application detects and resumes the pending deletion in the next session.
- When both parties in a conversation are marked as deleted, the conversation and its messages become eligible for permanent removal.

### Notifications
- Native browser notifications (Web Notifications API) for new messages, shown when the tab is not focused, with a content preview — including local decryption solely for displaying the notification, when the message is encrypted.

### Demo Mode (Preview Mode)
- Accessible without authentication at `/app?mode=preview`, or via the corresponding button on the login screen.
- Displays an interface with static sample content, with no connection to real accounts or Firestore data.
- Media sending, profile editing, and Firebase authentication are disabled in this mode.

## Architecture

### General Pattern

The project follows its own MVC-inspired organization, with no UI frameworks (React, Vue, etc.):

- **`model/`** — Domain entities and media capture. `AbstractModel` implements an Active Record-like pattern on top of Firestore (generic CRUD + `onSnapshot` for real-time updates), and `Chat`, `Message`, and `User` inherit from it. `Camera`, `AudioRecorder`, `AudioPlayer`, `RenderImage`, and `DocumentHandler` encapsulate media capture and preview in the browser.
- **`view/`** — `AbstractView` and the concrete views (`IndexView`, `AppView`) manipulate the DOM directly and maintain the UI state.
- **`controller/`** — `IndexController` (login screen) and `AppController` (main application) orchestrate UI events and calls to Firebase and the service layer.
- **`service/`** — Integrations and cross-cutting concerns: `CryptoService` (encryption), `CloudinaryService` (media upload), `MediaPolicy` (media blocking policy), `NotificationService` (notifications), and `CryptoWorker` (Web Worker for PBKDF2).
- **`firebase/`** — `Firestore` (generic wrapper around the SDK: `findById`, `findDocs`, `save`, `savePartial`, `delete`, `deleteCollection`, `batchWrite`, `onSnapshot`), `Authenticator` (Google login/logout/reauthentication), and `firebaseConfig` (initialization of the app, Firestore, and App Check).
- **`destroyer/`** — Automatic reset subsystem (detailed [below](#public-demo-environment-and-automatic-reset)).
- **`interface/`** + `MediaFactory`/`MediaContext` — Strategy Pattern for media handling (`IMediaStrategy` as the contract; `RenderImage` and `DocumentHandler` as concrete strategies).
- **`exception/`** — Domain exceptions (`AuthenticationException`, `InvalidArgumentException`, `InvalidStateException`, `NotFoundException`, `NotImplementedException`, `PrimaryKeyException`, `ProtectedAttributeException`).
- **`utils/`** — `LocalStorage` (typed access to `localStorage`) and `ProfileCache` (contact profile cache).

The application is an SPA with two HTML entry points, built separately by Vite: `index.html` (login/landing page) and `app.html` (main application). There is no WebSocket server and no Cloud Functions — all real-time synchronization is done through Firestore `onSnapshot` listeners.

### Firestore Data Model

- **`user/{email}`** — User document (`name`, `email`, `picture`/`profilePicture`, `about`, `publicKey`, `encryptedPrivateKey`, `termsAcceptedVersion`/`termsAcceptedAt`, `isDeleted`/`deletedAt`, `lastMessageAt`, `countedInMetadata`). The email is the document ID.
  - **`user/{email}/contacts/{contactEmail}`** — Contacts subcollection (`name`, `picture`, `profilePicture`, `chatId`, `isDeleted`).
- **`chats/{chatId}`** — Conversation between exactly two participants (`participantEmails`, `users` — a map keyed by base64-encoded emails — and `lastMessage`).
  - **`chats/{chatId}/messages/{messageId}`** — Messages in the conversation (`from`, `type`, `content`/`encryptedContent`, `timeStamp`, contact attachment fields when applicable).
- **`reset_actor/{email}`** — Coordination of the reset system's distributed lock.
- **`_system/metadata`, `_system/schedule`, `_system/reset_lock`, `_system/crypto`** — Internal documents: user/reset counts, scheduling of the next reset, execution lock, and dynamic encryption salt.

## Security

The application combines multiple layers of protection that are independent of one another. None of them is presented here as an absolute guarantee — they are cumulative layers of defense.

### Firestore Security Rules

The rules (`firestore.rules`) validate, on the server, both access and the format of the data written. Key points:

- **Conversation participation** — reading and writing messages requires the authenticated user to be one of the two participants in the conversation.
- **Message payload validation** — the `type` field only accepts `text` or `contact-attachment`; text is limited to 600 characters; encryption fields (`encryptedContent`, `iv`, `encryptedKey`, `senderKey`) have a defined maximum size; the declared sender must match the authenticated user.
- **Server-side rate limit** — a minimum interval of 1.5s between messages from the same user, checked against `lastMessageAt` in the user document.
- **Terms acceptance as a precondition** — creating conversations or sending messages requires `termsAcceptedVersion` to be populated in the user document.
- **Deleted accounts** — users with `isDeleted: true` cannot create conversations or send messages; permanent deletion of a user document is only allowed if it is already marked as deleted.
- **Atomic counters via rules** — the `_system/metadata` document (count of active users and resets) only accepts specific, incremental transitions, validated entirely within the Firestore rules, without Cloud Functions.

### Media Sending Restrictions

This project's instance blocks the sending of media and files in general by default, and the Firebase rules must be deliberately changed to enable this feature without any restriction. Sending images, files, and audio is controlled by three independent layers, reducing the risk surface associated with user-submitted content:

1. **Environment variable (`VITE_BLOCK_MEDIA`)** — read by `MediaPolicy`, which exposes `isUploadAllowed()`/`assertUploadAllowed()`. When enabled, the interface hides the related controls (camera, image, document, and audio sending) and `CloudinaryService` rejects any upload before even building the request.
2. **Media service (Cloudinary)** — uploading, when permitted by the layer above, depends on `VITE_CLOUDINARY_CLOUD_NAME`/`VITE_CLOUDINARY_UPLOAD_PRESET` being configured. The reset subsystem itself treats Cloudinary as unusable by default in production environments: the `CloudinaryDestroyer` performs no cleanup, recording the reason `media_blocked_in_production`.
3. **Firestore rules** — regardless of what the client sends, payload validation only accepts `type: 'text'` or `type: 'contact-attachment'`. A `picture`, `file`, or `audio` message is rejected by the database even if the client layer is bypassed.

These three layers do not depend on one another: no single layer, on its own, is the only point of control.

### Encryption

Text messages are end-to-end encrypted with the Web Crypto API:

- Each user has an ECDH key pair (P-256 curve); the private key is generated in the browser and kept as a non-extractable `CryptoKey` in IndexedDB.
- An encrypted backup of the private key is saved in Firestore (`encryptedPrivateKey`), protected by a key derived via PBKDF2 (run in a Web Worker) from the Firebase UID, a fixed application salt (`VITE_CRYPTO_SALT`), and a dynamic salt stored in `_system/crypto` — rotated on every instance reset when the reset subsystem is enabled for application demo purposes. This makes it possible to recover the key when accessing from a new device without exposing the private key in plaintext.
- Each message uses an ephemeral ECDH key pair (discarded after use) to derive, via ECDH + HKDF (SHA-256), a wrapping key (AES-KW) that wraps an AES-256-GCM session key unique to that message. The session key is wrapped twice — once for the recipient and once for the sender themselves — allowing both sides to decrypt the history later.

### Headers and Content Security Policy

In production (Vercel), the application sets HTTP security headers on all responses: a restrictive `Content-Security-Policy` (an explicit list of allowed origins for scripts, styles, images, connections, and frames), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, and a `Permissions-Policy` that restricts camera and microphone to the application's own origin and blocks geolocation.

## Public Demo Environment and Automatic Reset

The public instance operates as a demo environment: anyone can create an account and test the application, but the application's database is periodically reset. A dedicated subsystem (`destroyer/`) monitors and performs the reset on a recurring basis:

- **Configurable triggers** — a reset can be triggered by time (`VITE_RESET_INTERVAL_HOURS`/`VITE_RESET_INTERVAL_MINUTES`) and/or upon reaching a maximum number of users (`VITE_MAX_USERS`). Each trigger is disabled if its variable is not set or is zero.
- **Distributed lock** — since there is no dedicated server, any connected client can trigger the reset. An expiring lock (`_system/reset_lock`, with a 5-minute tolerance for stuck locks) and a per-user record (`reset_actor/{email}`) ensure that only one client runs the process at a time.
- **Execution** — the `DestroyerOrchestrator` triggers the Firestore cleanup (messages, conversations, contacts, and users, in batches via `writeBatch`) and reports the status of each step. Media cleanup on Cloudinary is treated as not applicable (there is no media to clean up); deletion of accounts in Firebase Authentication is also not performed in this cycle, because it depends on an action taken by the account owner themselves from the client — there are no Cloud Functions or privileged backend in the project to remove them centrally.
- **Synchronization across sessions** — both the login screen and the main application listen to the reset count in real time; upon detecting a new cycle, the local session (token, profile cache, UID) is cleared automatically.
- **Preview mode** — anyone who prefers not to create an account can explore the interface, with static sample data, by accessing `/app?mode=preview` without authenticating.

## Tech Stack

| Layer | Technologies |
|---|---|
| Runtime environment | Node.js 22 |
| Build/Bundler | Vite |
| Language | JavaScript (ES Modules, no UI framework) |
| Styling | SASS |
| Backend/Persistence | Firebase (Authentication, Firestore) |
| Access integrity | Firebase App Check (reCAPTCHA Enterprise) |
| Encryption | Web Crypto API (ECDH P-256, AES-GCM, AES-KW, HKDF) + Web Worker for PBKDF2 |
| Media upload | Cloudinary (subject to the restrictions described in [Security](#security)) |
| PDF preview | PDF.js (`pdfjs-dist`) |
| Markdown | `marked` (rendering of the Terms of Use) |
| HTTP requests | Axios |
| Containerization | Docker |
| Reference hosting | Vercel |

## Environment Variables

Configured via a `.env` file at the project root (template in `.env.example`). No real values are exposed in this documentation — only the purpose of each variable.

| Variable | Purpose | Required |
|---|---|---|
| `VITE_API_KEY` | Web API Key of the Firebase project. | Yes |
| `VITE_AUTH_DOMAIN` | Firebase authentication domain. | Yes |
| `VITE_PROJECT_ID` | Firebase project ID. | Yes |
| `VITE_STORAGE_BUCKET` | Firebase bucket associated with the project. | Yes |
| `VITE_MESSAGING_SENDER_ID` | Firebase Sender ID. | Yes |
| `VITE_APP_ID` | Firebase app ID. | Yes |
| `VITE_RECAPTCHA_SITE_KEY` | reCAPTCHA Enterprise site key, used by Firebase App Check. | Yes |
| `VITE_APPCHECK_DEBUG_TOKEN` | App Check debug token, only honored on `localhost`/`127.0.0.1`. | Only in local development |
| `VITE_STORAGE_KEY` | Name of the key used to persist the access token in `localStorage`. | Yes |
| `VITE_TOKEN_VALIDATOR` | Endpoint used to periodically validate (every 30 min) whether the Google access token is still valid. | Yes |
| `VITE_ICON_KEY` | Endpoint (with key) of the external service used to load the emoji list. | Recommended — without it, the emoji picker is empty |
| `VITE_BLOCK_MEDIA` | When `true`, disables sending images, files, and audio in the interface and blocks upload calls on the client. | Optional (unset/`false` = media not blocked at this layer) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloud name of the Cloudinary account used for media upload. | Required only if media sending is enabled |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset, used by Cloudinary. | Required only if media sending is enabled |
| `VITE_CRYPTO_SALT` | Fixed application salt, combined with a dynamic salt in the derivation of the key that protects the backup of the private encryption key. | Yes, for encryption to work correctly |
| `VITE_MAX_USERS` | Maximum number of concurrent users before triggering an automatic reset. | Optional (unset/`0` disables this trigger) |
| `VITE_RESET_INTERVAL_HOURS` / `VITE_RESET_INTERVAL_MINUTES` | Interval between automatic, time-scheduled resets. | Optional (unset/`0` disables this trigger) |
| `VITE_GITHUB_URL` / `VITE_LINKEDIN_URL` / `VITE_PORTFOLIO_URL` | Social links displayed on the login screen. | Optional |

## Installation and Execution

### Prerequisites
- A Firebase project with Authentication (Google provider enabled) and Firestore, with the rules from `firestore.rules` published.
- Node.js 22+ (local execution without Docker) or Docker.
- A Cloudinary account — optional, required only if media sending is enabled.

### Configuration
1. Clone the repository.
2. Copy `.env.example` to `.env` and fill in the variables with the values from your own project (see [Environment Variables](#environment-variables)).
3. Optionally, copy `.firebaserc.example` to `.firebaserc` if you plan to publish the Firestore rules using the Firebase CLI.

### Docker
```
sudo docker build -t chat .
```
Once the image is built:
```
sudo docker run -dp 5173:5173 chat
```

### Node.js
```
npm install
```
```
npm run dev
```
To expose the development server on the local network (the same behavior used in the Docker container):
```
npm run host
```

### Usage
With the project running:

- Login screen: `http://localhost:5173`
- Main application (requires authentication): `http://localhost:5173/app`
- Demo mode, without authentication: `http://localhost:5173/app?mode=preview`

### Production Build
```
npm run build
```
Generates the static artifacts in `dist/`. The reference deployment of the public instance is on Vercel — see `vercel.json` for the security headers applied.

## Project Structure

```
.
├── app.html                  # HTML entry point for the main application (post-login)
├── index.html                 # HTML entry point for the login screen
├── firestore.rules            # Firestore security rules
├── firebase.json               # Points the Firebase CLI to firestore.rules
├── vite.config.js               # Multi-entry build (index.html + app.html)
├── vercel.json                   # Security headers and CSP for production
├── Dockerfile
├── .env.example                   # Environment variables template
├── .firebaserc.example              # Firebase CLI configuration template
├── public/
└── src/
    ├── controller/             # IndexController, AppController
    ├── view/                   # AbstractView, IndexView, AppView
    ├── model/                  # AbstractModel, Chat, Message, User, Camera, AudioRecorder...
    ├── service/                # CryptoService, CloudinaryService, MediaPolicy, NotificationService...
    ├── firebase/                # Firestore, Authenticator, firebaseConfig
    ├── destroyer/                # Orchestrator and reset subsystem for the demo environment
    ├── interface/                 # Contracts (e.g., IMediaStrategy)
    ├── exception/                  # Domain exceptions
    ├── terms/                       # Terms of Use (PT/EN, Markdown)
    ├── utils/                        # LocalStorage, ProfileCache
    ├── sass/                          # Styles
    └── assets/                        # Static icons and images
```

## License

Distributed under the MIT License. See the [`LICENSE`](LICENSE) file for the full text.
