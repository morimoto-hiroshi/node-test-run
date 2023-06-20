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
                doneBlock(pos.coords);
            }
        }, (err) => {
            if (errorBlock) {
                errorBlock(err);
            }
        }, options);
    }
}
