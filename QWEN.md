# GDR-CAM Project Context

## Project Overview

GDR-CAM is a Progressive Web App (PWA) for capturing photos with embedded metadata. The application allows users to take photos and fill out observation forms that get stored as EXIF metadata in the image file. It features offline capabilities, GPS location integration, form data embedding, and an intuitive mobile-friendly interface.

### Key Features
- Camera access using getUserMedia API with automatic selection of rear camera
- Form data capture (work front, coronation, observation category, activities performed)
- GPS location embedding in image EXIF data
- Image rotation and preview functionality
- Offline PWA with service worker caching
- Metadata viewing and validation
- Photo gallery saving capabilities
- Timestamp and logo overlay on saved images

### Technologies Used
- HTML5, CSS3, JavaScript
- getUserMedia API for camera access
- EXIF.js and piexif.js for metadata handling
- Service Workers for offline functionality
- Web App Manifest for PWA installation
- File System Access API for gallery saving
- Canvas API for image processing and rotation

## Project Structure

```
GDR-CAM/
├── app.js              # Main application logic
├── index.html          # Main HTML structure
├── style.css           # Styling and responsive design
├── sw.js               # Service worker for offline functionality
├── manifest.json       # PWA manifest configuration
├── exif.js             # EXIF metadata reading library
├── piexif.js           # EXIF metadata writing library
├── read_metadata.py    # Python script for metadata reading
├── test_orientation.html # Test HTML file
├── GEMINI.md           # Additional documentation
├── README.md           # Main project documentation
├── img/                # Image assets
│   ├── ECUACORRIENTE.png
│   ├── icon-512x512.png
│   └── LOGO GDR.jpeg
├── .gitattributes      # Git configuration
└── QWEN.md             # This file
```

## Building and Running

### Development Setup
1. Clone or download the repository
2. Serve the files through a web server (required for camera access and service worker)
3. Open `index.html` in a modern browser that supports the required APIs

### Local Testing
The simplest way to run locally:
1. Install Python 3.x
2. Navigate to the project directory
3. Run `python -m http.server 8000` (or any preferred port)
4. Open `http://localhost:8000` in a modern browser

### PWA Installation
The app can be installed as a native application:
- Mobile devices: Tap browser menu and select "Add to Home Screen"
- Desktop browsers: Use the install button in the address bar

## Development Conventions

### Code Structure
- Main application logic is in app.js with a modular approach
- State management is handled through the `appState` object
- DOM element references are stored in the `elements` object
- Event listeners are attached through the `attachEventListeners()` function
- Image processing and EXIF data handling are separated into dedicated functions

### Naming Conventions
- JavaScript: camelCase for functions and variables
- CSS: kebab-case for class names
- Constants: UPPERCASE with underscores

### Error Handling
- Comprehensive error handling for camera access, location services, and image processing
- User-friendly error messages displayed via the `showStatus()` function
- Graceful fallbacks when certain APIs aren't available

### Metadata Handling
- Form data is stored as UserComment in EXIF data
- GPS coordinates are stored in EXIF GPS section with precision
- Date/time is stored in DateTimeOriginal field
- Image orientation is handled to ensure proper display

### Browser Compatibility
The application is designed to work across modern browsers:
- Chrome 50+
- Firefox 54+
- Edge 79+
- Safari 11.1+
- iOS Safari 11.3+

## Key Components

### Camera Module (`startCamera()`, `takePhoto()`)
Handles camera access with fallback mechanisms for different camera types and orientations.

### Metadata Module (`addMetadataToImage()`, `correctImageOrientation()`)
Processes images and embeds form data, GPS coordinates, and timestamps as EXIF metadata.

### Storage Module (`saveToGallery()`)
Saves processed images to device gallery with timestamp and logo overlay.

### PWA Module
Service worker implementation for offline functionality and manifest configuration for app installation.

### Service Worker Improvements
Recent enhancements to the service worker for better cross-device compatibility include:
- Implementation of separate caches for static and runtime assets
- More robust error handling and fallback strategies
- Network-first strategy for navigation requests with fallback to cached content
- Cache-first strategy for static assets with proper response validation
- Improved cache management and cleanup
- Better handling of cross-origin requests
- Proper implementation of `skipWaiting()` and `clients.claim()` for immediate activation

### GPS Precision Improvements
Recent enhancements to GPS precision include:
- Enhanced geolocation options with `enableHighAccuracy: true` and extended timeout to allow for better GPS fix
- Storage of additional GPS parameters including accuracy, altitude accuracy, heading, and speed
- Improved precision in EXIF GPS data using 6 decimal places (microdegrees) instead of 4
- Addition of GPSDOP (Dilution of Precision) to represent accuracy in metadata
- Enhanced GPS timestamp information with both date and time stamps
- Display of GPS accuracy information on images (±X meters)
- Higher precision calculation of coordinates using rational values with more significant digits
- Proper handling of GPS accuracy data when available
- Continuous GPS monitoring during form filling to capture the most accurate location reading
- Implementation of a GPS "watcher" that tracks the best available location (lowest accuracy value) while the user completes the form
- Real-time display of GPS accuracy updates during form completion
- Automatic stopping of GPS watching when metadata is saved or when moving to a new capture
- Improved location accuracy by allowing extended time for GPS signal refinement during form completion

### Zoom Functionality
Added zoom controls to enhance user experience:
- Zoom in and zoom out buttons with visual indicators
- Real-time zoom level display (e.g., "1x", "2x", etc.)
- Automatic detection of camera zoom capabilities
- Support for both optical and digital zoom depending on device capabilities
- Zoom constraints to prevent over-zooming beyond camera capabilities
- Disabled zoom controls when camera is not active
- Zoom level resets to 1x when starting a new capture
- Intuitive UI with dedicated zoom controls

### UI Improvements
Optimized camera interface for better user experience:
- Removed redundant start camera button since camera starts automatically on page load
- Cleaner, more focused interface with reduced button clutter
- Better visual hierarchy with zoom controls positioned optimally
- Automatic camera initialization eliminates unnecessary user step
- Streamlined workflow from camera activation to photo capture

### Camera Stability Improvements
Enhanced camera initialization and management for better reliability:
- Robust automatic camera startup with multiple fallback options
- Proper resource management with correct stream disposal
- Enhanced error handling with informative user messages
- Improved camera restart functionality for error recovery
- Better DOM readiness checks before initializing camera
- More reliable video track management and cleanup
- Optimized timing for camera initialization after page load