//ロード時の初期化処理
window.onload = function () {
    document.querySelector('#start-button').onclick = function () {
        startCamera();
    });
};

const options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
};

function success(pos) {
    const crd = pos.coords;

    log('Your current position is:');
    log(`Latitude : ${crd.latitude}`);
    log(`Longitude: ${crd.longitude}`);
    log(`Altitude: ${crd.altitude}`);
    log(`Speed: ${crd.speed} m/s`);
    log(`Heading: ${crd.speed} degree`);
    log(`More or less ${crd.accuracy} meters.`);
}

function error(err) {
    log(`ERROR(${err.code}): ${err.message}`);
}

navigator.geolocation.getCurrentPosition(success, error, options);

function log(msg) {
    document.getElementById('status').innerText = msg
    console.log(msg);
}
