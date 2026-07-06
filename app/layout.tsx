export const metadata = {
  title: "vestabook",
  description: "Runs a book on a Vestaboard, one frame at a time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "monospace", background: "#111", color: "#eee" }}>
        {children}
      </body>
    </html>
  );
}
