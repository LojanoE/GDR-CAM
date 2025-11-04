import piexif
import json
from tkinter import Tk, filedialog

def get_image_path():
    """Opens a file dialog to select an image file."""
    root = Tk()
    root.withdraw()  # Hide the main window
    file_path = filedialog.askopenfilename(
        title="Selecciona una imagen",
        filetypes=[("Archivos de imagen", "*.jpg *.jpeg *.tiff *.tif")]
    )
    root.destroy()
    return file_path

def display_exif_data(image_path):
    """
    Reads and displays EXIF data from an image file,
    focusing on GPS and UserComment.
    """
    try:
        exif_dict = piexif.load(image_path)

        print(f"--- Metadatos EXIF para: {image_path} ---")

        # Display UserComment (form data)
        if piexif.ImageIFD.ExifTag in exif_dict and piexif.ExifIFD.UserComment in exif_dict["Exif"]:
            user_comment_bytes = exif_dict["Exif"][piexif.ExifIFD.UserComment]
            try:
                # Decode the user comment (often stored as unicode or ASCII)
                # Piexif stores it as bytes, so we try to decode
                user_comment_str = user_comment_bytes.decode("utf-8")
                print("\n--- Datos del Formulario (UserComment) ---")
                try:
                    json_data = json.loads(user_comment_str)
                    print(json.dumps(json_data, indent=2))
                except json.JSONDecodeError:
                    print("No es un JSON válido en UserComment:")
                    print(user_comment_str)
            except UnicodeDecodeError:
                print("\n--- Datos del Formulario (UserComment - no se pudo decodificar) ---")
                print(user_comment_bytes)
        else:
            print("\n--- No se encontraron datos del formulario (UserComment) ---")

        # Display GPS data
        if piexif.ImageIFD.GPSTag in exif_dict and exif_dict["GPS"]:
            print("\n--- Datos GPS ---")
            for key, value in exif_dict["GPS"].items():
                tag_name = piexif.TAGS["GPS"].get(key, f"Unknown Tag ({key})")
                if isinstance(value, tuple) and len(value) == 2 and isinstance(value[0], int) and isinstance(value[1], int):
                    # Handle rational numbers (numerator, denominator)
                    if value[1] != 0:
                        print(f"{tag_name}: {value[0] / value[1]}")
                    else:
                        print(f"{tag_name}: {value}")
                else:
                    print(f"{tag_name}: {value}")
        else:
            print("\n--- No se encontraron datos GPS ---")

        print("\n--- Otros Metadatos (resumen) ---")
        for ifd_name in exif_dict:
            if ifd_name == "thumbnail":
                continue
            if ifd_name not in ["0th", "Exif", "GPS", "Interop"]:
                print(f"\n{ifd_name}:")
                for key, value in exif_dict[ifd_name].items():
                    tag_name = piexif.TAGS[ifd_name].get(key, f"Unknown Tag ({key})")
                    print(f"  {tag_name}: {value}")

    except piexif.InvalidImageDataError:
        print(f"Error: El archivo '{image_path}' no contiene datos EXIF válidos o no es un formato de imagen compatible.")
    except FileNotFoundError:
        print(f"Error: El archivo '{image_path}' no fue encontrado.")
    except Exception as e:
        print(f"Ocurrió un error inesperado: {e}")

if __name__ == "__main__":
    print("Este script te ayudará a leer los metadatos EXIF de una imagen.")
    print("Necesitas tener la librería 'Piexif' instalada. Si no la tienes, ejecuta:")
    print("pip install piexif")
    print("También necesitarás 'Pillow' para algunos casos:")
    print("pip install Pillow")
    print("Y 'tkinter' para el diálogo de selección de archivo (generalmente viene con Python):")
    print("pip install tk\n")

    input("Presiona Enter para seleccionar una imagen...")
    selected_image_path = get_image_path()

    if selected_image_path:
        display_exif_data(selected_image_path)
    else:
        print("No se seleccionó ninguna imagen. Saliendo.")
