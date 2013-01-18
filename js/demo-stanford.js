var IMG_SRC  = 'media/underwater.jpg';
var OVERLAY  = 0;   // 0 = foreground, 255 = background
var NUM_FISHES = 10;
var SHOW_DEBUG_SHADOW = true;
var NUM_FISHES = 10;
var PX_FOR_SHADOW = 20; // number of shadow pixels that fish has to encounter before it counts as hitting a shadow
var CHANGE_DIR_PX_THRESHOLD = 10; // number of pixels away from shadow before fish change direction
var CHANGE_DIR_MS_THRESHOLD = 1000; // number of ms before fish change direction again
var MAX_SPEED_MULTIPLIER = 5; // number of ms before fish change direction again
var TIME_STUCK = 4000; // time that a fish spends being stuck
var IMAGE_PATH = "../images/fish_";
var FISH_IMG_WIDTH = 50;
var FISH_IMG_HEIGHT = 30;

// array of fish images. default fish face right 0 degrees.
var fishGallery = ["yellow.png", "green.png", "light_blue.png",
				   "green_blue_orange.png", "green_red.png", 
				   "dark_blue.png"];
var fishes = [];
var stanfordImage;
var imageReady = false;

function randomSign() {
  if (Math.random() < 0.5) {
    return 1;
  }
  return -1;
}

function randomInt(min, max) {
  return Math.round(min + Math.random() * (max-min));
}

$(document).ready(function() {
  stanfordImage = new Image();
  stanfordImage.src = IMG_SRC;
  stanfordImage.onload = function() {
    imageReady = true;
  }

  for (var ii = 0; ii < NUM_FISHES; ii++) {
   var fishImage = new Image();
   var imageId = ii%6;
   fishImage.src = IMAGE_PATH + fishGallery[imageId];
   fishes[ii] = {x: randomInt(0, shadowCanvas.width - FISH_IMG_WIDTH),
                 y: randomInt(0, shadowCanvas.height - FISH_IMG_HEIGHT),
                 width: FISH_IMG_WIDTH,
                 height: FISH_IMG_HEIGHT, 
                 xSpeed: randomSign() * randomInt(3, 6),
                 ySpeed: randomSign() * randomInt(1, 2), 
                 lastTime: 0,
				 imageID: imageId,
                 image: fishImage,
				 numDirChanges: 0};
  }
});

var ChangeDirEnum = {
  NONE : 0,
  SHADOW : 1,
  EDGE : 2
}

function changeDirection(fishInfo, shadowCanvas, shadowData) {
  if (fishInfo.x < 0 ||
      fishInfo.x + fishInfo.width > shadowCanvas.width ||
      fishInfo.y < 0 ||
      fishInfo.y + fishInfo.height > shadowCanvas.height) {

	  fishInfo.outOfBounds = true;
    return ChangeDirEnum.EDGE;
  }
  fishInfo.outOfBounds = false;
  var count = 0;
  for (var dx = 0; dx < fishInfo.width + CHANGE_DIR_PX_THRESHOLD; dx++) {
    for (var dy = 0; dy < fishInfo.height + CHANGE_DIR_PX_THRESHOLD; dy++) {
      var x = Math.round(fishInfo.x + dx);
      if (fishInfo.xSpeed < 0) {
        x -= CHANGE_DIR_PX_THRESHOLD; // check left instead of right
      }
      var y = Math.round(fishInfo.y + dy);
      if (fishInfo.ySpeed < 0) {
        y -= CHANGE_DIR_PX_THRESHOLD; // check top instead of bottom
      }
      var i = 4*(y*shadowCanvas.width + x);
      if (i < 0 || i > shadowData.length - 1) {
        continue;
      }
      if (shadowData[i] == OVERLAY && shadowData[i+1] == OVERLAY && shadowData[i+2] == OVERLAY) {
        count++;
        if (count >= PX_FOR_SHADOW) {
          return ChangeDirEnum.SHADOW;
        }
      }
    }
  }
  return ChangeDirEnum.NONE;
}

function toggleDebugShadow() {
    SHOW_DEBUG_SHADOW = !SHOW_DEBUG_SHADOW;
}

function printFishInfo() {
  console.log(fishes);
}

function calculateSpeedMultiplier(fishInfo) {
  var curTime = Date.now();
  var lastTime = fishInfo.lastTime;
  var diff = curTime - lastTime;
  var part1 = CHANGE_DIR_MS_THRESHOLD / 5;
  var part2 = CHANGE_DIR_MS_THRESHOLD - part1;
  if (diff > CHANGE_DIR_MS_THRESHOLD) {
    return 1;
  } else if (diff <= part1) {
    return 1 + (MAX_SPEED_MULTIPLIER-1) * diff / part1;
  } else {
    return MAX_SPEED_MULTIPLIER - (MAX_SPEED_MULTIPLIER-1) * (diff - part1) / part2;
  }
}

function clamp(num, min, max) {
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

/* 
 * Returns true when fish is red. False if not.
 */
function isRed(fish){
	if(fish.image.src.indexOf("/images/fish_r.png") == -1){
		return false;
	} else {
		return true;
	}
}

/*
 * In this example, we show you how to overlay the shadow information over
 * an image painted into the canvas. This function is called in a loop
 * by shadowboxing.js. It overrides the default behavior of renderShadow(),
 * which draws the shadow in black on a white canvas.
 */
function renderShadow() {
  if (!background)    // if they haven't captured a background frame
      return;

  // shadow is an array of length 4*numPixels. Each pixel
  // is an [red green blue alpha] of the shadow information.
  // RGB gives you the color, while alpha indicates opacity.
  // Background pixels are white ([255 255 255 0]) and foreground
  // shadow pixels are black ([0 0 0 0]).
  shadow = getShadowData();

  // Drawing from our image onto the canvas
  if (imageReady) {
    // draw the image over the entire canvas
    shadowContext.drawImage(stanfordImage, 0, 0, shadowCanvas.width, shadowCanvas.height);    
    var pixels = shadowContext.getImageData(0, 0, shadowCanvas.width, shadowCanvas.height);

    if (SHOW_DEBUG_SHADOW) {
      // Now that the shadowContext has our jpeg painted, we can
      // loop pixel by pixel and only show the parts where the shadow lies.
      // 
      // IMPORTANT: make sure that the width and height of your two
      // canvases match. Otherwise, here be dragons!
      for(var i = 0; i < shadow.data.length; i=i+4) {
        // i = red; i+1 = green; i+2 = blue; i+3 = alpha
        if(shadow.data[i] == OVERLAY && shadow.data[i+1] == OVERLAY && shadow.data[i+2] == OVERLAY) {
          // If the current shadow pixel is to be overlayed, copy it over to
          // our canvas' pixel data
          pixels.data[i]   = shadow.data[i];
          pixels.data[i+1] = shadow.data[i+1];
          pixels.data[i+2] = shadow.data[i+2];
        }
      }
    }

    // And now, paint our pixels array back to the canvas.
    shadowContext.putImageData(pixels, 0, 0);

    for (var ii = 0; ii < NUM_FISHES; ii++) {
      var time = Date.now();
      if(time - fishes[ii].lastTime > CHANGE_DIR_MS_THRESHOLD && isRed(fishes[ii])){
        fishes[ii].image.src = IMAGE_PATH + fishGallery[fishes[ii].imageID];
      }	
      fishInfo = fishes[ii];
	 
      shadowContext.drawImage(fishInfo.image, fishInfo.x, fishInfo.y, fishInfo.width, fishInfo.height);
      var dir = changeDirection(fishInfo, shadowCanvas, shadow.data);
      if (dir == ChangeDirEnum.EDGE) {
        fishInfo.xSpeed *= -1;
        fishInfo.ySpeed *= -1;
      } else if (dir == ChangeDirEnum.SHADOW) {
        if (time - fishInfo.lastTime > CHANGE_DIR_MS_THRESHOLD) {
			fishes[ii].numDirChanges++;
			if(fishes[ii].numDirChanges > 4 && !isRed(fishes[ii])){
				fishes[ii].image.src = "../images/fish_r.png";
			}
			fishInfo.xSpeed *= -1;
			fishInfo.ySpeed *= -1;
			fishInfo.lastTime = time;
        }
      } else {
        if (time - fishes[ii].lastTime > CHANGE_DIR_MS_THRESHOLD &&
            fishes[ii].image.src.indexOf("/images/fish_yellow_r.png") != -1){
          fishes[ii].image.src = "../images/fish_yellow.png";
        }
      }
      var multiplier = calculateSpeedMultiplier(fishInfo);
      var xBounce = 0;//Math.round(6*Math.random()) -3;
      var yBounce = Math.round(6*Math.random()) -3;
      fishInfo.x += multiplier*fishInfo.xSpeed;
      fishInfo.x = clamp(fishInfo.x + xBounce, -1, shadowCanvas.width-fishInfo.width+1);
      fishInfo.y += multiplier*fishInfo.ySpeed;
      fishInfo.y = clamp(fishInfo.y + yBounce, -1, shadowCanvas.height-fishInfo.height+1);
    }
  }

  // Loop every millisecond. Changing the freq. is a tradeoff between
  // interactivity and performance. Tune to what your machine can support.
  setTimeout(renderShadow, 0);
}