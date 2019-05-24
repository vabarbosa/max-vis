
// MAX Image Segmenter ColorMap
export const getColorMap = async (imageData, modelData) => {
  let canvas = await Jimp.read(imageData)
  canvas.scaleToFit(MAX_SIZE,MAX_SIZE)
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

const getColor = pixel => COLOR_LIST[pixel % COLOR_LIST.length]

// Bounding Boxes

// Label Generation

// Basic Draw Methods

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

const getScaledSize = ({ height, width }) => {
  if (width > height) {
    return {
      scaledWidth: MAX_SIZE,
      scaledHeight: Math.round((height / width) * MAX_SIZE)
    }      
  } else {
    return {
      scaledWidth: Math.round((width / height) * MAX_SIZE),
      scaledHeight: MAX_SIZE
    }      
  }
}

const MAX_SIZE = 512