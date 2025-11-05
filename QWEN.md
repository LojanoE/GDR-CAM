# GDR-CAM Project Context

## Project Overview
GDR-CAM is a Progressive Web Application (PWA) for capturing photos with embedded metadata. The application allows users to take photos using their device's camera, fill out an observation form, and store all form data and GPS coordinates as EXIF metadata within the image file. The app works completely offline and can be installed on mobile devices and PCs.

## Key Features
- Camera capture with maximum resolution support (up to 4K)
- GPS location embedding in image metadata
- Observation form with fields for work front, coronation, activity type, and activity description
- Metadata storage in EXIF format
- Image rotation functionality
- Direct saving to device gallery (with iOS-specific support)
- Cross-platform compatibility
- Offline functionality via Service Worker

## Technologies Used
- HTML5
- CSS3
- JavaScript (ES6+)
- getUserMedia API for camera access
- Canvas API for image processing
- EXIF.js for reading metadata
- piexif.js for writing metadata
- Service Workers for offline functionality
- Web App Manifest for PWA installation
- File System Access API fallback for saving

## Project Structure
```
GDR-CAM/
├── app.js                 # Main application logic
├── exif.js               # Library for reading EXIF data
├── index.html            # Main HTML structure
├── manifest.json         # PWA configuration
├── piexif.js             # Library for writing EXIF data
├── style.css             # CSS styling
├── sw.js                 # Service worker for offline functionality
├── readme_metadata.py    # Python script for reading metadata
├── GEMINI.md             # AI assistant context file
├── img/                  # Image assets
│   ├── ECUACORRIENTE.png # Logo image
│   ├── icon-512x512.png  # App icon
│   └── LOGO GDR.jpeg     # Logo image
└── README.md             # Project documentation
```

## Core Application Logic (app.js)
The main application file contains:
- Camera initialization with rear/front fallback
- GPS location retrieval
- Photo capture with ImageCapture API
- Image orientation correction based on EXIF data
- Metadata embedding (form data + GPS coordinates)
- Image rotation functionality
- Gallery saving with timestamp and logo overlay
- Status messaging system

## Default EXIF Tags Used in the App
The application uses the following EXIF tags when embedding metadata:

### Form Data Tags:
- **ExifIFD.UserComment** - Stores the JSON with form data (workFront, coronation, activityPerformed, observationCategory, location, timestamp)

### GPS Data Tags:
- **GPSIFD.GPSVersionID** - Version of GPS tag (set to [2, 2, 0, 0])
- **GPSIFD.GPSLatitudeRef** - Latitude reference (N/S)
- **GPSIFD.GPSLatitude** - Latitude coordinates in DMS format
- **GPSIFD.GPSLongitudeRef** - Longitude reference (E/W)
- **GPSIFD.GPSLongitude** - Longitude coordinates in DMS format
- **GPSIFD.GPSAltitudeRef** - Altitude reference (0 for above sea level, 1 for below)
- **GPSIFD.GPSAltitude** - Altitude value

### Date/Time Tags:
- **ExifIFD.DateTimeOriginal** - Date and time when the original image was taken
- **ImageIFD.DateTime** - Date and time of image creation

### Image Orientation:
- The app handles image orientation through canvas manipulation and doesn't explicitly set the Orientation EXIF tag since the image is rotated in the canvas before saving

## Building and Running
This is a client-side JavaScript application that runs directly in a web browser. No build step is required.

### To run the application:
1. Serve the files via a local HTTP server (not file://):
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Or using Node.js with serve
   npx serve
   
   # Or using any other local server
   ```
2. Open the application in a modern browser at `http://localhost:8000`
3. Allow camera and location permissions when prompted

### For development:
- The application is designed to work offline after initial load
- Service worker caches all necessary assets
- Changes to JavaScript or CSS require a refresh and potentially service worker update

## Development Conventions
- JavaScript follows standard ES6+ conventions
- Error handling is implemented for camera access, location services, and metadata operations
- The application prioritizes high-resolution image capture
- GPS coordinates are stored with precision in EXIF format
- Form data is stored in the UserComment EXIF field as JSON
- UI elements are responsive and work on mobile and desktop

## Special Considerations
- The app forces portrait orientation during operation
- Automatic fallbacks exist for camera access (environment → user facing)
- High-accuracy GPS is requested with timeout and age limits
- Image rotation functionality preserves metadata
- Logo and timestamp are added when saving to gallery but not to the preview
- The app handles both Android and iOS devices with platform-specific saving logic

## Metadata Handling
- Form data is stored as JSON in the UserComment EXIF field
- GPS coordinates are stored in standard EXIF GPS format
- Date and time are stored in DateTimeOriginal field
- Image orientation is corrected based on embedded EXIF orientation data

## Offline Functionality
- Service worker caches all application assets
- Cache name includes version (currently v34)
- Works offline after initial load
- Navigation requests fall back to main page if network fails

## Graphical Elements Added to Images
When saving photos to the gallery, the application adds the following graphical elements:

### On image save:
1. **Logo watermark** - Placed in the bottom-left corner of the image
   - Logo used is "img/LOGO GDR.jpeg"
   - Size adjusts proportionally (maximum 320px height or 15% of image height)

2. **North direction indicator** - Placed in the bottom-center of the image
   - Representation: Upward arrow symbol (⬆) followed by GPS coordinates if available
   - Format when GPS data is present: `N [lat]° [N/S], [lng]° [E/W]` (e.g., N 0.1234° N, 0.5678° W)
   - Fallback when no GPS data: Simple "N" notation
   - Appearance: White text with black outline for high visibility on any background
   - Font: Bold Arial
   - Location: Between the logo (bottom left) and timestamp (bottom right)

3. **Timestamp** - Placed in the bottom-right corner of the image
   - Format: Capture date and time (e.g., "2023:08:15 14:30:25")
   - Font size scales with image size (between 20px and 80px)
   - Appearance: White text with black outline for high visibility on any background

### Important:
- These graphical elements (logo, north indicator, and timestamp) are only added when saving the photo to the gallery, not in the preview within the app
- In the app preview, the image shows without these graphical elements
- Image rotation can be done within the app, and the graphical elements maintain horizontally correct orientation regardless of image orientation

## Testing
To test the application functionality:
1. Verify camera access works in the browser
2. Test location services
3. Take a photo and fill out the form
4. Verify metadata is embedded correctly using the "View Metadatos" button
5. Test saving to gallery
6. Test rotation functionality