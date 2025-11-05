// GDR-CAM Application Logic

// Application state
const appState = {
    stream: null,
    imageCapture: null,
    capturedPhotoDataUrl: null,
    photoWithMetadata: null,
    currentLocation: null,
    isCameraActive: false,
    imageRotation: 0, // Track current rotation angle
    originalPhotoWithMetadata: null // Store the original image for rotation operations
};

// DOM Elements
const elements = {
    video: null,
    canvas: null,
    startCameraBtn: null,
    takePhotoBtn: null,
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
        
        // Start camera automatically
        autoStartCamera();
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

// Attach all event listeners
function attachEventListeners() {
    elements.startCameraBtn.addEventListener('click', startCamera);
    elements.takePhotoBtn.addEventListener('click', takePhoto);
    elements.saveMetadataBtn.addEventListener('click', handleSaveMetadata);
    
    // Add event listener for saving photo without form (only GPS and timestamp)
    elements.saveWithoutFormBtn.addEventListener('click', () => {
        // Create metadata object with just GPS and timestamp
        const metadata = {
            location: appState.currentLocation,
            timestamp: new Date().toLocaleString()
        };
        
        // Show loading indicator
        elements.saveWithoutFormBtn.innerHTML = '<span class="loading"></span> Procesando...';
        elements.saveWithoutFormBtn.disabled = true;
        
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
        
        // First try with rear (environment) camera at highest resolution
        const constraints = { 
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
        
        elements.video.srcObject = appState.stream;
        const track = appState.stream.getVideoTracks()[0];
        if (typeof ImageCapture !== 'undefined'){
            appState.imageCapture = new ImageCapture(track);
        }
        
        elements.takePhotoBtn.disabled = true; // Disable until location is obtained
        elements.startCameraBtn.disabled = true;
        showStatus('Cámara iniciada. Obteniendo ubicación...', 'success');
        
        // Attempt to get location
        await getCurrentLocation();
        appState.isCameraActive = true;
    } catch (err) {
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
        appState.isCameraActive = false;
    }
}

// Attempt to get current location
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        const gpsDisplay = document.getElementById('gps-coords');
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    appState.currentLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        timestamp: position.timestamp
                    };
                    console.log('Location obtained:', appState.currentLocation);
                    showStatus('Ubicación obtenida. Puede tomar una foto.', 'success');
                    gpsDisplay.value = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
                    elements.takePhotoBtn.disabled = false; // Enable photo taking
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
                    console.warn('Could not obtain location:', error.message);
                    showStatus(errorMessage + ' Puede tomar la foto sin datos de GPS.', 'error');
                    gpsDisplay.value = 'No se pudo obtener la ubicación.';
                    elements.takePhotoBtn.disabled = false; // Enable photo taking anyway
                    resolve(null); // Still resolve the promise to continue app flow
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
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

            appState.capturedPhotoDataUrl = imageDataUrl;

            elements.video.srcObject = null;
            if (appState.stream) {
                appState.stream.getTracks().forEach(track => track.stop());
                appState.stream = null;
            }
            elements.cameraSection.classList.add('hidden');
            elements.formSection.classList.remove('hidden');
            elements.takePhotoBtn.disabled = true;
            elements.startCameraBtn.disabled = false;
            appState.isCameraActive = false;
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
    
    if (!workFront || !coronation || !activityPerformed || !observationCategory) {
        showStatus('Por favor complete todos los campos del formulario.', 'error');
        return;
    }
    
    // Create metadata object
    const metadata = {
        workFront,
        coronation,
        activityPerformed,
        observationCategory,
        location: appState.currentLocation,
        timestamp: new Date().toLocaleString() // Using local time format instead of ISO string
    };
    
    // Show loading indicator
    elements.saveMetadataBtn.innerHTML = '<span class="loading"></span> Procesando...';
    elements.saveMetadataBtn.disabled = true;
    
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
                    console.log("Adding GPS data...");
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
                    
                    // Improve precision by using higher precision rational values
                    // Calculate degrees, minutes, and seconds with higher precision
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
                            [latDeg, 1], 
                            [latMin, 1], 
                            [Math.round(latSec * 10000), 10000]  // Increased precision to 4 decimal places
                        ],
                        [piexif.GPSIFD.GPSLongitudeRef]: lngRef,
                        [piexif.GPSIFD.GPSLongitude]: [
                            [lngDeg, 1], 
                            [lngMin, 1], 
                            [Math.round(lngSec * 10000), 10000]  // Increased precision to 4 decimal places
                        ]
                    };

                    if (metadata.location.altitude !== null && metadata.location.altitude !== undefined) {
                        const alt = Math.abs(metadata.location.altitude);
                        const altRef = metadata.location.altitude >= 0 ? 0 : 1;
                        exifObj["GPS"][piexif.GPSIFD.GPSAltitudeRef] = altRef;
                        exifObj["GPS"][piexif.GPSIFD.GPSAltitude] = [Math.round(alt * 10000), 10000]; // Increased precision
                    }
                    console.log("GPS data added:", exifObj["GPS"]);
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
        
        // Calculate new canvas dimensions based on rotation
        if (angle === 90 || angle === -90 || angle === 270 || angle === -270) {
            canvas.width = img.height;
            canvas.height = img.width;
        } else {
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
    elements.startCameraBtn.disabled = false;
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
    
    // Start camera automatically when returning to camera view
    if (!appState.isCameraActive) {
        startCamera();
    }
}

// Function to start camera automatically on page load
function autoStartCamera() {
    // Only start camera if no active stream
    if (!appState.stream) {
        // Simulate click on start camera button
        elements.startCameraBtn.click();
    }
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
            
            // Add the logo and timestamp to the image when saving 
            const logo = new Image();
            logo.onload = function() {
                const logoHeight = Math.min(320, canvas.height * 0.15); // Make logo proportional to image
                const logoAspectRatio = logo.width / logo.height;
                const logoWidth = logoHeight * logoAspectRatio;
                const logoPadding = Math.min(25, canvas.width * 0.02, canvas.height * 0.02); // Make padding proportional to image

                // Calculate positions for the logo in the bottom-left corner of the canvas
                const logoX = logoPadding;
                const logoY = canvas.height - logoHeight - logoPadding;
                
                // Draw logo with proper positioning
                ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);

                // Prepare to draw timestamp text in the bottom-right corner
                const fontSize = Math.min(80, Math.max(20, Math.floor(canvas.height * 0.04))); // Scale font with image size
                ctx.font = `${fontSize}px Arial`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';

                const timestampX = canvas.width - logoPadding;
                const timestampY = canvas.height - logoPadding;
                ctx.fillText(timestamp, timestampX, timestampY);

                // Convert canvas back to data URL
                const imageWithText = canvas.toDataURL('image/jpeg', 0.98);
                
                // Reinsert the original EXIF data into the image with text
                const exifBytes = piexif.dump(exifObj);
                const imageWithExif = piexif.insert(exifBytes, imageWithText);
                
                resolve(imageWithExif);
            };
            
            logo.onerror = function() {
                // If the logo fails to load, still draw the timestamp
                const fontSize = Math.min(80, Math.max(20, Math.floor(canvas.height * 0.04))); // Scale font with image size
                ctx.font = `${fontSize}px Arial`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';

                const timestampX = canvas.width - 15;
                const timestampY = canvas.height - 15;
                ctx.fillText(timestamp, timestampX, timestampY);

                // Convert canvas back to data URL
                const imageWithText = canvas.toDataURL('image/jpeg', 0.98);
                
                // Reinsert the original EXIF data into the image with text
                const exifBytes = piexif.dump(exifObj);
                const imageWithExif = piexif.insert(exifBytes, imageWithText);
                
                resolve(imageWithExif);
            };
            
            logo.src = 'img/LOGO GDR.jpeg';
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
            
            // Draw the logo and timestamp horizontally on the rotated image when saving
            const logo = new Image();
            logo.onload = function() {
                const logoHeight = Math.min(320, canvas.height * 0.15); // Make logo proportional to image
                const logoAspectRatio = logo.width / logo.height;
                const logoWidth = logoHeight * logoAspectRatio;
                const logoPadding = Math.min(25, canvas.width * 0.02, canvas.height * 0.02); // Make padding proportional to image

                // Calculate positions for the logo in the bottom-left corner of the canvas
                const logoX = logoPadding;
                const logoY = canvas.height - logoHeight - logoPadding;
                
                // Draw logo with proper positioning
                ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);

                // Prepare to draw timestamp text in the bottom-right corner
                const fontSize = Math.min(80, Math.max(20, Math.floor(canvas.height * 0.04))); // Scale font with image size
                ctx.font = `${fontSize}px Arial`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';

                const timestampX = canvas.width - logoPadding;
                const timestampY = canvas.height - logoPadding;
                ctx.fillText(timestamp, timestampX, timestampY);

                // Convert canvas back to data URL
                const rotatedImageWithText = canvas.toDataURL('image/jpeg', 0.98);
                
                // Reinsert the original EXIF data into the rotated image with text
                const exifBytes = piexif.dump(exifObj);
                const imageWithExif = piexif.insert(exifBytes, rotatedImageWithText);
                
                resolve(imageWithExif);
            };
            
            logo.onerror = function() {
                // If the logo fails to load, still draw the timestamp
                const fontSize = Math.min(80, Math.max(20, Math.floor(canvas.height * 0.04))); // Scale font with image size
                ctx.font = `${fontSize}px Arial`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';

                const timestampX = canvas.width - 15;
                const timestampY = canvas.height - 15;
                ctx.fillText(timestamp, timestampX, timestampY);

                // Convert canvas back to data URL
                const rotatedImageWithText = canvas.toDataURL('image/jpeg', 0.98);
                
                // Reinsert the original EXIF data into the rotated image with text
                const exifBytes = piexif.dump(exifObj);
                const imageWithExif = piexif.insert(exifBytes, rotatedImageWithText);
                
                resolve(imageWithExif);
            };
            
            logo.src = 'img/LOGO GDR.jpeg';
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
