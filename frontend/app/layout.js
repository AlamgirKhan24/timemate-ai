import NavBar from "@/components/NavBar";
import "./globals.css";

export const metadata = {
  title: "TimeMate AI · Make room for your day",
  description: "Plan your tasks, calendar, and reminders in one calm workspace.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NavBar>{children}</NavBar>
      </body>
    </html>
  );
}

