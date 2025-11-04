/* piexifjs

The MIT License (MIT)

Copyright (c) 2014, 2015 hMatoba(https://github.com/hMatoba)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

(function () {
    "use strict";
    var piexif = {};
    piexif.remove = function (jpeg) {
        var b64 = false;
        if (jpeg.slice(0, 2) == "\xff\xd8") {
        } else if (jpeg.slice(0, 23) == "data:image/jpeg;base64," || jpeg.slice(0, 22) == "data:image/jpg;base64,") {
            jpeg = atob(jpeg.split(",")[1]);
            b64 = true;
        } else {
            throw ("Given data is not jpeg.");
        }
        
        var exifIndex = piexif.getExifByteArray(jpeg);
        if (exifIndex) {
            var emptyExif = "\xff\xe1\x00\x02";
            jpeg = jpeg.slice(0, exifIndex[0]) + emptyExif + jpeg.slice(exifIndex[1]);
        }
        
        if (b64) {
            jpeg = "data:image/jpeg;base64," + btoa(jpeg);
        }
        
        return jpeg
    };

    piexif.insert = function (exif, jpeg) {
        var b64 = false;
        if (exif.slice(0, 6) != "\xff\xe1\x00\x00\x45\x78") {
            throw ("Given data is not exif.");
        }
        if (jpeg.slice(0, 2) == "\xff\xd8") {
        } else if (jpeg.slice(0, 23) == "data:image/jpeg;base64," || jpeg.slice(0, 22) == "data:image/jpg;base64,") {
            jpeg = atob(jpeg.split(",")[1]);
            b64 = true;
        } else {
            throw ("Given data is not jpeg.");
        }

        var exifLength = exif.length;
        var lengthHex = exifLength.toString(16);
        if (lengthHex.length < 4) {
            lengthHex = "0000".slice(lengthHex.length) + lengthHex;
        }
        exif = "\xff\xe1" + String.fromCharCode(parseInt(lengthHex.slice(0, 2), 16), parseInt(lengthHex.slice(2, 4), 16)) + exif.slice(4);

        var segments = piexif.splitIntoSegments(jpeg);
        var inserted = false;
        var newJpeg = "";
        for (var i = 0; i < segments.length; i++) {
            var segment = segments[i];
            if (segment.slice(0, 2) == "\xff\xe0" && !inserted) {
                newJpeg += segment + exif;
                inserted = true;
            } else if (segment.slice(0, 2) == "\xff\xe1" && !inserted) {
                if (segment.slice(4, 10) == "\x45\x78\x69\x66\x00\x00") {
                    newJpeg += segment + exif;
                    inserted = true;
                } else {
                    newJpeg += segment.slice(0, 2) + exif + segment.slice(2);
                    inserted = true;
                }
            } else if (segment.slice(0, 2).charCodeAt(0) == 255 && segment.slice(2, 4).charCodeAt(0) == 224 && !inserted) {
                newJpeg += segment + exif;
                inserted = true;
            } else if (i == 0 && segment.slice(0, 2) == "\xff\xd8" && !inserted) {
                newJpeg += segment + exif;
                inserted = true;
            } else {
                newJpeg += segment;
            }
        }
        if (b64) {
            newJpeg = "data:image/jpeg;base64," + btoa(newJpeg);
        }

        return newJpeg
    };

    piexif.load = function (jpeg) {
        var b64 = false;
        if (jpeg.slice(0, 23) == "data:image/jpeg;base64," || jpeg.slice(0, 22) == "data:image/jpg;base64,") {
            jpeg = atob(jpeg.split(",")[1]);
            b64 = true;
        }

        var exifDict = {};
        var exifByteArray = piexif.getExifByteArray(jpeg);
        if (!exifByteArray) {
            return {}
        }
        var header = exifByteArray.slice(0, 10);
        var zeroth = piexif.getIfdData(exifByteArray, 0x0000);
        var exif = piexif.getIfdData(exifByteArray, 0x8769);
        var gps = piexif.getIfdData(exifByteArray, 0x8825);
        var interop = piexif.getIfdData(exifByteArray, 0xa005);
        if (zeroth) {
            exifDict["0th"] = zeroth
        }
        if (exif) {
            exifDict["Exif"] = exif
        }
        if (gps) {
            exifDict["GPS"] = gps
        }
        if (interop) {
            exifDict["Interop"] = interop
        }
        exifDict["thumbnail"] = null;

        return exifDict
    };

    piexif.getExifByteArray = function (jpeg) {
        var segments = piexif.splitIntoSegments(jpeg);
        var app1 = null;
        for (var i = 0; i < segments.length; i++) {
            var seg = segments[i];
            if (seg.slice(0, 2) == "\xff\xe1" && seg.slice(4, 10) == "\x45\x78\x69\x66\x00\x00") {
                app1 = seg;
                break
            }
        }
        if (!app1) {
            return null
        }

        var exifArray = app1.slice(10);
        var exif = [];
        for (var i = 0; i < exifArray.length; i++) {
            exif.push(exifArray.charCodeAt(i));
        }
        return exif
    };

    piexif.getIfdData = function (exifByteArray, ifdOffset) {
        var ifdDict = {};
        var entryNum = exifByteArray.slice(ifdOffset + 2, ifdOffset + 4);
        entryNum = (entryNum[0] << 8) + entryNum[1];
        var offset = ifdOffset + 4;
        for (var i = 0; i < entryNum; i++) {
            var entryOffset = offset + 12 * i;
            var tag = (exifByteArray[entryOffset] << 8) + exifByteArray[entryOffset + 1];
            var type = (exifByteArray[entryOffset + 2] << 8) + exifByteArray[entryOffset + 3];
            var length = (exifByteArray[entryOffset + 4] << 24) + (exifByteArray[entryOffset + 5] << 16) +
                (exifByteArray[entryOffset + 6] << 8) + exifByteArray[entryOffset + 7];
            var valueOffset = (exifByteArray[entryOffset + 8] << 24) + (exifByteArray[entryOffset + 9] << 16) +
                (exifByteArray[entryOffset + 10] << 8) + exifByteArray[entryOffset + 11];
            if (length > 4) {
                valueOffset = (valueOffset[0] << 24) + (valueOffset[1] << 16) + (valueOffset[2] << 8) + valueOffset[3]
            } else {
                valueOffset = entryOffset + 8
            }
            var values = [];
            if (type == 1 || type == 7) {
                for (var j = 0; j < length; j++) {
                    values.push(exifByteArray[valueOffset + j])
                }
            } else if (type == 2) {
                var str = "";
                for (var j = 0; j < length - 1; j++) {
                    str += String.fromCharCode(exifByteArray[valueOffset + j])
                }
                values = str
            } else if (type == 3) {
                for (var j = 0; j < length; j++) {
                    values.push((exifByteArray[valueOffset + j * 2] << 8) + exifByteArray[valueOffset + j * 2 + 1])
                }
            } else if (type == 4) {
                for (var j = 0; j < length; j++) {
                    values.push((exifByteArray[valueOffset + j * 4] << 24) + (exifByteArray[valueOffset + j * 4 + 1] << 16) +
                        (exifByteArray[valueOffset + j * 4 + 2] << 8) + exifByteArray[valueOffset + j * 4 + 3])
                }
            } else if (type == 5) {
                for (var j = 0; j < length; j++) {
                    var numerator = (exifByteArray[valueOffset + j * 8] << 24) + (exifByteArray[valueOffset + j * 8 + 1] << 16) +
                        (exifByteArray[valueOffset + j * 8 + 2] << 8) + exifByteArray[valueOffset + j * 8 + 3];
                    var denominator = (exifByteArray[valueOffset + j * 8 + 4] << 24) + (exifByteArray[valueOffset + j * 8 + 5] << 16) +
                        (exifByteArray[valueOffset + j * 8 + 6] << 8) + exifByteArray[valueOffset + j * 8 + 7];
                    values.push([numerator, denominator])
                }
            } else if (type == 9) {
                for (var j = 0; j < length; j++) {
                    values.push((exifByteArray[valueOffset + j * 4] << 24) + (exifByteArray[valueOffset + j * 4 + 1] << 16) +
                        (exifByteArray[valueOffset + j * 4 + 2] << 8) + exifByteArray[valueOffset + j * 4 + 3])
                }
            } else if (type == 10) {
                for (var j = 0; j < length; j++) {
                    var numerator = (exifByteArray[valueOffset + j * 8] << 24) + (exifByteArray[valueOffset + j * 8 + 1] << 16) +
                        (exifByteArray[valueOffset + j * 8 + 2] << 8) + exifByteArray[valueOffset + j * 8 + 3];
                    var denominator = (exifByteArray[valueOffset + j * 8 + 4] << 24) + (exifByteArray[valueOffset + j * 8 + 5] << 16) +
                        (exifByteArray[valueOffset + j * 8 + 6] << 8) + exifByteArray[valueOffset + j * 8 + 7];
                    values.push([numerator, denominator])
                }
            }
            if (tag in piexif.TAGS) {
                ifdDict[piexif.TAGS[tag]] = values
            }
        }
        return ifdDict
    };

    piexif.splitIntoSegments = function (jpeg) {
        var head = 0;
        var segments = [];
        if (jpeg.slice(0, 2) != "\xff\xd8") {
            throw ("Given data isn't JPEG.")
        }
        while (true) {
            var entry = jpeg.slice(head, head + 2);
            if (entry[0] != "\xff") {
                throw ("Wrong JPEG format.")
            }
            if (entry[1] == "\xd9") {
                break
            }
            var length = jpeg.charCodeAt(head + 2) * 256 + jpeg.charCodeAt(head + 3);
            var maxOffset = head + length + 2;
            while (segments.length > 10) {
                break
            }
            segments.push(jpeg.slice(head, maxOffset));
            head = maxOffset
        }
        return segments
    };


    piexif.TAGS = {
        "0th": {
            0: "ImageWidth",
            1: "ImageLength",
            2: "BitsPerSample",
            3: "Compression",
            4: "PhotometricInterpretation",
            5: "Threshholding",
            6: "CellWidth",
            7: "CellLength",
            8: "FillOrder",
            9: "DocumentName",
            10: "ImageDescription",
            11: "Make",
            12: "Model",
            13: "StripOffsets",
            14: "Orientation",
            15: "SamplesPerPixel",
            16: "RowsPerStrip",
            17: "StripByteCounts",
            18: "MinSampleValue",
            19: "MaxSampleValue",
            20: "XResolution",
            21: "YResolution",
            22: "PlanarConfiguration",
            23: "ResolutionUnit",
            24: "TransferFunction",
            25: "WhitePoint",
            26: "PrimaryChromaticities",
            27: "YCbCrCoefficients",
            28: "YCbCrSubSampling",
            29: "YCbCrPositioning",
            30: "ReferenceBlackWhite",
            31: "DateTime",
            32: "ImageDescription",
            33: "Make",
            34: "Model",
            35: "Software",
            36: "DateTime",
            37: "Artist",
            38: "HostComputer",
            39: "Predictor",
            40: "WhitePoint",
            41: "PrimaryChromaticities",
            42: "ColorMap",
            43: "TileWidth",
            44: "TileLength",
            45: "TileOffsets",
            46: "TileByteCounts",
            254: "NewSubfileType",
            255: "SubfileType",
            256: "ImageWidth",
            257: "ImageLength",
            258: "BitsPerSample",
            259: "Compression",
            262: "PhotometricInterpretation",
            263: "Threshholding",
            264: "CellWidth",
            265: "CellLength",
            266: "FillOrder",
            269: "DocumentName",
            270: "ImageDescription",
            271: "Make",
            272: "Model",
            273: "StripOffsets",
            274: "Orientation",
            277: "SamplesPerPixel",
            278: "RowsPerStrip",
            279: "StripByteCounts",
            280: "MinSampleValue",
            281: "MaxSampleValue",
            282: "XResolution",
            283: "YResolution",
            284: "PlanarConfiguration",
            285: "ResolutionUnit",
            290: "TransferFunction",
            291: "WhitePoint",
            292: "PrimaryChromaticities",
            296: "YCbCrCoefficients",
            297: "YCbCrSubSampling",
            298: "YCbCrPositioning",
            301: "ReferenceBlackWhite",
            305: "Software",
            306: "DateTime",
            315: "Artist",
            316: "HostComputer",
            317: "Predictor",
            318: "WhitePoint",
            319: "PrimaryChromaticities",
            320: "ColorMap",
            321: "HalftoneHints",
            322: "TileWidth",
            323: "TileLength",
            324: "TileOffsets",
            325: "TileByteCounts",
            330: "ExtraSamples",
            332: "SampleFormat",
            333: "SMinSampleValue",
            334: "SMaxSampleValue",
            336: "TransferRange",
            512: "JPEGProc",
            513: "JPEGInterchangeFormat",
            514: "JPEGInterchangeFormatLength",
            515: "JPEGRestartInterval",
            517: "JPEGLosslessPredictors",
            518: "JPEGPointTransforms",
            519: "JPEGQTables",
            520: "JPEGDCTables",
            521: "JPEGACTables",
            529: "YCbCrCoefficients",
            530: "YCbCrSubSampling",
            531: "YCbCrPositioning",
            532: "ReferenceBlackWhite",
            307: "DateTime"
        },
        "Exif": {
            33434: "ExposureTime",
            33437: "FNumber",
            34850: "ExposureProgram",
            34852: "SpectralSensitivity",
            34855: "ISOSpeedRatings",
            34856: "OECF",
            34864: "SensitivityType",
            34865: "StandardOutputSensitivity",
            34866: "RecommendedExposureIndex",
            34867: "ISOSpeed",
            34868: "ISOSpeedLatitudeyyy",
            34869: "ISOSpeedLatitudezzz",
            36864: "ExifVersion",
            36867: "DateTimeOriginal",
            36868: "DateTimeDigitized",
            37121: "ComponentsConfiguration",
            37122: "CompressedBitsPerPixel",
            37377: "ShutterSpeedValue",
            37378: "ApertureValue",
            37379: "BrightnessValue",
            37380: "ExposureBiasValue",
            37381: "MaxApertureValue",
            37382: "SubjectDistance",
            37383: "MeteringMode",
            37384: "LightSource",
            37385: "Flash",
            37386: "FocalLength",
            37396: "SubjectArea",
            37500: "MakerNote",
            37510: "UserComment",
            37520: "SubSecTime",
            37521: "SubSecTimeOriginal",
            37522: "SubSecTimeDigitized",
            40960: "FlashpixVersion",
            40961: "ColorSpace",
            40962: "PixelXDimension",
            40963: "PixelYDimension",
            40964: "RelatedSoundFile",
            40965: "InteroperabilityTag",
            41483: "FlashEnergy",
            41484: "SpatialFrequencyResponse",
            41486: "FocalPlaneXResolution",
            41487: "FocalPlaneYResolution",
            41488: "FocalPlaneResolutionUnit",
            41492: "SubjectLocation",
            41493: "ExposureIndex",
            41495: "SensingMethod",
            41728: "FileSource",
            41729: "SceneType",
            41730: "CFAPattern",
            41985: "CustomRendered",
            41986: "ExposureMode",
            41987: "WhiteBalance",
            41988: "DigitalZoomRatio",
            41989: "FocalLengthIn35mmFilm",
            41990: "SceneCaptureType",
            41991: "GainControl",
            41992: "Contrast",
            41993: "Saturation",
            41994: "Sharpness",
            41995: "DeviceSettingDescription",
            41996: "SubjectDistanceRange",
            42016: "ImageUniqueID",
            42032: "CameraOwnerName",
            42033: "BodySerialNumber",
            42034: "LensSpecification",
            42035: "LensMake",
            42036: "LensModel",
            42037: "LensSerialNumber"
        },
        "GPS": {
            0: "GPSVersionID",
            1: "GPSLatitudeRef",
            2: "GPSLatitude",
            3: "GPSLongitudeRef",
            4: "GPSLongitude",
            5: "GPSAltitudeRef",
            6: "GPSAltitude",
            7: "GPSTimeStamp",
            8: "GPSSatellites",
            9: "GPSStatus",
            10: "GPSMeasureMode",
            11: "GPSDOP",
            12: "GPSSpeedRef",
            13: "GPSSpeed",
            14: "GPSTrackRef",
            15: "GPSTrack",
            16: "GPSImgDirectionRef",
            17: "GPSImgDirection",
            18: "GPSMapDatum",
            19: "GPSDestLatitudeRef",
            20: "GPSDestLatitude",
            21: "GPSDestLongitudeRef",
            22: "GPSDestLongitude",
            23: "GPSDestBearingRef",
            24: "GPSDestBearing",
            25: "GPSDestDistanceRef",
            26: "GPSDestDistance",
            27: "GPSProcessingMethod",
            28: "GPSAreaInformation",
            29: "GPSDateStamp",
            30: "GPSDifferential",
            31: "GPSHPositioningError"
        },
        "Interop": {
            1: "InteroperabilityIndex",
            2: "InteroperabilityVersion",
            1024: "RelatedImageFileFormat",
            1025: "RelatedImageWidth",
            1026: "RelatedImageLength"
        }
    };

    if (typeof exports !== "undefined") {
        if (typeof module !== "undefined" && module.exports) {
            exports = module.exports = piexif
        }
        exports.piexif = piexif
    } else {
        window.piexif = piexif;
    }
})();