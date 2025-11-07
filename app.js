// GDR-CAM Application Logic

// Application state
const appState = {
    stream: null,
    imageCapture: null,
    capturedPhotoDataUrl: null,
    photoWithMetadata: null,
    currentLocation: null,
    bestLocation: null, // Track the best GPS reading found so far
    locationWatcher: null, // Store the GPS watcher ID
    isCameraActive: false,
    imageRotation: 0, // Track current rotation angle
    originalPhotoWithMetadata: null, // Store the original image for rotation operations
    currentZoom: 1.0, // Current zoom level
    maxZoom: 1.0, // Maximum available zoom level
    zoomSupported: false // Whether zoom is supported by the camera
};

// DOM Elements
const elements = {
    video: null,
    canvas: null,
    takePhotoBtn: null,
    zoomInBtn: null,
    zoomOutBtn: null,
    zoomLevelDisplay: null,
    formSection: null,
    resultSection: null,
    photoPreview: null,
    saveMetadataBtn: null,
    newCaptureBtn: null,
    downloadPhotoBtn: null,
    cameraSection: null,
    statusMessage: null,
    saveWithoutFormBtn: null,  // Added this to track the save without form button
    rotateLeftBtn: null,
    rotateRightBtn: null,
};

// Initialize the application
function init() {
    // Get DOM elements
    elements.video = document.getElementById('video');
    elements.canvas = document.getElementById('canvas');
    elements.startCameraBtn = document.getElementById('start-camera');
    elements.takePhotoBtn = document.getElementById('take-photo');
    elements.formSection = document.getElementById('form-section');
    elements.resultSection = document.getElementById('result-section');
    elements.photoPreview = document.getElementById('photo-preview');
    elements.saveMetadataBtn = document.getElementById('save-metadata');
    elements.newCaptureBtn = document.getElementById('new-capture');
    elements.downloadPhotoBtn = document.getElementById('download-photo');
    elements.cameraSection = document.getElementById('camera-section');
    elements.statusMessage = document.getElementById('status-message');
    elements.saveWithoutFormBtn = document.getElementById('save-photo-without-form');
    elements.rotateLeftBtn = document.getElementById('rotate-left');
    elements.rotateRightBtn = document.getElementById('rotate-right');
    elements.zoomInBtn = document.getElementById('zoom-in');
    elements.zoomOutBtn = document.getElementById('zoom-out');
    elements.zoomLevelDisplay = document.getElementById('zoom-level');
    
    // Initialize zoom controls
    initializeZoomControls();
    
    // Attach event listeners
    attachEventListeners();
    
    // Initialize camera automatically on page load
    window.addEventListener('load', () => {
        // Verify service worker support and register
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('ServiceWorker registrado con éxito:', registration);
                })
                .catch(error => {
                    console.log('Error al registrar ServiceWorker:', error);
                });
        }
        
        // Lock screen orientation to portrait if available
        lockScreenOrientation();
        
        // Ensure DOM is ready and start camera automatically
        if (document.readyState === 'complete') {
            autoStartCamera();
        } else {
            window.addEventListener('DOMContentLoaded', () => {
                autoStartCamera();
            });
        }
    });
}

// Function to lock screen orientation to portrait mode
function lockScreenOrientation() {
    if (screen.orientation && screen.orientation.lock) {
        // Modern browsers with Screen Orientation API
        screen.orientation.lock('portrait')
            .then(() => {
                console.log('Screen orientation locked to portrait');
                // Add event listener to unlock when page is hidden
                document.addEventListener('visibilitychange', handleVisibilityChange);
                window.addEventListener('beforeunload', unlockScreenOrientation);
            })
            .catch(error => {
                console.warn('Screen orientation lock failed:', error);
                // Fallback for older browsers or unsupported devices
                attemptFallbackOrientationLock();
            });
    } else {
        // Fallback for older browsers or unsupported devices
        attemptFallbackOrientationLock();
    }
}

// Function to handle visibility change events
function handleVisibilityChange() {
    if (document.hidden) {
        unlockScreenOrientation();
    } else {
        // Re-lock when page becomes visible again
        setTimeout(() => lockScreenOrientation(), 500);
    }
}

// Function to unlock screen orientation
function unlockScreenOrientation() {
    if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
        console.log('Screen orientation unlocked');
    }
}

// Fallback for browsers that don't support Screen Orientation API
function attemptFallbackOrientationLock() {
    // Add CSS to force portrait display
    const style = document.createElement('style');
    style.textContent = `
        @media screen and (orientation: landscape) {
            body {
                transform: rotate(90deg);
                transform-origin: top left;
                width: 100vh;
                height: 100vw;
                overflow: hidden;
                position: absolute;
                top: 0;
                left: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Function to initialize zoom controls
function initializeZoomControls() {
    // Initially disable zoom controls until camera is active
    if (elements.zoomInBtn) elements.zoomInBtn.disabled = true;
    if (elements.zoomOutBtn) elements.zoomOutBtn.disabled = true;
    
    // Update zoom display
    if (elements.zoomLevelDisplay) {
        elements.zoomLevelDisplay.textContent = `${appState.currentZoom.toFixed(1)}x`;
    }
}

// Function to update zoom controls state based on zoom support and current zoom level
function updateZoomControls() {
    if (!appState.zoomSupported) {
        if (elements.zoomInBtn) elements.zoomInBtn.disabled = true;
        if (elements.zoomOutBtn) elements.zoomOutBtn.disabled = true;
        return;
    }
    
    if (elements.zoomInBtn) elements.zoomInBtn.disabled = appState.stream === null;
    if (elements.zoomOutBtn) elements.zoomOutBtn.disabled = appState.stream === null;
    
    // Disable zoom in if at max zoom level
    if (elements.zoomInBtn) {
        elements.zoomInBtn.disabled = (appState.currentZoom >= appState.maxZoom) || (appState.stream === null);
    }
    
    // Disable zoom out if at minimum zoom level (1.0)
    if (elements.zoomOutBtn) {
        elements.zoomOutBtn.disabled = (appState.currentZoom <= 1.0) || (appState.stream === null);
    }
    
    // Update zoom display
    if (elements.zoomLevelDisplay) {
        elements.zoomLevelDisplay.textContent = `${appState.currentZoom.toFixed(1)}x`;
    }
}

// Function to apply zoom to the camera
async function applyZoom(zoomFactor) {
    if (!appState.stream || !appState.zoomSupported) {
        return;
    }
    
    // Clamp zoom factor between 1.0 and max zoom
    const targetZoom = Math.max(1.0, Math.min(zoomFactor, appState.maxZoom));
    
    try {
        const track = appState.stream.getVideoTracks()[0];
        if (track && track.applyConstraints) {
            await track.applyConstraints({
                advanced: [{ zoom: targetZoom }]
            });
            
            // Update state
            appState.currentZoom = targetZoom;
            console.log(`Zoom applied: ${targetZoom}x`);
            
            // Update UI
            updateZoomControls();
        }
    } catch (error) {
        console.warn('Could not apply zoom constraints:', error.message);
        // Fallback: just update the state without applying to the camera
        appState.currentZoom = targetZoom;
        updateZoomControls();
    }
}

// Zoom in function
function zoomIn() {
    const zoomIncrement = 0.5;
    const newZoom = Math.min(appState.currentZoom + zoomIncrement, appState.maxZoom);
    
    if (newZoom > appState.currentZoom) {
        applyZoom(newZoom);
    }
}

// Zoom out function
function zoomOut() {
    const zoomIncrement = 0.5;
    const newZoom = Math.max(appState.currentZoom - zoomIncrement, 1.0);
    
    if (newZoom < appState.currentZoom) {
        applyZoom(newZoom);
    }
}

// Attach all event listeners
function attachEventListeners() {
    elements.takePhotoBtn.addEventListener('click', takePhoto);
    elements.zoomInBtn.addEventListener('click', zoomIn);
    elements.zoomOutBtn.addEventListener('click', zoomOut);
    elements.saveMetadataBtn.addEventListener('click', handleSaveMetadata);
    
    // Add event listener for saving photo without form (only GPS and timestamp)
    elements.saveWithoutFormBtn.addEventListener('click', () => {
        // Use the best location found during the form filling period
        const bestLocationForMetadata = appState.bestLocation || appState.currentLocation;
        
        // Create metadata object with just GPS and timestamp
        const metadata = {
            location: bestLocationForMetadata,
            timestamp: new Date().toLocaleString()
        };
        
        // Show loading indicator
        elements.saveWithoutFormBtn.innerHTML = '<span class="loading"></span> Procesando...';
        elements.saveWithoutFormBtn.disabled = true;
        
        // Stop GPS watching as we're now saving the metadata
        stopLocationWatching();
        
        // Add metadata to the image
        addMetadataToImage(appState.capturedPhotoDataUrl, metadata);
    });
    
    elements.newCaptureBtn.addEventListener('click', newCapture);
    elements.downloadPhotoBtn.addEventListener('click', async () => {
        if (!appState.photoWithMetadata) {
            showStatus('No hay imagen para guardar', 'error');
            return;
        }
        
        // Update button state before calling saveToGallery
        elements.downloadPhotoBtn.innerHTML = '<span class="loading"></span> Guardando...';
        elements.downloadPhotoBtn.disabled = true;
        
        // Apply timestamp and logo before saving to gallery
        const imageToSave = await addTimestampAndLogoToImage(appState.photoWithMetadata);
        
        // Call the consolidated saveToGallery function
        saveToGallery(imageToSave);
    });
    
    // Rotation controls
    elements.rotateLeftBtn.addEventListener('click', () => rotateImage(-90));
    elements.rotateRightBtn.addEventListener('click', () => rotateImage(90));
    
    // Modal functionality
    const viewMetadataBtn = document.getElementById('view-metadata');
    const metadataModal = document.getElementById('metadata-modal');
    const closeButton = document.querySelector('.close-button');
    const metadataDisplay = document.getElementById('metadata-display');

    viewMetadataBtn.addEventListener('click', () => {
        if (appState.photoWithMetadata) {
            try {
                const exifObj = piexif.load(appState.photoWithMetadata);
                let metadataText = '';

                // Display User Comment (form data)
                if (exifObj.Exif && exifObj.Exif[piexif.ExifIFD.UserComment]) {
                    try {
                        let userComment;
                        if (piexif.helper && piexif.helper.decodeFromUnicode) {
                            userComment = piexif.helper.decodeFromUnicode(exifObj.Exif[piexif.ExifIFD.UserComment]);
                        } else {
                            // Fallback: if the decodeFromUnicode method is not available,
                            // try to extract the string manually (assuming ASCII\0 prefix was used)
                            const comment = exifObj.Exif[piexif.ExifIFD.UserComment];
                            if (comment.startsWith('ASCII\0')) {
                                userComment = comment.substring(6); // Remove 'ASCII\0' prefix
                            } else {
                                userComment = comment;
                            }
                        }
                        const jsonData = JSON.parse(userComment);
                        metadataText += 'Datos del Formulario:\n';
                        metadataText += JSON.stringify(jsonData, null, 2);
                        metadataText += '\n\n';
                    } catch (e) {
                        console.error('Error parsing user comment:', e);
                        metadataText += 'Datos del Formulario (no se pudo decodificar):\n';
                        metadataText += exifObj.Exif[piexif.ExifIFD.UserComment] + '\n\n';
                    }
                } else {
                    metadataText += 'No se encontraron datos del formulario en los metadatos.\n\n';
                }

                // Display GPS data
                if (exifObj.GPS && Object.keys(exifObj.GPS).length > 0) {
                    metadataText += 'Datos GPS:\n';
                    
                    // Get GPS coordinates
                    let lat = null, lng = null;
                    let latRef = null, lngRef = null;
                    
                    for (const tag in exifObj.GPS) {
                        const tagName = piexif.GPSIFD[tag] || `Unknown Tag (${tag})`;
                        
                        // Process GPS coordinates
                        if (tag == piexif.GPSIFD.GPSLatitude) {
                            const gpsLat = exifObj.GPS[tag];
                            if (Array.isArray(gpsLat) && gpsLat.length === 3) {
                                // Calculate decimal degrees from DMS
                                const deg = gpsLat[0][0] / gpsLat[0][1];
                                const min = gpsLat[1][0] / gpsLat[1][1];
                                const sec = gpsLat[2][0] / gpsLat[2][1];
                                lat = deg + (min / 60) + (sec / 3600);
                            }
                            metadataText += `${tagName}: ${exifObj.GPS[tag]}\n`;
                        } else if (tag == piexif.GPSIFD.GPSLongitude) {
                            const gpsLng = exifObj.GPS[tag];
                            if (Array.isArray(gpsLng) && gpsLng.length === 3) {
                                // Calculate decimal degrees from DMS
                                const deg = gpsLng[0][0] / gpsLng[0][1];
                                const min = gpsLng[1][0] / gpsLng[1][1];
                                const sec = gpsLng[2][0] / gpsLng[2][1];
                                lng = deg + (min / 60) + (sec / 3600);
                            }
                            metadataText += `${tagName}: ${exifObj.GPS[tag]}\n`;
                        } else if (tag == piexif.GPSIFD.GPSLatitudeRef) {
                            latRef = exifObj.GPS[tag];
                            metadataText += `${tagName}: ${exifObj.GPS[tag]}\n`;
                        } else if (tag == piexif.GPSIFD.GPSLongitudeRef) {
                            lngRef = exifObj.GPS[tag];
                            metadataText += `${tagName}: ${exifObj.GPS[tag]}\n`;
                        } else {
                            // For other GPS tags, just display as is
                            metadataText += `${tagName}: ${exifObj.GPS[tag]}\n`;
                        }
                    }
                    
                    // Display calculated coordinates if available
                    if (lat !== null && lng !== null && latRef && lngRef) {
                        const latSign = latRef === 'S' ? -1 : 1;
                        const lngSign = lngRef === 'W' ? -1 : 1;
                        const calculatedLat = (lat * latSign).toFixed(8);
                        const calculatedLng = (lng * lngSign).toFixed(8);
                        metadataText += `\nCoordenadas calculadas:\n`;
                        metadataText += `Latitud: ${calculatedLat}°\n`;
                        metadataText += `Longitud: ${calculatedLng}°\n`;
                    }
                } else {
                    metadataText += 'No se encontraron datos GPS en los metadatos.\n';
                }
                
                // Display DateTime
                if (exifObj.Exif && exifObj.Exif[piexif.ExifIFD.DateTimeOriginal]) {
                    metadataText += `\nFecha y Hora Original: ${exifObj.Exif[piexif.ExifIFD.DateTimeOriginal]}\n`;
                } else if (exifObj['0th'] && exifObj['0th'][piexif.ImageIFD.DateTime]) {
                    metadataText += `\nFecha y Hora: ${exifObj['0th'][piexif.ImageIFD.DateTime]}\n`;
                }

                metadataDisplay.textContent = metadataText;
                metadataModal.classList.remove('hidden');
            } catch (error) {
                console.error('Error al cargar los metadatos:', error);
                showStatus('Error al cargar los metadatos.', 'error');
            }
        } else {
            showStatus('No hay foto para ver los metadatos.', 'error');
        }
    });

    closeButton.addEventListener('click', () => {
        metadataModal.classList.add('hidden');
    });

    window.addEventListener('click', (event) => {
        if (event.target == metadataModal) {
            metadataModal.classList.add('hidden');
        }
    });
}

// Start camera function
async function startCamera() {
    try {
        // Check if camera access is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('API de getUserMedia no soportada en este navegador');
        }

        appState.isCameraActive = true; // Set early to prevent multiple concurrent attempts
        
        // First try with rear (environment) camera at highest resolution
        let constraints = { 
            video: { 
                facingMode: 'environment',
                width: { ideal: 4096 },  // Maximum resolution available
                height: { ideal: 2160 },
                aspectRatio: { ideal: 16/9 }
            } 
        };
        
        try {
            appState.stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (environmentError) {
            console.warn('Could not access rear camera at maximum resolution, trying with default resolution:', environmentError);
            // If it fails, try with rear camera at default resolution
            try {
                const constraintsFallback = { 
                    video: { facingMode: 'environment' } 
                };
                appState.stream = await navigator.mediaDevices.getUserMedia(constraintsFallback);
            } catch (fallbackError) {
                console.warn('Could not access rear camera, trying with front camera:', fallbackError);
                // If it fails, try with front camera
                const constraintsAlt = { 
                    video: { 
                        facingMode: 'user',
                        width: { ideal: 4096 },  // Maximum resolution available
                        height: { ideal: 2160 },
                        aspectRatio: { ideal: 16/9 }
                    } 
                };
                appState.stream = await navigator.mediaDevices.getUserMedia(constraintsAlt);
            }
        }
        
        if (appState.stream) {
            elements.video.srcObject = appState.stream;
            const track = appState.stream.getVideoTracks()[0];
            if (typeof ImageCapture !== 'undefined'){
                appState.imageCapture = new ImageCapture(track);
            }
            
            // Check if zoom is supported
            await initializeZoomCapabilities(track);
            
            elements.takePhotoBtn.disabled = true; // Disable until location is obtained
            showStatus('Cámara iniciada. Obteniendo ubicación...', 'success');
            
            // Attempt to get location
            await getCurrentLocation();
        } else {
            throw new Error('No se pudo iniciar la cámara');
        }
    } catch (err) {
        // Reset camera state on error
        appState.isCameraActive = false;
        
        // Handle different types of errors with appropriate messages
        if (err.name === 'NotAllowedError') {
            showStatus('Permiso denegado para acceder a la cámara. Por favor, habilite los permisos y recargue la página.', 'error');
        } else if (err.name === 'NotFoundError') {
            showStatus('No se encontró ninguna cámara. Asegúrese de que tenga una cámara conectada.', 'error');
        } else if (err.name === 'NotReadableError') {
            showStatus('No se puede acceder a la cámara porque ya está en uso por otra aplicación.', 'error');
        } else if (err.name === 'OverconstrainedError') {
            showStatus('No se puede acceder a la cámara con las restricciones especificadas.', 'error');
        } else if (err.name === 'SecurityError') {
            showStatus('Acceso a la cámara bloqueado por razones de seguridad.', 'error');
        } else {
            console.error('Error accessing the camera:', err);
            showStatus('Error al acceder a la cámara. Asegúrese de permitir el acceso: ' + err.message, 'error');
        }
    }
}

// Function to initialize zoom capabilities for the camera
async function initializeZoomCapabilities(track) {
    if (!track) {
        console.warn('No video track available for zoom initialization');
        appState.zoomSupported = false;
        appState.maxZoom = 1.0;
        updateZoomControls();
        return;
    }

    // Check if the track supports zoom
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
    
    if (capabilities.zoom) {
        appState.zoomSupported = true;
        // Set max zoom to the maximum supported by the camera, or 10x if no maximum is specified
        appState.maxZoom = capabilities.zoom.max ? Math.min(capabilities.zoom.max, 10) : 10;
        appState.currentZoom = 1.0; // Start at 1x zoom
        
        console.log(`Zoom supported. Max zoom: ${appState.maxZoom}x`);
    } else {
        console.log('Zoom not supported by this camera');
        appState.zoomSupported = false;
        appState.maxZoom = 1.0;
    }
    
    // Update zoom controls to reflect current state
    updateZoomControls();
}

// Attempt to get current location with enhanced precision and start watching for better readings
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        const gpsDisplay = document.getElementById('gps-coords');
        if (navigator.geolocation) {
            // Use more optimistic timeout settings to allow for more accurate GPS fix
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Store all available GPS data for higher precision
                    appState.currentLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,                    // Accuracy in meters
                        altitude: position.coords.altitude,                    // Altitude in meters
                        altitudeAccuracy: position.coords.altitudeAccuracy,    // Altitude accuracy in meters
                        heading: position.coords.heading,                      // Heading in degrees
                        speed: position.coords.speed,                          // Speed in meters/second
                        timestamp: position.timestamp                          // Timestamp of location fix
                    };
                    // Initialize best location with the first reading
                    appState.bestLocation = {...appState.currentLocation};
                    console.log('Initial location obtained:', appState.currentLocation);
                    showStatus(`Ubicación obtenida. Precisión: ±${Math.round(appState.currentLocation.accuracy)}m. Puede tomar una foto.`, 'success');
                    // Display coordinates with higher precision (7 decimal places for better accuracy)
                    gpsDisplay.value = `${position.coords.latitude.toFixed(7)}, ${position.coords.longitude.toFixed(7)}`;
                    elements.takePhotoBtn.disabled = false; // Enable photo taking
                    
                    // Update zoom controls after camera is fully started
                    setTimeout(() => {
                        updateZoomControls();
                    }, 500); // Small delay to ensure everything is ready
                    
                    // Start watching for more precise locations after the initial fix
                    startLocationWatching(gpsDisplay);
                    
                    resolve(position);
                },
                (error) => {
                    let errorMessage = '';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Permiso denegado para acceder a la geolocalización.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'La información de ubicación no está disponible.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'La solicitud para obtener la ubicación ha expirado.';
                            break;
                        case error.UNKNOWN_ERROR:
                        default:
                            errorMessage = 'Ocurrió un error desconocido al obtener la ubicación.';
                            break;
                    }
                    console.warn('Could not obtain initial location:', error.message);
                    showStatus(errorMessage + ' Puede tomar la foto sin datos de GPS.', 'error');
                    gpsDisplay.value = 'No se pudo obtener la ubicación.';
                    elements.takePhotoBtn.disabled = false; // Enable photo taking anyway
                    resolve(null); // Still resolve the promise to continue app flow
                },
                {
                    enableHighAccuracy: true,  // Enable GPS for highest accuracy
                    timeout: 20000,            // Longer timeout to allow for better GPS fix
                    maximumAge: 300000         // Accept cached location up to 5 minutes old
                }
            );
        } else {
            console.warn('Geolocation not supported');
            showStatus('La geolocalización no es compatible con este navegador', 'error');
            gpsDisplay.value = 'Geolocalización no soportada.';
            elements.takePhotoBtn.disabled = false; // Enable photo taking anyway
            resolve(null); // Resolve the promise since geolocation isn't supported
        }
    });
}

// Function to start watching for more precise GPS locations
function startLocationWatching(gpsDisplay) {
    if (appState.locationWatcher) {
        // Clear any existing watcher
        navigator.geolocation.clearWatch(appState.locationWatcher);
    }
    
    // Only start watching if we have initial location permission
    appState.locationWatcher = navigator.geolocation.watchPosition(
        (position) => {
            // Create a new location object with all available data
            const newPosition = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                altitudeAccuracy: position.coords.altitudeAccuracy,
                heading: position.coords.heading,
                speed: position.coords.speed,
                timestamp: position.timestamp
            };
            
            // Check if this is the best location we've received so far (by accuracy)
            if (!appState.bestLocation || (newPosition.accuracy && newPosition.accuracy < appState.bestLocation.accuracy)) {
                console.log(`Better location found! Previous: ±${appState.bestLocation.accuracy}m, New: ±${newPosition.accuracy}m`);
                appState.bestLocation = { ...newPosition };
            }

            // Update the display with the latest best location
            if (gpsDisplay && appState.bestLocation) {
                gpsDisplay.value = `${appState.bestLocation.latitude.toFixed(7)}, ${appState.bestLocation.longitude.toFixed(7)} (±${Math.round(appState.bestLocation.accuracy)}m)`;
            }
        },
        (error) => {
            console.warn('Error in location watching:', error.message);
            // Continue operation even if location updates fail
        },
        {
            enableHighAccuracy: true, // Use GPS for highest accuracy
            timeout: 30000,           // Timeout for each update
            maximumAge: 10000         // Accept cached positions up to 10 seconds old to reduce battery/CPU usage
        }
    );
}

// Function to stop watching GPS locations when no longer needed
function stopLocationWatching() {
    if (appState.locationWatcher) {
        navigator.geolocation.clearWatch(appState.locationWatcher);
        appState.locationWatcher = null;
    }
}

// Function to crop an image to a specific aspect ratio (e.g., 16:9)
function cropToAspectRatio(imageDataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const originalWidth = img.width;
            const originalHeight = img.height;

            // Determine if the image is portrait or landscape
            const isPortrait = originalHeight > originalWidth;
            const targetAspectRatio = isPortrait ? 9 / 16 : 16 / 9;

            const originalAspectRatio = originalWidth / originalHeight;

            // If the aspect ratio is already correct (with a small tolerance), no need to crop
            if (Math.abs(originalAspectRatio - targetAspectRatio) < 0.01) {
                resolve(imageDataUrl);
                return;
            }

            let sx, sy, sWidth, sHeight;

            // Calculate cropping dimensions
            if (originalAspectRatio > targetAspectRatio) {
                // Image is wider than target, crop width (horizontal crop)
                sHeight = originalHeight;
                sWidth = originalHeight * targetAspectRatio;
                sx = (originalWidth - sWidth) / 2;
                sy = 0;
            } else {
                // Image is taller than target, crop height (vertical crop)
                sWidth = originalWidth;
                sHeight = originalWidth / targetAspectRatio;
                sx = 0;
                sy = (originalHeight - sHeight) / 2;
            }

            const canvas = document.createElement('canvas');
            canvas.width = sWidth;
            canvas.height = sHeight;
            const ctx = canvas.getContext('2d');

            // Draw the cropped portion of the image onto the canvas
            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

            // Get the cropped image as a data URL
            resolve(canvas.toDataURL('image/jpeg', 0.98));
        };
        img.onerror = () => reject(new Error('Error al cargar la imagen para recortar.'));
        img.src = imageDataUrl;
    });
}

// Take photo
async function takePhoto() {
    const processImage = async (imageSource) => {
        try {
            const canvas = document.createElement('canvas');
            // Use actual video/source dimensions for maximum quality
            const width = imageSource.videoWidth || imageSource.width;
            const height = imageSource.videoHeight || imageSource.height;
            
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            
            // Draw the image with maximum quality
            context.drawImage(imageSource, 0, 0, width, height);
            
            // Capture with maximum quality (98%)
            let imageDataUrl = canvas.toDataURL('image/jpeg', 0.98);

            // Correct the image orientation based on EXIF data before storing
            try {
                imageDataUrl = await correctImageOrientation(imageDataUrl);
            } catch (orientationError) {
                console.warn('Could not correct image orientation:', orientationError);
                // If orientation correction fails, use the original image
            }

            // Crop the image to 16:9 or 9:16 aspect ratio
            try {
                const croppedImageDataUrl = await cropToAspectRatio(imageDataUrl);
                appState.capturedPhotoDataUrl = croppedImageDataUrl;
            } catch (cropError) {
                console.error('Error al recortar la imagen:', cropError);
                appState.capturedPhotoDataUrl = imageDataUrl; // Use uncropped image on error
            }

            // Stop video tracks properly
            if (appState.stream) {
                appState.stream.getTracks().forEach(track => track.stop());
                appState.stream = null;
            }
            elements.video.srcObject = null;
            elements.cameraSection.classList.add('hidden');
            elements.formSection.classList.remove('hidden');
            elements.takePhotoBtn.disabled = true;
            appState.isCameraActive = false;
            
            // Update the GPS display with the best location found so far
            if (appState.bestLocation) {
                const gpsDisplay = document.getElementById('gps-coords');
                gpsDisplay.value = `${appState.bestLocation.latitude.toFixed(7)}, ${appState.bestLocation.longitude.toFixed(7)} (±${Math.round(appState.bestLocation.accuracy)}m)`;
            }
        } catch (error) {
            console.error('Error processing the captured image:', error);
            showStatus('Error al procesar la imagen capturada.', 'error');
        }
    };

    if (appState.imageCapture) {
        // Set up options for maximum image quality
        const photoSettings = {
            imageWidth: 4096,  // Maximum resolution
            imageHeight: 2160,
            fillLightMode: 'auto'  // Adjust according to lighting conditions
        };
        
        appState.imageCapture.takePhoto(photoSettings)
            .then(blob => {
                const image = new Image();
                image.src = URL.createObjectURL(blob);
                image.onload = async () => {
                    await processImage(image);
                };
                image.onerror = (error) => {
                    console.error('Error loading captured photo:', error);
                    showStatus('Error al cargar la foto capturada.', 'error');
                };
            })
            .catch(error => {
                console.error('Error taking photo:', error);
                console.log('Trying with default settings...');
                // If it fails with high-resolution settings, try with default
                appState.imageCapture.takePhoto()
                    .then(blob => {
                        const image = new Image();
                        image.src = URL.createObjectURL(blob);
                        image.onload = async () => {
                            await processImage(image);
                        };
                        image.onerror = (error) => {
                            console.error('Error loading captured photo with default settings:', error);
                            showStatus('Error al cargar la foto capturada.', 'error');
                        };
                    })
                    .catch(error2 => {
                        console.error('Error taking photo with default settings:', error2);
                        showStatus('Error al tomar la foto. Intente recargar la página.', 'error');
                    });
            });
    } else {
        await processImage(elements.video);
    }
}

// Handle save metadata
function handleSaveMetadata() {
    const workFront = document.getElementById('work-front').value;
    const coronation = document.getElementById('coronation').value;
    const activityPerformed = document.getElementById('activity-performed').value;
    const observationCategory = document.getElementById('observation-category').value;
    
    if (!workFront || !coronation || !observationCategory) {
        showStatus('Por favor complete todos los campos del formulario.', 'error');
        return;
    }
    
    // Use the best location found during the form filling period
    const bestLocationForMetadata = appState.bestLocation || appState.currentLocation;
    
    // Create metadata object
    const metadata = {
        workFront,
        coronation,
        activityPerformed,
        observationCategory,
        location: bestLocationForMetadata,
        timestamp: new Date().toLocaleString() // Using local time format instead of ISO string
    };
    
    // Show loading indicator
    elements.saveMetadataBtn.innerHTML = '<span class="loading"></span> Procesando...';
    elements.saveMetadataBtn.disabled = true;
    
    // Stop GPS watching as we're now saving the metadata
    stopLocationWatching();
    
    // Add metadata to image
    addMetadataToImage(appState.capturedPhotoDataUrl, metadata);
}

// Function to get the EXIF orientation of the image
function getImageOrientation(imageDataUrl) {
    return new Promise((resolve) => {
        // Load the image to check its EXIF data
        const img = new Image();
        img.onload = function() {
            // Use exif.js to read the orientation
            EXIF.getData(img, function() {
                const orientation = EXIF.getTag(this, "Orientation");
                resolve(orientation || 1); // Default to 1 if no orientation found
            });
        };
        img.onerror = function() {
            resolve(1); // Default orientation if image fails to load
        };
        img.src = imageDataUrl;
    });
}

// Function to correct image orientation based on EXIF data
function correctImageOrientation(imageDataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            EXIF.getData(img, function() {
                const orientation = EXIF.getTag(this, "Orientation");
                
                if (!orientation || orientation === 1) {
                    // No rotation needed, return original image
                    resolve(imageDataUrl);
                    return;
                }
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas dimensions based on orientation
                let { width, height } = img;
                if (orientation >= 5 && orientation <= 8) {
                    [width, height] = [height, width]; // Swap dimensions for rotated images
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Apply transformations based on EXIF orientation
                ctx.save();
                
                switch (orientation) {
                    case 2:
                        // Flip horizontal
                        ctx.translate(width, 0);
                        ctx.scale(-1, 1);
                        break;
                    case 3:
                        // Rotate 180
                        ctx.translate(width, height);
                        ctx.rotate(Math.PI);
                        break;
                    case 4:
                        // Flip vertical
                        ctx.translate(0, height);
                        ctx.scale(1, -1);
                        break;
                    case 5:
                        // Flip along top-left to bottom-right diagonal
                        ctx.rotate(0.5 * Math.PI);
                        ctx.scale(1, -1);
                        break;
                    case 6:
                        // Rotate 90
                        ctx.rotate(0.5 * Math.PI);
                        ctx.translate(0, -height);
                        break;
                    case 7:
                        // Flip along top-right to bottom-left diagonal
                        ctx.rotate(0.5 * Math.PI);
                        ctx.translate(width, -height);
                        ctx.scale(-1, 1);
                        break;
                    case 8:
                        // Rotate -90
                        ctx.rotate(-0.5 * Math.PI);
                        ctx.translate(-width, 0);
                        break;
                    default:
                        // No rotation needed
                        ctx.restore();
                        resolve(imageDataUrl);
                        return;
                }
                
                // Draw the image on the canvas with correct orientation
                ctx.drawImage(img, 0, 0, img.width, img.height);
                ctx.restore();
                
                // Convert canvas back to data URL
                const correctedImage = canvas.toDataURL('image/jpeg', 0.98);
                resolve(correctedImage);
            });
        };
        
        img.onerror = function() {
            reject(new Error('Error loading image for orientation correction'));
        };
        
        img.src = imageDataUrl;
    });
}

// Function to draw date/time and logo on image ensuring labels remain horizontal
function drawTimestampAndLogoOnImage(imageDataUrl, timestamp) {
    return new Promise(async (resolve, reject) => {
        const img = new Image();
        img.onload = async function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Get the actual image orientation from EXIF data
            const imageOrientation = await getImageOrientation(imageDataUrl);
            
            // Set canvas dimensions based on image orientation
            if (imageOrientation === 6 || imageOrientation === 8) { // 90° or 270° rotated
                canvas.width = img.height;
                canvas.height = img.width;
            } else { // Normal or 180° rotated
                canvas.width = img.width;
                canvas.height = img.height;
            }

            // Apply transformations based on EXIF orientation to correctly orient the image
            ctx.save();
            
            switch (imageOrientation) {
                case 2: // Horizontal flip
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                    break;
                case 3: // 180° rotate left
                    ctx.translate(canvas.width, canvas.height);
                    ctx.rotate(Math.PI);
                    break;
                case 4: // Vertical flip
                    ctx.translate(0, canvas.height);
                    ctx.scale(1, -1);
                    break;
                case 5: // Vertical flip + 90 rotate right
                    ctx.rotate(0.5 * Math.PI);
                    ctx.scale(1, -1);
                    break;
                case 6: // 90° rotate right
                    ctx.rotate(0.5 * Math.PI);
                    ctx.translate(0, -canvas.width);
                    break;
                case 7: // Horizontal flip + 90 rotate right
                    ctx.rotate(0.5 * Math.PI);
                    ctx.translate(canvas.height, -canvas.width);
                    ctx.scale(-1, 1);
                    break;
                case 8: // 90° rotate left
                    ctx.rotate(-0.5 * Math.PI);
                    ctx.translate(-canvas.height, 0);
                    break;
            }

            // Draw the image with correct orientation
            ctx.drawImage(img, 0, 0);

            // Restore the context to its original state before adding text/logo
            // This ensures text/logo will be drawn in horizontal orientation
            ctx.restore();

            // Calculate dimensions for logo and text based on the original canvas dimensions
            let canvasWidth, canvasHeight;
            if (imageOrientation === 6 || imageOrientation === 8) { // 90° or 270° rotated
                canvasWidth = img.height;
                canvasHeight = img.width;
            } else { // Normal or 180° rotated
                canvasWidth = img.width;
                canvasHeight = img.height;
            }

            // For the preview, we don't add the timestamp and logo immediately
            // Instead, we'll add them later after the user confirms the orientation
            resolve(canvas.toDataURL('image/jpeg', 0.98));
        };
        
        img.onerror = function() {
            reject(new Error('Error loading image'));
        };
        
        img.src = imageDataUrl;
    });
}

// Function to add metadata to the image
async function addMetadataToImage(imageDataUrl, metadata) {
    console.log("Starting addMetadataToImage");
    console.log("imageDataUrl (first 100 characters):", imageDataUrl.slice(0, 100));
    
    try {
        // Add the date and time as text on the image
        const timestampedImage = await drawTimestampAndLogoOnImage(imageDataUrl, metadata.timestamp);
        
        if (typeof piexif !== 'undefined' && piexif.dump) {
            try {
                console.log("Loading EXIF data from image...");
                let exifObj = piexif.load(timestampedImage);
                console.log("EXIF data loaded:", JSON.parse(JSON.stringify(exifObj)));

                if (!exifObj) {
                    console.log("No EXIF data found, creating empty object.");
                    exifObj = {"0th": {}, "Exif": {}, "GPS": {}, "Interop": {}, "thumbnail": null};
                }

                console.log("Metadata to add:", metadata);
                
                // Only add UserComment if there's form data
                if (metadata.workFront || metadata.coronation || metadata.activityPerformed || metadata.observationCategory) {
                    // Handle the encoding of the user comment
                    let userComment;
                    if (piexif.helper && piexif.helper.encodeToUnicode) {
                        try {
                            userComment = piexif.helper.encodeToUnicode(JSON.stringify(metadata));
                        } catch (encodingError) {
                            console.warn("Unicode encoding failed, using fallback:", encodingError);
                            // Fallback: try to use the simpler ASCII encoding
                            userComment = "ASCII\0" + JSON.stringify(metadata);
                        }
                    } else {
                        // Fallback: try to use the simpler ASCII encoding
                        // First, ensure metadata is properly stringified and encode safely
                        const metadataStr = JSON.stringify(metadata);
                        // Convert the string to a format that piexif can handle
                        userComment = "ASCII\0" + metadataStr;
                    }
                    
                    exifObj["Exif"][piexif.ExifIFD.UserComment] = userComment;
                    console.log("UserComment added to EXIF object.");
                } else {
                    console.log("No form data, skipping UserComment.");
                }

                if (metadata.location) {
                    console.log("Adding GPS data with enhanced precision...");
                    const lat = metadata.location.latitude;
                    const lng = metadata.location.longitude;
                    
                    // Validate coordinates
                    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                        throw new Error("Coordenadas GPS inválidas");
                    }
                    
                    const latRef = lat >= 0 ? "N" : "S";
                    const lngRef = lng >= 0 ? "E" : "W";
                    const absLat = Math.abs(lat);
                    const absLng = Math.abs(lng);

                    // Calculate degrees, minutes, and seconds with maximum precision
                    // For higher precision GPS, we'll use a better rational approximation
                    const latDeg = Math.floor(absLat);
                    const latMinDecimal = (absLat - latDeg) * 60;
                    const latMin = Math.floor(latMinDecimal);
                    const latSec = (latMinDecimal - latMin) * 60;
                    
                    const lngDeg = Math.floor(absLng);
                    const lngMinDecimal = (absLng - lngDeg) * 60;
                    const lngMin = Math.floor(lngMinDecimal);
                    const lngSec = (lngMinDecimal - lngMin) * 60;

                    exifObj["GPS"] = {
                        [piexif.GPSIFD.GPSVersionID]: [2, 2, 0, 0],
                        [piexif.GPSIFD.GPSLatitudeRef]: latRef,
                        [piexif.GPSIFD.GPSLatitude]: [
                            [Math.round(latDeg), 1], 
                            [Math.round(latMin), 1], 
                            [Math.round(latSec * 1000000), 1000000]  // Increased precision to 6 decimal places
                        ],
                        [piexif.GPSIFD.GPSLongitudeRef]: lngRef,
                        [piexif.GPSIFD.GPSLongitude]: [
                            [Math.round(lngDeg), 1], 
                            [Math.round(lngMin), 1], 
                            [Math.round(lngSec * 1000000), 1000000]  // Increased precision to 6 decimal places
                        ]
                    };

                    // Add altitude if available
                    if (metadata.location.altitude !== null && metadata.location.altitude !== undefined) {
                        const alt = Math.abs(metadata.location.altitude);
                        const altRef = metadata.location.altitude >= 0 ? 0 : 1;
                        exifObj["GPS"][piexif.GPSIFD.GPSAltitudeRef] = altRef;
                        // Use higher precision for altitude (up to 6 decimal places)
                        exifObj["GPS"][piexif.GPSIFD.GPSAltitude] = [Math.round(alt * 1000000), 1000000];
                    }

                    // Add GPS accuracy (DOP - Dilution of Precision)
                    if (metadata.location.accuracy !== undefined) {
                        // Convert accuracy in meters to GPS DOP (Dilution of Precision)
                        // This is a simplified conversion; for more accurate conversion, more complex algorithms are needed
                        const accuracy = metadata.location.accuracy;
                        // Use the accuracy value directly to represent precision (lower is better)
                        exifObj["GPS"][piexif.GPSIFD.GPSDOP] = [Math.round(accuracy * 100), 100]; // Higher precision
                    }

                    // Add date and time stamp if available
                    if (metadata.location.timestamp) {
                        const date = new Date(metadata.location.timestamp);
                        // Format for GPS date stamp (YYYY:MM:DD)
                        const gpsDate = date.getFullYear() + ":" + 
                            String(date.getMonth() + 1).padStart(2, '0') + ":" + 
                            String(date.getDate()).padStart(2, '0');
                        
                        exifObj["GPS"][piexif.GPSIFD.GPSDateStamp] = gpsDate;
                        
                        // Add GPS time stamp (HH:MM:SS)
                        const gpsTime = String(date.getHours()).padStart(2, '0') + ":" + 
                            String(date.getMinutes()).padStart(2, '0') + ":" + 
                            String(date.getSeconds()).padStart(2, '0');
                        
                        // GPS time should be in atomic clock reference
                        exifObj["GPS"][piexif.GPSIFD.GPSTimeStamp] = [
                            [date.getHours(), 1],
                            [date.getMinutes(), 1],
                            [date.getSeconds(), 1]
                        ];
                    }

                    // Add altitude accuracy if available
                    if (metadata.location.altitudeAccuracy !== null && metadata.location.altitudeAccuracy !== undefined) {
                        exifObj["GPS"][piexif.GPSIFD.GPSHPositioningError] = [Math.round(metadata.location.altitudeAccuracy * 1000000), 1000000]; // Horizontal positioning error
                    }

                    // Add heading if available (direction of travel)
                    if (metadata.location.heading !== null && metadata.location.heading !== undefined) {
                        if (metadata.location.heading >= 0 && metadata.location.heading <= 360) {
                            exifObj["GPS"][piexif.GPSIFD.GPSImgDirectionRef] = "T"; // True direction
                            exifObj["GPS"][piexif.GPSIFD.GPSImgDirection] = [Math.round(metadata.location.heading * 1000000), 1000000]; // Heading in degrees
                        }
                    }

                    // Add speed if available
                    if (metadata.location.speed !== null && metadata.location.speed !== undefined) {
                        exifObj["GPS"][piexif.GPSIFD.GPSSpeedRef] = "K"; // km/h
                        // Convert m/s to km/h: m/s * 3.6 = km/h
                        const speedKmh = metadata.location.speed * 3.6;
                        exifObj["GPS"][piexif.GPSIFD.GPSSpeed] = [Math.round(speedKmh * 1000000), 1000000];
                    }

                    console.log("Enhanced GPS data added:", exifObj["GPS"]);
                }

                const now = new Date();
                const dateTimeOriginal = now.getFullYear() + ":" + 
                    String(now.getMonth() + 1).padStart(2, '0') + ":" + 
                    String(now.getDate()).padStart(2, '0') + " " +
                    String(now.getHours()).padStart(2, '0') + ":" + 
                    String(now.getMinutes()).padStart(2, '0') + ":" + 
                    String(now.getSeconds()).padStart(2, '0');
                exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = dateTimeOriginal;
                exifObj["0th"][piexif.ImageIFD.DateTime] = dateTimeOriginal;
                
                // Don't add orientation tag since we already applied rotation to canvas
                // exifObj["0th"][piexif.ImageIFD.Orientation] = 1; // Consider image as normal orientation
                console.log("Final EXIF object before 'dump':", JSON.parse(JSON.stringify(exifObj)));

                const exifBytes = piexif.dump(exifObj);
                console.log("EXIF data converted to bytes.");

                const newImage = piexif.insert(exifBytes, timestampedImage);
                console.log("New image created with inserted EXIF data.");

                appState.photoWithMetadata = newImage;
                appState.originalPhotoWithMetadata = newImage; // Store original for rotation
                elements.photoPreview.src = newImage;
                
                // If the preview image is not correctly oriented for display, we may need to correct it specifically for the preview
                // The image should already be corrected by drawTimestampAndLogoOnImage, but let's ensure preview shows correctly
                elements.formSection.classList.add('hidden');
                elements.resultSection.classList.remove('hidden');
                showStatus('¡Foto guardada con metadatos! Confirme la orientación y guarde en galería.', 'success');
                
                // Reset both buttons if they exist
                if (elements.saveMetadataBtn) {
                    elements.saveMetadataBtn.innerHTML = 'Guardar Foto con Metadatos';
                    elements.saveMetadataBtn.disabled = false;
                }
                if (elements.saveWithoutFormBtn) {
                    elements.saveWithoutFormBtn.innerHTML = 'Guardar Foto sin Formulario';
                    elements.saveWithoutFormBtn.disabled = false;
                }

            } catch (err) {
                console.error('Error in addMetadataToImage:', err);
                showStatus('Error al guardar los metadatos: ' + err.message, 'error');
                
                // Reset both buttons if they exist
                if (elements.saveMetadataBtn) {
                    elements.saveMetadataBtn.innerHTML = 'Guardar Foto con Metadatos';
                    elements.saveMetadataBtn.disabled = false;
                }
                if (elements.saveWithoutFormBtn) {
                    elements.saveWithoutFormBtn.innerHTML = 'Guardar Foto sin Formulario';
                    elements.saveWithoutFormBtn.disabled = false;
                }
            }
        } else {
            console.warn('piexif is not available.');
            showStatus('La biblioteca para metadatos no está disponible.', 'error');
        }
    } catch (error) {
        console.error('Error drawing timestamp on image:', error);
        showStatus('Error al procesar la imagen: ' + error.message, 'error');
        
        // Reset both buttons if they exist
        if (elements.saveMetadataBtn) {
            elements.saveMetadataBtn.innerHTML = 'Guardar Foto con Metadatos';
            elements.saveMetadataBtn.disabled = false;
        }
        if (elements.saveWithoutFormBtn) {
            elements.saveWithoutFormBtn.innerHTML = 'Guardar Foto sin Formulario';
            elements.saveWithoutFormBtn.disabled = false;
        }
    }
}

// Function to rotate an image by a given angle (without adding timestamp/logo to preview)
async function rotateImage(angle) {
    if (!appState.photoWithMetadata) {
        showStatus('No hay imagen para rotar', 'error');
        return;
    }

    const img = new Image();
    img.onload = async function() {
        // Load the EXIF data from the current image to preserve it
        const exifObj = piexif.load(appState.photoWithMetadata);
        
        // Create a canvas to rotate the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Determine original aspect ratio to preserve it
        const isOriginalPortrait = img.height > img.width;

        // Calculate new canvas dimensions based on rotation, preserving aspect ratio
        const needsDimensionSwap = Math.abs(angle) === 90 || Math.abs(angle) === 270;

        if (needsDimensionSwap) {
            // Swap dimensions for 90/270 degree rotations
            canvas.width = img.height;
            canvas.height = img.width;
        } else {
            // Keep original dimensions for 180 degree rotations
            canvas.width = img.width;
            canvas.height = img.height;
        }
        
        // Save the initial context state
        ctx.save();
        
        // Move to the center of the canvas
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        // Rotate the canvas
        ctx.rotate(angle * Math.PI / 180);
        
        // Draw the image centered on the rotated canvas
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        // Restore the context to avoid adding labels in preview
        ctx.restore();
        
        // Convert canvas back to data URL without adding timestamp/logo
        const rotatedImage = canvas.toDataURL('image/jpeg', 0.98);
        
        // Reinsert the original EXIF data into the rotated image
        const exifBytes = piexif.dump(exifObj);
        const imageWithExif = piexif.insert(exifBytes, rotatedImage);
        
        // Update the preview and app state
        elements.photoPreview.src = imageWithExif;
        appState.photoWithMetadata = imageWithExif;
        
        // Update the rotation angle in app state (keeping within 0-359 range)
        appState.imageRotation = (appState.imageRotation + angle) % 360;
        if (appState.imageRotation < 0) {
            appState.imageRotation += 360;
        }
    };
    
    img.onerror = function() {
        showStatus('Error al cargar la imagen para rotar', 'error');
    };
    
    img.src = appState.photoWithMetadata;
}

// New capture function - now includes starting the camera automatically
function newCapture() {
    elements.resultSection.classList.add('hidden');
    elements.cameraSection.classList.remove('hidden');
    elements.takePhotoBtn.disabled = true;
    
    // Clear form fields
    document.getElementById('work-front').value = '';
    document.getElementById('coronation').value = '';
    document.getElementById('observation-category').value = '';
    document.getElementById('activity-performed').value = '';
    document.getElementById('gps-coords').value = '';
    
    // Restore download button text if it was changed
    if (elements.downloadPhotoBtn.innerHTML.includes('Guardando...') || 
        elements.downloadPhotoBtn.innerHTML.includes('Guardando en galería') || 
        elements.downloadPhotoBtn.innerHTML.includes('Descargando...')) {
        elements.downloadPhotoBtn.innerHTML = 'Guardar en Galería';
        elements.downloadPhotoBtn.disabled = false;
    }
    
    // Reset rotation state
    appState.imageRotation = 0;
    appState.originalPhotoWithMetadata = null;
    
    // Stop location watching when starting a new capture
    stopLocationWatching();
    
    // Reset zoom state
    appState.currentZoom = 1.0;
    updateZoomControls();
    
    // Start camera automatically when returning to camera view
    if (!appState.isCameraActive) {
        startCamera();
    }
}

// Function to start camera automatically on page load with enhanced stability
function autoStartCamera() {
    // Only start camera if no active stream
    if (!appState.stream && !appState.isCameraActive) {
        console.log('Attempting to start camera automatically...');
        
        // Use setTimeout to ensure DOM is fully loaded
        setTimeout(() => {
            startCamera();
        }, 100); // Small delay to ensure everything is ready
    }
}

// Enhanced function to restart camera with better error handling
function restartCamera() {
    // Stop any existing stream first
    if (appState.stream) {
        appState.stream.getTracks().forEach(track => track.stop());
        appState.stream = null;
    }
    
    // Reset camera state
    appState.isCameraActive = false;
    
    // Attempt to start camera again
    startCamera();
}

// Function to show status messages
function showStatus(message, type) {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status ${type}`;
    elements.statusMessage.classList.remove('hidden');
    
    setTimeout(() => {
        elements.statusMessage.classList.add('hidden');
    }, 3000);
}

// Function to save to gallery with proper button state handling

async function saveToGallery(imageUrl) {
    // If image has been rotated, apply rotation to original image before saving
    let imageToSave = imageUrl;
    
    if (appState.imageRotation !== 0 && appState.originalPhotoWithMetadata) {
        // Apply rotation to the original image with metadata
        imageToSave = await applyRotationToImage(appState.originalPhotoWithMetadata, appState.imageRotation);
    }

    // Try to save directly to gallery using the File System Access API if supported
    if ('showSaveFilePicker' in window) {
        try {
            const fileHandle = await showSaveFilePicker({
                suggestedName: `gdr-cam-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`,
                types: [{
                    description: 'JPEG Images',
                    accept: { 'image/jpeg': ['.jpg', '.jpeg'] }
                }]
            });
            
            const writable = await fileHandle.createWritable();
            const response = await fetch(imageToSave);
            const blob = await response.blob();
            await writable.write(blob);
            await writable.close();
            
            showStatus('Imagen guardada en la galería', 'success');
            elements.downloadPhotoBtn.innerHTML = 'Guardar en Galería';
            elements.downloadPhotoBtn.disabled = false;
            return;
        } catch (error) {
            console.warn('File System Access API failed, falling back to download method:', error);
            // Fall through to the download method below
        }
    }
    
    // Fallback to download method
    saveUsingDownloadAPI(imageToSave);
}

// Function to add timestamp and logo to an image before saving to gallery
async function addTimestampAndLogoToImage(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            // Load the EXIF data from the original image
            const exifObj = piexif.load(imageUrl);
            
            // Get the timestamp from the EXIF data for use on the image
            const timestamp = exifObj['Exif'] && exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal] 
                ? exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal] 
                : new Date().toLocaleString();
            
            // Create a canvas to add timestamp and logo to the image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw the image on the canvas
            ctx.drawImage(img, 0, 0);
            
            // Add the north direction indicator, and timestamp to the image when saving
            const drawOverlays = () => {
                const padding = Math.min(25, canvas.width * 0.02, canvas.height * 0.02); // Make padding proportional to image

                // Draw north direction indicator in the bottom center with white text and black outline
                const fontSize = Math.min(80, Math.max(20, Math.floor(canvas.height * 0.04))); // Scale font with image size
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                const centerX = canvas.width / 2;
                const northY = canvas.height - padding;
                
                // Extract GPS data from EXIF if available
                let gpsInfo = 'N'; // Default if no GPS data
                if (exifObj.GPS) {
                    // Get GPS coordinates from EXIF data
                    let lat = null, lng = null;
                    let latRef = null, lngRef = null;
                    
                    // Process GPS coordinates from EXIF
                    if (exifObj.GPS[piexif.GPSIFD.GPSLatitude]) {
                        const gpsLat = exifObj.GPS[piexif.GPSIFD.GPSLatitude];
                        if (Array.isArray(gpsLat) && gpsLat.length === 3) {
                            // Calculate decimal degrees from DMS (Degrees, Minutes, Seconds)
                            const deg = gpsLat[0][0] / gpsLat[0][1];
                            const min = gpsLat[1][0] / gpsLat[1][1];
                            const sec = gpsLat[2][0] / gpsLat[2][1];
                            lat = deg + (min / 60) + (sec / 3600);
                        }
                    }
                    
                    if (exifObj.GPS[piexif.GPSIFD.GPSLongitude]) {
                        const gpsLng = exifObj.GPS[piexif.GPSIFD.GPSLongitude];
                        if (Array.isArray(gpsLng) && gpsLng.length === 3) {
                            // Calculate decimal degrees from DMS (Degrees, Minutes, Seconds)
                            const deg = gpsLng[0][0] / gpsLng[0][1];
                            const min = gpsLng[1][0] / gpsLng[1][1];
                            const sec = gpsLng[2][0] / gpsLng[2][1];
                            lng = deg + (min / 60) + (sec / 3600);
                        }
                    }
                    
                    latRef = exifObj.GPS[piexif.GPSIFD.GPSLatitudeRef];
                    lngRef = exifObj.GPS[piexif.GPSIFD.GPSLongitudeRef];
                    
                    // Format GPS coordinates if available with higher precision
                    if (lat !== null && lng !== null && latRef && lngRef) {
                        gpsInfo = `N ${Math.abs(lat).toFixed(6)}° ${latRef}, ${Math.abs(lng).toFixed(6)}° ${lngRef}`;
                        
                        // If accuracy is available, add it to the display
                        if (exifObj.GPS[piexif.GPSIFD.GPSDOP]) {
                            const dop = exifObj.GPS[piexif.GPSIFD.GPSDOP];
                            if (Array.isArray(dop) && dop[1] !== 0) {
                                const accuracy = (dop[0] / dop[1]).toFixed(1);
                                gpsInfo += ` (±${accuracy}m)`;
                            }
                        }
                    }
                }
                
                // Draw a simple north arrow symbol above the GPS info with white color and black outline
                ctx.strokeStyle = 'black'; // Black outline
                ctx.lineWidth = 2; // Outline thickness
                ctx.fillStyle = 'white'; // White fill color
                ctx.strokeText('⬆', centerX, northY - fontSize * 0.8);
                ctx.fillText('⬆', centerX, northY - fontSize * 0.8);
                
                // Draw GPS info with white color and black outline
                ctx.strokeText(gpsInfo, centerX, northY);
                ctx.fillText(gpsInfo, centerX, northY);
                
                // Prepare to draw timestamp text in the bottom-right corner with white text and black outline
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';

                const timestampX = canvas.width - padding;
                const timestampY = canvas.height - padding;
                
                // Draw timestamp with white color and black outline
                ctx.strokeStyle = 'black'; // Black outline
                ctx.lineWidth = 2; // Outline thickness
                ctx.fillStyle = 'white'; // White fill color
                ctx.strokeText(timestamp, timestampX, timestampY);
                ctx.fillText(timestamp, timestampX, timestampY);

                // Convert canvas back to data URL
                const imageWithText = canvas.toDataURL('image/jpeg', 0.98);
                
                // Reinsert the original EXIF data into the image with text
                const exifBytes = piexif.dump(exifObj);
                const imageWithExif = piexif.insert(exifBytes, imageWithText);
                
                resolve(imageWithExif);
            };
            
            drawOverlays();
        };
        
        img.onerror = function() {
            reject(new Error('Error loading image'));
        };
        
        img.src = imageUrl;
    });
}

// Apply rotation to an image while preserving its metadata and adding timestamp/logo only when saving
async function applyRotationToImage(imageUrl, rotationAngle) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = async function() {
            // Load the EXIF data from the original image
            const exifObj = piexif.load(imageUrl);
            
            // Get the timestamp from the EXIF data for use on the rotated image
            const timestamp = exifObj['Exif'] && exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal] 
                ? exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal] 
                : new Date().toLocaleString();
            
            // Create a canvas to rotate the image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new canvas dimensions based on rotation
            if (rotationAngle === 90 || rotationAngle === -90 || rotationAngle === 270 || rotationAngle === -270) {
                canvas.width = img.height;
                canvas.height = img.width;
            } else {
                canvas.width = img.width;
                canvas.height = img.height;
            }
            
            // Save the initial context state to restore later
            ctx.save();
            
            // Move to the center of the canvas
            ctx.translate(canvas.width / 2, canvas.height / 2);
            
            // Rotate the canvas
            ctx.rotate(rotationAngle * Math.PI / 180);
            
            // Draw the image centered on the rotated canvas
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            
            // Restore the initial context state to draw text and logo in horizontal orientation
            ctx.restore();
            
            // Draw the north direction indicator, and timestamp horizontally on the rotated image when saving
            const drawOverlays = () => {
                const padding = Math.min(25, canvas.width * 0.02, canvas.height * 0.02); // Make padding proportional to image

                // Draw north direction indicator in the bottom center with white text and black outline
                const fontSize = Math.min(80, Math.max(20, Math.floor(canvas.height * 0.04))); // Scale font with image size
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                const centerX = canvas.width / 2;
                const northY = canvas.height - padding;
                
                // Extract GPS data from EXIF if available
                let gpsInfo = 'N'; // Default if no GPS data
                if (exifObj.GPS) {
                    // Get GPS coordinates from EXIF data
                    let lat = null, lng = null;
                    let latRef = null, lngRef = null;
                    
                    // Process GPS coordinates from EXIF
                    if (exifObj.GPS[piexif.GPSIFD.GPSLatitude]) {
                        const gpsLat = exifObj.GPS[piexif.GPSIFD.GPSLatitude];
                        if (Array.isArray(gpsLat) && gpsLat.length === 3) {
                            // Calculate decimal degrees from DMS (Degrees, Minutes, Seconds)
                            const deg = gpsLat[0][0] / gpsLat[0][1];
                            const min = gpsLat[1][0] / gpsLat[1][1];
                            const sec = gpsLat[2][0] / gpsLat[2][1];
                            lat = deg + (min / 60) + (sec / 3600);
                        }
                    }
                    
                    if (exifObj.GPS[piexif.GPSIFD.GPSLongitude]) {
                        const gpsLng = exifObj.GPS[piexif.GPSIFD.GPSLongitude];
                        if (Array.isArray(gpsLng) && gpsLng.length === 3) {
                            // Calculate decimal degrees from DMS (Degrees, Minutes, Seconds)
                            const deg = gpsLng[0][0] / gpsLng[0][1];
                            const min = gpsLng[1][0] / gpsLng[1][1];
                            const sec = gpsLng[2][0] / gpsLng[2][1];
                            lng = deg + (min / 60) + (sec / 3600);
                        }
                    }
                    
                    latRef = exifObj.GPS[piexif.GPSIFD.GPSLatitudeRef];
                    lngRef = exifObj.GPS[piexif.GPSIFD.GPSLongitudeRef];
                    
                    // Format GPS coordinates if available with higher precision
                    if (lat !== null && lng !== null && latRef && lngRef) {
                        gpsInfo = `N ${Math.abs(lat).toFixed(6)}° ${latRef}, ${Math.abs(lng).toFixed(6)}° ${lngRef}`;
                        
                        // If accuracy is available, add it to the display
                        if (exifObj.GPS[piexif.GPSIFD.GPSDOP]) {
                            const dop = exifObj.GPS[piexif.GPSIFD.GPSDOP];
                            if (Array.isArray(dop) && dop[1] !== 0) {
                                const accuracy = (dop[0] / dop[1]).toFixed(1);
                                gpsInfo += ` (±${accuracy}m)`;
                            }
                        }
                    }
                }
                
                // Draw a simple north arrow symbol above the GPS info with white color and black outline
                ctx.strokeStyle = 'black'; // Black outline
                ctx.lineWidth = 2; // Outline thickness
                ctx.fillStyle = 'white'; // White fill color
                ctx.strokeText('⬆', centerX, northY - fontSize * 0.8);
                ctx.fillText('⬆', centerX, northY - fontSize * 0.8);
                
                // Draw GPS info with white color and black outline
                ctx.strokeText(gpsInfo, centerX, northY);
                ctx.fillText(gpsInfo, centerX, northY);

                // Prepare to draw timestamp text in the bottom-right corner with white text and black outline
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';

                const timestampX = canvas.width - padding;
                const timestampY = canvas.height - padding;
                
                // Draw timestamp with white color and black outline
                ctx.strokeStyle = 'black'; // Black outline
                ctx.lineWidth = 2; // Outline thickness
                ctx.fillStyle = 'white'; // White fill color
                ctx.strokeText(timestamp, timestampX, timestampY);
                ctx.fillText(timestamp, timestampX, timestampY);

                // Convert canvas back to data URL
                const rotatedImageWithText = canvas.toDataURL('image/jpeg', 0.98);
                
                // Reinsert the original EXIF data into the rotated image with text
                const exifBytes = piexif.dump(exifObj);
                const imageWithExif = piexif.insert(exifBytes, rotatedImageWithText);
                
                resolve(imageWithExif);
            };
            
            drawOverlays();
        };
        
        img.onerror = function() {
            reject(new Error('Error loading image for rotation'));
        };
        
        img.src = imageUrl;
    });
}



// Alternative method using the download API with Android optimization

async function saveUsingDownloadAPI(imageUrl) {

    try {
        // For Android, try using the download approach with proper MIME type
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // Check if we're on a mobile device (Android/iOS)
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile && navigator.userAgent.indexOf('Android') !== -1) {
            // On Android devices, try to save using the download approach
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `gdr-cam-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
            
            // Trigger the download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the URL object
            URL.revokeObjectURL(url);
            
            // On Android, this saves to Downloads folder which is usually synced with gallery
            showStatus('Imagen guardada en Descargas. Puede aparecer en la Galería en unos segundos.', 'success');
        } else {
            // For non-Android devices, use the standard approach
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `gdr-cam-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
            
            // Trigger the download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the URL object
            URL.revokeObjectURL(url);
            
            showStatus('Imagen guardada en la galería', 'success');
        }
    } catch (error) {
        console.error('Error al guardar imagen con el método de descarga:', error);
        showStatus('Error al guardar la imagen.', 'error');
    } finally {
        // Ensure the button is reset even if the download fails
        if (elements.downloadPhotoBtn.innerHTML.includes('Guardando...')) {
            elements.downloadPhotoBtn.innerHTML = 'Guardar en Galería';
            elements.downloadPhotoBtn.disabled = false;
        }
    }
}



// Initialize the app when DOM is loaded

document.addEventListener('DOMContentLoaded', init);
