# Project Overview

GDR-CAM is a Progressive Web App (PWA) designed for capturing photos and embedding them with EXIF metadata. The application is built with vanilla HTML, CSS, and JavaScript. It allows users to take pictures, fill out a form with observational data, and save the image with the collected information stored as EXIF metadata. The app is designed to work offline, making it suitable for use in environments with limited or no internet connectivity.

## Key Technologies

*   **Frontend:** HTML5, CSS3, JavaScript
*   **Camera Access:** `getUserMedia` API
*   **Metadata:** `exif.js` and `piexif.js` for reading and writing EXIF data.
*   **Offline Functionality:** Service Workers (`sw.js`)
*   **PWA:** Web App Manifest (`manifest.json`) for installation on mobile and desktop devices.

# Building and Running

This is a client-side web application. There is no build process required. To run the application, you can serve the files using a simple local web server.

For example, using Python's built-in HTTP server:

```bash
python -m http.server
```

Or using Node.js with the `http-server` package:

```bash
npx http-server
```

Then, open your web browser and navigate to the local server's address (e.g., `http://localhost:8000`).

# Development Conventions

*   **Code Style:** The JavaScript code in `app.js` is written in a procedural style with a global `appState` object to manage the application's state. DOM elements are cached in an `elements` object.
*   **Modularity:** The application is divided into several files:
    *   `index.html`: The main HTML file.
    *   `style.css`: The stylesheet.
    *   `app.js`: The core application logic.
    *   `sw.js`: The service worker for offline support.
    *   `exif.js` and `piexif.js`: Third-party libraries for EXIF metadata manipulation.
*   **Offline First:** The service worker is configured to cache all the necessary assets, allowing the application to work offline. The strategy is cache-first for static assets and network-first for navigation requests.
*   **Error Handling:** The application includes error handling for camera access, geolocation, and other browser APIs. Status messages are displayed to the user to provide feedback.

# Recent Improvements

*   **Form Persistence:** The application now correctly saves and restores form data, including custom "Frente de Trabajo" values, using `localStorage`. This prevents the app from crashing when loading a previously saved custom work front.
*   **Permission Handling:** The camera permission logic has been improved. The application will now remember if the camera permission has been denied and will not ask for it again on subsequent loads or when starting a new capture, providing a smoother user experience.