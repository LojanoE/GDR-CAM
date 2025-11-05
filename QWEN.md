# GDR-CAM Project Context

## Project Overview

GDR-CAM is a Progressive Web App (PWA) for capturing photos with embedded metadata. The application allows users to take photos and fill out a form with observation details, which are then stored as EXIF metadata in the captured image. It's designed to work completely offline and is optimized for mobile devices.

### Key Features:

- **Photo Capture:** Uses device camera with support for both front and rear cameras (with fallbacks)
- **Metadata Integration:** Form data (work front, coronation, observation type, activity) and GPS coordinates are embedded in EXIF data
- **Offline Functionality:** Works without internet connection using service workers
- **Cross-platform:** Compatible with mobile and desktop browsers
- **Image Processing:** Adds timestamps and logos to captured images
- **Metadata Verification:** Modal display to view embedded metadata
- **Gallery Integration:** Automatic saving to device gallery with sharing API fallback
- **Proper Image Orientation:** Corrects image orientation based on device rotation and EXIF data
- **Installable PWA:** Full PWA functionality with proper manifest and service worker

### Technologies Used:

- **Frontend:** HTML5, CSS3, JavaScript
- **Camera APIs:** `getUserMedia`, `ImageCapture`
- **Metadata Libraries:** `exif.js`, `piexif.js`
- **PWA Components:** Service Worker, Web App Manifest
- **Geolocation:** GPS coordinate capture with accuracy
- **File System:** Image saving with proper EXIF handling

## Project Structure

```
GDR-CAM/
├── index.html          # Main application page
├── app.js              # Core application logic
├── style.css           # Application styling
├── exif.js             # EXIF metadata reading library
├── piexif.js           # EXIF metadata writing library
├── test.html           # Testing functionality page
├── GEMINI.md           # Code assistant documentation
├── README.md           # Project documentation
├── sw.js               # (Not found - likely referenced in code)
├── manifest.json       # (Not found - likely referenced in code)
├── img/                # Image assets
│   ├── ECUACORRIENTE.png
│   ├── icon-512x512.png
│   └── LOGO GDR.jpeg
└── Python tools        # EXIF reading utilities
    ├── read_metadata.py
    ├── simple_exif_check.py
    └── verify_metadata.py
```

## Application Flow

1. **Camera Initialization:** On page load, automatically starts camera with rear-facing as default
2. **Location Capture:** Gets GPS coordinates with high accuracy
3. **Photo Capture:** Takes high-quality photo (up to 4096x2160) using `ImageCapture` API
4. **Metadata Form:** User completes observation form with work details
5. **EXIF Processing:** Embeds form data and GPS coordinates into image EXIF data
6. **Image Enhancement:** Adds timestamp and logo overlay to image
7. **Gallery Saving:** Automatically saves to device gallery with sharing API
8. **Result Display:** Shows preview with option to view, save again, or take new photo

## Key Implementation Details

### Metadata Handling:
- Uses `piexif.js` to embed JSON form data in `UserComment` EXIF field
- GPS coordinates stored in standard EXIF GPS tags with high precision
- Timestamps added in both EXIF and as visual overlay
- Image orientation correction applied based on EXIF data

### Camera Operations:
- Prioritizes rear-facing camera at maximum resolution
- Fallback to front-facing camera if rear is unavailable
- Uses `ImageCapture` API for highest quality photos
- Canvas fallback for compatibility

### Form Fields:
- Work Front: `work-front`
- Coronation: `coronation`
- Observation Category: `observation-category` (rutina/liberacion/novedad/importante)
- Activity Performed: `activity-performed` (textarea)

## Building and Running

This is a static web project with no build process required.

### Local Development:
1. Serve files using a local web server (required for camera access and service workers)
2. Recommended commands:
   - Python: `python -m http.server 8000`
   - Node: `npx serve`
   - PHP: `php -S localhost:8000`

### Important Notes:
- Camera access requires HTTPS or localhost
- Service worker registration happens automatically
- EXIF metadata writing requires the piexif library
- GPS functionality may not work in all environments

## Development Conventions

- Single-page application structure
- Mobile-first responsive design
- Progressive enhancement approach
- Offline-first architecture
- Proper error handling for all user interactions
- Loading indicators for long-running operations
- Asynchronous operations with proper state management

## Testing and Validation

The project includes Python scripts for EXIF metadata verification:
- `read_metadata.py`: Reads EXIF data from images
- `simple_exif_check.py`: Basic EXIF validation
- `verify_metadata.py`: Interactive EXIF data verification

## PWA Files

The application now includes two essential files for PWA functionality:

### sw.js (Service Worker)
- Caches essential application files for offline functionality
- Handles network requests with cache-first strategy
- Properly updates cache versions
- Includes fallback for navigation requests

### manifest.json (Web App Manifest)
- Defines app name, icons, and display properties
- Configures standalone display mode
- Includes proper icon sizes and types
- Sets theme colors and orientation

## Orientation Correction Implementation

The application now properly handles device rotation and image orientation:

### Functions Added:
- `correctImageOrientation()`: Reads EXIF orientation data and applies appropriate transformations
- Modified `takePhoto()` to be asynchronous and apply orientation correction
- Preserved existing `drawTimestampAndLogoOnImage()` orientation handling

### How It Works:
1. Captures image using device camera
2. Reads EXIF orientation data immediately after capture
3. Applies rotation/flip transformations based on EXIF data
4. Stores properly oriented image for further processing
5. Maintains correct orientation through all subsequent operations

## Common Issues and Solutions

1. **Camera Permissions:** Ensure proper permissions are granted in browser settings
2. **GPS Accuracy:** High accuracy GPS may take time to acquire in new locations
3. **EXIF Compatibility:** Some image editing tools may strip EXIF data
4. **iOS Gallery:** Special handling for saving to iOS gallery is implemented
5. **PWA Installation:** Proper service worker and manifest files are now included for reliable installation

This project is designed for field observation work where metadata integrity and location accuracy are critical.