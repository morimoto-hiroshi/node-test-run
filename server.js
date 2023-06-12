//利用モジュール
const os = require('os')
const fs = require('fs')
const path = require('path')
const http = require('http')
const websocketServer = require('websocket').server

//定数
const [EN0] = Object.values(os.networkInterfaces())
const {address: ADDRESS} = EN0.find(({family}) => family === 'IPv4') //サーバーのIPアドレス
const PORT = process.env.PORT || 3000 //httpサーバーのポート
const PROTOCOL = 'note' //WebSocketのプロトコル識別子
const DATA_DIR = '.data' //データ保存ディレクトリ

//httpサーバーのrequestハンドラ
const g_httpServer = http.createServer((request, response) => {
    //url検査
    var url = request.url
    if (url == '/') {
        url = '/index.html'
    }
    if (url.indexOf('..') != -1) {
        response.writeHead(403)
        response.end()
        return;
    }
    //api応答処理
    if (url.match('^/api/.+$') != null) {
        switch (request.method) {
            case 'GET':
                break
            case 'POST':
                break
        }
        response.writeHead(403)
        response.end()
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
    if (patterns.filter(pat => url.match(pat)).length <= 0) {
        response.writeHead(404)
        response.end()
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
    const ext = path.extname(url)
    if (ext in types) {
        headers['Content-Type'] = types[ext]
    }
    fs.readFile('./public' + url, (err, data) => {
        if (err) {
            console.log(`${new Date()} readFile error: ${err}`)
        } else {
            response.writeHead(200, headers)
            response.write(data)
            response.end()
        }
    })
})

//httpサーバーを起動
g_httpServer.listen(PORT, () => {
    console.log(`${new Date()} listen http://${ADDRESS}:${PORT}`)
})

//WebSocketサーバーをhttpサーバーに寄生させる
const g_websocketServer = new websocketServer({
    httpServer: g_httpServer,
    autoAcceptConnections: false //cross-origin protectionを無効化しない
})

//WebSocketサーバーのrequestハンドラ
g_websocketServer.on('request', (request) => {
    //originの検査
    console.log(`${new Date()} check origin: ${request.origin}`)
    if (request.origin !== `http://localhost:${PORT}` && request.origin !== `http://${ADDRESS}:${PORT}`) {
        request.reject()
        console.log(`${new Date()} REJECTED: ${request.origin}`)
        return
    }

    //コネクション確立とイベントハンドラ
    const connection = request.accept(PROTOCOL, request.origin)
    onAccept(connection)
    connection.on('message', message => {
        switch (message.type) {
            case 'utf8':
                console.log(`${new Date()} text message: ${message.utf8Data}`)
                const data = JSON.parse(message.utf8Data)
                switch (data.cmd) {
                    case 'add':
                        data.unit.unitId = Date.now()
                    case 'drag':
                    case 'update':
                        onAddDragUpdate(data)
                        break;
                    case 'delete':
                        onDelete(data)
                        break;
                }
                break
            case 'binary':
                console.log(`${new Date()} binary message: ${message.binaryData.length}byte`)
                connection.sendBytes(message.binaryData)
                break
        }
    })
    connection.on('close', (reasonCode, description) => {
        console.log(`${new Date()} closed: ${connection.remoteAddress}`)
    })
})

//コネクション確立時の処理
function onAccept(connection) {
    const sessionId = `${connection.socket._peername.address}:${connection.socket._peername.port}:${new Date().getTime()}`
    console.log(`${new Date()} acceepted: ${sessionId}`)
    //sessionIdを送る
    const json = JSON.stringify({
        cmd: 'info',
        sessionId: sessionId
    })
    connection.sendUTF(json) //送信元だけに送る
    //既存データを送る
    if (fs.existsSync(DATA_DIR)) {
        fs.readdirSync(DATA_DIR).filter(path => path.match(/\.json$/)).forEach(path => {
            const json = fs.readFileSync(`${DATA_DIR}/${path}`, 'utf8')
            connection.sendUTF(json) //送信元だけに送る
        })
    }
}

//add,drag,updateコマンドの処理
function onAddDragUpdate(data) {
    const json = JSON.stringify(data)
    const jsonPath = `${DATA_DIR}/${data.unit.unitId}.json`
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, {recursive: true})
    }
    if (data.cmd != 'drag') { //dragはファイル保存しない
        fs.writeFile(jsonPath, json, (err) => {
            if (err) {
                console.log(`${new Date()} writeFile error: ${err}`)
            }
        })
    }
    g_websocketServer.broadcast(json) //全端末に送る
}

//deleteコマンドの処理
function onDelete(data) {
    const json = JSON.stringify(data)
    const jsonPath = `${DATA_DIR}/${data.unit.unitId}.json`
    fs.unlink(jsonPath, (err) => {
        if (err) {
            console.log(`${new Date()} unlink error: ${err}`)
        }
    })
    g_websocketServer.broadcast(json) //全端末に送る
}
