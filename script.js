const homePage = document.getElementById("homePage");
const cameraPage = document.getElementById("cameraPage");
const resultPage = document.getElementById("resultPage");

const video = document.getElementById("video");
const outputCanvas = document.getElementById("outputCanvas");
const outputCtx = outputCanvas.getContext("2d");

const destinationTitle = document.getElementById("destinationTitle");
const locationName = document.getElementById("locationName");
const finalPhoto = document.getElementById("finalPhoto");

let backgroundImage = new Image();
let stream = null;
let segmentation = null;
let animationRunning = false;


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

    backgroundImage.src = imagePath;

    backgroundImage.onload = function () {

        showPage(cameraPage);
        startCamera();

    };

}


/* =========================
   START CAMERA
========================= */

async function startCamera() {

    try {

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


        video.onloadedmetadata = function () {

            video.play();

            outputCanvas.width =
                video.videoWidth;

            outputCanvas.height =
                video.videoHeight;


            startSegmentation();

        };

    }

    catch (error) {

        alert(
            "ক্যামেরা চালু করা যাচ্ছে না। Camera Permission Allow করুন।"
        );

        console.error(error);

    }

}


/* =========================
   MEDIAPIPE AI
========================= */

function startSegmentation() {

    segmentation =
        new SelfieSegmentation({

            locateFile: function(file) {

                return (
                    "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/" +
                    file
                );

            }

        });


    segmentation.setOptions({

        modelSelection: 1

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
        !video.srcObject
    ) {
        return;
    }


    if (
        video.readyState >= 2
    ) {

        await segmentation.send({

            image: video

        });

    }


    if (stream) {

        requestAnimationFrame(
            processCamera
        );

    }

}


/* =========================
   REMOVE BACKGROUND
========================= */

function onResults(results) {

    const width =
        outputCanvas.width;

    const height =
        outputCanvas.height;


    outputCtx.clearRect(
        0,
        0,
        width,
        height
    );


    /* DESTINATION BACKGROUND */

    outputCtx.drawImage(

        backgroundImage,

        0,
        0,

        width,
        height

    );


    /* PERSON MASK */

    outputCtx.save();


    outputCtx.drawImage(

        results.segmentationMask,

        0,
        0,

        width,
        height

    );


    outputCtx.globalCompositeOperation =
        "source-in";


    /* DRAW PERSON */

    outputCtx.drawImage(

        video,

        0,
        0,

        width,
        height

    );


    outputCtx.restore();

}


/* =========================
   CAPTURE PHOTO
========================= */

document
    .getElementById("captureBtn")
    .addEventListener(
        "click",
        function () {

            const photo =
                outputCanvas.toDataURL(
                    "image/png"
                );


            finalPhoto.src = photo;


            stopCamera();


            showPage(resultPage);

        }
    );


/* =========================
   STOP CAMERA
========================= */

function stopCamera() {

    if (stream) {

        stream
            .getTracks()
            .forEach(

                track => track.stop()

            );

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