# GEMINI Code Assistant Report

## Project Overview

This project is a Progressive Web App (PWA) named "GDR-CAM". Its primary function is to serve as a photo-capturing application that embeds metadata into the images. The application is designed to work seamlessly on various devices, including mobile phones and PCs, and it supports offline functionality.

### Key Features:

- **Photo Capture:** Utilizes the device's camera to take pictures.
- **Metadata Form:** Users can fill out a form with details such as "Frente de trabajo," "Coronamiento," "Tipo de observación," and "Actividad realizada."
- **EXIF Metadata:** The information from the form, along with GPS coordinates (latitude, longitude, altitude), is embedded into the photo's EXIF data.
- **Offline Functionality:** The application can be used without an internet connection, thanks to a Service Worker.
- **PWA:** It can be "installed" on a device's home screen for easy access.
- **Image Saving:** Provides functionality to save the captured image to the device's gallery.

### Technologies Used:

- **Frontend:** HTML5, CSS3, JavaScript
- **Camera Access:** `getUserMedia` API, `ImageCapture` API
- **Metadata:** `piexif.js` and `exif.js` libraries for reading and writing EXIF metadata.
- **Offline Support:** Service Workers (`sw.js`)
- **PWA:** Web App Manifest (`manifest.json`)

## Building and Running

This is a static web project with no build process.

### Running the Application:

1.  **Serve the files:** You need to serve the project files using a local web server. You can use any simple web server. For example, if you have Python installed, you can run the following command in the project's root directory:
    ```bash
    python -m http.server
    ```
2.  **Access the application:** Open your web browser and navigate to the local server's address (e.g., `http://localhost:8000`).

The application should load, and you can start using it.

## Development Conventions

- **Single-Page Application:** The entire user interface and logic are contained within `index.html`.
- **JavaScript Libraries:** The project relies on `exif.js`, `piexif.js`, and `save-image.js`, which are included via `<script>` tags in `index.html`.
- **Image Capture:** The application uses the `ImageCapture` API to take photos, which helps in preserving the original EXIF metadata from the camera. A fallback to the canvas method is implemented for browsers that do not support `ImageCapture`.
- **GPS Capture Flow:** To ensure that GPS data is captured, the user is notified that the location is being obtained, and the photo capture is delayed until the location is acquired.
- **Offline First:** The Service Worker (`sw.js`) is configured to cache the main application files (`/`, `index.html`, `manifest.json`), allowing the app to load and function offline.
- **PWA Configuration:** The `manifest.json` file defines the application's name, icons, and other properties for the PWA experience.
- **Responsive Design:** The `style.css` file includes media queries to adapt the layout for different screen sizes, particularly for mobile devices.
