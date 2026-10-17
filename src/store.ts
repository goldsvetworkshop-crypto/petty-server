export class MemoryNonceStore {
  private usedSignatures = new Set<string>();

  public hasBeenUsed(signature: string): boolean {
    return this.usedSignatures.has(signature);
  }

  public markUsed(signature: string): void {
    this.usedSignatures.add(signature);
  }
}
