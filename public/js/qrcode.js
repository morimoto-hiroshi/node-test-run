/**
 * QRコードリーダー
 */
class MyQrcode {

    /**
     * フィールド
     */
    m_canvas = null;
    m_canvasCtx = null;
    m_video = null;
    m_outputDiv = null;

    /**
     * 認識開始
     */
    start() {
        const resultDiv = document.querySelector('#qrcode-result');
        resultDiv.innerHTML = `<canvas style="width:80%; max-width:320px;"></canvas><div></div>`;
        this.m_canvas = resultDiv.querySelector('canvas');
        this.m_canvasCtx = this.m_canvas.getContext('2d', {willReadFrequently: true});
        this.m_video = document.createElement('video');
        this.m_outputDiv = resultDiv.querySelector('div');
        navigator.mediaDevices.getUserMedia({video: {facingMode: "environment"}}).then((stream) => {
            this.m_video.srcObject = stream;
            this.m_video.setAttribute('playsinline', true); // required to tell iOS safari we don't want fullscreen
            this.m_video.play();
            requestAnimationFrame(() => {
                this._tick();
            });
        });
    }

    _tick() {
        if (this.m_video.readyState === this.m_video.HAVE_ENOUGH_DATA) {
            this.m_canvas.height = this.m_video.videoHeight;
            this.m_canvas.width = this.m_video.videoWidth;
            this.m_canvasCtx.drawImage(this.m_video, 0, 0, this.m_canvas.width, this.m_canvas.height);
            const imageData = this.m_canvasCtx.getImageData(0, 0, this.m_canvas.width, this.m_canvas.height);
            let code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            if (code) {
                this._drawLine(code.location.topLeftCorner, code.location.topRightCorner, "#FF3B58");
                this._drawLine(code.location.topRightCorner, code.location.bottomRightCorner, "#FF3B58");
                this._drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner, "#FF3B58");
                this._drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner, "#FF3B58");
                this.m_outputDiv.innerText = code.data;
            } else {
                this.m_outputDiv.innerText = '';
            }
        }
        requestAnimationFrame(() => {
            this._tick();
        });
    }

    _drawLine(begin, end, color) {
        this.m_canvasCtx.beginPath();
        this.m_canvasCtx.moveTo(begin.x, begin.y);
        this.m_canvasCtx.lineTo(end.x, end.y);
        this.m_canvasCtx.lineWidth = 4;
        this.m_canvasCtx.strokeStyle = color;
        this.m_canvasCtx.stroke();
    }
}
