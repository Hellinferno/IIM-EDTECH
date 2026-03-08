import { Webhook } from "svix";
import { deleteUserByClerkId, upsertUserRecord } from "@/lib/supabase";

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkUserPayload {
  id?: string;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmailAddress[];
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserPayload;
}

function resolvePrimaryEmail(data: ClerkUserPayload): string | null {
  const emailAddresses = data.email_addresses ?? [];
  if (emailAddresses.length === 0) {
    return null;
  }

  const primary = emailAddresses.find(
    (entry) => entry.id === data.primary_email_address_id && entry.email_address
  );
  if (primary?.email_address) {
    return primary.email_address;
  }

  return emailAddresses[0]?.email_address ?? null;
}

export async function POST(request: Request): Promise<Response> {
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json({ error: "Missing CLERK_WEBHOOK_SECRET" }, { status: 500 });
  }

  const body = await request.text();

  let event: ClerkWebhookEvent;
  try {
    const webhook = new Webhook(webhookSecret);
    event = webhook.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature
    }) as ClerkWebhookEvent;
  } catch {
    return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type === "user.deleted") {
    const clerkId = event.data.id;
    if (!clerkId) {
      return Response.json({ ok: true }, { status: 200 });
    }

    const deleted = await deleteUserByClerkId(clerkId);
    if (!deleted) {
      return Response.json({ error: "Failed to delete user record" }, { status: 500 });
    }
    return Response.json({ ok: true }, { status: 200 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const clerkId = event.data.id;
    const email = resolvePrimaryEmail(event.data);

    if (!clerkId || !email) {
      return Response.json({ error: "Missing user identity payload" }, { status: 400 });
    }

    const synced = await upsertUserRecord({ clerkId, email });
    if (!synced) {
      return Response.json({ error: "Failed to sync user record" }, { status: 500 });
    }
  }

  return Response.json({ ok: true }, { status: 200 });
}
