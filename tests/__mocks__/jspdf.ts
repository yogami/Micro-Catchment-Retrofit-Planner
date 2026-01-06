/**
 * jsPDF Mock for Jest tests
 * 
 * The real jsPDF has dependencies that don't work well in jsdom.
 * This mock provides the essential API surface for contract testing.
 */

class MockJsPDF {
    private content: string[] = [];

    setFontSize(_size: number): this { return this; }
    setFont(_family: string, _style?: string): this { return this; }
    setTextColor(_color: number): this { return this; }

    text(text: string, _x: number, _y: number, _options?: object): this {
        this.content.push(text);
        return this;
    }

    line(_x1: number, _y1: number, _x2: number, _y2: number): this { return this; }

    addPage(): this { return this; }

    output(type: 'blob' | 'arraybuffer' | 'dataurlstring'): Blob | ArrayBuffer | string {
        if (type === 'blob') {
            return new Blob([this.content.join('\n')], { type: 'application/pdf' });
        }
        if (type === 'arraybuffer') {
            return new ArrayBuffer(0);
        }
        return 'data:application/pdf;base64,mock';
    }

    save(_filename: string): void {
        // No-op in tests
    }
}

export default MockJsPDF;
