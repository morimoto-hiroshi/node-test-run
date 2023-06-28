//ロード時の初期化処理
window.onload = () => {
    //ボタンのハンドラ設定
    document.querySelector('#camera-button').onclick = onCameraButton;
    document.querySelector('#gps-button').onclick = onGpsButton;
    document.querySelector('#qrcode-button').onclick = onQrcodeButton;

    //初期設定
    updateCameraResult();
    initAutosizeResult();
    getLoginInfo();
}

//カメラ実行ボタン
function onCameraButton() {
    const myCamera = new MyCamera();
    myCamera.start((buf) => {
        //撮影データをアップロード
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
    myGps.start((coords, description) => {
        document.querySelector('#gps-result').innerText = description;
    }, (err, description) => {
        document.querySelector('#gps-result').innerText = description;
    });
}

//QRコード実行ボタン
function onQrcodeButton() {
    const myQrcode = new MyQrcode();
    myQrcode.start();
}

//文字サイズ自動要素の生成
function initAutosizeResult() {
    const myAutosize = new MyAutosize();
    const ele = myAutosize.createElement('123ABgpiiwwff📛😀あいう漢字', 30, 100);
    document.querySelector('#autosize-result').appendChild(ele);
    setResizable(ele, (width, height) => {
        console.log(width, height);
    }, (width, height, resized) => {
        console.log(width, height, resized);
    })
}

//ログイン情報の取得
function getLoginInfo() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/login-info', true);
    xhr.onload = () => {
        const result = JSON.parse(xhr.response);
        const [name] = result.email.split('@');
        document.querySelector('#login-info .image').setAttribute('src', result.picture);
        document.querySelector('#login-info .name').innerText = name;
    };
    xhr.send(null);
}
