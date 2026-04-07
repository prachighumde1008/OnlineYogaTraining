document.addEventListener("DOMContentLoaded", function () {

const video = document.getElementById("video");
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

document.querySelector(".camera-container").appendChild(canvas);

let camera;
let holdTime = 0;
let timer = null;
let saved = false;

let selectedPose = localStorage.getItem("selectedPose") || "";

/* SKELETON COLOR FLAG */
window.isCorrectPose = false;

/* ANGLE FUNCTION */
function getAngle(a, b, c) {
    let angle = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    angle = Math.abs(angle * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
}

/* MEDIAPIPE */
const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

pose.onResults(results => {

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas.style.width = video.clientWidth + "px";
    canvas.style.height = video.clientHeight + "px";
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.zIndex = "2";
    canvas.style.pointerEvents = "none";
    canvas.style.transform = "scaleX(-1)";

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.poseLandmarks) {

        let lineColor = "#ff0000";
        let pointColor = "#ff0000";

        if (window.isCorrectPose) {
            lineColor = "#00ff00";
            pointColor = "#00ff00";
        }

        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
            color: lineColor,
            lineWidth: 4
        });

        drawLandmarks(ctx, results.poseLandmarks, {
            color: pointColor,
            lineWidth: 2
        });

        detect(results.poseLandmarks);
    }
});

/* CAMERA START */
window.startCamera = async function () {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        video.srcObject = stream;

        video.onloadedmetadata = () => {
            video.play();

            camera = new Camera(video, {
                onFrame: async () => {
                    await pose.send({ image: video });
                },
                width: 640,
                height: 480
            });

            camera.start();
        };
    } catch (error) {
        alert("Camera error: " + error.message);
    }
};

/* CAMERA STOP */
window.stopCamera = function () {
    if (camera) {
        camera.stop();
    }
    resetTimer();
    updateBar(0);
    window.isCorrectPose = false;
};

/* DETECTION */
function detect(lm) {

    const text = document.getElementById("poseText");
    const status = document.getElementById("statusText");

    const ls = lm[11], rs = lm[12];
    const le = lm[13], re = lm[14];
    const lw = lm[15], rw = lm[16];
    const lh = lm[23], rh = lm[24];
    const lk = lm[25], rk = lm[26];
    const la = lm[27], ra = lm[28];

    if (!ls || !rs || !le || !re || !lw || !rw || !lh || !rh || !lk || !rk || !la || !ra) {
        text.innerHTML = "📏 Full body not visible";
        if (status) {
            status.innerHTML = "⏳ Waiting";
            status.style.background = "rgba(0,0,0,0.7)";
        }
        window.isCorrectPose = false;
        resetTimer();
        updateBar(0);
        return;
    }

    let leftArm = getAngle(ls, le, lw);
    let rightArm = getAngle(rs, re, rw);
    let leftLeg = getAngle(lh, lk, la);
    let rightLeg = getAngle(rh, rk, ra);

    let detectedPose = "";
    let score = 0;

    /* TREE POSE */
    if (selectedPose === "Tree Pose") {
        detectedPose = "Tree Pose";

        if (Math.abs(la.y - ra.y) > 0.25) {
            score = 70;

            if (leftArm > 150 && rightArm > 150) {
                score = 100;
                text.innerHTML = "🌳 Tree Pose (Perfect)";
            } else {
                text.innerHTML = "🙌 Raise both arms";
            }
        } else {
            text.innerHTML = "⚠ Lift one leg properly";
            score = 40;
        }
    }

    /* LOTUS POSE */
    else if (selectedPose === "Lotus Pose") {
        detectedPose = "Lotus Pose";

        if (lk.y > lh.y && rk.y > rh.y) {
            score = 85;
            text.innerHTML = "🧘 Lotus Pose";
        } else {
            score = 40;
            text.innerHTML = "⚠ Sit cross-legged properly";
        }
    }

    /* FORWARD BEND */
    else if (selectedPose === "Forward Bend") {
        detectedPose = "Forward Bend";

        if (ls.y > lh.y && rs.y > rh.y) {
            score = 90;
            text.innerHTML = "🤸 Forward Bend";
        } else {
            score = 45;
            text.innerHTML = "⚠ Bend forward more";
        }
    }

    /* CHILD POSE */
    else if (selectedPose === "Child Pose") {
        detectedPose = "Child Pose";

        if (ls.y > lh.y && rs.y > rh.y) {
            score = 85;
            text.innerHTML = "🧎 Child Pose";
        } else {
            score = 45;
            text.innerHTML = "⚠ Sit back and bend forward";
        }
    }

    /* MOUNTAIN POSE */
    else if (selectedPose === "Mountain Pose") {
        detectedPose = "Mountain Pose";

        if (Math.abs(ls.y - rs.y) < 0.05 && Math.abs(lh.y - rh.y) < 0.05) {
            score = 90;
            text.innerHTML = "⛰ Mountain Pose";
        } else {
            score = 50;
            text.innerHTML = "⚠ Stand straight";
        }
    }

    /* WARRIOR POSE */
    else if (selectedPose === "Warrior Pose") {
        detectedPose = "Warrior Pose";

        if (leftArm > 150 && rightArm > 150) {
            score = 70;

            if (leftLeg > 150 || rightLeg > 150) {
                score = 100;
                text.innerHTML = "🔥 Warrior Pose";
            } else {
                text.innerHTML = "🦵 Bend knee more";
            }
        } else {
            score = 45;
            text.innerHTML = "⚠ Stretch both arms";
        }
    }

    else {
        text.innerHTML = "📏 Select a pose first";
        if (status) {
            status.innerHTML = "⏳ Waiting";
            status.style.background = "rgba(0,0,0,0.7)";
        }
        window.isCorrectPose = false;
        resetTimer();
        updateBar(0);
        return;
    }

    updateBar(score);

    if (status) {
        if (score >= 80) {
            window.isCorrectPose = true;
            status.innerHTML = "✅ Correct Pose";
            status.style.background = "green";
            startTimer(detectedPose, score);
        } else {
            window.isCorrectPose = false;
            status.innerHTML = "❌ Improve Pose";
            status.style.background = "red";
            resetTimer();
        }
    } else {
        if (score >= 80) {
            window.isCorrectPose = true;
            startTimer(detectedPose, score);
        } else {
            window.isCorrectPose = false;
            resetTimer();
        }
    }
}

/* PROGRESS BAR */
function updateBar(score) {
    const bar = document.getElementById("progressBar");
    if (bar) {
        bar.style.width = score + "%";
    }
}

/* TIMER */
function startTimer(poseName, score) {
    if (timer) return;

    timer = setInterval(() => {
        holdTime++;

        const timerBox = document.getElementById("timerBox");
        if (timerBox) {
            timerBox.innerText = "⏱ " + holdTime + " sec";
        }

        /* save once after 5 seconds */
        if (holdTime === 5 && !saved) {
            saveProgress(poseName, score);
            saved = true;
            resetTimer();
        }
    }, 1000);
}

/* RESET TIMER */
function resetTimer() {
    holdTime = 0;
    saved = false;
    clearInterval(timer);
    timer = null;

    const timerBox = document.getElementById("timerBox");
    if (timerBox) {
        timerBox.innerText = "⏱ 0 sec";
    }
}

/* SAVE RESULT TO LOCALSTORAGE */
function saveProgress(poseName, score) {
    if (!poseName) return;

    let data = JSON.parse(localStorage.getItem("yogaProgress")) || [];

    data.push({
        pose: poseName,
        score: score,
        date: new Date().toISOString()
    });

    localStorage.setItem("yogaProgress", JSON.stringify(data));
    console.log("Saved progress:", { pose: poseName, score: score });
}

});