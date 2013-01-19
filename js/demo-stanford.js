var IMG_SRC  = 'media/underwater_image.jpg';
var OVERLAY  = 0;   // 0 = foreground, 255 = background
var SHOW_DEBUG_SHADOW = true;
var NUM_FISHES = 100;
var PX_FOR_SHADOW = 20; // number of shadow pixels that fish has to encounter before it counts as hitting a shadow
var CHANGE_DIR_PX_THRESHOLD = 20; // number of pixels away from shadow before fish change direction
var CHANGE_DIR_MS_THRESHOLD = 1000; // number of ms before fish change direction again
var MAX_SPEED_MULTIPLIER = 5; // number of ms before fish change direction again
var ACCELERATE_MS = 750; // time for fish to accelerate
var DECELERATE_MS = 4500; // time for fish to decelerate
var TIME_STUCK = 4000; // time that a fish spends being stuck
var IMAGE_PATH = "images/fish_";
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

function randomFishX() {
  return randomInt(FISH_IMG_WIDTH / 2, shadowCanvas.width - FISH_IMG_WIDTH / 2);
}

function randomFishY() {
  return randomInt(FISH_IMG_HEIGHT / 2, shadowCanvas.height - FISH_IMG_HEIGHT / 2)
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

		fishes[ii] = {x: randomFishX(),
				 y: randomFishY(),
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
	LEFT_OR_RIGHT_EDGE : 2,
	TOP_OR_BOTTOM_EDGE : 3
}

function changeDirection(fishInfo, shadowCanvas, shadowData) {
	if (fishInfo.x - fishInfo.width/2.0 < 0 && fishInfo.xSpeed < 0) {
		fishInfo.outOfBounds = true;
		return ChangeDirEnum.LEFT_OR_RIGHT_EDGE;
	}
	if (fishInfo.x + fishInfo.width/2.0 > shadowCanvas.width && fishInfo.xSpeed > 0) {
		fishInfo.outOfBounds = true;
		return ChangeDirEnum.LEFT_OR_RIGHT_EDGE;
	}
	if (fishInfo.y - fishInfo.height/2.0 < 0 && fishInfo.ySpeed < 0) {
		fishInfo.outOfBounds = true;
		return ChangeDirEnum.TOP_OR_BOTTOM_EDGE;
	}
	if (fishInfo.y + fishInfo.height/2.0 > shadowCanvas.height && fishInfo.ySpeed > 0) {
		fishInfo.outOfBounds = true;
		return ChangeDirEnum.TOP_OR_BOTTOM_EDGE;
	}
	fishInfo.outOfBounds = false;
	var count = 0;
	for (var dx = -fishInfo.width / 2; dx < fishInfo.width / 2 + CHANGE_DIR_PX_THRESHOLD; dx++) {
		for (var dy = -fishInfo.height / 2; dy < fishInfo.height / 2 + CHANGE_DIR_PX_THRESHOLD; dy++) {
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

function clearScratchCanvas() {    
	var imgData = scratchContext.createImageData(scratchCanvas.width, scratchCanvas.height);
	for (var i = 0; i < imgData.data.length; i += 4)
	{
		imgData.data[i+0]=255;
		imgData.data[i+1]=255;
		imgData.data[i+2]=255;
		imgData.data[i+3]=0;
	}
	scratchContext.putImageData(imgData,0,0);
}


function printFishInfo() {
	console.log(fishes);
	console.log('\n');
}

function calculateSpeedMultiplier(fishInfo) {
	var curTime = Date.now();
	var lastTime = fishInfo.lastTime;
	var diff = curTime - lastTime;
	var part1 = ACCELERATE_MS;
	var part2 = DECELERATE_MS;
	if (diff > part1 + part2) {
		return 1;
	}
	else if (diff <= part1) {
		return 1 + (MAX_SPEED_MULTIPLIER-1) * diff / part1;
	}
	else {
		return MAX_SPEED_MULTIPLIER - (MAX_SPEED_MULTIPLIER-1) * (diff - part1) / part2;
	}
}

function clamp(num, min, max) {
	if (num < min) return min;
	if (num > max) return max;
	return num;
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
					pixels.data[i]   = pixels.data[i] / 2.7; // shadow.data[i];
					pixels.data[i+1] = pixels.data[i+1] / 2.0; // shadow.data[i+1];
					pixels.data[i+2] = pixels.data[i+2]/1.5; //shadow.data[i+2];
					pixels.data[i+3] = 200;
				}
			}
		}

		// And now, paint our pixels array back to the canvas.
		shadowContext.putImageData(pixels, 0, 0);

		clearScratchCanvas();


		for (var ii = 0; ii < NUM_FISHES; ii++) {
			var time = Date.now();
			if(time - fishes[ii].lastTime > CHANGE_DIR_MS_THRESHOLD){
				fishes[ii].image.src = IMAGE_PATH + fishGallery[fishes[ii].imageID];
			}	
			fishInfo = fishes[ii];
			var dir = changeDirection(fishInfo, shadowCanvas, shadow.data);
			if (dir == ChangeDirEnum.TOP_OR_BOTTOM_EDGE) {
				fishInfo.ySpeed *= -1;
			} 
			else if (dir == ChangeDirEnum.LEFT_OR_RIGHT_EDGE) {
				fishInfo.xSpeed *= -1;
			}
			else if (dir == ChangeDirEnum.SHADOW) {
				if (time - fishInfo.lastTime > CHANGE_DIR_MS_THRESHOLD) {
					fishes[ii].numDirChanges++;
					if(fishes[ii].numDirChanges > 4){
            fishInfo.x = randomFishX();
            fishInfo.y = randomFishY();
					}
					fishInfo.xSpeed *= -1;
					fishInfo.ySpeed *= -1;
					fishInfo.lastTime = time;
				}
			}
			var multiplier = calculateSpeedMultiplier(fishInfo);
			var xBounce = Math.round(6*Math.random()) -3;
			var yBounce = Math.round(6*Math.random()) -3;

			scratchContext.save();
			scratchContext.translate(fishInfo.x, fishInfo.y);
      var angle;
      if (fishInfo.xSpeed < 0) {
        scratchContext.scale(-1, 1);
        angle = Math.atan(-fishInfo.ySpeed/fishInfo.xSpeed);
      } else {
        angle = Math.atan(fishInfo.ySpeed/fishInfo.xSpeed);
      }
			scratchContext.rotate(angle);
			scratchContext.translate(-1*fishInfo.x - fishInfo.width / 2.0, -1*fishInfo.y - fishInfo.height / 2.0);
			scratchContext.drawImage(fishInfo.image, fishInfo.x, fishInfo.y, fishInfo.width, fishInfo.height); 
			scratchContext.restore();

			fishInfo.x += multiplier * fishInfo.xSpeed + xBounce;
			fishInfo.y += multiplier * fishInfo.ySpeed + yBounce;
			fishInfo.x = clamp(fishInfo.x, fishInfo.width/2-1, shadowCanvas.width-fishInfo.width/2+1);
			fishInfo.y = clamp(fishInfo.y, fishInfo.height/2-1, shadowCanvas.height-fishInfo.height/2+1);
		}
	}
	// Loop every millisecond. Changing the freq. is a tradeoff between
	// interactivity and performance. Tune to what your machine can support.
	setTimeout(renderShadow, 0);
}