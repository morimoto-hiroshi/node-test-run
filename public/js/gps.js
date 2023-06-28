class MyGps {

    /**
     * 測定開始
     */
    start(doneBlock, errorBlock) {
        const options = {
            enableHighAccuracy: true,
            timeout: 5000, //msec
            maximumAge: 0 //キャッシュの許容時間(msec)
        };
        navigator.geolocation.getCurrentPosition((pos) => {
            if (doneBlock) {
                const coords = pos.coords;
                const description = `緯度: ${coords.latitude}\n`
                        + `経度: ${coords.longitude}\n`
                        + `高度: ${coords.altitude} meter\n`
                        + `緯度/経度の精度: ${coords.accuracy} meter\n`
                        + `高度の精度: ${coords.altitudeAccuracy} meter\n`
                        + `進行方向: ${coords.speed} degree (N:0, E:90, W:270)\n`
                        + `速度: ${coords.speed} m/s\n`;
                doneBlock(pos.coords, description);
            }
        }, (err) => {
            if (errorBlock) {
                const description = `ERROR(${err.code}): ${err.message}`;
                errorBlock(err, description);
            }
        }, options);
    }
}
