const { getSupabaseAdmin } = require("./_supabase");

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function getRequestIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0]).split(",")[0].trim();
  }

  return (
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    null
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = parseBody(req);
    const userId = body.user_id;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "Missing or invalid user_id" });
    }

    const includeJoinedAt = Boolean(body.include_joined_at);
    const supabase = getSupabaseAdmin();

    const payload = {
      user_id: userId,
      profile: body.profile || null,
      name: typeof body.name === "string" ? body.name.trim() || null : null,
      device_info: body.device_info || null,
      ip_address: getRequestIp(req),
      user_agent:
        typeof req.headers["user-agent"] === "string"
          ? req.headers["user-agent"]
          : null,
      updated_at: new Date().toISOString(),
    };

    if (includeJoinedAt) {
      payload.joined_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("user_info")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res
      .status(200)
      .json({ ok: true, source: "api/log-user", user_id: userId });
  } catch (e) {
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Unexpected server error",
    });
  }
};
