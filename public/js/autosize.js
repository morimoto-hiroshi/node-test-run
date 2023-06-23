class MyAutosize {

    /**
     * フィールド
     */
    m_canvas = null;
    m_text = '123abciiffwwあいう漢字';

    /**
     * html要素の生成
     */
    createElement() {
        this.m_canvas = document.createElement('canvas');
        const canvas = this.m_canvas;
        canvas.style.width = '400px';
        canvas.style.height = '150px';
        canvas.width = 400 * 2;
        canvas.height = 150 * 2;
        canvas.className = 'autosize';
        //リサイズイベントのハンドラを設定
        const observer = new MutationObserver(() => {
            this.draw();
        })
        observer.observe(canvas, {
            attriblutes: true,
            attributeFilter: ["style"]
        })
        this.draw();
        return canvas;
    }

    /**
     * 再描画
     */
    draw() {
        const width = parseInt(this.m_canvas.style.width);
        const height = parseInt(this.m_canvas.style.height);
        console.log(`draw w=${width} h=${height}`);

        const canvas = this.m_canvas;
        const context = canvas.getContext('2d');
        context.font = '72px "メイリオ"';
        context.strokeStyle = 'rgb(128,0,0)';
        context.fillStyle = 'pink';
        const metrics = context.measureText(this.m_text);
        console.log(metrics);
        context.fillText(this.m_text, 20, 80);
        context.strokeText(this.m_text, 20, 80);
        context.fillText(this.m_text, 20, 170, 320);
        context.strokeText(this.m_text, 20, 170, 320);
        context.fillText(metrics.width, 20, 260);
    }
}
