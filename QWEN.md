# GDR-CAM Project Context

## Project Overview

GDR-CAM is a Progressive Web App (PWA) for capturing photos with embedded metadata. The application allows users to take photos using their device's camera, fill out an observation form, and save the photo with GPS coordinates and form data embedded as EXIF metadata. The app is designed to work offline and can be installed on mobile devices and PCs.

## Project Structure

```
GDR-CAM/
├── app.js                  # Main application logic
├── index.html              # Main HTML interface
├── style.css               # Application styles
├── sw.js                   # Service worker for offline functionality
├── manifest.json           # PWA manifest file
├── exif.js                 # Library for reading EXIF data
├── piexif.js               # Library for writing EXIF data
├── frentes.json            # Work fronts data for form dropdown
├── test_orientation.html   # Orientation testing page
├── GEMINI.md               # Existing documentation
├── README.md               # Project documentation
├── .gitattributes          # Git attributes configuration
├── img/                    # Image assets
│   ├── ECUACORRIENTE.png
│   ├── icon-512x512.png
│   └── LOGO GDR.jpeg
└── .git/                   # Git repository metadata
```

## Core Functionality

### Camera Features
- Access to device camera using `getUserMedia` API
- Photo capture functionality
- Zoom controls (with support detection)
- Flash mode cycling (auto, on, off)
- Image rotation controls (90° left/right)

### Metadata Embedding
- GPS location data (coordinates, altitude, accuracy)
- Form data from user input (work front, coronation, observation category, activity performed)
- Timestamp information
- All metadata stored in EXIF format within image files

### Form Functionality
- Work front selection with searchable dropdown
- Custom work front option
- Coronation selection (C945, C960, C970, C980)
- Observation category (routine, release, novelty, important)
- Activity performed text input
- GPS coordinate display

### Offline Capabilities
- Service worker implementation for offline access
- Static asset caching (cache-first strategy)
- Navigation handling with network-first approach
- Runtime caching for dynamic content

### PWA Features
- Installable on mobile and desktop platforms
- Full-screen standalone display
- Custom app icons and splash screens
- Portrait orientation lock

## Key Technologies

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Camera API:** `getUserMedia` and `ImageCapture`
- **PWA:** Service Workers, Web App Manifest
- **Metadata:** `exif.js` and `piexif.js` libraries
- **GPS:** Geolocation API
- **Device Orientation:** Screen Orientation API
- **Styling:** CSS variables, flexbox, responsive design

## Application Logic (app.js)

The main application uses a state-based architecture with a global `appState` object to manage:

- Camera stream and capture state
- Image rotation and zoom levels
- GPS location tracking
- Form data persistence (local storage)
- Photo metadata processing

Key functions include:
- `startCamera()` - Initialize camera access
- `takePhoto()` - Capture and process images
- `addMetadataToImage()` - Embed form and GPS data
- `saveToGallery()` - Save processed image to device
- `rotateImage()` - Rotate the captured image
- `getLocation()` - Get and watch GPS coordinates

## Configuration Files

### manifest.json
- App name: "GDR-CAM - Aplicación de Captura de Fotos"
- Short name: "GDR-CAM"
- Display mode: standalone
- Theme color: #007bff
- Background color: #1A2230
- Portrait orientation requirement

### sw.js
- Cache versioning with cache names including version numbers
- Static asset caching strategy
- Runtime caching for dynamic content
- Cleanup of old caches during activation

### frentes.json
- Array of predefined work fronts for the dropdown
- Dynamically loaded and populated in the form

## Building and Running

This is a client-side web application that requires a local web server to run properly due to browser security restrictions for camera access and service workers.

### Local Development
1. Start a local web server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Or using Node.js 'serve' package
   npx serve
   ```
   
2. Access the application at `http://localhost:8000`

### Requirements
- Secure context (https or localhost) for camera and service worker APIs
- Modern browser with Web APIs support (getUserMedia, Service Worker, Screen Orientation)
- Camera access permissions enabled by user

## Development Conventions

- Procedural JavaScript with global state management
- Event-driven architecture for UI interactions
- Form data persistence using localStorage
- Responsive UI with CSS flexbox
- Consistent color scheme using CSS variables
- Error handling with user notifications
- GPS coordinates stored in EXIF format with decimal degrees calculation

## Special Features

- Automatic GPS coordinate watching during form filling
- Best GPS reading selection based on accuracy
- GPS display throttling to prevent UI flickering
- Form interaction detection to pause background updates
- Searchable custom dropdown for work fronts
- Image rotation with EXIF orientation preservation
- Metadata display modal for viewing embedded data
- Custom logo and branding throughout the application
- Version tracking in multiple places (UI and service worker)

## Compatibility

- Chrome 50+
- Firefox 54+
- Edge 79+
- Safari 11.1+
- iOS Safari 11.3+
- Mobile and desktop platforms
- Works offline after initial installation

## Files and Assets

- Images are stored in the `img/` directory with appropriate sizing for PWA icons
- EXIF libraries are included directly in the project
- CSS uses a modern, clean design with consistent color scheme
- HTML structure follows semantic web practices
- External dependencies are minimized to essential libraries only