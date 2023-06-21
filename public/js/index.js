//ロード時の初期化処理
window.onload = () => {
    //ボタンのハンドラ設定
    document.querySelector('#camera-button').onclick = onCameraButton;
    document.querySelector('#gps-button').onclick = onGpsButton;
    document.querySelector('#qrcode-button').onclick = onQrcodeButton;

    //結果要素の更新
    updateCameraResult();
}

//カメラ実行ボタン
function onCameraButton() {
    const myCamera = new MyCamera();
    myCamera.start((dataUrl) => {
        //撮影データをアップロード
        const base64 = dataUrl.replace(/^.*,/, '');
        const bstr = atob(base64);
        const buf = new Uint8Array(bstr.length);
        for (var i = 0; i < bstr.length; i++) {
            buf[i] = bstr.charCodeAt(i);
        }
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            location.reload();
        };
        xhr.open("POST", '/api/add-image', false);
        xhr.send(buf);
    });
}

//アップロードされた画像があれば表示
function updateCameraResult() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/exist-image', true);
    xhr.onload = () => {
        const result = JSON.parse(xhr.response);
        if (result.exists) {
            document.querySelector('#camera-result').insertAdjacentHTML('beforeend', `
                            <img src="/api/get-image" style="max-width:320px"/>
                            <button>削除</button>`);
            document.querySelector('#camera-result button').onclick = deleteCameraResult;
        }
    };
    xhr.send(null);
}

//アップロードされた画像の削除
function deleteCameraResult() {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/delete-image', true);
    xhr.onload = () => {
        location.reload();
    };
    xhr.send(null);
}

//GPS実行ボタン
function onGpsButton() {
    const myGps = new MyGps();
    myGps.start((coords) => {
        const description = `Latitude : ${coords.latitude}\n`
                + `Longitude: ${coords.longitude}\n`
                + `Altitude: ${coords.altitude} meter\n`
                + `Lat/Lon accuracy: ${coords.accuracy} meter\n`
                + `Alt accuracy: ${coords.altitudeAccuracy} meter\n`
                + `Heading: ${coords.speed} degree (N:0, E:90, W:270)\n`
                + `Speed: ${coords.speed} m/s\n`;
        document.querySelector('#gps-result').innerText = description;
    }, (err) => {
        const description = `ERROR(${err.code}): ${err.message}`;
        document.querySelector('#gps-result').innerText = description;
    });
}

//QRコード実行ボタン
function onQrcodeButton() {
    const resultDiv = document.querySelector('#qrcode-result');
    resultDiv.innerHTML = `<canvas style="width:320px;height:240px"></canvas><div></div>`;
    var video = document.createElement("video");
    var canvasElement = resultDiv.querySelector('canvas');
    var canvas = canvasElement.getContext("2d");
    var outputDiv = resultDiv.querySelector('div');

    function drawLine(begin, end, color) {
        canvas.beginPath();
        canvas.moveTo(begin.x, begin.y);
        canvas.lineTo(end.x, end.y);
        canvas.lineWidth = 4;
        canvas.strokeStyle = color;
        canvas.stroke();
    }

    // Use facingMode: environment to attemt to get the front camera on phones
    navigator.mediaDevices.getUserMedia({video: {facingMode: "environment"}}).then(function (stream) {
        video.srcObject = stream;
        video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
        video.play();
        requestAnimationFrame(tick);
    });

    function tick() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvasElement.height = video.videoHeight;
            canvasElement.width = video.videoWidth;
            canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
            var imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
            var code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            if (code) {
                drawLine(code.location.topLeftCorner, code.location.topRightCorner, "#FF3B58");
                drawLine(code.location.topRightCorner, code.location.bottomRightCorner, "#FF3B58");
                drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner, "#FF3B58");
                drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner, "#FF3B58");
                outputDiv.innerText = code.data;
            } else {
                outputDiv.innerText = '';
            }
        }
        requestAnimationFrame(tick);
    }
}
