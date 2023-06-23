/**
 * エレメントをリサイズ可能にする
 */
function setResizable(ele, onresize, onend) {
    //クロージャのコンテキスト変数
    var m_resized = false;
    var m_offsetX, m_offsetY;

    //開始イベントハンドラを設定
    ele.addEventListener('mousedown', onStart);
    ele.addEventListener('touchstart', onStart);

    //ドラッグ開始イベントハンドラ
    function onStart(e) {
        //目印としてクラス名を追加
        this.classList.add('drag');
        const event = trimEvent(e);
        m_offsetX = this.offsetLeft + this.offsetWidth - event.pageX;
        m_offsetY = this.offsetTop + this.offsetHeight - event.pageY;
        //移動／終了イベントハンドラを設定
        document.body.addEventListener('mousemove', onResize);
        document.body.addEventListener('touchmove', onResize);
        document.body.addEventListener('mouseleave', onEnd);
        document.body.addEventListener('touchleave', onEnd);
        this.addEventListener('mouseup', onEnd);
        this.addEventListener('touchend', onEnd);
    }

    //ドラッグ移動イベントハンドラ
    function onResize(e) {
        m_resized = true;
        var drag = document.getElementsByClassName('drag')[0];
        e.preventDefault();
        const size = getSize(e);
        drag.style.width = size.width + 'px';
        drag.style.height = size.height + 'px';
        if (onresize) {
            onresize(size.width, size.height);
        }
    }

    //ドラッグ終了イベントハンドラ
    function onEnd(e) {
        var drag = document.getElementsByClassName('drag')[0];
        //イベントハンドラを撤去
        document.body.removeEventListener('mousemove', onResize);
        document.body.removeEventListener('touchmove', onResize);
        document.body.removeEventListener('mouseleave', onEnd);
        document.body.removeEventListener('touchleave', onEnd);
        drag.removeEventListener('mouseup', onEnd);
        drag.removeEventListener('touchend', onEnd);
        //目印のクラス名を消去
        drag.classList.remove('drag');
        const size = getSize(e);
        if (onend) {
            onend(size.width, size.height, m_resized);
        }
        m_resized = false;
    }

    //マウスまたはタッチイベントを共通化
    function trimEvent(e) {
        return e.type.startsWith('mouse') ? e : e.changedTouches[0];
    }

    //エレメントの左上隅の位置を取得
    function getSize(e) {
        const event = trimEvent(e);
        return {width: event.pageX + m_offsetX - event.target.offsetLeft, height: event.pageY + m_offsetY - event.target.offsetTop};
    }
}
