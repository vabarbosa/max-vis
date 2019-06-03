// MAX Image Segmenter ColorMap
const MAX_IMGSEG_SIZE = 512

export const getColorMap = async (imageData, modelData) => {
  let canvas = await Jimp.read(imageData)
  canvas.scaleToFit(MAX_IMGSEG_SIZE,MAX_IMGSEG_SIZE)
  const flatSegMap = modelData.reduce((a, b) => a.concat(b), [])
  const objTypes = [...new Set(flatSegMap)].map(x => OBJ_LIST[x])
  const segments = objTypes.map(type => {
    return {
      [type] : getColor(OBJ_LIST.indexOf(type))
    }
  })  
  const data = canvas.bitmap.data
  let objColor = [0, 0, 0]
  const bgVal = OBJ_LIST.indexOf('background')
  flatSegMap.forEach((s, i) => {
    if (s !== bgVal) {
      objColor = getColor(s)
      data[(i * 4)] = objColor[0] // red channel
      data[(i * 4) + 1] = objColor[1] // green channel
      data[(i * 4) + 2] = objColor[2] // blue channel
      data[(i * 4) + 3] = 200 // alpha
    }
  })
  const base64 = URLtoB64(await canvas.getBase64Async(Jimp.AUTO))
  let binary = fixBinary(atob(base64))
  let blob = new Blob([binary], {type: 'image/png'})
  return { 
    blob, 
    segments,
    width: canvas.bitmap.width,
    height: canvas.bitmap.height
  }
}

const COLOR_MAP = {
  green: [0, 128, 0],
  red: [255, 0, 0],
  gray: [192, 192, 192],
  purple: [160, 32, 240],
  pink: [255, 185, 80],
  teal: [30, 128, 128],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255]
}
const COLOR_LIST = Object.values(COLOR_MAP)
const COLOR_NAMES = Object.keys(COLOR_MAP)
const getColor = pixel => COLOR_LIST[pixel % COLOR_LIST.length]
const getColorName = pixel => COLOR_NAMES[pixel % COLOR_NAMES.length]

const OBJ_LIST = ['background', 'airplane', 'bicycle', 'bird', 'boat', 
  'bottle', 'bus', 'car', 'cat', 'chair', 'cow', 'dining table', 
  'dog', 'horse', 'motorbike', 'person', 'potted plant', 'sheep', 
  'sofa', 'train', 'tv'
]
let objMap = {} 
OBJ_LIST.forEach((x,i)=> objMap[x]=i)
const OBJ_MAP = objMap

// MAX Human Pose Estimator
const MAX_HPOSE_SIZE = 432

export const getPoseLines = async (imageData, modelData) => {
    const canvas = await Jimp.read(imageData);
    canvas.scaleToFit(MAX_HPOSE_SIZE, MAX_HPOSE_SIZE)
    //const padSize = getPadSize(width);
    const padSize = 2;
    modelData.map(obj => obj.poseLines).forEach((skeleton, i) => {
        skeleton.forEach((line, i) => {
            // LINE GENERATION
            const xMin = line[0];
            const yMin = line[1];
            const xMax = line[2];
            const yMax = line[3];
            // need to add something here to switch colors between skeletons
            drawLine(canvas, xMin, yMin, xMax, yMax, padSize, 'cyan'); 
        });
    });
    const base64 = URLtoB64(await canvas.getBase64Async(Jimp.AUTO));
    let binary = fixBinary(atob(base64));
    let blob = new Blob([binary], {type: 'image/png'});
    return { 
      blob,
      width: canvas.bitmap.width,
      height: canvas.bitmap.height
    }
}

// Bounding Boxes

// NEW CODE
export const getObjectBoxes = async (imageData, modelData) => {
  const canvas = await Jimp.read(imageData)
  const { width, height } = canvas.bitmap
  let fontType = getScaledFont(width, 'black');
  console.log('start font load')
  const font = await Jimp.loadFont('https://raw.githubusercontent.com/kastentx/max-viz-utils/master/fonts/open-sans/open-sans-32-black/open-sans-32-black.fnt');
  console.log('end font load')
  // const padSize = getPadSize(width);
  const padSize = 2;
  modelData.map(obj => obj.detection_box).forEach((box, i) => {
      const xMax = box[3] * width;
      const xMin = box[1] * width;
      const yMax = box[2] * height;
      const yMin = box[0] * height;
      rect(canvas, xMin, yMin, xMax, yMax, padSize, 'cyan');
      // LABEL GENERATION
      const text = modelData[i].label;
      const textHeight = Jimp.measureTextHeight(font, text);
      const xTagMax = Jimp.measureText(font, text) + (padSize*2) + xMin;
      const yTagMin = yMin - textHeight > 0 ? yMin - textHeight : yMin;
      rectFill(canvas, xMin, yTagMin, xTagMax, textHeight + yTagMin, padSize, 'cyan');
      canvas.print(font, xMin + padSize, yTagMin, text);
  });
  // return canvas.getBase64Async(Jimp.AUTO);
  const base64 = URLtoB64(await canvas.getBase64Async(Jimp.AUTO));
  let binary = fixBinary(atob(base64));
  let blob = new Blob([binary], {type: 'image/png'});
  return { 
    blob,
    width: canvas.bitmap.width,
    height: canvas.bitmap.height
  }
}



// Label Generation

// Basic Draw Methods
const drawLine = (img, xMin, yMin, xMax, yMax, padSize, color) => {
  const xLength = Math.abs(xMax - xMin);
  const yLength = Math.abs(yMax - yMin);
  const steps = xLength > yLength ? xLength : yLength;
  const xStep = (xMax - xMin) / steps;
  const yStep = (yMax - yMin) / steps;
  let x = xMin;
  let y = yMin;
  for (let s of range(0, steps)) {
    x = x + xStep;
    y = y + yStep;
    for (let i of range(x - padSize, x + padSize)) {
      img.setPixelColor(Jimp.cssColorToHex(color), i, y);
    }
    for (let j of range(y - padSize, y + padSize)) {
      img.setPixelColor(Jimp.cssColorToHex(color), x, j);
    }  
  }
}

// NEW CODE
const rect = (img, xMin, yMin, xMax, yMax, padSize, color) => 
  drawRect(img, xMin, yMin, xMax, yMax, padSize, color, false);

const rectFill = (img, xMin, yMin, xMax, yMax, padSize, color) => 
  drawRect(img, xMin, yMin, xMax, yMax, padSize, color, true);

const drawRect = (img, xMin, yMin, xMax, yMax, padSize, color, isFilled) => {
  for (let x of range(xMin, xMax)) {
    for (let y of range(yMin, yMax)) { 
      if (withinRange(y, yMin, padSize) || withinRange(x, xMin, padSize) || 
          withinRange(y, yMax, padSize) || withinRange(x, xMax, padSize)) {
        img.setPixelColor(Jimp.cssColorToHex(color), x, y);
      } else if (isFilled && (y <= (yMax + padSize) && x <= (xMax + padSize))) {
        img.setPixelColor(Jimp.cssColorToHex(color), x, y);
      }
    }
  }
}

// Basic Utility Functions
const flatten = (a) => Array.isArray(a) ? [].concat(...a.map(flatten)) : a

const B64toURL = base64 => `data:image/png;base64,${base64}`

const URLtoB64 = dataURL => dataURL.split(',')[1]

const fixBinary = (bin) => {
  let length = bin.length
  let buf = new ArrayBuffer(length)
  let arr = new Uint8Array(buf)
  for (let i = 0; i < length; i++) {
    arr[i] = bin.charCodeAt(i)
  }
  return buf
}

const getScaledFont = (width, color) => {
  if (width > 1600)
    return color === 'black' ? Jimp.FONT_SANS_128_BLACK : Jimp.FONT_SANS_128_WHITE;
  else if (width > 700)
    return color === 'black' ? Jimp.FONT_SANS_32_BLACK : Jimp.FONT_SANS_32_WHITE;
  else
  return color === 'black' ? Jimp.FONT_SANS_16_BLACK : Jimp.FONT_SANS_16_WHITE;
}

const getScaledSize = ({ height, width }, maxSize) => {
  if (width > height) {
    return {
      scaledWidth: maxSize,
      scaledHeight: Math.round((height / width) * maxSize)
    }      
  } else {
    return {
      scaledWidth: Math.round((width / height) * maxSize),
      scaledHeight: maxSize
    }      
  }
}

function* range(start, end) {
  for (let i = start; i <= end; i++) {
      yield i;
  }
}

const withinRange = (i, line, range) =>
  (line-range<=i) && (i<=line+range);