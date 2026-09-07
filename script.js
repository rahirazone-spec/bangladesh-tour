const homePage = document.getElementById("homePage");
const cameraPage = document.getElementById("cameraPage");
const resultPage = document.getElementById("resultPage");

const video = document.getElementById("video");
const outputCanvas = document.getElementById("outputCanvas");
const outputCtx = outputCanvas.getContext("2d", {
    willReadFrequently: true
});

const destinationTitle =
    document.getElementById("destinationTitle");

const locationName =
    document.getElementById("locationName");

const finalPhoto =
    document.getElementById("finalPhoto");

let backgroundImage = new Image();
let stream = null;
let segmentation = null;
let latestResults = null;


/* =========================
   PAGE CHANGE
========================= */

function showPage(page) {

    homePage.classList.remove("active");
    cameraPage.classList.remove("active");
    resultPage.classList.remove("active");

    page.classList.add("active");
}


/* =========================
   SELECT DESTINATION
========================= */

function selectDestination(name, imagePath) {

    destinationTitle.innerText = name;
    locationName.innerText = name;

    backgroundImage = new Image();

    backgroundImage.onload = function () {

        showPage(cameraPage);

        startCamera();

    };

    backgroundImage.src = imagePath;
}


/* =========================
   START CAMERA
========================= */

async function startCamera() {

    try {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            alert(
                "এই ব্রাউজারে Camera Support নেই। Chrome ব্যবহার করুন।"
            );

            return;
        }


        stream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    facingMode: "user",

                    width: {
                        ideal: 1280
                    },

                    height: {
                        ideal: 720
                    }

                },

                audio: false

            });


        video.srcObject = stream;


        video.onloadedmetadata = async function () {

            await video.play();


            outputCanvas.width =
                video.videoWidth;

            outputCanvas.height =
                video.videoHeight;


            startSegmentation();

        };

    }

    catch (error) {

        console.error(
            "Camera Error:",
            error
        );

        alert(
            "ক্যামেরা চালু করা যাচ্ছে না। Camera Permission Allow করুন।"
        );

    }

}


/* =========================
   MEDIAPIPE AI
========================= */

function startSegmentation() {

    segmentation =
        new SelfieSegmentation({

            locateFile: function (file) {

                return (
                    "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/" +
                    file
                );

            }

        });


    /*
       MODEL 0 = GENERAL MODEL
       Person cutout-এর জন্য ব্যবহার করছি
    */

    segmentation.setOptions({

        modelSelection: 0

    });


    segmentation.onResults(
        onResults
    );


    processCamera();

}


/* =========================
   PROCESS CAMERA
========================= */

async function processCamera() {

    if (
        !stream ||
        !video.srcObject ||
        !segmentation
    ) {

        return;

    }


    if (
        video.readyState >= 2
    ) {

        try {

            await segmentation.send({

                image: video

            });

        }

        catch (error) {

            console.error(
                "Segmentation Error:",
                error
            );

        }

    }


    if (stream) {

        requestAnimationFrame(
            processCamera
        );

    }

}


/* =========================
   AI RESULT
========================= */

function onResults(results) {

    latestResults = results;


    const width =
        outputCanvas.width;

    const height =
        outputCanvas.height;


    /*
       Clear previous frame
    */

    outputCtx.clearRect(
        0,
        0,
        width,
        height
    );


    /*
       -------------------------
       1. DRAW DESTINATION
       -------------------------
    */

    if (
        backgroundImage.complete
    ) {

        outputCtx.drawImage(

            backgroundImage,

            0,
            0,
            width,
            height

        );

    }


    /*
       -------------------------
       2. CREATE PERSON MASK
       -------------------------
    */

    const maskCanvas =
        document.createElement("canvas");

    maskCanvas.width = width;
    maskCanvas.height = height;


    const maskCtx =
        maskCanvas.getContext("2d", {
            willReadFrequently: true
        });


    maskCtx.drawImage(

        results.segmentationMask,

        0,
        0,
        width,
        height

    );


    /*
       Get mask pixels
    */

    const maskData =
        maskCtx.getImageData(
            0,
            0,
            width,
            height
        );


    const pixels =
        maskData.data;


    /*
       Convert MediaPipe mask
       brightness → alpha
    */

    for (
        let i = 0;
        i < pixels.length;
        i += 4
    ) {

        const brightness =
            (
                pixels[i] +
                pixels[i + 1] +
                pixels[i + 2]
            ) / 3;


        let alpha = 0;


        /*
           Strong background
           = transparent
        */

        if (brightness < 30) {

            alpha = 0;

        }


        /*
           Strong person
           = fully visible
        */

        else if (brightness > 170) {

            alpha = 255;

        }


        /*
           Soft edge
        */

        else {

            alpha =
                (
                    (brightness - 30) /
                    140
                ) * 255;

        }


        /*
           Make mask WHITE
           and use brightness
           as alpha
        */

        pixels[i] = 255;
        pixels[i + 1] = 255;
        pixels[i + 2] = 255;
        pixels[i + 3] = alpha;

    }


    maskCtx.putImageData(
        maskData,
        0,
        0
    );


    /*
       -------------------------
       3. DRAW CAMERA IMAGE
       -------------------------
    */

    const personCanvas =
        document.createElement("canvas");

    personCanvas.width = width;
    personCanvas.height = height;


    const personCtx =
        personCanvas.getContext("2d");


    personCtx.clearRect(
        0,
        0,
        width,
        height
    );


    /*
       Draw camera
    */

    personCtx.drawImage(

        video,

        0,
        0,
        width,
        height

    );


    /*
       Apply transparent mask
    */

    personCtx.globalCompositeOperation =
        "destination-in";


    personCtx.drawImage(

        maskCanvas,

        0,
        0,
        width,
        height

    );


    personCtx.globalCompositeOperation =
        "source-over";


    /*
       -------------------------
       4. PUT PERSON
       ON DESTINATION
       -------------------------
    */

    outputCtx.drawImage(

        personCanvas,

        0,
        0,
        width,
        height

    );

}


/* =========================
   CAPTURE PHOTO
========================= */

const captureButton =
    document.getElementById("captureBtn");


if (captureButton) {

    captureButton.addEventListener(
        "click",
        capturePhoto
    );

}


function capturePhoto() {

    /*
       Make sure canvas has
       the latest AI result
    */

    if (
        outputCanvas.width === 0 ||
        outputCanvas.height === 0
    ) {

        alert(
            "ছবি প্রস্তুত হয়নি। একটু অপেক্ষা করুন।"
        );

        return;

    }


    const photo =
        outputCanvas.toDataURL(
            "image/png"
        );


    finalPhoto.src = photo;


    stopCamera();


    showPage(resultPage);

}


/* =========================
   STOP CAMERA
========================= */

function stopCamera() {

    if (stream) {

        stream
            .getTracks()
            .forEach(function (track) {

                track.stop();

            });

    }


    stream = null;

}


/* =========================
   GO HOME
========================= */

function goHome() {

    stopCamera();

    showPage(homePage);

}


/* =========================
   DOWNLOAD PHOTO
========================= */

function downloadPhoto() {

    const link =
        document.createElement("a");


    link.download =
        "amar-bangladesh-tour.png";


    link.href =
        finalPhoto.src;


    link.click();

}