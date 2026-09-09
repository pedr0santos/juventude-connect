import type { Express } from "express";
import { ENV } from "./env";
import { storageGetSignedUrl } from "../storage";

export function registerStorageProxy(app: Express) {
  app.get(["/storage/*", "/manus-storage/*"], async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      if (req.path.startsWith("/storage/") && ENV.s3Endpoint && ENV.s3Bucket && ENV.s3AccessKeyId && ENV.s3SecretAccessKey) {
        const url = await storageGetSignedUrl(key);
        res.set("Cache-Control", "private, max-age=300");
        res.redirect(307, url);
        return;
      }

      if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
        res.status(500).send("Storage proxy not configured");
        return;
      }

      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
