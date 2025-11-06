# Project Overview

This project is a Progressive Web Application (PWA) called GDR-CAM, designed for capturing photos with embedded metadata. The application allows users to take pictures, fill out an observation form, and save the image with the form data and GPS coordinates stored as EXIF metadata. The application is designed to work offline.

## Main Technologies

*   **Frontend:** HTML5, CSS3, JavaScript
*   **Camera Access:** `getUserMedia` API
*   **Metadata:** `exif.js` and `piexif.js` for reading and writing EXIF metadata.
*   **Offline:** Service Workers (`sw.js`)
*   **PWA:** Web App Manifest (`manifest.json`)

## Architecture

The application is a single-page application (`index.html`) with the core logic in `app.js`. It utilizes a service worker (`sw.js`) for offline caching of assets. The `manifest.json` file enables the PWA functionality.

# Building and Running

This is a static web project with no build process. To run the application, open the `index.html` file in a modern web browser.

## Development Conventions

The code is written in plain JavaScript with a focus on DOM manipulation. The application state is managed in a single `appState` object. The code is not modularized into separate files, but rather organized into functions within `app.js`.
