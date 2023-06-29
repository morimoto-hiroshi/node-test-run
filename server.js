//利用モジュール
const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');
const websocketServer = require('websocket').server;
const {Storage} = require('@google-cloud/storage');
const docs = require('@googleapis/docs');
const crypto = require('crypto');

//定数
const IS_CLOUD = ('NODE_ENV' in process.env && process.env.NODE_ENV == 'production');
const [EN0] = Object.values(os.networkInterfaces());
const {address: ADDRESS} = EN0.find(({family}) => family === 'IPv4'); //サーバーのIPアドレス
const PORT = process.env.PORT || 3000; //httpサーバーのポート
const PROTOCOL = 'note'; //WebSocketのプロトコル識別子
const DATA_DIR = '.data'; //データ保存ディレクトリ
const SESSION_DIR = IS_CLOUD ? '/tmp' : '.data'; //session保存ディレクトリ

//ストレージ初期化
const g_storage = new Storage(IS_CLOUD ? {} : {
    keyFilename: './.keys/node-test-run-1b6e23e510da.json', //keyFile(*1)
    projectId: 'node-test-run' //プロジェクト(*2)
});
const g_bucket = g_storage.bucket('node-test-run-tokyo');
if (!IS_CLOUD) {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, {recursive: true});
    }
}

/**
 * OAuth2情報の取得方法
 * GCPコンソールで プロジェクト(*2) を選択し、APIとサービス＞OAuth同意画面 へ。
 * OAuth同意画面を作成する。スコープには .../auth/userinfo.email を追加。
 * 次に APIとサービス＞認証情報 へ。＋認証情報を作成＞OAuthクライアントID＞
 * アプリケーションの種類＝ウェブアプリケーション で作成し、
 * 認証情報の一覧画面で、作成したクライアントのダウンロードボタンからjsonを取得。
 */

//OAuth2初期化
const OAUTH_CLIENT_JSON = '.keys/client_secret_839282543284-ijdjcam7rmko62uquv6faa33kfis546c.apps.googleusercontent.com.json';
const oauth2Data = JSON.parse(fs.readFileSync(OAUTH_CLIENT_JSON, 'utf8'));
const g_oauth2Client = new docs.auth.OAuth2(oauth2Data.web.client_id, oauth2Data.web.client_secret,
        IS_CLOUD ? 'https://node-test-run.appspot.com/oauth2callback' : 'http://localhost:3000/oauth2callback');
const g_oauth2Url = g_oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: 'https://www.googleapis.com/auth/userinfo.email', //Google アカウントのメインのメールアドレスを表示する
});

//httpサーバーのrequestハンドラ
const g_httpServer = http.createServer((request, response) => {
    //url検査
    console.log(`${new Date()} ${request.method} ${request.url}`);
    const urlDic = url.parse(request.url);
    const queryDic = querystring.parse(urlDic.query);
    let urlPathname = urlDic.pathname;
    //ログイン
    if (urlPathname == '/login') {
        response.writeHead(302, {'Location': g_oauth2Url});
        response.end();
        return;
    }
    //OAuth2コールバック
    if (urlPathname == '/oauth2callback') {
        onOAuth2Callback(request, response);
        return;
    }
    //ログアウト
    if (urlPathname == '/logout') {
        deleteLoginInfo(request, response);
        response.writeHead(302, {'Location': '/'});
        response.end();
        return;
    }
    //上記以外で、ログインしていなければログイン画面へ
    const loginInfoJson = getLoginInfoJson(request);
    if (loginInfoJson === null && urlPathname != '/login.html') {
        response.writeHead(302, {'Location': '/login.html'});
        response.end();
        return;
    }
    //Pathnameの検査と置換
    if (urlPathname == '/') {
        urlPathname = '/index.html';
    }
    if (urlPathname.indexOf('..') != -1) {
        response.writeHead(403);
        response.end();
        return;
    }
    //REST-API応答処理
    if (urlPathname.match('^/api/.+$') != null) {
        onRestApi(request, response, urlPathname, loginInfoJson);
        return;
    }
    //ファイル応答処理
    const patterns = [
        '^/.+\\.html$',
        '^/css/.+\\.css$',
        '^/js/.+\\.js$',
        '^/img/.+\\.(ico|png|jpg|gif)$',
        '^/audio/.+\\.(mp3)$'
    ];
    if (patterns.filter(pat => urlPathname.match(pat)).length <= 0) {
        response.writeHead(404);
        response.end();
        return;
    }
    const types = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/js',
        '.ico': 'image/vnd.microsoft.icon',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.mp3': 'audio/mpeg'
    }
    const headers = {}
    const ext = path.extname(urlPathname);
    if (ext in types) {
        headers['Content-Type'] = types[ext];
    }
    fs.readFile('./public' + urlPathname, (err, data) => {
        if (err) {
            console.log(`${new Date()} readFile error: ${err}`);
        } else {
            response.writeHead(200, headers);
            response.write(data);
            response.end();
        }
    });
});

//OAuth2コールバック
function onOAuth2Callback(request, response) {
    //渡された認可コード(authorization code)を送ってアクセストークンを取得
    const queryDic = querystring.parse(url.parse(request.url).query);
    g_oauth2Client.getToken(queryDic.code, (err, token) => {
        if (err) {
            response.writeHead(err.code, {'Content-Type': 'text/plain'});
            response.write(`OAuth getToken Error: ${err.code} ${err.message}`);
            response.end();
        } else {
            //アクセストークンが得られたら、Google APIでユーザー情報を取得する
            const req = https.request('https://www.googleapis.com/oauth2/v1/userinfo', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token.access_token}`
                },
            }, (res) => {
                if (res.statusCode != 200) {
                    //access_tokenが違う場合など
                    response.writeHead(res.statusCode, {'Content-Type': 'text/plain'});
                    response.write(`Getting Userinfo, Resonse Error: ${res.statusCode} ${res.statusMessage}`);
                    response.end();
                    return;
                }
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    //成功したとき
                    const loginInfo = JSON.parse(chunk);
                    if (isAllowedMailDomain(loginInfo.email)) {
                        saveLoginInfo(response, chunk);
                        response.writeHead(302, {'Location': '/'});
                        response.end();
                    } else {
                        response.writeHead(401, {'Content-Type': 'text/plain; charset=utf-8'});
                        response.write(`このメールアドレス '${loginInfo.email}' ではご利用できません`);
                        response.end();
                    }
                });
            });
            req.on('error', (err) => {
                //www.googleapis.comに接続できない場合など
                response.writeHead(500, {'Content-Type': 'text/plain'});
                response.write(`Getting Userinfo, Request Error: ${err}`);
                response.end();
            })
            req.end();
        }
    });
}

//アクセス許可されたメールアドレスかどうか
function isAllowedMailDomain(email) {
    const [emailDomain] = email.match(/[^@]+$/);
    const authInfo = JSON.parse(fs.readFileSync('.keys/auth-info.json', 'utf8'));
    return authInfo.allowed_domains.filter(domain => domain == emailDomain).length > 0;
}

//ログイン情報取得
function getLoginInfoJson(request) {
    const sessionId = getCookie(request, 'session-id');
    if (sessionId == '') {
        return null;
    }
    const path = getSessionJsonPath(sessionId);
    if (!fs.existsSync(path)) {
        return null;
    }
    return fs.readFileSync(path, 'utf8');
}

//ログイン情報保存
function saveLoginInfo(response, infoJson) {
    const sessionId = crypto.createHash('sha1').update(createUuid()).digest('hex');
    setCookie(response, 'session-id', sessionId);
    const path = getSessionJsonPath(sessionId);
    fs.writeFileSync(path, infoJson);
}

//ログイン情報削除
function deleteLoginInfo(request, response) {
    expireCookie(response, 'session-id');
    const sessionId = getCookie(request, 'session-id');
    if (sessionId == '') {
        return;
    }
    const path = getSessionJsonPath(sessionId);
    if (!fs.existsSync(path)) {
        return;
    }
    fs.unlink(path, () => {
    });
}

//sessionファイルのパス名取得
function getSessionJsonPath(sessionId) {
    return `${SESSION_DIR}/sess-${sessionId}.json`;
}

//Cookie取得
function getCookie(request, name) {
    const cookie = request.headers.cookie;
    if (cookie === undefined) {
        return '';
    }
    const datas = cookie.split(';').map(data => data.trim());
    const data = datas.find(data => data.startsWith(`${name}=`));
    if (data === undefined) {
        return '';
    }
    const value = data.substring(`${name}=`.length);
    return unescape(value);
}

//Cookie設定
function setCookie(response, name, value) {
    const escapedValue = escape(value);
    response.setHeader('Set-Cookie', [`${name}=${escapedValue}`]);
}

//Cookie破棄
function expireCookie(response, name) {
    response.setHeader('Set-Cookie', [`${name}=; max-age=0`]);
}

//UUID生成用フィールド
let g_uuidTime = new Date().getTime();
let g_uuidSerial = 0;

//UUID生成
function createUuid() {
    return [ADDRESS, process.pid, g_uuidTime, g_uuidSerial++].join('.');
}

//REST-API応答処理
function onRestApi(request, response, urlPathname, loginInfoJson) {
    const imagePath = `${DATA_DIR}/image.png`;
    switch (urlPathname) {
        case '/api/login-info':
            response.writeHead(200, {'Content-Type': 'text/json'});
            response.write(loginInfoJson);
            response.end();
            return;
        case '/api/add-image':
            let bufs = [];
            request.on('data', (chunk) => {
                bufs.push(chunk);
            }).on('end', () => {
                let body = Buffer.concat(bufs);
                g_bucket.file(imagePath).save(body, {}, (err) => {
                    const code = err ? 500 : 201;
                    const json = JSON.stringify({
                        urlPathname: urlPathname,
                        code: code,
                        length: body.length
                    });
                    response.writeHead(code, {'Content-Type': 'text/json'});
                    response.write(json);
                    response.end();
                });
//                fs.writeFile(imagePath, body, (err) => { //ローカルファイルが使える場合
//                    const code = err ? 500 : 201;
//                    const json = JSON.stringify({
//                        code: code,
//                        length: body.length
//                    });
//                    response.writeHead(code, {'Content-Type': 'text/json'});
//                    response.write(json);
//                    response.end();
//                })
            });
            return;
        case '/api/exist-image':
            g_bucket.file(imagePath).exists({}, (err, exists) => {
                const code = err ? 500 : 200;
                const json = JSON.stringify({
                    urlPathname: urlPathname,
                    code: code,
                    exists: exists
                });
                response.writeHead(code, {'Content-Type': 'text/json'});
                response.write(json);
                response.end();
            });
//            fs.exists(imagePath, (e) => {
//                const code = 200;
//                const json = JSON.stringify({
//                    code: code,
//                    exists: e
//                });
//                response.writeHead(code, {'Content-Type': 'text/json'});
//                response.write(json);
//                response.end();
//            });
            return;
        case '/api/get-image':
            g_bucket.file(imagePath).createReadStream()
                    //成功時:resopnse -> end
                    //エラー時:response -> error
                    .on('response', (res) => {
                        if (res.statusCode == 200) {
                            response.writeHead(200, {'Content-Type': 'image/png'});
                        } else {
                            response.writeHead(res.statusCode, res.statusMessage);
                        }
                    }).on('end', () => {
                response.end();
            }).on('error', () => {
                response.end();
            }).pipe(response);
//            fs.readFile(imagePath, (err, data) => {
//                if (err) {
//                    response.writeHead(404);
//                    response.end();
//                } else {
//                    response.writeHead(200, {'Content-Type': 'image/png'});
//                    response.write(data);
//                    response.end();
//                }
//            });
            return;
        case '/api/delete-image':
            g_bucket.file(imagePath).delete({ignoreNotFound: true}, (err) => {
                const code = err ? 500 : 200;
                const json = JSON.stringify({
                    urlPathname: urlPathname,
                    code: code
                });
                response.writeHead(code, {'Content-Type': 'text/json'});
                response.write(json);
                response.end();
            });
//            fs.unlink(imagePath, (err) => {
//                const code = err ? 500 : 200;
//                const json = JSON.stringify({
//                    code: code
//                });
//                response.writeHead(code, {'Content-Type': 'text/json'});
//                response.write(json);
//                response.end();
//            });
            return;
    }
    response.writeHead(403);
    response.end();
}

//httpサーバーを起動
g_httpServer.listen(PORT, () => {
    console.log(`${new Date()} listen http://${ADDRESS}:${PORT}`);
});

//WebSocketサーバーをhttpサーバーに寄生させる
const g_websocketServer = new websocketServer({
    httpServer: g_httpServer,
    autoAcceptConnections: false //cross-origin protectionを無効化しない
});

//WebSocketサーバーのrequestハンドラ
g_websocketServer.on('request', (request) => {
    //originの検査
    console.log(`${new Date()} check origin: ${request.origin}`);
    if (request.origin !== `http://localhost:${PORT}` && request.origin !== `http://${ADDRESS}:${PORT}`) {
        request.reject();
        console.log(`${new Date()} REJECTED: ${request.origin}`);
        return;
    }

    //コネクション確立とイベントハンドラ
    const connection = request.accept(PROTOCOL, request.origin);
    onAccept(connection);
    connection.on('message', message => {
        switch (message.type) {
            case 'utf8':
                console.log(`${new Date()} text message: ${message.utf8Data}`);
                const data = JSON.parse(message.utf8Data);
                switch (data.cmd) {
                    case 'add':
                        data.unit.unitId = Date.now();
                    case 'drag':
                    case 'update':
                        onAddDragUpdate(data);
                        break;
                    case 'delete':
                        onDelete(data);
                        break;
                }
                break;
            case 'binary':
                console.log(`${new Date()} binary message: ${message.binaryData.length}byte`);
                connection.sendBytes(message.binaryData);
                break;
        }
    });
    connection.on('close', (reasonCode, description) => {
        console.log(`${new Date()} closed: ${connection.remoteAddress}`);
    });
});

//コネクション確立時の処理
function onAccept(connection) {
    const sessionId = `${connection.socket._peername.address}:${connection.socket._peername.port}:${new Date().getTime()}`;
    console.log(`${new Date()} acceepted: ${sessionId}`);
    //sessionIdを送る
    const json = JSON.stringify({
        cmd: 'info',
        sessionId: sessionId
    });
    connection.sendUTF(json); //送信元だけに送る
    //既存データを送る
    fs.readdirSync(DATA_DIR).filter(path => path.match(/\.json$/)).forEach(path => {
        const json = fs.readFileSync(`${DATA_DIR}/${path}`, 'utf8');
        connection.sendUTF(json); //送信元だけに送る
    });
}

//add,drag,updateコマンドの処理
function onAddDragUpdate(data) {
    const json = JSON.stringify(data);
    const jsonPath = `${DATA_DIR}/${data.unit.unitId}.json`;
    if (data.cmd != 'drag') { //dragはファイル保存しない
        fs.writeFile(jsonPath, json, (err) => {
            if (err) {
                console.log(`${new Date()} writeFile error: ${err}`);
            }
        })
    }
    g_websocketServer.broadcast(json); //全端末に送る
}

//deleteコマンドの処理
function onDelete(data) {
    const json = JSON.stringify(data);
    const jsonPath = `${DATA_DIR}/${data.unit.unitId}.json`;
    fs.unlink(jsonPath, (err) => {
        if (err) {
            console.log(`${new Date()} unlink error: ${err}`);
        }
    })
    g_websocketServer.broadcast(json); //全端末に送る
}
