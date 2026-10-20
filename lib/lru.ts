/** Tiny byte-bounded LRU. Map keeps insertion order, so the first key is the least recent. */
export class ByteLru {
  private map = new Map<string, Uint8Array>();
  private bytes = 0;

  constructor(private readonly maxBytes: number) {}

  get(key: string): Uint8Array | undefined {
    const value = this.map.get(key);
    if (value) {
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: string, value: Uint8Array): void {
    if (value.byteLength > this.maxBytes) return;
    const old = this.map.get(key);
    if (old) {
      this.bytes -= old.byteLength;
      this.map.delete(key);
    }
    this.map.set(key, value);
    this.bytes += value.byteLength;
    for (const [k, v] of this.map) {
      if (this.bytes <= this.maxBytes) break;
      this.map.delete(k);
      this.bytes -= v.byteLength;
    }
  }

  get size(): number {
    return this.bytes;
  }
}
