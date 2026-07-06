export default function Home() {
  return (
    <main style={{ padding: "2rem", maxWidth: 640, margin: "0 auto" }}>
      <h1>vestabook</h1>
      <p>Runs a book on a physical Vestaboard, advancing one frame every INTERVAL_MINUTES.</p>
      <ul>
        <li>
          <code>GET /api/preview</code> — current frame as plain text (no auth)
        </li>
        <li>
          <code>GET /api/tick</code> — pushes the current frame to the board (requires{" "}
          <code>X-Tick-Secret</code> header)
        </li>
        <li>
          <code>GET /api/control</code> — change book/random/pause (requires{" "}
          <code>?dongle=...</code>)
        </li>
      </ul>
    </main>
  );
}
