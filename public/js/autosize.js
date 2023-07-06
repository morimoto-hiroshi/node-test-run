/**
 * フォントサイズ自動調整
 */
class MyAutosize {

    /**
     * フィールド
     */
    m_text;
    m_minSize;
    m_maxSize;
    m_canvas = null;
    /**
     * html要素の生成
     */
    createElement(text, minSize, maxSize) {
        this.m_text = text;
        this.m_minSize = minSize;
        this.m_maxSize = maxSize;
        this.m_canvas = document.createElement('canvas');
        const canvas = this.m_canvas;
        canvas.className = 'autosize';
        canvas.style.width = '500px';
        canvas.style.height = '160px';
        //リサイズイベントのハンドラを設定
        const observer = new MutationObserver(() => {
            this.draw();
        })
        observer.observe(canvas, {
            attriblutes: true,
            attributeFilter: ["style"]
        })
        return canvas;
    }

    /**
     * min/maxの設定
     */
    setRange(minSize, maxSize) {
        this.m_minSize = minSize;
        this.m_maxSize = maxSize;
        this.draw();
    }

    /**
     * 再描画
     */
    draw() {
        this.setCanvasScale();
        const canvas = this.m_canvas;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = 'rgb(128,0,0)';
        ctx.fillStyle = 'pink';
        ctx.textBaseline = 'ideographic';
        //適合サイズを求める（漸近アルゴリズムは改善の余地あり、mix/maxの場合など）というか一発で決められるのでは？
        let min = this.m_minSize;
        let max = this.m_maxSize;
        let size = -1;
        let metrics;
        while (true) {
            let newSize = Math.round((min + max) / 2 * 10) / 10; //小数点以下1桁で丸める
            if (newSize == size) {
                break;
            }
            size = newSize;
            ctx.font = `${size}px 'メイリオ'`;
            metrics = ctx.measureText(this.m_text);
            if (canvas.width < metrics.width) {
                max = size;
            } else {
                min = size;
            }
        }
        //補助線
        this.hLine(metrics.actualBoundingBoxAscent);
        this.hLine(metrics.actualBoundingBoxAscent + -metrics.actualBoundingBoxDescent);
        //適合サイズで描画
        const lineHeight = metrics.actualBoundingBoxAscent + -metrics.actualBoundingBoxDescent;
        let y = lineHeight;
        ctx.fillText(this.m_text, 0, y);
        ctx.strokeText(this.m_text, 0, y);
        //サイズ情報
        y += lineHeight;
        ctx.fillText(ctx.font, 0, y);
        y += lineHeight;
        ctx.fillText(`min:${this.m_minSize}px, max:${this.m_maxSize}px`, 0, y);
    }

    /**
     * 補助線描画
     */
    hLine(y) {
        const canvas = this.m_canvas;
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.fillStyle = 'royalblue';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * デバイスピクセル比に応じたcanvas座標系を設定する
     */
    setCanvasScale() {
        const canvas = this.m_canvas;
        const styleWidth = parseInt(canvas.style.width);
        const styleHeight = parseInt(canvas.style.height);
        canvas.width = styleWidth * window.devicePixelRatio;
        canvas.height = styleHeight * window.devicePixelRatio;
    }
}
