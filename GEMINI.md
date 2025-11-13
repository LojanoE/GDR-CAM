# Project Overview

This project is a Progressive Web App (PWA) named GDR-CAM. Its primary function is to serve as a camera application that captures photos and embeds them with metadata. This metadata includes information from a user-filled form and GPS coordinates.

## Main Technologies

*   **Frontend:** HTML5, CSS3, JavaScript
*   **PWA:** Service Workers (`sw.js`) are used for offline functionality, and a `manifest.json` file allows the web app to be installed on devices.
*   **Camera Access:** The `getUserMedia` API is used to access the device's camera.
*   **Metadata:** The `exif.js` and `piexif.js` libraries are used to read and write EXIF metadata to the captured JPEG images.
*   **Data:** `frentes.json` is used to populate a dropdown in the observation form.

## Architecture

The application follows a simple single-page application (SPA) architecture:

*   `index.html`: The main and only HTML file, containing the entire user interface.
*   `style.css`: Contains all the styles for the application.
*   `app.js`: This file holds the core application logic, including camera control, form handling, metadata embedding, and image saving.
*   `sw.js`: The service worker script that manages caching for offline use.
*   `exif.js` & `piexif.js`: Third-party libraries for handling EXIF data.

# Building and Running

This is a client-side web application and does not require a build process. To run the project, you need to serve the files using a local web server.

## Running the Application

1.  **Start a local web server:**
    You can use any simple web server. If you have Python installed, you can run one of the following commands in the project's root directory:

    ```bash
    # For Python 3
    python -m http.server

    # For Python 2
    python -m SimpleHTTPServer
    ```

    Alternatively, you can use other tools like `npx serve`.

2.  **Access the application:**
    Open your web browser and navigate to the local server's address (e.g., `http://localhost:8000`).

    **Note:** The application requires a secure context (`https://` or `localhost`) for the `getUserMedia` API (camera access) and Service Workers to function correctly.

# Development Conventions

*   **Code Style:** The JavaScript code in `app.js` is written in a procedural style with a global `appState` object to manage the application's state. It is not using any major frameworks.
*   **Dependencies:** The project uses a few external JavaScript libraries (`exif.js`, `piexif.js`) which are included directly in the project.
*   **Offline First:** The service worker is configured to cache all the main assets, allowing the application to work offline. The strategy is cache-first for static assets and network-first for navigation.
