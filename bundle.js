        //Dynamically loads in tensorflow library via CDN to keep the library lightweight
        //Kept having issues using the create script element way
        (function() {
          //import tfjs
          var xhttp = new XMLHttpRequest();
          xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
              return Function(this.responseText)();
            }
          };
          xhttp.open("GET", "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs", false);
          xhttp.send();

          //import coco-ssd model
          var xhttp = new XMLHttpRequest();
          xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
              return Function(this.responseText)();
            }
          };
          xhttp.open("GET", "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd", false);
          xhttp.send();

          //import gifshot
          var xhttp = new XMLHttpRequest();
          xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
              return Function(this.responseText)();
            }
          };
          xhttp.open("GET", "https://cdnjs.cloudflare.com/ajax/libs/gifshot/0.3.2/gifshot.min.js", false);
          xhttp.send();
        })()

        var WebcamFeed = (function(){

          //init variables and elements
          const VIDEO_WIDTH = 300, 
          VIDEO_HEIGHT = 165,
          MOTION_SCORE_THRESHOLD = 200

          let _prevImageData = [], 
          _prevImageScore = 0,
          _video = document.createElement('VIDEO'), //html element to display webcam feed
          _dataPayload = [], //data to push to db
          _webcamFrames = [],
          _isStopped = false,
          _loaderContainer = document.createElement('div'),
          _loader = document.createElement('div'),
          _loaderText = document.createElement('div')

          _loaderContainer.style.position = "absolute"
          _loaderContainer.style.height = "100%"
          _loaderContainer.style.width = "100%"
          _loaderContainer.style.top = "0"
          _loaderContainer.style.left = "0"

          _loader.className = "loader"
          _loader.style.border = "16px solid #f3f3f3"
          _loader.style.borderRadius = "50%"
          _loader.style.borderTop = "16px solid gold"
          _loader.style.borderBottom = "16px solid gold"
          _loader.style.width = "120px"
          _loader.style.height = "120px"
          _loader.style.animation = "spin 2s linear infinite"
          _loader.style.margin = "0 auto"
          _loader.animate([
            {transform: 'rotate(0deg)'},
            {transform: 'rotate(360deg)'}
          ], {
            duration: 1000,
            iterations: Infinity
          })
          
          _loaderText.className = "loader-text"
          _loaderText.style.fontSize = "150%";
          _loaderText.style.fontWeight = "900";
          _loaderText.style.margin = "0 auto";
          _loaderText.style.width = "30%";
          _loaderText.style.textAlign = "center";
          _loaderText.style.marginTop = "50px";

          _modifyLoaderElements(true)

          document.body.appendChild(_loaderContainer)
          _loaderContainer.appendChild(_loader)
          _loaderContainer.appendChild(_loaderText)

          _video.style.position = "fixed"
          _video.style.bottom = "0"
          _video.style.right = "0"
          _video.style.width = "250px"
          _video.style.height = "200px"
          _video.autoplay = "true"
          _video.style.zIndex = "1000"
          _video.style.cursor = "move"
          _dragElement(_video)
          document.body.appendChild(_video)

          let _canvas = document.createElement('canvas')

          _canvas.style.width = `${VIDEO_WIDTH}px`
          _canvas.style.height = `${VIDEO_HEIGHT}px`
          _canvas.style.position = "fixed"
          _canvas.style.top = "0"
          _canvas.style.left = "0"
          _canvas.style.zIndex = "1001"
          _canvas.style.display = "none" //we don't need to see the canvas, we just need it for calculations

          document.body.appendChild(_canvas)

          let _context = _canvas.getContext('2d')


          function _dragElement(elmnt) {
            let _pos1 = 0, _pos2 = 0, _pos3 = 0, _pos4 = 0
            if (document.getElementById(elmnt.id + "header")) {
              // if present, the header is where you move the DIV from:
              document.getElementById(elmnt.id + "header").onmousedown = _dragMouseDown
            } else {
              // otherwise, move the DIV from anywhere inside the DIV:
              elmnt.onmousedown = _dragMouseDown
            }

            function _dragMouseDown(e) {
              e = e || window.event
              e.preventDefault()
              // get the mouse cursor position at startup:
              _pos3 = e.clientX
              _pos4 = e.clientY
              document.onmouseup = _closeDragElement
              // call a function whenever the cursor moves:
              document.onmousemove = _elementDrag
            }

            function _elementDrag(e) {
              e = e || window.event
              e.preventDefault()
              // calculate the new cursor position:
              _pos1 = _pos3 - e.clientX
              _pos2 = _pos4 - e.clientY
              _pos3 = e.clientX
              _pos4 = e.clientY
              // set the element's new position:
              elmnt.style.top = (elmnt.offsetTop - _pos2) + "px"
              elmnt.style.left = (elmnt.offsetLeft - _pos1) + "px"
            }

            function _closeDragElement() {
              // stop moving when mouse button is released:
              document.onmouseup = null
              document.onmousemove = null
            }
          }

          function _setMotionScore() {
            let motionScore = 0;
            const PIXEL_THRESHOLD = 100

            _context.drawImage(_video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT)

            let _imageData = _context.getImageData(0,0,VIDEO_WIDTH,VIDEO_HEIGHT).data

            for (let x = 0; x < VIDEO_WIDTH; x++) {
              for (let y = 0; y < VIDEO_HEIGHT; y++) {
                let i = (x + y * VIDEO_WIDTH) * 4; //position
                let r = Math.abs(_imageData[i] - (_prevImageData[i] || 0))
                let g = Math.abs(_imageData[i + 1] - (_prevImageData[i + 1] || 0))
                let b = Math.abs(_imageData[i + 2] - (_prevImageData[i + 2] || 0))
                let pixelScore = r + g + b

                if (pixelScore >= PIXEL_THRESHOLD) { //pixel threshold (the higher the number, the more movement)
                    motionScore++;
                }
              }
            }

            //set data for the next frame diff detection
            _prevImageData = JSON.parse(JSON.stringify(_imageData)) //deep copy

            _prevImageScore = motionScore
          }

          function _setLoaderElements() {
            
          }

          function _modifyLoaderElements(hide, text) {
            _loader.style.display = hide ? "none" : "block"

            _loaderText.style.display = hide ? "none" : "block"
            _loaderText.innerText = text ? text : ""

            _loaderContainer.style.backgroundColor = hide ? "inherit" : "lightGrey"
            _loaderContainer.style.opacity = hide ? "0.6" : "1"

          }

          function _submitGif() {
            let list = new DataTransfer(),
                fileInput = document.querySelector('input[type=file][id^=dq-imgupload-file-input-]'),
                submitButton = document.querySelector('input[type=submit]#btn_finish')
            
            _modifyLoaderElements(false, "Please wait while session gif is being uploaded...")

            if (_webcamFrames.length > 0) {
              //generate gif from webcamfeed
              _generateGifByWebcamFeed()
              .then((gifUrl) => {
                if (!fileInput && !submitButton) {
                  console.log("Url of the session GIF:", gifUrl)
                } else {
                  fetch(gifUrl)
                  .then((res) => {return res.arrayBuffer()})
                  .then((buf) => {return new File([buf], "goldeneyeWebcamGif", {type: "image/gif"})})
                  .then((file) => {
                    list.items.add(file)
                    fileInput.files = list.files

                    //submit form
                    submitButton.click()
                  })
                }
                _modifyLoaderElements(true)
              }) 
            } else {
              console.log("Goldeneye Object Detector notification: There were no frames detected during this session to create a gif.")
              _modifyLoaderElements(true)
            }
          }

          function _generateGifByImageFrames(imageFrames) {
            return new Promise((resolve,reject) => {
              gifshot.createGIF({
                images: imageFrames,
                gifWidth: VIDEO_WIDTH,
                gifHeight: VIDEO_HEIGHT,
                interval: 0.1,
                numFrames: imageFrames.length,
                frameDuration: 1,
                sampleInterval: 10,
                numWorkers: 2
              }, (obj) => {
                if (!obj.error) {
                  resolve(obj.image)
                } else {
                  reject(obj.error)
                }
              })
            })
          }

          function _generateGifByWebcamFeed() {
            return new Promise((resolve,reject) => {
              gifshot.createGIF({
                images: _webcamFrames,
                gifWidth: VIDEO_WIDTH,
                gifHeight: VIDEO_HEIGHT,
                interval: 0.1,
                numFrames: _webcamFrames.length,
                frameDuration: 1,
                sampleInterval: 10,
                numWorkers: 2
              }, (obj) => {
                if (!obj.error) {
                  resolve(obj.image)
                } else {
                  reject(obj.error)
                }
              })
            })
          }

          function _detectFrame(video, model) {
            model.detect(video)
              .then(predictions => {
                //start storing image frames
                _modifyLoaderElements(true)

                _webcamFrames.push(_canvas.toDataURL())

                if (typeof predictions != "undefined") {
                  if (predictions.length > 0 && !!predictions.find((el) => ((el.class == 'cell phone') || (el.class == 'laptop')))) {
                    _renderPredictions(predictions)
                  } else {
                    // push image with image score
                    if (_prevImageScore > MOTION_SCORE_THRESHOLD) {
                      if (predictions.length > 0) {
                        for (const prediction of predictions) {
                          _generateGifByImageFrames(_webcamFrames.slice(-30))
                          .then(result => {
                            _dataPayload.push(Object.assign({}, {bbox: prediction.bbox, class: prediction.class, score: prediction.score}, {motionScore: _prevImageScore, gif: result}))
                          })
                        }
                      } else {
                        _generateGifByImageFrames(_webcamFrames.slice(-30))
                        .then(result => {
                          _dataPayload.push(Object.assign({}, {bbox: [], class: null, score: null}, {motionScore: _prevImageScore, gif: result }))
                        })
                      }
                    }
                  }
                }

                if (!_isStopped) {
                  requestAnimationFrame(() => {
                    _detectFrame(video, model)
                  })
                }

                _setMotionScore()
              })
              .catch(error => {
                console.log(error)
              })
          }

          function _renderPredictions(predictions) {
            //these classifications will be changed eventually after re-training
            for (const prediction of predictions) {
              if (['cell phone', 'laptop'].includes(prediction.class) ) { //these classifications will be changed eventually after re-training
                _generateGifByImageFrames(_webcamFrames.slice(-30))
                .then(result => {
                  _dataPayload.push(Object.assign({}, prediction, {motionScore: null, gif: result}))
                })
              }
            }
          }

          return {
            objectDetectionPayload: _dataPayload,
            start: function(e) {

              _isStopped = false

              if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices
                  .getUserMedia({ video: true })
                  .then((stream) => {
                    //show webcam stream on screen
                    window.stream = stream
                    _video.srcObject = stream
                  })
                  .then(() =>{
                    //load model
                    _modifyLoaderElements(false, "Please wait while frames are loading...")

                    cocoSsd.load()
                      .then(model => {
                        if (!_isStopped) {
                          _detectFrame(_video, model)
                        }
                      })
                      .catch(error => console.log(error)) 
                  })
                  .catch(error => console.log(error))
              }
            },

            stop: function(e) {
              const stream = _video.srcObject

              _modifyLoaderElements(true)

              if (stream) {
                var tracks = stream.getTracks()

                for (var i = 0; i < tracks.length; i++) {
                  var track = tracks[i]
                  track.stop()
                }

                _video.srcObject = null

              } 

              _isStopped = true

              _submitGif()
            }
          }
        })();

        window.WebcamFeed = WebcamFeed;
