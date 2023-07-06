/**
 * カメラ撮影
 */
class MyCamera {

    /**
     * フィールド
     */
    m_envCamera = true; //前／後カメラ
    m_confirmMode = false; //OKモード or 撮影モード
    m_audio = null;
    m_video = null;
    m_canvas = null;
    m_btnChange = null;
    m_btnCapture = null;
    m_btnCancel = null;
    m_doneBlock = null;

    /**
     * 撮影開始
     */
    start(doneBlock) {
        //画面作成
        document.body.insertAdjacentHTML('beforeend', `
            <div class="my-camera">
                <audio src="/audio/Shutter.mp3" type="audio/mpeg"></audio>
                <video autoplay muted playsinline></video>
                <canvas></canvas>
                <div class="buttons">
                    <button class="change" disabled="true">前／後</button>
                    <button class="capture" disabled="true">撮影</button>
                    <button class="cancel">Cancel</button>
                </div>
            </div>`);

        //初期設定
        this.m_audio = document.querySelector('.my-camera audio');
        this.m_video = document.querySelector('.my-camera video');
        this.m_canvas = document.querySelector('.my-camera canvas');
        this.m_btnChange = document.querySelector('.my-camera .change');
        this.m_btnCapture = document.querySelector('.my-camera .capture');
        this.m_btnCancel = document.querySelector('.my-camera .cancel');
        this.m_doneBlock = doneBlock;

        //ボタンハンドラ設定
        this.m_btnChange.onclick = () => {
            this._onChange();
        };
        this.m_btnCapture.onclick = () => {
            this._onCapture();
        };
        this.m_btnCancel.onclick = () => {
            this._onCancel();
        };

        //プレビュー開始
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            this._setupCameraStream();
        } else {
            alert('カメラが見つかりません')
        }
    }

    /**
     * カメラからvideoエレメントへのストリーミングを設定する
     */
    _setupCameraStream() {
        const param = {
            audio: false,
            video: {
                width: 1280, //portrait/landscapeにかかわらず長辺をwidthに指定する(*1)
                height: 720,
                facingMode: this.m_envCamera ? 'environment' : 'user'
            }
        };
        navigator.mediaDevices.getUserMedia(param).then((stream) => {
            this.m_video.srcObject = stream;
            this.m_video.play();
            this.m_btnChange.disabled = false;
            this.m_btnCapture.disabled = false;
        });
        this.m_video.onresize = (e) => { //portrait/landscapeに応じてvideoサイズが設定されイベントが来る(*2)
            const videoWidth = this.m_video.videoWidth;
            const videoHeight = this.m_video.videoHeight;
            //ウィンドウの0.8倍に内接するサイズを表示サイズとする
            const maxRatio = 0.8;
            const maxWidth = window.innerWidth * maxRatio;
            const maxHeight = window.innerHeight * maxRatio;
            const dispRatio = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
            const dispWidth = videoWidth * dispRatio;
            const dispHeight = videoHeight * dispRatio;
            //videoとcanvasの表示サイズを設定する
            this.m_video.style.width = dispWidth + 'px';
            this.m_video.style.height = dispHeight + 'px';
            this.m_canvas.style.width = dispWidth + 'px';
            this.m_canvas.style.height = dispHeight + 'px';
            //videoとcanvasの論理サイズを合わせる
            this.m_canvas.width = videoWidth;
            this.m_canvas.height = videoHeight;
        }
    }

    /**
     * 前／後ボタン押下
     */
    _onChange() {
        this.m_envCamera = !this.m_envCamera;
        this._setupCameraStream();
    }

    /**
     * 撮影／OKボタン押下
     */
    _onCapture() {
        if (this.m_confirmMode) {
            //OKモード -> 終了
            if (this.m_doneBlock) {
                const dataUrl = this.m_canvas.toDataURL('image/png');
                const base64 = dataUrl.replace(/^.*,/, '');
                const bstr = atob(base64);
                const buf = new Uint8Array(bstr.length);
                for (let i = 0; i < bstr.length; i++) {
                    buf[i] = bstr.charCodeAt(i);
                }
                this.m_doneBlock(buf);
            }
            document.querySelector('.my-camera').remove();
        } else {
            //撮影モードの場合
            this.m_audio.play();
            //画面を video -> canvas に切り替え
            const context = this.m_canvas.getContext('2d');
            context.drawImage(this.m_video, 0, 0, this.m_video.videoWidth, this.m_video.videoHeight);
            this.m_video.style.display = 'none';
            this.m_canvas.style.display = 'block';
            //OKモードに切り替え
            this.m_confirmMode = true;
            this.m_btnChange.disabled = true;
            this.m_btnCapture.innerText = 'OK';
        }
    }

    /**
     * キャンセルボタン押下
     */
    _onCancel() {
        if (this.m_confirmMode) {
            //OKモードの場合
            //画面を canvas -> video に切り替え
            this.m_video.style.display = 'block';
            this.m_canvas.style.display = 'none';
            //撮影モードに切り替え
            this.m_confirmMode = false;
            this.m_btnChange.disabled = false;
            this.m_btnCapture.innerText = '撮影';
        } else {
            //撮影モードの場合 -> 終了
            document.querySelector('.my-camera').remove();
        }
    }
}
