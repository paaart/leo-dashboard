import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const quotes = JSON.parse(readFileSync("quotes.json", "utf-8"));

async function uploadQuotes() {
  const { error } = await supabase.from("transport_quotes").insert(quotes);
  if (error) {
    console.error("❌ Upload failed:", error.message);
  } else {
    console.log("✅ Upload successful:", quotes.length, "records inserted.");
  }
}

uploadQuotes();
