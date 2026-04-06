document.addEventListener("DOMContentLoaded", function () {

const video = document.getElementById("video");
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

document.querySelector(".camera-container").appendChild(canvas);

let camera;
let holdTime = 0;
let timer = null;
let saved = false;

/* GET SELECTED POSE */
let selectedPose = localStorage.getItem("selectedPose");

/* ANGLE FUNCTION */
function getAngle(a,b,c){
let angle = Math.atan2(c.y-b.y,c.x-b.x) - Math.atan2(a.y-b.y,a.x-b.x);
angle = Math.abs(angle*180/Math.PI);
if(angle>180) angle = 360-angle;
return angle;
}

/* MEDIAPIPE */
const pose = new Pose({
locateFile:(file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
modelComplexity:1,
smoothLandmarks:true,
minDetectionConfidence:0.5,
minTrackingConfidence:0.5
});

pose.onResults(results=>{

canvas.width = video.videoWidth;
canvas.height = video.videoHeight;

canvas.style.width = video.clientWidth+"px";
canvas.style.height = video.clientHeight+"px";

ctx.clearRect(0,0,canvas.width,canvas.height);

if(results.poseLandmarks){

drawConnectors(ctx,results.poseLandmarks,POSE_CONNECTIONS);
drawLandmarks(ctx,results.poseLandmarks);

detect(results.poseLandmarks);
}
});

/* CAMERA */
window.startCamera = async function(){
let stream = await navigator.mediaDevices.getUserMedia({video:true});
video.srcObject = stream;

video.onloadedmetadata = ()=>{
video.play();

camera = new Camera(video,{
onFrame:async()=>{
await pose.send({image:video});
}
});

camera.start();
};
};

window.stopCamera = function(){
if(camera) camera.stop();
};

/* DETECTION */
function detect(lm){

const text = document.getElementById("poseText");
const status = document.getElementById("statusText");

const ls=lm[11], rs=lm[12];
const le=lm[13], re=lm[14];
const lw=lm[15], rw=lm[16];
const lh=lm[23], rh=lm[24];
const lk=lm[25], rk=lm[26];
const la=lm[27], ra=lm[28];

let leftArm=getAngle(ls,le,lw);
let rightArm=getAngle(rs,re,rw);
let leftLeg=getAngle(lh,lk,la);
let rightLeg=getAngle(rh,rk,ra);

let poseName = "";
let score = 0;

/* TREE POSE */
if(Math.abs(la.y-ra.y)>0.25){

poseName = "Tree Pose";

if(leftArm>150 && rightArm>150){
score=100;
text.innerHTML="🌳 Tree Pose (Perfect)";
}
else{
score=60;
text.innerHTML="🙌 Raise arms";
}

}

/* WARRIOR POSE */
else if(leftArm>150 && rightArm>150){

poseName = "Warrior Pose";

if(leftLeg>150 || rightLeg>150){
score=100;
text.innerHTML="🔥 Warrior Pose (Good)";
}
else{
score=70;
text.innerHTML="🦵 Bend knee";
}
}

/* DEFAULT */
else{
resetTimer();
updateBar(0);
text.innerHTML="📏 Adjust posture...";
status.innerHTML="⏳ Waiting...";
return;
}

/* UPDATE BAR */
updateBar(score);

/* MATCH CHECK */
if(poseName === selectedPose){

status.innerHTML="✅ Correct Pose";
status.style.background="green";

startTimer(poseName, score);

}else{

status.innerHTML="❌ Wrong Pose";
status.style.background="red";

resetTimer();
}
}

/* PROGRESS BAR */
function updateBar(score){
document.getElementById("progressBar").style.width=score+"%";
}

/* TIMER */
function startTimer(poseName, score){

if(timer) return;

timer=setInterval(()=>{

holdTime++;
document.getElementById("timerBox").innerText="⏱ "+holdTime+" sec";

if(holdTime===5 && !saved){
saveProgress(poseName, score);
saved = true;
}

},1000);
}

/* RESET */
function resetTimer(){
holdTime=0;
saved=false;

clearInterval(timer);
timer=null;

document.getElementById("timerBox").innerText="⏱ 0 sec";
}

/* SAVE REAL DATA */
function saveProgress(poseName, score){

let data=JSON.parse(localStorage.getItem("yogaProgress"))||[];

data.push({
pose: poseName,
score: score,
date: new Date().toLocaleString()
});

localStorage.setItem("yogaProgress",JSON.stringify(data));
}

});