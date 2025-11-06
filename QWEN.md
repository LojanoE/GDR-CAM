# GDR-CAM Project Context

## Project Overview
GDR-CAM is a Progressive Web Application (PWA) designed for capturing photos with embedded metadata. The application allows users to take photos using their device's camera, fill out an observation form, and store all data as metadata within the photo. Key features include:

- Photo capture with metadata embedding (EXIF data)
- Form for recording work details (work front, coronation, observation type, activity performed)
- GPS coordinates integration
- Offline functionality through service workers
- Responsive design for mobile, tablet, and desktop
- Gallery saving capability (with special iOS support)

## Project Structure
```
GDR-CAM/
├── app.js                 # Main application logic
├── exif.js                # EXIF metadata reading library
├── piexif.js              # EXIF metadata writing library
├── sw.js                  # Service worker for offline functionality
├── index.html             # Main application page
├── manifest.json          # PWA manifest configuration
├── style.css              # Styling for the application
├── README.md              # Project documentation
├── GEMINI.md              # Additional documentation
├── test_orientation.html  # Test page for orientation functionality
├── img/                   # Images directory
│   ├── ECUACORRIENTE.png  # Background image
│   ├── icon-512x512.png   # App icon
│   └── LOGO GDR.jpeg      # Logo image
└── .gitattributes         # Git attributes configuration
```

## Core Technologies
- **HTML5**: For structure and semantic markup
- **CSS3**: For styling and responsive design
- **JavaScript**: Core application logic
- **getUserMedia API**: For camera access
- **EXIF.js & piexif.js**: For metadata manipulation
- **Service Workers**: For offline functionality
- **Web App Manifest**: For PWA installation

## Key Features & Functionality

### Camera Integration
- Uses `navigator.mediaDevices.getUserMedia()` for camera access
- Prioritizes rear-facing camera at highest resolution (4096x2160)
- Falls back to front-facing camera if rear is unavailable
- Supports zoom functionality with controls for zoom in/out

### GPS Location
- Uses `navigator.geolocation` with high accuracy enabled
- Continuously monitors for improved location precision
- Stores GPS coordinates in EXIF metadata with accuracy indicators
- Includes altitude, heading, and speed if available

### Metadata Embedding
- Embeds form data as UserComment in EXIF metadata
- Stores GPS coordinates as standard EXIF GPS data
- Includes timestamp and date information
- Uses piexif.js for EXIF data manipulation

### Image Processing
- Corrects image orientation based on EXIF data
- Supports image rotation (left/right) while preserving metadata
- Adds timestamp and logo to saved images
- Supports zoom functionality during capture

### Offline Functionality
- Implemented with service worker (sw.js)
- Caches static assets for offline access
- Implements cache-first strategy for static resources
- Network-first strategy with fallback for navigation

### PWA Features
- Web App Manifest for installation
- Service worker for offline functionality
- Responsive design for all device sizes
- Locks screen orientation to portrait mode

## Application Flow
1. Automatically starts camera on page load
2. Acquires GPS location with high accuracy
3. User captures photo using camera interface
4. Form appears for data entry (work front, coronation, etc.)
5. User can view captured photo and rotate if needed
6. Metadata is embedded in the photo EXIF data
7. User can save photo to device gallery

## Key Files & Components

### app.js
Main application file containing:
- Camera initialization and control
- GPS location acquisition
- Form handling and validation
- Image processing and metadata embedding
- UI state management

### sw.js
Service worker implementing:
- Cache strategies for static assets
- Offline functionality
- Runtime caching for dynamic content

### manifest.json
PWA configuration with:
- App name, description, and icons
- Display settings (standalone)
- Theme colors
- Orientation lock

### style.css
Styling system with:
- CSS variables for consistent theming
- Responsive design for all screen sizes
- Custom styling for camera interface
- Form and result display styling

## Development Conventions
- Uses ES6+ JavaScript features
- Modular approach with clear function separation
- Error handling for camera and location permissions
- Asynchronous operations with Promises and async/await
- Responsive design principles

## Building and Running
The application is a client-side web application that requires no build process:

1. Simply open `index.html` in a modern browser
2. The application will automatically register the service worker
3. Camera access and location services will be requested on first use

For development:
- Modify HTML, CSS, or JavaScript files directly
- Test functionality using modern browsers
- Use `test_orientation.html` for orientation testing

## Testing
- The project includes a test page (`test_orientation.html`) for orientation functionality
- All functionality can be tested through the main UI
- Service worker behavior can be observed in browser dev tools