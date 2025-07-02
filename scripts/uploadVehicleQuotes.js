import "dotenv/config";

import * as fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const vehicleQuotes = JSON.parse(
  fs.readFileSync("scripts/vehicleQuotes.json", "utf-8")
);

async function uploadVehicleQuotes() {
  console.log(`🚗 Uploading ${vehicleQuotes.length} vehicle quotes...`);

  const { error } = await supabase
    .from("vehicle_quotes")
    .upsert(vehicleQuotes, { onConflict: ["source", "destination", "size"] });

  if (error) {
    console.error("❌ Vehicle upload failed:", error.message);
  } else {
    console.log("✅ Vehicle upload successful.");
  }
}

uploadVehicleQuotes();
