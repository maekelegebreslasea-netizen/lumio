const https = require("https");

exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  const apiKey = (event.headers && (event.headers["x-api-key"] || event.headers["X-Api-Key"])) 
    || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "No API key provided" }) };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  return new Promise((resolve) => {
    const bodyStr = JSON.stringify(requestBody);
    
    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: corsHeaders,
          body: data,
        });
      });
    });

    req.on("error", (err) => {
      resolve({
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Request failed: " + err.message }),
      });
    });

    req.setTimeout(25000, () => {
      req.destroy();
      resolve({
        statusCode: 504,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Request timeout" }),
      });
    });

    req.write(bodyStr);
    req.end();
  });
};
