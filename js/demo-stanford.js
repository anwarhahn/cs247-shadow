var IMG_SRC  = 'media/rosebowl.jpg';
var OVERLAY  = 0;   // 0 = foreground, 255 = background
var NUM_FISHES = 10;
var SHOW_DEBUG_SHADOW = true;

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
      fishes[ii] = {x: ii*10, y: ii*50, width: 10, height: 10, speed: 10*Math.random()};
    }
});

function changeDirection(fishInfo) {
  if (fishInfo.x <= 0 ||
      fishInfo.x + fishInfo.width >= shadowCanvas.width ||
      fishInfo.y <= 0 ||
      fishInfo.y + fishInfo.height >= shadowCanvas.height) {
    return true;
  }
  return false;
}

function toggleDebugShadow() {
    SHOW_DEBUG_SHADOW = !SHOW_DEBUG_SHADOW;
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
          fishInfo = fishes[ii];
          shadowContext.beginPath();
          shadowContext.arc(fishInfo.x,fishInfo.y,fishInfo.width,0,360,true);
          shadowContext.fill();
          shadowContext.closePath();
          fishInfo.x += fishInfo.speed;
          if (changeDirection(fishInfo)) {
            fishInfo.speed *= -1;
          }
        }
    }

    // Loop every millisecond. Changing the freq. is a tradeoff between
    // interactivity and performance. Tune to what your machine can support.
    setTimeout(renderShadow, 0);
}