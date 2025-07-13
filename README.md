# realtime-chatapp

- [English](README.md) | [Portuguese](README.pt-br.md)

## Tabela de Conteúdo
- [Overview](#overview)
  - [Tools](#tools)
- [Documentation](#documentation)
  - [Installation](#installation)
    - [Docker](#docker)
    - [Node.js](#nodejs)
  - [Usage](#usage)

## Overview

Preview: <a href="https://myrealtimechat.vercel.app/app">https://myrealtimechat.vercel.app/app</a>

A real-time web chat application, similar to WhatsApp, Telegram, or Discord, with its own design and several features. In addition to text messaging, it allows the sending of attachments such as images, files, contacts, PDF file previews, audios, and the use of emojis. The project also includes Google authentication, management of multiple contacts, profile image changes, and adaptability on different devices, both mobile and desktop. All responses and the application's state provide real-time feedback.

<blockquote>
<p dir="auto">This project is under development and is not yet complete. Currently, only the frontend, some simulated data, and small features in the backend using Firebase are implemented. I am always working on new features for this project in my free time.</p>
</blockquote>

A summary of the project:
<ul>
  <li>Real-time updates and feedback</li>
  <li>Text message exchange</li>
  <li>Audio sending feature</li>
  <li>Emojis usage</li>
  <li>Attachment sending, including files, images, contacts</li>
  <li>PDF file preview using PDF.js</li>
  <li>Google authentication</li>
  <li>Responsive design, adaptable on both mobile and desktop devices</li>
  <li>Docker for portability across different environments</li>
</ul>

### Tools Used
<ul>
  <li>Javascript</li>
  <li>Node.js</li>
  <li>Firebase</li>
  <li>PDF.js</li>
  <li>Docker</li>
  <li>HTML</li>
  <li>SASS Pre-processor (Syntactically Awesome Style Sheets)</li>
  <li>Axios</li>
  <li>Vite</li>
  <li>Dotenv (.env)</li>
  <li>NPM (Package Manager)</li>
</ul>

## Documentation

### Installation

After cloning the repository, follow the steps below to complete the installation of the project:

Navigate to the project directory, open the terminal, and run the commands as per one of the methods listed below (Docker or Node.js) to install the necessary dependencies and run the project properly.

Once done, choose one of the installation steps to continue setting up the project.

#### Docker

```
sudo docker build -t chat .
```
  After the Docker image has been built, run the following command:
  
```
sudo docker run -dp 5173:5173 chat
```

#### Node.js

Install the necessary dependencies with the following command:

```javascript
npm install
```

Then, run the following command to start the API:

```javascript
npm run dev
```
### Usage

If configured correctly, following either of the methods above, and everything goes as planned, the project will be ready to run.
Access one of the following URLs in your browser to view the project:

Login page: - <a>http://localhost:5173</a> </br>
Main chat page: - <a>http://localhost:5173/app</a>