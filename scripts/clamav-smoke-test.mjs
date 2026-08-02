import net from "node:net";

const host = process.env.CLAMAV_HOST || "127.0.0.1";
const port = Number(process.env.CLAMAV_PORT || 3310);
const timeoutMs = Number(process.env.CLAMAV_TIMEOUT_MS || 10000);
const eicar = Buffer.from(
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*",
  "utf8"
);

function scan(buffer) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.write("zINSTREAM\0");
      const size = Buffer.alloc(4);
      size.writeUInt32BE(buffer.length, 0);
      socket.write(size);
      socket.write(buffer);
      socket.write(Buffer.alloc(4));
      socket.end();
    });

    let response = "";
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(err);
    };

    socket.setTimeout(timeoutMs);
    socket.on("data", (chunk) => {
      response += chunk.toString();
    });
    socket.on("end", () => {
      if (settled) return;
      settled = true;
      resolve(response.trim());
    });
    socket.on("timeout", () => fail(new Error(`Timed out connecting to ClamAV at ${host}:${port}`)));
    socket.on("error", fail);
  });
}

const cleanResult = await scan(Buffer.from("%PDF-1.4 clean smoke test", "utf8"));
const infectedResult = await scan(eicar);

if (!cleanResult.includes("OK")) {
  throw new Error(`Expected clean scan to return OK, got: ${cleanResult}`);
}

if (!infectedResult.includes("FOUND")) {
  throw new Error(`Expected EICAR scan to return FOUND, got: ${infectedResult}`);
}

console.log(`ClamAV smoke test passed at ${host}:${port}`);
console.log(`Clean response: ${cleanResult}`);
console.log(`EICAR response: ${infectedResult}`);
