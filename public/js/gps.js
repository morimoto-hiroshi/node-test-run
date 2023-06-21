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
                const description = `Latitude : ${coords.latitude}\n`
                        + `Longitude: ${coords.longitude}\n`
                        + `Altitude: ${coords.altitude} meter\n`
                        + `Lat/Lon accuracy: ${coords.accuracy} meter\n`
                        + `Alt accuracy: ${coords.altitudeAccuracy} meter\n`
                        + `Heading: ${coords.speed} degree (N:0, E:90, W:270)\n`
                        + `Speed: ${coords.speed} m/s\n`;
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
