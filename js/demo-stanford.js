var IMG_SRC  = 'media/underwater.jpg';
var OVERLAY  = 0;   // 0 = foreground, 255 = background
var NUM_FISHES = 10;
var SHOW_DEBUG_SHADOW = true;
var NUM_FISHES = 10;
var CHANGE_DIR_PX_THRESHOLD = 10; // number of pixels away from shadow before fish change direction
var CHANGE_DIR_MS_THRESHOLD = 1000; // number of ms before fish change direction again
var MAX_SPEED_MULTIPLIER = 5; // number of ms before fish change direction again
var TIME_STUCK = 4000; // time that a fish spends being stuck

// array of fish images. default fish face right 0 degrees.
var fishGallery = ["../images/fish_yellow.png", "../images/fish_green.png"];
var fishes = [];
var stanfordImage;
var imageReady = false;
$(document).ready(function() {
  stanfordImage = new Image();
  stanfordImage.src = IMG_SRC;
  stanfordImage.onload = function() {
    imageReady = true;
  }

  for (var ii = 0; ii < NUM_FISHES; ii++) {
   var fishImage = new Image();
   fishImage.src = fishGallery[ii%2];
     fishes[ii] = {x: ii*10, y: ii*50, width: 50, height: 30, 
	               xSpeed: Math.round(5*Math.random()) + 5, ySpeed: 0, 
				   lastTime: 0, image: fishImage, outOfBounds: false, 
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
  for (var dx = 0; dx < fishInfo.width + CHANGE_DIR_PX_THRESHOLD; dx++) {
    for (var dy = 0; dy < fishInfo.height + CHANGE_DIR_PX_THRESHOLD; dy++) {
      var x = fishInfo.x + dx;
      if (fishInfo.xSpeed < 0) {
        x -= CHANGE_DIR_PX_THRESHOLD; // check left instead of right
      }
      var y = fishInfo.y + dy;
      if (fishInfo.ySpeed < 0) {
        y -= CHANGE_DIR_PX_THRESHOLD; // check top instead of bottom
      }
      var i = 4*(y*shadowCanvas.width + x);
      if (i < 0 || i > shadowData.length - 1) {
        continue;
      }
      if (shadowData[i] == OVERLAY && shadowData[i+1] == OVERLAY && shadowData[i+2] == OVERLAY) {
        return ChangeDirEnum.SHADOW;
      }
    }
  }
  return ChangeDirEnum.NONE;
}

function toggleDebugShadow() {
    SHOW_DEBUG_SHADOW = !SHOW_DEBUG_SHADOW;
}

function calculateSpeedMultiplier(fishInfo) {
  var curTime = (new Date()).getTime();
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
		var time = (new Date()).getTime();
		if(time - fishes[ii].lastTime > TIME_STUCK &&
			fishes[ii].image.src.indexOf("/images/fish_yellow_r.png") != -1 ){
			fishes[ii].image.src = "../images/fish_yellow.png";
			fishes[ii].numDirChanges  = 0;
		}	
      fishInfo = fishes[ii];
      shadowContext.drawImage(fishInfo.image, fishInfo.x, fishInfo.y, fishInfo.width, fishInfo.height);

      //console.log(multiplier);
      var dir = changeDirection(fishInfo, shadowCanvas, shadow.data);
      //console.log(dir);
      if (dir == ChangeDirEnum.EDGE) {
        fishInfo.xSpeed *= -1;
        fishInfo.ySpeed *= -1;
      } else if (dir == ChangeDirEnum.SHADOW) {
        var time = (new Date()).getTime();
        if (time - fishInfo.lastTime > CHANGE_DIR_MS_THRESHOLD) {
		  if(!fishInfo.outOfBounds){
			fishes[ii].numDirChanges++;
			if(fishes[ii].numDirChanges > 4){
				fishes[ii].image.src = "../images/fish_yellow_r.png";
			}
		   }
          fishInfo.xSpeed *= -1;
          fishInfo.ySpeed *= -1;
          fishInfo.lastTime = time;
        }
      }
      var multiplier = calculateSpeedMultiplier(fishInfo);
      // wendy: this seems buggy. if you keep the fish in the shadows they stop switching after a while..
      // fishInfo.x += multiplier*fishInfo.xSpeed;
      fishInfo.x += fishInfo.xSpeed;
      fishInfo.y += fishInfo.ySpeed;
    }
  }

  // Loop every millisecond. Changing the freq. is a tradeoff between
  // interactivity and performance. Tune to what your machine can support.
  setTimeout(renderShadow, 0);
}