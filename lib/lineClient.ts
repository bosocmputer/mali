const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const REQUEST_TIMEOUT_MS = 10_000;
// 3 attempts in total: now, +2s, +5s. Kept short because this runs inside a cron HTTP request.
const DEFAULT_RETRY_DELAYS_MS = [2_000, 5_000];

export class LineSendError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number
  ) {
    super(message);
    this.name = "LineSendError";
  }
}

export type SendLineOptions = {
  token?: string;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  retryDelaysMs?: number[];
};

async function readLineErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.message === "string" ? body.message.slice(0, 200) : "";
  } catch {
    return "";
  }
}

/**
 * Push one message to a LINE user. Resolves only when LINE accepted it (HTTP 2xx);
 * throws LineSendError otherwise. Network errors, 429 and 5xx are retried; other
 * 4xx (bad token, blocked user, invalid payload) are not, since retrying cannot help.
 */
export async function sendLineMessage(
  lineUserId: string,
  message: string | object,
  options: SendLineOptions = {}
): Promise<void> {
  const token = options.token ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
  if (!token) {
    throw new LineSendError("LINE_CHANNEL_ACCESS_TOKEN ยังไม่ได้ตั้งค่า", false);
  }

  const fetchFn = options.fetchFn ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const delays = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const payload = typeof message === "string" ? { type: "text", text: message } : message;
  const body = JSON.stringify({ to: lineUserId, messages: [payload] });

  let lastError: LineSendError | undefined;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    if (attempt > 0) await sleep(delays[attempt - 1]);

    try {
      const res = await fetchFn(LINE_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) return;

      const detail = await readLineErrorDetail(res);
      lastError = new LineSendError(
        `LINE ตอบกลับ ${res.status}${detail ? `: ${detail}` : ""}`,
        res.status === 429 || res.status >= 500,
        res.status
      );
    } catch (e) {
      lastError = new LineSendError(
        `เชื่อมต่อ LINE ไม่ได้: ${e instanceof Error ? e.message : String(e)}`,
        true
      );
    }

    if (!lastError.retryable) break;
  }

  throw lastError ?? new LineSendError("ส่ง LINE ไม่สำเร็จ", false);
}
