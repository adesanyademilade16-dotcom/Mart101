import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const config = {
  api: { bodyParser: false },
};

const SUPABASE_URL = "https://ututplfwuwwkbcrrjydw.supabase.co";

function getRawBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: any) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await getRawBody(req);
  const signature = req.headers["x-paystack-signature"];

  const expectedSignature = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    const reference = event.data.reference; // this is our order's id
    const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: order } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", reference)
      .maybeSingle();

    if (order && order.status === "pending_payment") {
      const now = new Date();
      const autoRelease = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      await supabase
        .from("orders")
        .update({
          status: "paid_held",
          paid_at: now.toISOString(),
          auto_release_at: autoRelease.toISOString(),
        })
        .eq("id", order.id);
    }
  }

  return res.status(200).json({ received: true });
}
