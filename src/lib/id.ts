/**
 * crypto.randomUUID()はセキュアコンテキスト（https、またはlocalhost）でしか使えないため、
 * 使えない場合（例：スマホからLAN経由でhttp://192.168.x.x等にアクセスした場合）は
 * 簡易的なID生成にフォールバックする。
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
